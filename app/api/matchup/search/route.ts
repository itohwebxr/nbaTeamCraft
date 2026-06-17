import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type TeamPick = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  is_sandbox: boolean;
  created_at: string;
};

const SELECT = "id, name, overall, tier, is_sandbox, created_at";

// GET /api/matchup/search?q=...&limit=10
// Empty q -> latest teams (Dream Draft + Roster Builder mixed). With q, matches
// on team name, a player's name, or a player's NBA team name (stored in
// roster_json). Name and roster searches run separately, then merge — keeps the
// PostgREST filters simple and robust.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 25);

    const supabase = createServerClient();

    if (!q) {
      const { data, error } = await supabase
        .from("public_teams")
        .select(SELECT)
        .neq("created_by_browser_id", "__legend__")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ teams: (data ?? []) as TeamPick[] });
    }

    const [byName, byRoster] = await Promise.all([
      supabase
        .from("public_teams")
        .select(SELECT)
        .neq("created_by_browser_id", "__legend__")
        .ilike("name", `%${q}%`) // .ilike() uses SQL-style % wildcards
        .order("created_at", { ascending: false })
        .limit(limit),
      // roster_json is a jsonb array of player entries (name + NBA team). Cast to
      // text so a single ILIKE catches both player names and NBA team names.
      // .filter() is raw PostgREST, where * is the wildcard (not %).
      supabase
        .from("public_teams")
        .select(SELECT)
        .neq("created_by_browser_id", "__legend__")
        .filter("roster_json::text", "ilike", `*${q}*`)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (byName.error) throw byName.error;
    if (byRoster.error) throw byRoster.error;

    const merged = new Map<string, TeamPick>();
    for (const t of [...(byName.data ?? []), ...(byRoster.data ?? [])] as TeamPick[]) {
      if (!merged.has(t.id)) merged.set(t.id, t);
    }
    const teams = [...merged.values()]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);

    return NextResponse.json({ teams });
  } catch (e) {
    console.error("[matchup search]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to search teams", detail }, { status: 500 });
  }
}
