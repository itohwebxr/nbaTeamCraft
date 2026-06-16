import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/comments/[commentId]/like  { browserId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { browserId } = await req.json();
    if (!browserId) return NextResponse.json({ error: "Missing browserId" }, { status: 400 });

    const supabase = createServerClient();

    const { error } = await supabase
      .from("comment_likes")
      .insert({ comment_id: commentId, browser_id: browserId });

    if (error) {
      if (error.code === "23505") {
        // Already liked — return current count.
        const { data } = await supabase
          .from("team_comments").select("like_count").eq("id", commentId).single();
        return NextResponse.json({ liked: true, likeCount: data?.like_count ?? 0 });
      }
      throw error;
    }

    const { data } = await supabase.rpc("increment_comment_like", { c_id: commentId });
    return NextResponse.json({ liked: true, likeCount: data ?? 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to like comment" }, { status: 500 });
  }
}

// DELETE /api/comments/[commentId]/like  { browserId }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { browserId } = await req.json();
    if (!browserId) return NextResponse.json({ error: "Missing browserId" }, { status: 400 });

    const supabase = createServerClient();

    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("browser_id", browserId);
    if (error) throw error;

    const { data } = await supabase.rpc("decrement_comment_like", { c_id: commentId });
    return NextResponse.json({ liked: false, likeCount: data ?? 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to unlike comment" }, { status: 500 });
  }
}
