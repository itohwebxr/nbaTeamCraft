import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { PlayerSeason, RosterEntry, RosterSlot, Position } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/public-teams/[id]/roster
// Reconstructs the full RosterEntry[] (with complete PlayerSeason data) for a
// saved public team, so the client can seed the Roster Builder for a "remix".
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: team, error: teamErr } = await supabase
      .from("public_teams")
      .select("name, roster_json, metadata")
      .eq("id", id)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const metaPlayers: { playerId: string; name: string; season: string }[] =
      team.metadata?.players ?? [];
    const rosterItems: { slot: RosterSlot; name: string; season: string; assignedPosition: Position }[] =
      team.roster_json ?? [];

    if (metaPlayers.length === 0) {
      return NextResponse.json({ error: "Team has no roster metadata" }, { status: 422 });
    }

    const nbaIds = [...new Set(metaPlayers.map((p) => p.playerId))];
    const seasons = [...new Set(metaPlayers.map((p) => p.season))];

    // Fetch candidate player_seasons, then narrow to exact (nba_player_id, season) pairs.
    const { data: seasonRows, error: seasonErr } = await supabase
      .from("player_seasons")
      .select(`
        id, player_id, team_id, season,
        ppg, rpg, apg, spg, bpg, mpg,
        overall, cost,
        players!inner ( id, nba_player_id, name ),
        player_season_positions ( position, is_primary )
      `)
      .in("season", seasons)
      .in("players.nba_player_id", nbaIds);

    if (seasonErr) {
      return NextResponse.json({ error: seasonErr.message }, { status: 500 });
    }

    // Index by `${nba_player_id}|${season}` for exact lookup.
    const byKey = new Map<string, PlayerSeason>();
    for (const row of (seasonRows ?? []) as any[]) {
      const ps: PlayerSeason = {
        id: row.id,
        player_id: row.player_id,
        team_id: row.team_id,
        season: row.season,
        name: row.players.name,
        nba_player_id: row.players.nba_player_id,
        positions: row.player_season_positions ?? [],
        ppg: row.ppg, rpg: row.rpg, apg: row.apg,
        spg: row.spg, bpg: row.bpg, mpg: row.mpg,
        overall: row.overall, cost: row.cost,
      };
      byKey.set(`${ps.nba_player_id}|${ps.season}`, ps);
    }

    // Build RosterEntry[], pulling slot/assignedPosition from roster_json
    // (matched by name+season) and the full PlayerSeason from the DB.
    const roster: RosterEntry[] = [];
    for (const mp of metaPlayers) {
      const playerSeason = byKey.get(`${mp.playerId}|${mp.season}`);
      if (!playerSeason) continue;
      const item = rosterItems.find(
        (r) => r.name === mp.name && r.season === mp.season
      );
      roster.push({
        playerSeason,
        slot: item?.slot ?? (playerSeason.positions[0]?.position as RosterSlot) ?? "BENCH1",
        assignedPosition:
          item?.assignedPosition ??
          (playerSeason.positions.find((p) => p.is_primary)?.position ??
            playerSeason.positions[0]?.position ??
            "PG") as Position,
      });
    }

    if (roster.length === 0) {
      return NextResponse.json({ error: "Could not resolve any players" }, { status: 422 });
    }

    return NextResponse.json({ name: team.name, roster });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load roster" }, { status: 500 });
  }
}
