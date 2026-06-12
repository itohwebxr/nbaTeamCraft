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

    // Enrich with team names + optional profile data
    const teamIds = [...new Set(entries.map((e) => e.public_team_id))];
    const userIds = [...new Set(entries.map((e) => (e as any).user_id).filter(Boolean))];
    const [teamsRes, profilesRes] = await Promise.all([
      supabase.from("public_teams").select("id, name, overall, tier").in("id", teamIds),
      userIds.length > 0
        ? supabase.from("profiles").select("id, x_handle, display_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);
    const teamMap: Record<string, { name: string; overall: number; tier: string }> = {};
    for (const t of (teamsRes.data ?? [])) teamMap[t.id] = t;
    const profileMap: Record<string, { xHandle: string | null; displayName: string | null; avatarUrl: string | null }> = {};
    for (const p of ((profilesRes as any).data ?? [])) {
      profileMap[p.id] = { xHandle: p.x_handle, displayName: p.display_name, avatarUrl: p.avatar_url };
    }

    const leaderboard = entries
      .map((e: any) => {
        const profile = e.user_id ? profileMap[e.user_id] : null;
        return {
          entryId: e.id,
          teamId: e.public_team_id,
          name: teamMap[e.public_team_id]?.name ?? "—",
          overall: teamMap[e.public_team_id]?.overall ?? 0,
          tier: teamMap[e.public_team_id]?.tier ?? "D",
          wins: e.wins,
          losses: e.losses,
          pointDiff: e.points_for - e.points_against,
          matchesPlayed: e.wins + e.losses,
          xHandle: profile?.xHandle ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        };
      })
      .sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff);

    return NextResponse.json({ leaderboard, cupWeek });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
