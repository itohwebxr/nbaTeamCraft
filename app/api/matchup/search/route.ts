import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type TeamPick = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  is_sandbox: boolean;
  is_historical?: boolean;
  created_at: string;
};

const SELECT = "id, name, overall, tier, is_sandbox, created_at";
const LEGEND = "__legend__";
const HISTORICAL = "__historical__";
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
      // Default suggestion list: user-made teams only. Legend and historical
      // (real NBA) teams are surfaced exclusively via explicit search.
      // Fetch one extra to tell whether more exist beyond the shown list.
      const { data, error } = await supabase
        .from("public_teams")
        .select(SELECT)
        .not("created_by_browser_id", "in", `(${LEGEND},${HISTORICAL})`)
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (error) throw error;
      const rows = (data ?? []) as TeamPick[];
      return NextResponse.json({ teams: rows.slice(0, limit), hasMore: rows.length > limit });
    }

    // Normalize season notation: "2025-2026" or "2025/26" → "2025-26" so
    // users can type either style and still match historical team names.
    const normQ = q.replace(/(\d{4})[-\/]20(\d{2})/g, "$1-$2").replace(/(\d{4})[-\/](\d{4})/g, (_, y1, y2) => `${y1}-${y2.slice(2)}`);
    const needle = normQ.toLowerCase();

    // 1) NBA team name / abbreviation -> matching team_ids (used to match a team
    //    by one of its players' real NBA team).
    const { data: nbaTeams } = await supabase
      .from("teams")
      .select("id")
      .or(`name.ilike.%${q}%,abbreviation.ilike.%${q}%`);
    const matchingTeamIds = new Set((nbaTeams ?? []).map((t) => t.id as string));

    type PoolRow = TeamPick & {
      roster_json: { name: string }[];
      metadata: { players?: { name: string; team: string }[] } | null;
    };

    const rowMatches = (row: PoolRow): boolean => {
      const nameHit = row.name?.toLowerCase().includes(needle);
      const players = row.metadata?.players ?? [];
      const rosterNames = row.roster_json ?? [];
      const playerHit =
        rosterNames.some((p) => p.name?.toLowerCase().includes(needle)) ||
        players.some((p) => p.name?.toLowerCase().includes(needle));
      const nbaTeamHit =
        matchingTeamIds.size > 0 && players.some((p) => matchingTeamIds.has(p.team));
      return !!(nameHit || playerHit || nbaTeamHit);
    };

    // 2) User-made teams: scan a recent pool and filter in JS.
    const { data: userPool, error } = await supabase
      .from("public_teams")
      .select(`${SELECT}, roster_json, metadata`)
      .not("created_by_browser_id", "in", `(${LEGEND},${HISTORICAL})`)
      .order("created_at", { ascending: false })
      .limit(POOL);
    if (error) throw error;

    // 3) Historical (real NBA) teams: queried separately so their bulk doesn't
    //    crowd the user pool. Bounded set (≈one row per real team), so a full
    //    JS scan is fine.
    const { data: histPool, error: histErr } = await supabase
      .from("public_teams")
      .select(`${SELECT}, roster_json, metadata`)
      .eq("created_by_browser_id", HISTORICAL)
      .limit(2000);
    if (histErr) throw histErr;

    const toPick = (row: PoolRow, historical: boolean): TeamPick => ({
      id: row.id,
      name: row.name,
      overall: row.overall,
      tier: row.tier,
      is_sandbox: row.is_sandbox,
      is_historical: historical,
      created_at: row.created_at,
    });

    const userMatches = ((userPool ?? []) as PoolRow[]).filter(rowMatches).map((r) => toPick(r, false));
    const histMatches = ((histPool ?? []) as PoolRow[])
      .filter(rowMatches)
      .sort((a, b) => b.overall - a.overall)
      .map((r) => toPick(r, true));

    // User-made teams first, then real NBA teams (strongest first).
    const matched = [...userMatches, ...histMatches];

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
