import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);
    const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("sim_feed")
      .select("id, kind, share_id, result_url, title, subtitle, display_name, avatar_url, like_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ feed: data ?? [], hasMore: (data?.length ?? 0) === limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ feed: [], hasMore: false });
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
