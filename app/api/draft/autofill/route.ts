import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { PlayerSeason, Position, BENCH_SLOTS } from "@/types";

export const dynamic = "force-dynamic";

// POST /api/draft/autofill
// Fills the remaining roster slots with the best-available players so a partial
// sandbox build can jump straight to results. Best-available = highest overall,
// matched to the vacant starter position where possible, excluding already
// drafted players. Respects the sandbox season / team filter when set.
//
// Body: { vacantStarters: Position[], vacantBenchCount: number,
//         draftedPlayerIds: string[], season?: string, teamAbbr?: string }
// Returns: { picks: { playerSeason, slot, assignedPosition }[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shape(row: any): PlayerSeason {
  return {
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
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const vacantStarters: Position[] = body.vacantStarters ?? [];
    const vacantBenchCount: number = body.vacantBenchCount ?? 0;
    const draftedPlayerIds: string[] = body.draftedPlayerIds ?? [];
    const season: string | undefined = body.season || undefined;
    const teamAbbr: string | undefined = body.teamAbbr || undefined;

    if (vacantStarters.length === 0 && vacantBenchCount === 0) {
      return NextResponse.json({ picks: [] });
    }

    const supabase = createServerClient();

    // Resolve the team filter (sandbox) to team ids if a specific team is set.
    let teamIds: string[] | null = null;
    if (teamAbbr) {
      let tq = supabase.from("teams").select("id").eq("abbreviation", teamAbbr);
      if (season) tq = tq.eq("season", season);
      const { data: teams } = await tq;
      teamIds = (teams ?? []).map((t) => t.id as string);
    }

    let q = supabase
      .from("player_seasons")
      .select(`
        id, player_id, team_id, season,
        ppg, rpg, apg, spg, bpg, mpg, overall, cost,
        players!inner ( id, nba_player_id, name ),
        player_season_positions ( position, is_primary )
      `)
      .order("overall", { ascending: false })
      .limit(600);
    if (season) q = q.eq("season", season);
    if (teamIds && teamIds.length > 0) q = q.in("team_id", teamIds);

    const { data, error } = await q;
    if (error) throw error;

    // Dedupe by player (highest overall kept, since ordered desc).
    const seen = new Set<string>();
    const pool: PlayerSeason[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const ps = shape(row);
      if (seen.has(ps.nba_player_id)) continue;
      seen.add(ps.nba_player_id);
      pool.push(ps);
    }

    const used = new Set<string>(draftedPlayerIds);
    const picks: { playerSeason: PlayerSeason; slot: string; assignedPosition: Position }[] = [];

    const takeBest = (pos?: Position): PlayerSeason | undefined => {
      if (pos) {
        const match = pool.find(
          (p) => !used.has(p.nba_player_id) && p.positions.some((pp) => pp.position === pos)
        );
        if (match) return match;
      }
      return pool.find((p) => !used.has(p.nba_player_id));
    };

    for (const pos of vacantStarters) {
      const pick = takeBest(pos);
      if (!pick) continue;
      used.add(pick.nba_player_id);
      picks.push({ playerSeason: pick, slot: pos, assignedPosition: pos });
    }

    const benchSlot = BENCH_SLOTS[0];
    for (let i = 0; i < vacantBenchCount; i++) {
      const pick = takeBest();
      if (!pick) break;
      used.add(pick.nba_player_id);
      const ap = (pick.positions.find((pp) => pp.is_primary)?.position ??
        pick.positions[0]?.position ??
        "SF") as Position;
      picks.push({ playerSeason: pick, slot: benchSlot, assignedPosition: ap });
    }

    return NextResponse.json({ picks });
  } catch (e) {
    console.error("autofill error:", e);
    return NextResponse.json({ error: "Failed to auto-fill" }, { status: 500 });
  }
}
