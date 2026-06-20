import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);
    const cursor = req.nextUrl.searchParams.get("cursor");
    const userId = req.nextUrl.searchParams.get("userId");
    const supabase = createServerClient();

    let query = supabase
      .from("trivia_feed")
      .select("id, share_id, score, total, gmode, difficulty, display_name, avatar_url, like_count, comment_count, questions_preview, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) query = query.eq("user_id", userId);
    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) throw error;

    const feed = data ?? [];
    const nextCursor = feed.length === limit ? feed[feed.length - 1].created_at : null;
    return NextResponse.json({ feed, nextCursor });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ feed: [], nextCursor: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, share_id, score, total, gmode, difficulty, display_name, avatar_url, questions_preview } =
      await req.json() as {
        user_id?: string;
        share_id: string;
        score: number;
        total: number;
        gmode: string;
        difficulty: string;
        display_name?: string;
        avatar_url?: string;
        questions_preview?: { q: string; c: boolean }[];
      };

    if (!share_id || score == null || total == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from("trivia_feed").insert({
      user_id: user_id ?? null,
      share_id,
      score,
      total,
      gmode,
      difficulty,
      display_name: display_name ?? null,
      avatar_url: avatar_url ?? null,
      questions_preview: questions_preview ?? null,
    });

    if (error) throw error;
    return NextResponse.json({ posted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to post to feed" }, { status: 500 });
  }
}
