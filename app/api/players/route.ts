import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { PlayerSeason } from "@/types";

// GET /api/players?teamId=xxx
// Returns all players for a given team, with positions joined
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: seasons, error: seasonsErr } = await supabase
    .from("player_seasons")
    .select(`
      id,
      player_id,
      team_id,
      season,
      ppg, rpg, apg, spg, bpg, mpg,
      overall, cost,
      players!inner (
        id,
        nba_player_id,
        name
      ),
      player_season_positions (
        position,
        is_primary
      )
    `)
    .eq("team_id", teamId)
    .order("overall", { ascending: false });

  if (seasonsErr) {
    return NextResponse.json({ error: seasonsErr.message }, { status: 500 });
  }

  // Shape into PlayerSeason[]
  const players: PlayerSeason[] = (seasons ?? []).map((row: any) => ({
    id: row.id,
    player_id: row.player_id,
    team_id: row.team_id,
    season: row.season,
    name: row.players.name,
    nba_player_id: row.players.nba_player_id,
    positions: row.player_season_positions ?? [],
    ppg: row.ppg,
    rpg: row.rpg,
    apg: row.apg,
    spg: row.spg,
    bpg: row.bpg,
    mpg: row.mpg,
    overall: row.overall,
    cost: row.cost,
  }));

  return NextResponse.json(players);
}
