import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);
    const cursor = req.nextUrl.searchParams.get("cursor");
    const supabase = createServerClient();

    let query = supabase
      .from("sim_feed")
      .select("id, kind, share_id, result_url, title, subtitle, display_name, avatar_url, like_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

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
    const { user_id, kind, share_id, result_url, title, subtitle, display_name, avatar_url } =
      await req.json() as {
        user_id?: string;
        kind: "matchup" | "playoff" | "season";
        share_id?: string;
        result_url?: string;
        title: string;
        subtitle?: string;
        display_name?: string;
        avatar_url?: string;
      };

    if (!kind || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from("sim_feed").insert({
      user_id: user_id ?? null,
      kind,
      share_id: share_id ?? null,
      result_url: result_url ?? null,
      title,
      subtitle: subtitle ?? null,
      display_name: display_name ?? null,
      avatar_url: avatar_url ?? null,
    });

    if (error) throw error;
    return NextResponse.json({ posted: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("sim_feed insert error:", msg);
    return NextResponse.json({ error: "Failed to post to sim feed", detail: msg }, { status: 500 });
  }
}
