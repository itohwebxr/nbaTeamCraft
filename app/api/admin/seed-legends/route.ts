// Admin-only route to seed legendary historical teams into public_teams.
// Protected by ADMIN_SECRET env var. Run once after deploying Phase 1.
//
// Usage: POST /api/admin/seed-legends
//   Headers: { "x-admin-secret": "<ADMIN_SECRET>" }
// Returns: list of seeded team names and any errors.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { calcTeamEvaluation } from "@/lib/evaluate";
import {
  RosterEntry,
  PlayerSeason,
  StarterSlot,
  STARTER_SLOTS,
} from "@/types";

export const dynamic = "force-dynamic";

// Legend team definitions — abbreviation + season identify the exact team in DB.
const LEGEND_TEAMS: { abbr: string; season: string; label: string }[] = [
  { abbr: "LAL", season: "2001-02", label: "01-02 Lakers" },
  { abbr: "DET", season: "2003-04", label: "03-04 Pistons" },
  { abbr: "MIA", season: "2005-06", label: "05-06 Heat" },
  { abbr: "BOS", season: "2007-08", label: "07-08 Celtics" },
  { abbr: "HOU", season: "2007-08", label: "07-08 Rockets" },
  { abbr: "CLE", season: "2008-09", label: "08-09 Cavaliers" },
  { abbr: "OKC", season: "2011-12", label: "11-12 Thunder" },
  { abbr: "MIA", season: "2012-13", label: "12-13 Heat" },
  { abbr: "SAS", season: "2013-14", label: "13-14 Spurs" },
  { abbr: "GSW", season: "2015-16", label: "15-16 Warriors" },
  { abbr: "GSW", season: "2016-17", label: "16-17 Warriors" },
  { abbr: "HOU", season: "2017-18", label: "17-18 Rockets" },
  { abbr: "MIL", season: "2020-21", label: "20-21 Bucks" },
  { abbr: "PHX", season: "2021-22", label: "21-22 Suns" },
  { abbr: "DEN", season: "2022-23", label: "22-23 Nuggets" },
  { abbr: "BOS", season: "2023-24", label: "23-24 Celtics" },
];

// Assign 6 players to roster slots. We slot the best player for each
// position, then put the highest remaining overall as bench.
function buildRoster(players: PlayerSeason[]): RosterEntry[] | null {
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const slots: Record<string, RosterEntry> = {};
  const used = new Set<string>();

  // Pass 1: assign each player to their primary position if slot is free
  for (const p of sorted) {
    if (used.has(p.id)) continue;
    const primary = p.positions.find((pos) => pos.is_primary)?.position;
    if (primary && STARTER_SLOTS.includes(primary as StarterSlot) && !slots[primary]) {
      slots[primary] = { playerSeason: p, slot: primary as StarterSlot, assignedPosition: primary as StarterSlot };
      used.add(p.id);
    }
  }

  // Pass 2: fill empty starter slots with best available player (any position)
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

  // Pass 3: bench slot — best remaining player
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

  const supabase = createServerClient();

  // Fetch population stats for team evaluation
  const { data: popData, error: popErr } = await supabase
    .from("player_seasons")
    .select("ppg, rpg, apg, spg, bpg")
    .gte("mpg", 20);
  if (popErr) return NextResponse.json({ error: popErr.message }, { status: 500 });

  const pop = popData ?? [];
  const population = {
    ppg: pop.map((p: any) => p.ppg),
    rpg: pop.map((p: any) => p.rpg),
    apg: pop.map((p: any) => p.apg),
    spg: pop.map((p: any) => p.spg),
    bpg: pop.map((p: any) => p.bpg),
  };

  const results: { name: string; status: string; overall?: number; tier?: string }[] = [];

  for (const legend of LEGEND_TEAMS) {
    // Skip if already seeded
    const { data: existing } = await supabase
      .from("public_teams")
      .select("id")
      .eq("name", legend.label)
      .eq("created_by_browser_id", "__legend__")
      .maybeSingle();
    if (existing) {
      results.push({ name: legend.label, status: "skipped (already exists)" });
      continue;
    }

    // Find team row
    const { data: teamRows } = await supabase
      .from("teams")
      .select("id, name, abbreviation, season")
      .eq("abbreviation", legend.abbr)
      .eq("season", legend.season)
      .limit(1);
    const team = teamRows?.[0];
    if (!team) {
      results.push({ name: legend.label, status: `error: team ${legend.abbr} ${legend.season} not in DB` });
      continue;
    }

    // Fetch players with positions
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
      results.push({ name: legend.label, status: `error: no players found` });
      continue;
    }

    const players: PlayerSeason[] = (seasonRows as any[]).map((row) => ({
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

    const roster = buildRoster(players);
    if (!roster) {
      results.push({ name: legend.label, status: "error: could not build roster" });
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

    // public_teams.share_id has a FK to shares(id), so create a real
    // shares row first. Legend share pages are harmless if visited.
    const id = generateId();
    const shareId = `legend_${id}`;
    // Match the flat ShareData shape used by /share/[id]
    const shareData: Record<string, string> = {
      name: legend.label,
      overall: String(evaluation.overall),
      tier: evaluation.tier,
    };
    for (const e of roster_json) {
      const key = e.slot === "BENCH1" ? "6th" : e.slot.toLowerCase();
      shareData[key] = e.name;
      shareData[`${key}_s`] = e.season;
    }
    const { error: shareErr } = await supabase.from("shares").insert({
      id: shareId,
      data: shareData,
    });
    if (shareErr) {
      results.push({ name: legend.label, status: `error: ${shareErr.message}` });
      continue;
    }

    const { error: insertErr } = await supabase.from("public_teams").insert({
      id,
      share_id: shareId,
      name: legend.label,
      overall: evaluation.overall,
      tier: evaluation.tier,
      offense: evaluation.offense,
      defense: evaluation.defense,
      rebound: evaluation.rebound,
      playmaking: evaluation.playmaking,
      roster_json,
      metadata,
      created_by_browser_id: "__legend__",
    });

    if (insertErr) {
      await supabase.from("shares").delete().eq("id", shareId);
      results.push({ name: legend.label, status: `error: ${insertErr.message}` });
    } else {
      results.push({ name: legend.label, status: "seeded", overall: evaluation.overall, tier: evaluation.tier });
    }
  }

  return NextResponse.json({ results });
}
