import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { simulateGame, SimTeam, SimPlayer } from "@/lib/simulateGame";
import { RosterEntry, PublicTeam, TeamEvaluation } from "@/types";

export const dynamic = "force-dynamic";

// POST /api/exhibition
// Body: { roster: RosterEntry[], evaluation: TeamEvaluation, teamName: string, excludeOpponentIds?: string[] }
// Picks a random opponent from public_teams, simulates a game and returns the result.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roster,
      evaluation,
      teamName,
      excludeOpponentIds = [],
    }: {
      roster: RosterEntry[];
      evaluation: TeamEvaluation;
      teamName?: string;
      excludeOpponentIds?: string[];
    } = body;

    if (!roster?.length || !evaluation) {
      return NextResponse.json({ error: "Missing roster or evaluation" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Build opponent pool: legend teams + recent ranked teams (user-created)
    const [legendRes, recentRes] = await Promise.all([
      supabase.from("public_teams").select("*").eq("created_by_browser_id", "__legend__"),
      supabase.from("public_teams").select("*")
        .neq("created_by_browser_id", "__legend__")
        .order("created_at", { ascending: false })
        .limit(150),
    ]);
    if (legendRes.error) throw legendRes.error;

    let pool = ([...(legendRes.data ?? []), ...(recentRes.data ?? [])]) as PublicTeam[];
    const filtered = pool.filter((t) => !excludeOpponentIds.includes(t.id));
    if (filtered.length > 0) pool = filtered;

    if (pool.length === 0) {
      return NextResponse.json({ error: "No opponents available" }, { status: 404 });
    }

    const opponent = pool[Math.floor(Math.random() * pool.length)];

    // Resolve opponent player stats from player_seasons via metadata
    const oppPlayers = await resolveOpponentPlayers(supabase, opponent);

    const userTeam: SimTeam = {
      name: teamName || "My Team",
      evaluation,
      players: roster.map((e) => ({
        name: e.playerSeason.name,
        slot: e.slot,
        position: e.assignedPosition,
        overall: e.playerSeason.overall,
        ppg: e.playerSeason.ppg ?? 0,
        rpg: e.playerSeason.rpg ?? 0,
        apg: e.playerSeason.apg ?? 0,
        spg: e.playerSeason.spg ?? 0,
        bpg: e.playerSeason.bpg ?? 0,
      })),
    };

    const oppTeam: SimTeam = {
      name: opponent.name,
      evaluation: {
        overall: opponent.overall,
        offense: opponent.offense,
        defense: opponent.defense,
        rebound: opponent.rebound,
        playmaking: opponent.playmaking,
      },
      players: oppPlayers,
    };

    // Fresh seed per exhibition — every match plays out differently
    const seed = crypto.randomUUID();
    const result = simulateGame(userTeam, oppTeam, seed);

    return NextResponse.json({
      seed,
      opponent: {
        id: opponent.id,
        name: opponent.name,
        overall: opponent.overall,
        tier: opponent.tier,
        isLegend: opponent.created_by_browser_id === "__legend__",
      },
      result,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to simulate match" }, { status: 500 });
  }
}

async function resolveOpponentPlayers(
  supabase: ReturnType<typeof createServerClient>,
  opponent: PublicTeam
): Promise<SimPlayer[]> {
  const meta = opponent.metadata?.players ?? [];
  const teamIds = [...new Set(meta.map((p) => p.team))].filter(Boolean);

  // Fetch real per-game stats; fall back to overall-based synthesis in the
  // engine when a player can't be matched (ppg=0 triggers the fallback).
  let statsByKey = new Map<string, { ppg: number; rpg: number; apg: number; spg: number; bpg: number }>();
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("player_seasons")
      .select("season, ppg, rpg, apg, spg, bpg, players!inner ( nba_player_id )")
      .in("team_id", teamIds);
    for (const row of (data ?? []) as unknown as Array<{
      season: string; ppg: number; rpg: number; apg: number; spg: number; bpg: number;
      players: { nba_player_id: string };
    }>) {
      statsByKey.set(`${row.players.nba_player_id}|${row.season}`, row);
    }
  }

  return opponent.roster_json.map((item) => {
    const m = meta.find((p) => p.name === item.name && p.season === item.season);
    const stats = m ? statsByKey.get(`${m.playerId}|${m.season}`) : undefined;
    return {
      name: item.name,
      slot: item.slot,
      position: item.assignedPosition,
      overall: item.overall,
      ppg: stats?.ppg ?? 0,
      rpg: stats?.rpg ?? 0,
      apg: stats?.apg ?? 0,
      spg: stats?.spg ?? 0,
      bpg: stats?.bpg ?? 0,
    };
  });
}
