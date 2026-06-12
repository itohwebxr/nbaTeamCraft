// GET /api/cup/status?browserId=xxx&cupWeek=2026-W25
// Returns the caller's cup entry + all played matches for the week.
// If cupWeek is omitted, uses the current week.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { currentCupWeek } from "@/lib/cupWeek";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const browserId = searchParams.get("browserId");
    const cupWeek = searchParams.get("cupWeek") ?? currentCupWeek();

    if (!browserId) {
      return NextResponse.json({ error: "browserId is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find the entry for this browser in this week
    const { data: entries, error: entriesErr } = await supabase
      .from("cup_entries")
      .select("*")
      .eq("cup_week", cupWeek)
      .eq("browser_id", browserId)
      .limit(1);

    if (entriesErr) {
      if (entriesErr.code === "42P01") return NextResponse.json({ entry: null, matches: [], cupWeek });
      throw entriesErr;
    }

    const entry = entries?.[0] ?? null;
    if (!entry) {
      return NextResponse.json({ entry: null, matches: [], cupWeek });
    }

    // Fetch match history (both home and away) and join opponent entry + team name
    const { data: homeMatchesRaw } = await supabase
      .from("cup_matches")
      .select(`
        id, cup_week, played_on, home_score, away_score, quarter_scores, home_box, away_box, legend_team_id,
        away_entry:away_entry_id ( id, public_team_id, wins, losses )
      `)
      .eq("home_entry_id", entry.id)
      .order("played_on");

    const { data: awayMatchesRaw } = await supabase
      .from("cup_matches")
      .select(`
        id, cup_week, played_on, home_score, away_score, quarter_scores, home_box, away_box, legend_team_id,
        home_entry:home_entry_id ( id, public_team_id, wins, losses )
      `)
      .eq("away_entry_id", entry.id)
      .order("played_on");

    // Legend matches are stored self-referencing (home = away = user's entry),
    // so they show up in both queries — keep only the home-side copy.
    const homeMatches = homeMatchesRaw ?? [];
    const awayMatches = (awayMatchesRaw ?? []).filter(
      (m: any) => m.home_entry?.id !== entry.id
    );

    // Collect all opponent team IDs (incl. legend teams) so we can enrich with names
    const oppTeamIds = new Set<string>();
    for (const m of homeMatches) {
      const away = (m as any).away_entry;
      if ((m as any).legend_team_id) oppTeamIds.add((m as any).legend_team_id);
      else if (away?.public_team_id) oppTeamIds.add(away.public_team_id);
    }
    for (const m of awayMatches) {
      const home = (m as any).home_entry;
      if (home?.public_team_id) oppTeamIds.add(home.public_team_id);
    }

    const teamNamesMap: Record<string, { name: string; overall: number; tier: string }> = {};
    if (oppTeamIds.size > 0) {
      const { data: teams } = await supabase
        .from("public_teams")
        .select("id, name, overall, tier")
        .in("id", [...oppTeamIds]);
      for (const t of (teams ?? [])) {
        teamNamesMap[t.id] = { name: t.name, overall: t.overall, tier: t.tier };
      }
    }

    // Normalise to a unified match list from the user's perspective
    const matches = [
      ...homeMatches.map((m: any) => ({
        id: m.id,
        played_on: m.played_on,
        userScore: m.home_score,
        oppScore: m.away_score,
        won: m.home_score > m.away_score,
        quarters: m.quarter_scores,
        userBox: m.home_box,
        oppBox: m.away_box,
        opponent: m.legend_team_id
          ? { entryId: null, isLegend: true, ...teamNamesMap[m.legend_team_id] }
          : { entryId: m.away_entry?.id, ...teamNamesMap[m.away_entry?.public_team_id] },
      })),
      ...awayMatches.map((m: any) => ({
        id: m.id,
        played_on: m.played_on,
        userScore: m.away_score,
        oppScore: m.home_score,
        won: m.away_score > m.home_score,
        quarters: m.quarter_scores,
        userBox: m.away_box,
        oppBox: m.home_box,
        opponent: {
          entryId: m.home_entry?.id,
          ...teamNamesMap[m.home_entry?.public_team_id],
        },
      })),
    ].sort((a, b) => a.played_on.localeCompare(b.played_on));

    return NextResponse.json({ entry, matches, cupWeek });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch cup status" }, { status: 500 });
  }
}
