import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { HomeTeam } from "@/lib/homeTeams";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toHomeTeams(rows: any[]): HomeTeam[] {
  return rows.map((t) => {
    const p = t.profiles;
    const { profiles: _p, ...rest } = t;
    void _p;
    return {
      ...rest,
      creator: p
        ? { displayName: p.display_name ?? null, avatarUrl: p.avatar_url ?? null, xHandle: p.x_handle ?? null }
        : null,
    } as HomeTeam;
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const kind = searchParams.get("kind") === "dream" ? "dream" : "builder";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const cursor = searchParams.get("cursor");

    const supabase = createServerClient();

    let query = supabase
      .from("public_teams")
      .select("*, profiles!user_id(display_name, avatar_url, x_handle)")
      .neq("created_by_browser_id", "__legend__")
      .neq("created_by_browser_id", "__historical__")
      .eq("is_sandbox", kind === "builder")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) throw error;

    const teams = toHomeTeams(data ?? []);
    const nextCursor = teams.length === limit ? teams[teams.length - 1].created_at : null;

    return NextResponse.json({ teams, nextCursor });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
