import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { type: feedType, id: feedId } = await params;

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("feed_comments")
      .select("id, display_name, avatar_url, body, created_at")
      .eq("feed_type", feedType)
      .eq("feed_id", feedId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const comments = (data ?? []).map((c) => ({ ...c, isMine: false }));
    return NextResponse.json({ comments });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { type: feedType, id: feedId } = await params;
  const { body, browserId, userId, displayName, avatarUrl } = await req.json() as {
    body: string;
    browserId?: string;
    userId?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  };

  void browserId;

  if (!body || body.trim().length === 0) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }
  if (body.length > 280) {
    return NextResponse.json({ error: "Comment exceeds 280 characters" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data: comment, error: insertError } = await supabase
      .from("feed_comments")
      .insert({
        feed_type: feedType,
        feed_id: feedId,
        user_id: userId ?? null,
        display_name: displayName ?? null,
        avatar_url: avatarUrl ?? null,
        body: body.trim(),
      })
      .select("id, display_name, avatar_url, body, created_at")
      .single();

    if (insertError) throw insertError;

    const table = feedType === "sim" ? "sim_feed" : "trivia_feed";
    const { count } = await supabase
      .from("feed_comments")
      .select("*", { count: "exact", head: true })
      .eq("feed_type", feedType)
      .eq("feed_id", feedId);
    await supabase.from(table).update({ comment_count: count ?? 0 }).eq("id", feedId);

    return NextResponse.json({ comment: { ...comment, isMine: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
