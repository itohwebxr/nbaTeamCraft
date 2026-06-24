// Admin-only route to seed every real NBA team (1976–2026) into public_teams
// as ready-made simulator opponents. Source NBA data (teams / players /
// player_seasons) is only READ — nothing is mutated. Generated rows are tagged
// with created_by_browser_id = "__historical__" so they can be excluded from
// the simulator's default suggestion list and only surfaced on explicit search.
//
// Protected by ADMIN_SECRET. The job is idempotent and batched so it can be
// called repeatedly without timing out:
//   POST /api/admin/seed-historical?batch=50
//   Headers: { "x-admin-secret": "<ADMIN_SECRET>" }
// Returns per-team status plus how many teams remain unseeded.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { calcTeamEvaluation } from "@/lib/evaluate";
import {
  RosterEntry,
  PlayerSeason,
  PlayerSeasonPosition,
  StarterSlot,
  STARTER_SLOTS,
} from "@/types";

export const dynamic = "force-dynamic";

const MARKER = "__historical__";

// Assign 6 players to roster slots: best player per primary position first,
// remaining starter slots filled by best available, then the top leftover as
// the 6th man. (Mirrors the legend-seeding logic.)
function buildRoster(players: PlayerSeason[]): RosterEntry[] | null {
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const slots: Record<string, RosterEntry> = {};
  const used = new Set<string>();

  for (const p of sorted) {
    if (used.has(p.id)) continue;
    const primary = p.positions.find((pos) => pos.is_primary)?.position;
    if (primary && STARTER_SLOTS.includes(primary as StarterSlot) && !slots[primary]) {
      slots[primary] = { playerSeason: p, slot: primary as StarterSlot, assignedPosition: primary as StarterSlot };
      used.add(p.id);
    }
  }

  for (const slot of STARTER_SLOTS) {
    if (slots[slot]) continue;
    for (const p of sorted) {
      if (!used.has(p.id)) {
        slots[slot] = { playerSeason: p, slot, assignedPosition: slot };
        used.add(p.id);
        break;
      }
    }
  }

  let benchEntry: RosterEntry | null = null;
  for (const p of sorted) {
    if (!used.has(p.id)) {
      const pos = p.positions[0]?.position ?? "PG";
      benchEntry = { playerSeason: p, slot: "BENCH1", assignedPosition: pos };
      break;
    }
  }

  const rosterEntries = STARTER_SLOTS.map((s) => slots[s]).filter(Boolean) as RosterEntry[];
  if (rosterEntries.length < 5) return null;
  if (benchEntry) rosterEntries.push(benchEntry);
  return rosterEntries;
}

function generateId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (const byte of arr) id += chars[byte % chars.length];
  return id;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = Math.min(Math.max(Number(req.nextUrl.searchParams.get("batch")) || 50, 1), 200);
  const supabase = createServerClient();

  // Population stats for team evaluation (rotation players only).
  const { data: popData, error: popErr } = await supabase
    .from("player_seasons")
    .select("ppg, rpg, apg, spg, bpg")
    .gte("mpg", 20);
  if (popErr) return NextResponse.json({ error: popErr.message }, { status: 500 });

  const pop = popData ?? [];
  const population = {
    ppg: pop.map((p) => p.ppg as number),
    rpg: pop.map((p) => p.rpg as number),
    apg: pop.map((p) => p.apg as number),
    spg: pop.map((p) => p.spg as number),
    bpg: pop.map((p) => p.bpg as number),
  };

  // All real teams, oldest first for stable progress across batched calls.
  const { data: allTeams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, abbreviation, season")
    .order("season", { ascending: true })
    .order("name", { ascending: true });
  if (teamsErr) return NextResponse.json({ error: teamsErr.message }, { status: 500 });

  // Names already seeded -> skip (idempotent / resumable).
  const { data: seeded } = await supabase
    .from("public_teams")
    .select("name")
    .eq("created_by_browser_id", MARKER);
  const seededNames = new Set((seeded ?? []).map((r) => r.name as string));

  const pending = (allTeams ?? []).filter((t) => !seededNames.has(t.name as string));
  const batch = pending.slice(0, batchSize);

  const results: { name: string; status: string; overall?: number; tier?: string }[] = [];

  for (const team of batch) {
    const { data: seasonRows, error: playerErr } = await supabase
      .from("player_seasons")
      .select(`
        id, player_id, team_id, season, ppg, rpg, apg, spg, bpg, mpg, overall, cost,
        players!inner ( id, nba_player_id, name ),
        player_season_positions ( position, is_primary )
      `)
      .eq("team_id", team.id)
      .order("overall", { ascending: false });

    if (playerErr || !seasonRows?.length) {
      results.push({ name: team.name as string, status: "error: no players found" });
      continue;
    }

    const players: PlayerSeason[] = (seasonRows as unknown as Array<{
      id: string; player_id: string; team_id: string; season: string;
      ppg: number; rpg: number; apg: number; spg: number; bpg: number; mpg: number;
      overall: number; cost: number;
      players: { id: string; nba_player_id: string; name: string };
      player_season_positions: { position: string; is_primary: boolean }[];
    }>).map((row) => ({
      id: row.id,
      player_id: row.player_id,
      team_id: row.team_id,
      season: row.season,
      name: row.players.name,
      nba_player_id: row.players.nba_player_id,
      positions: (row.player_season_positions ?? []) as PlayerSeasonPosition[],
      ppg: row.ppg,
      rpg: row.rpg,
      apg: row.apg,
      spg: row.spg,
      bpg: row.bpg,
      mpg: row.mpg,
      overall: row.overall,
      cost: row.cost,
    }));

    const roster = buildRoster(players);
    if (!roster) {
      results.push({ name: team.name as string, status: "error: could not build roster" });
      continue;
    }

    const evaluation = calcTeamEvaluation(roster, population);

    const roster_json = roster.map((e) => ({
      slot: e.slot,
      name: e.playerSeason.name,
      season: e.playerSeason.season,
      overall: e.playerSeason.overall,
      assignedPosition: e.assignedPosition,
    }));

    const metadata = {
      players: roster.map((e) => ({
        playerId: e.playerSeason.nba_player_id,
        name: e.playerSeason.name,
        season: e.playerSeason.season,
        team: e.playerSeason.team_id,
      })),
    };

    // public_teams.share_id FKs to shares(id) — create a real shares row first.
    const id = generateId();
    const shareId = `hist_${id}`;
    const shareData: Record<string, string> = {
      name: team.name as string,
      overall: String(evaluation.overall),
      tier: evaluation.tier,
    };
    for (const e of roster_json) {
      const key = e.slot === "BENCH1" ? "6th" : e.slot.toLowerCase();
      shareData[key] = e.name;
      shareData[`${key}_s`] = e.season;
    }
    const { error: shareErr } = await supabase.from("shares").insert({ id: shareId, data: shareData });
    if (shareErr) {
      results.push({ name: team.name as string, status: `error: ${shareErr.message}` });
      continue;
    }

    const { error: insertErr } = await supabase.from("public_teams").insert({
      id,
      share_id: shareId,
      name: team.name as string,
      overall: evaluation.overall,
      tier: evaluation.tier,
      offense: evaluation.offense,
      defense: evaluation.defense,
      rebound: evaluation.rebound,
      playmaking: evaluation.playmaking,
      roster_json,
      metadata,
      created_by_browser_id: MARKER,
    });

    if (insertErr) {
      await supabase.from("shares").delete().eq("id", shareId);
      results.push({ name: team.name as string, status: `error: ${insertErr.message}` });
    } else {
      results.push({ name: team.name as string, status: "seeded", overall: evaluation.overall, tier: evaluation.tier });
    }
  }

  const seededCount = results.filter((r) => r.status === "seeded").length;
  return NextResponse.json({
    processed: batch.length,
    seeded: seededCount,
    remaining: pending.length - batch.length,
    total: (allTeams ?? []).length,
    results,
  });
}
