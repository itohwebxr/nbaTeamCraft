import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("trivia_feed")
      .select("id, share_id, score, total, gmode, difficulty, display_name, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ feed: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ feed: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, share_id, score, total, gmode, difficulty, display_name, avatar_url } =
      await req.json() as {
        user_id?: string;
        share_id: string;
        score: number;
        total: number;
        gmode: string;
        difficulty: string;
        display_name?: string;
        avatar_url?: string;
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
    });

    if (error) throw error;
    return NextResponse.json({ posted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to post to feed" }, { status: 500 });
  }
}
