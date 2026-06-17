import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { simulateGame, SimTeam, SimPlayer } from "@/lib/simulateGame";
import { PublicTeam } from "@/types";

export const dynamic = "force-dynamic";

const SERIES_TARGET = 4; // wins needed to take a best-of-7 series

// POST /api/matchup/simulate
// Body: { homeTeamId, awayTeamId, mode: "single" | "series" }
// Simulates a head-to-head between two saved teams (Dream Draft or Roster
// Builder). "series" plays out until one side wins 4 games.
export async function POST(req: NextRequest) {
  try {
    const { homeTeamId, awayTeamId, mode = "single" } = await req.json();

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: "Missing team ids" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Resolve "__random__" sentinel: pick a random public_teams row that is
    // neither a legend nor the other team.
    async function resolveId(id: string, excludeId: string): Promise<string> {
      if (id !== "__random__") return id;
      const { data } = await supabase
        .from("public_teams")
        .select("id")
        .neq("id", excludeId)
        .neq("created_by_browser_id", "__legend__")
        .limit(300);
      const rows = (data ?? []) as { id: string }[];
      if (rows.length === 0) throw new Error("No teams available for random pick");
      return rows[Math.floor(Math.random() * rows.length)].id;
    }

    const resolvedHomeId = await resolveId(homeTeamId, awayTeamId);
    const resolvedAwayId = await resolveId(awayTeamId, resolvedHomeId);

    if (resolvedHomeId === resolvedAwayId) {
      return NextResponse.json({ error: "Pick two different teams" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("public_teams")
      .select("*")
      .in("id", [resolvedHomeId, resolvedAwayId]);
    if (error) throw error;

    const rows = (data ?? []) as PublicTeam[];
    const homeRow = rows.find((t) => t.id === resolvedHomeId);
    const awayRow = rows.find((t) => t.id === resolvedAwayId);
    if (!homeRow || !awayRow) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const [homeTeam, awayTeam] = await Promise.all([
      toSimTeam(supabase, homeRow),
      toSimTeam(supabase, awayRow),
    ]);

    const meta = {
      home: { id: homeRow.id, name: homeRow.name, overall: homeRow.overall, tier: homeRow.tier },
      away: { id: awayRow.id, name: awayRow.name, overall: awayRow.overall, tier: awayRow.tier },
    };

    if (mode === "series") {
      const games = [];
      const wins = { home: 0, away: 0 };
      let g = 0;
      while (wins.home < SERIES_TARGET && wins.away < SERIES_TARGET) {
        const seed = `${resolvedHomeId}|${resolvedAwayId}|g${g}|${Date.now()}|${Math.random()}`;
        const result = simulateGame(homeTeam, awayTeam, seed);
        if (result.winner === "home") wins.home++;
        else wins.away++;
        games.push(result);
        g++;
        if (g > 7) break; // safety
      }
      const seriesWinner = wins.home > wins.away ? "home" : "away";
      return NextResponse.json({
        mode: "series",
        ...meta,
        games,
        seriesWins: wins,
        seriesWinner,
      });
    }

    const seed = `${resolvedHomeId}|${resolvedAwayId}|${crypto.randomUUID()}`;
    const result = simulateGame(homeTeam, awayTeam, seed);
    return NextResponse.json({ mode: "single", ...meta, result });
  } catch (e) {
    console.error("[matchup simulate]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to simulate matchup", detail }, { status: 500 });
  }
}

async function toSimTeam(
  supabase: ReturnType<typeof createServerClient>,
  team: PublicTeam
): Promise<SimTeam> {
  const players = await resolvePlayers(supabase, team);
  return {
    name: team.name,
    evaluation: {
      overall: team.overall,
      offense: team.offense,
      defense: team.defense,
      rebound: team.rebound,
      playmaking: team.playmaking,
    },
    players,
  };
}

// Resolve per-game stats from player_seasons via metadata; falls back to
// overall-based synthesis in the engine when a player can't be matched.
async function resolvePlayers(
  supabase: ReturnType<typeof createServerClient>,
  team: PublicTeam
): Promise<SimPlayer[]> {
  const meta = team.metadata?.players ?? [];
  const teamIds = [...new Set(meta.map((p) => p.team))].filter(Boolean);

  const statsByKey = new Map<string, { ppg: number; rpg: number; apg: number; spg: number; bpg: number }>();
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

  return team.roster_json.map((item) => {
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
