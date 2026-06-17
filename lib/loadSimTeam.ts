import { createServerClient } from "@/lib/supabase";
import { simulateGame, SimTeam, SimPlayer, GameResult } from "@/lib/simulateGame";
import { PublicTeam } from "@/types";

export type { SimTeam, SimPlayer, GameResult };

export type TeamMeta = {
  id: string;
  name: string;
  overall: number;
  tier: string;
};

export async function loadSimTeam(
  supabase: ReturnType<typeof createServerClient>,
  teamId: string
): Promise<{ meta: TeamMeta; simTeam: SimTeam }> {
  const { data, error } = await supabase
    .from("public_teams")
    .select("*")
    .eq("id", teamId)
    .single();
  if (error || !data) throw new Error(`Team not found: ${teamId}`);
  const row = data as PublicTeam;
  return {
    meta: { id: row.id, name: row.name, overall: row.overall, tier: row.tier },
    simTeam: await toSimTeam(supabase, row),
  };
}

async function toSimTeam(
  supabase: ReturnType<typeof createServerClient>,
  team: PublicTeam
): Promise<SimTeam> {
  return {
    name: team.name,
    evaluation: {
      overall: team.overall,
      offense: team.offense,
      defense: team.defense,
      rebound: team.rebound,
      playmaking: team.playmaking,
    },
    players: await resolvePlayers(supabase, team),
  };
}

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

// Simulate a best-of-7 series between two already-loaded SimTeams.
export type SeriesResult = {
  games: GameResult[];
  wins: { home: number; away: number };
  winner: "home" | "away";
};

export function simulateSeries(
  home: SimTeam,
  homeId: string,
  away: SimTeam,
  awayId: string,
  seriesKey: string
): SeriesResult {
  const SERIES_TARGET = 4;
  const games: GameResult[] = [];
  const wins = { home: 0, away: 0 };
  let g = 0;
  while (wins.home < SERIES_TARGET && wins.away < SERIES_TARGET) {
    const seed = `${homeId}|${awayId}|${seriesKey}|g${g}|${Date.now()}|${Math.random()}`;
    const result = simulateGame(home, away, seed);
    if (result.winner === "home") wins.home++;
    else wins.away++;
    games.push(result);
    g++;
    if (g > 7) break;
  }
  return { games, wins, winner: wins.home > wins.away ? "home" : "away" };
}
