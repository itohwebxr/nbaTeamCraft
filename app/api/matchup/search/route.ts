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
// Pool size scanned in-process for player / NBA-team substring matching. Small
// scale, so a JS filter over recent teams is simpler and far more robust than
// fragile jsonb-text casting inside PostgREST.
const POOL = 300;

// GET /api/matchup/search?q=...&limit=10
// Empty q -> latest teams (Dream Draft + Roster Builder mixed). With q, matches
// on team name, player name, or NBA team name. Returns { teams, hasMore }.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 25);

    const supabase = createServerClient();

    if (!q) {
      // Fetch one extra to tell whether more exist beyond the shown list.
      const { data, error } = await supabase
        .from("public_teams")
        .select(SELECT)
        .neq("created_by_browser_id", "__legend__")
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (error) throw error;
      const rows = (data ?? []) as TeamPick[];
      return NextResponse.json({ teams: rows.slice(0, limit), hasMore: rows.length > limit });
    }

    const needle = q.toLowerCase();

    // 1) NBA team name / abbreviation -> matching team_ids (used to match a team
    //    by one of its players' real NBA team).
    const { data: nbaTeams } = await supabase
      .from("teams")
      .select("id")
      .or(`name.ilike.%${q}%,abbreviation.ilike.%${q}%`);
    const matchingTeamIds = new Set((nbaTeams ?? []).map((t) => t.id as string));

    // 2) Scan a recent pool and filter in JS by team name, player name, or the
    //    player's NBA team id.
    const { data: pool, error } = await supabase
      .from("public_teams")
      .select(`${SELECT}, roster_json, metadata`)
      .neq("created_by_browser_id", "__legend__")
      .order("created_at", { ascending: false })
      .limit(POOL);
    if (error) throw error;

    type PoolRow = TeamPick & {
      roster_json: { name: string }[];
      metadata: { players?: { name: string; team: string }[] } | null;
    };

    const matched: TeamPick[] = [];
    for (const row of (pool ?? []) as PoolRow[]) {
      const nameHit = row.name?.toLowerCase().includes(needle);
      const players = row.metadata?.players ?? [];
      const rosterNames = row.roster_json ?? [];
      const playerHit =
        rosterNames.some((p) => p.name?.toLowerCase().includes(needle)) ||
        players.some((p) => p.name?.toLowerCase().includes(needle));
      const nbaTeamHit =
        matchingTeamIds.size > 0 && players.some((p) => matchingTeamIds.has(p.team));

      if (nameHit || playerHit || nbaTeamHit) {
        matched.push({
          id: row.id,
          name: row.name,
          overall: row.overall,
          tier: row.tier,
          is_sandbox: row.is_sandbox,
          created_at: row.created_at,
        });
      }
    }

    return NextResponse.json({
      teams: matched.slice(0, limit),
      hasMore: matched.length > limit,
    });
  } catch (e) {
    console.error("[matchup search]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to search teams", detail }, { status: 500 });
  }
}
