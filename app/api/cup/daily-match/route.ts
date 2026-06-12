// POST /api/cup/daily-match
// Triggers today's cup match for the given entry.
// At most one match per (entry, date) — idempotent: returns existing if already played.
//
// Body: { entryId: string, browserId: string }

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { simulateGame, SimTeam, SimPlayer } from "@/lib/simulateGame";
import { currentCupWeek, isoDate, todayUTC } from "@/lib/cupWeek";
import { PublicTeam } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { entryId, browserId } = await req.json();
    if (!entryId || !browserId) {
      return NextResponse.json({ error: "entryId and browserId are required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const today = isoDate(todayUTC());
    const cupWeek = currentCupWeek();

    // Verify entry belongs to this browser
    const { data: entry, error: entryErr } = await supabase
      .from("cup_entries")
      .select("*")
      .eq("id", entryId)
      .eq("browser_id", browserId)
      .eq("cup_week", cupWeek)
      .maybeSingle();
    if (entryErr) {
      if (entryErr.code === "42P01") return NextResponse.json({ error: "Cup tables not yet available" }, { status: 503 });
      return NextResponse.json({ error: entryErr.message }, { status: 500 });
    }
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Check if already played today
    const { data: existing } = await supabase
      .from("cup_matches")
      .select("*")
      .eq("home_entry_id", entryId)
      .eq("played_on", today)
      .maybeSingle();
    // Also check as away side
    const { data: existingAway } = await supabase
      .from("cup_matches")
      .select("*")
      .eq("away_entry_id", entryId)
      .eq("played_on", today)
      .maybeSingle();
    if (existing || existingAway) {
      return NextResponse.json({ alreadyPlayed: true, match: existing ?? existingAway });
    }

    // Cup is finished after 7 matches (wins + losses = 7)
    if (entry.wins + entry.losses >= 7) {
      return NextResponse.json({ cupFinished: true, entry });
    }

    // Fetch user's public_team
    const { data: userTeamRow } = await supabase
      .from("public_teams")
      .select("*")
      .eq("id", entry.public_team_id)
      .maybeSingle();
    if (!userTeamRow) {
      return NextResponse.json({ error: "User team not found" }, { status: 404 });
    }

    // Pick opponent: prefer other cup entries this week, fall back to legend pool
    const { data: weekEntries } = await supabase
      .from("cup_entries")
      .select("id, public_team_id, wins, losses")
      .eq("cup_week", cupWeek)
      .neq("id", entryId);

    // Find cup entries that haven't played today either
    const availableWeekEntries = await Promise.all(
      (weekEntries ?? []).map(async (e) => {
        const { count } = await supabase
          .from("cup_matches")
          .select("id", { count: "exact", head: true })
          .or(`home_entry_id.eq.${e.id},away_entry_id.eq.${e.id}`)
          .eq("played_on", today);
        return { ...e, playedToday: (count ?? 0) > 0 };
      })
    );
    const cupPool = availableWeekEntries.filter((e) => !e.playedToday);

    let opponentTeamRow: PublicTeam | null = null;
    let opponentEntryId: string | null = null;

    if (cupPool.length > 0) {
      const pick = cupPool[Math.floor(Math.random() * cupPool.length)];
      opponentEntryId = pick.id;
      const { data } = await supabase.from("public_teams").select("*").eq("id", pick.public_team_id).maybeSingle();
      opponentTeamRow = data;
    }

    if (!opponentTeamRow) {
      // Fall back to legend pool
      const { data: legends } = await supabase
        .from("public_teams")
        .select("*")
        .eq("created_by_browser_id", "__legend__");
      const pool = (legends ?? []) as PublicTeam[];
      if (pool.length > 0) {
        opponentTeamRow = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    if (!opponentTeamRow) {
      return NextResponse.json({ error: "No opponent available" }, { status: 404 });
    }

    // Resolve player stats for both teams
    const userPlayers = await resolvePlayerStats(supabase, userTeamRow as PublicTeam);
    const oppPlayers = await resolvePlayerStats(supabase, opponentTeamRow);

    const userTeam: SimTeam = {
      name: userTeamRow.name,
      evaluation: { overall: userTeamRow.overall, offense: userTeamRow.offense, defense: userTeamRow.defense, rebound: userTeamRow.rebound, playmaking: userTeamRow.playmaking },
      players: userPlayers,
    };
    const oppTeam: SimTeam = {
      name: opponentTeamRow.name,
      evaluation: { overall: opponentTeamRow.overall, offense: opponentTeamRow.offense, defense: opponentTeamRow.defense, rebound: opponentTeamRow.rebound, playmaking: opponentTeamRow.playmaking },
      players: oppPlayers,
    };

    // Deterministic seed: entryId + date so result is reproducible
    const seed = `${entryId}|${today}`;
    const result = simulateGame(userTeam, oppTeam, seed);

    const won = result.winner === "home";

    // If opponent is a real cup entry, create a reciprocal cup_match
    // (both entries see the same match from their own side)
    let matchId: string = "";
    if (opponentEntryId) {
      const { data: matchRow, error: matchErr } = await supabase
        .from("cup_matches")
        .insert({
          cup_week: cupWeek,
          home_entry_id: entryId,
          away_entry_id: opponentEntryId,
          home_score: result.homeTotal,
          away_score: result.awayTotal,
          quarter_scores: result.quarters,
          home_box: result.homeBox,
          away_box: result.awayBox,
          played_on: today,
        })
        .select("id")
        .single();
      if (matchErr) {
        return NextResponse.json({ error: matchErr.message }, { status: 500 });
      }
      matchId = matchRow.id;

      // Update both entries' W/L records
      await Promise.all([
        supabase.from("cup_entries").update({
          wins: entry.wins + (won ? 1 : 0),
          losses: entry.losses + (won ? 0 : 1),
          points_for: entry.points_for + result.homeTotal,
          points_against: entry.points_against + result.awayTotal,
        }).eq("id", entryId),
        supabase.from("cup_entries").update({
          wins: weekEntries!.find(e => e.id === opponentEntryId)!.wins + (won ? 0 : 1),
          losses: weekEntries!.find(e => e.id === opponentEntryId)!.losses + (won ? 1 : 0),
          points_for: (weekEntries!.find(e => e.id === opponentEntryId) as any).points_for + result.awayTotal,
          points_against: (weekEntries!.find(e => e.id === opponentEntryId) as any).points_against + result.homeTotal,
        }).eq("id", opponentEntryId),
      ]);
    } else {
      // Legend opponent — no cup_matches row needed (legend has no entry_id)
      // Store as a ghost match with away_entry_id = null by using a dummy approach:
      // Just update user's entry stats directly.
      await supabase.from("cup_entries").update({
        wins: entry.wins + (won ? 1 : 0),
        losses: entry.losses + (won ? 0 : 1),
        points_for: entry.points_for + result.homeTotal,
        points_against: entry.points_against + result.awayTotal,
      }).eq("id", entryId);

      // Insert with a self-referencing away_entry for the legend case,
      // using user's entry as away (workaround for FK constraint).
      // We store the legend's box in home_box and user in away_box.
      // The status API normalises perspective from played_on side.
      const { data: matchRow } = await supabase
        .from("cup_matches")
        .insert({
          cup_week: cupWeek,
          home_entry_id: entryId,
          away_entry_id: entryId,   // dummy — legend has no entry
          home_score: result.homeTotal,
          away_score: result.awayTotal,
          quarter_scores: result.quarters,
          home_box: result.homeBox,
          away_box: result.awayBox,
          played_on: today,
        })
        .select("id")
        .single();
      matchId = matchRow?.id ?? "";
    }

    return NextResponse.json({
      matchId,
      result: {
        userScore: result.homeTotal,
        oppScore: result.awayTotal,
        won,
        quarters: result.quarters,
        userBox: result.homeBox,
        oppBox: result.awayBox,
        overtime: result.overtime,
      },
      opponent: {
        id: opponentTeamRow.id,
        name: opponentTeamRow.name,
        overall: opponentTeamRow.overall,
        tier: opponentTeamRow.tier,
        isLegend: opponentTeamRow.created_by_browser_id === "__legend__",
      },
      updatedEntry: {
        wins: entry.wins + (won ? 1 : 0),
        losses: entry.losses + (won ? 0 : 1),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to simulate cup match" }, { status: 500 });
  }
}

async function resolvePlayerStats(
  supabase: ReturnType<typeof createServerClient>,
  team: PublicTeam
): Promise<SimPlayer[]> {
  const meta = team.metadata?.players ?? [];
  const teamIds = [...new Set(meta.map((p: any) => p.team))].filter(Boolean);
  const statsByKey = new Map<string, { ppg: number; rpg: number; apg: number; spg: number; bpg: number }>();
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("player_seasons")
      .select("season, ppg, rpg, apg, spg, bpg, players!inner ( nba_player_id )")
      .in("team_id", teamIds);
    for (const row of (data ?? []) as any[]) {
      statsByKey.set(`${row.players.nba_player_id}|${row.season}`, row);
    }
  }
  return team.roster_json.map((item: any) => {
    const m = meta.find((p: any) => p.name === item.name && p.season === item.season);
    const stats = m ? statsByKey.get(`${m.playerId}|${m.season}`) : undefined;
    return { name: item.name, slot: item.slot, position: item.assignedPosition, overall: item.overall, ppg: stats?.ppg ?? 0, rpg: stats?.rpg ?? 0, apg: stats?.apg ?? 0, spg: stats?.spg ?? 0, bpg: stats?.bpg ?? 0 };
  });
}
