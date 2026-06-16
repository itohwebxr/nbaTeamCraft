import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// DELETE /api/comments/[commentId]  { browserId, userId? }
// Lets a commenter remove their own comment (matched by browser_id or user_id).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { browserId, userId } = await req.json();
    if (!browserId && !userId) {
      return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: comment, error: fetchErr } = await supabase
      .from("team_comments")
      .select("id, team_id, browser_id, user_id")
      .eq("id", commentId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const owns =
      (userId && comment.user_id === userId) ||
      (browserId && comment.browser_id === browserId);
    if (!owns) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const { error: delErr } = await supabase.from("team_comments").delete().eq("id", commentId);
    if (delErr) throw delErr;

    await supabase.rpc("decrement_team_comment_count", { t_id: comment.team_id });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
