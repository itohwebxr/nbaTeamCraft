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
// Pool size scanned in-process for player / NBA-team substring matching.
const POOL = 300;

type Filter = "all" | "real" | "built";

// GET /api/matchup/search?q=...&limit=20&filter=all|real|built
// filter: "all" = real NBA + user-made mixed (user-made first), "real" =
// historical NBA teams only, "built" = user-made (Dream Draft + Roster
// Builder) only. Empty q -> a browseable list; with q, matches on team name,
// player name, or NBA team name. Returns { teams, hasMore }.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 200);
    const filterParam = (searchParams.get("filter") ?? "all") as Filter;
    const filter: Filter = ["all", "real", "built"].includes(filterParam) ? filterParam : "all";

    const includeUser = filter === "all" || filter === "built";
    const includeHist = filter === "all" || filter === "real";

    const supabase = createServerClient();

    // ── Empty query: browseable list (no needle matching) ──────────────
    if (!q) {
      const fetchUser = async (): Promise<TeamPick[]> => {
        if (!includeUser) return [];
        const { data } = await supabase
          .from("public_teams")
          .select(SELECT)
          .not("created_by_browser_id", "in", `(${LEGEND},${HISTORICAL})`)
          .order("created_at", { ascending: false })
          .limit(limit + 1);
        return ((data ?? []) as TeamPick[]).map((r) => ({ ...r, is_historical: false }));
      };
      const fetchHist = async (): Promise<TeamPick[]> => {
        if (!includeHist) return [];
        const { data } = await supabase
          .from("public_teams")
          .select(SELECT)
          .eq("created_by_browser_id", HISTORICAL)
          .order("overall", { ascending: false })
          .limit(limit + 1);
        return ((data ?? []) as TeamPick[]).map((r) => ({ ...r, is_historical: true }));
      };

      const [userRows, histRows] = await Promise.all([fetchUser(), fetchHist()]);
      // User-made first, then real NBA teams (strongest first).
      const combined = [...userRows, ...histRows];
      return NextResponse.json({ teams: combined.slice(0, limit), hasMore: combined.length > limit });
    }

    // ── Query present: match on name / player / NBA team ───────────────
    const normQ = q
      .replace(/(\d{4})[-\/]20(\d{2})/g, "$1-$2")
      .replace(/(\d{4})[-\/](\d{4})/g, (_, y1, y2) => `${y1}-${y2.slice(2)}`);
    const needle = normQ.toLowerCase();

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

    const toPick = (row: PoolRow, historical: boolean): TeamPick => ({
      id: row.id,
      name: row.name,
      overall: row.overall,
      tier: row.tier,
      is_sandbox: row.is_sandbox,
      is_historical: historical,
      created_at: row.created_at,
    });

    let userMatches: TeamPick[] = [];
    let histMatches: TeamPick[] = [];

    if (includeUser) {
      const { data: userPool, error } = await supabase
        .from("public_teams")
        .select(`${SELECT}, roster_json, metadata`)
        .not("created_by_browser_id", "in", `(${LEGEND},${HISTORICAL})`)
        .order("created_at", { ascending: false })
        .limit(POOL);
      if (error) throw error;
      userMatches = ((userPool ?? []) as PoolRow[]).filter(rowMatches).map((r) => toPick(r, false));
    }

    if (includeHist) {
      const { data: histPool, error: histErr } = await supabase
        .from("public_teams")
        .select(`${SELECT}, roster_json, metadata`)
        .eq("created_by_browser_id", HISTORICAL)
        .limit(2000);
      if (histErr) throw histErr;
      histMatches = ((histPool ?? []) as PoolRow[])
        .filter(rowMatches)
        .sort((a, b) => b.overall - a.overall)
        .map((r) => toPick(r, true));
    }

    const matched = [...userMatches, ...histMatches];
    return NextResponse.json({ teams: matched.slice(0, limit), hasMore: matched.length > limit });
  } catch (e) {
    console.error("[matchup search]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to search teams", detail }, { status: 500 });
  }
}
