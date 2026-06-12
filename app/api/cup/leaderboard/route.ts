// GET /api/cup/leaderboard?cupWeek=2026-W25
// Returns all cup entries for the week, sorted by wins then point differential.
// Used on the home page cup section and the cup standings page.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { currentCupWeek } from "@/lib/cupWeek";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cupWeek = req.nextUrl.searchParams.get("cupWeek") ?? currentCupWeek();
    const supabase = createServerClient();

    const { data: entries, error } = await supabase
      .from("cup_entries")
      .select("id, cup_week, public_team_id, wins, losses, points_for, points_against, browser_id, created_at")
      .eq("cup_week", cupWeek)
      .neq("browser_id", "__legend__"); // never include legend as a standings entry
    if (error) throw error;

    if (!entries?.length) {
      return NextResponse.json({ leaderboard: [], cupWeek });
    }

    // Enrich with team names
    const teamIds = [...new Set(entries.map((e) => e.public_team_id))];
    const { data: teams } = await supabase
      .from("public_teams")
      .select("id, name, overall, tier")
      .in("id", teamIds);
    const teamMap: Record<string, { name: string; overall: number; tier: string }> = {};
    for (const t of (teams ?? [])) teamMap[t.id] = t;

    const leaderboard = entries
      .map((e) => ({
        entryId: e.id,
        teamId: e.public_team_id,
        name: teamMap[e.public_team_id]?.name ?? "—",
        overall: teamMap[e.public_team_id]?.overall ?? 0,
        tier: teamMap[e.public_team_id]?.tier ?? "D",
        wins: e.wins,
        losses: e.losses,
        pointDiff: e.points_for - e.points_against,
        matchesPlayed: e.wins + e.losses,
      }))
      .sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff);

    return NextResponse.json({ leaderboard, cupWeek });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
