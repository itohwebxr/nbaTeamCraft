import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { simulateSeason, seasonGrade } from "@/lib/season";
import type { TeamMeta } from "@/lib/loadSimTeam";

export const dynamic = "force-dynamic";

// POST /api/season/simulate
// Body: { teamId: string }
// Projects one team's 82-game record from its overall rating + randomness.
export type SeasonResult = {
  team: TeamMeta;
  wins: number;
  losses: number;
  winRate: number;
  label: string;
  blurb: string;
  games: boolean[];
};

export async function POST(req: NextRequest) {
  try {
    const { teamId } = (await req.json()) as { teamId: string };
    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Resolve a random team if requested.
    let resolvedId = teamId;
    if (teamId === "__random__") {
      const { data } = await supabase
        .from("public_teams")
        .select("id")
        .neq("created_by_browser_id", "__legend__")
        .limit(500);
      const pool = (data ?? []) as { id: string }[];
      if (pool.length === 0) throw new Error("No teams available");
      resolvedId = pool[Math.floor(Math.random() * pool.length)].id;
    }

    const { data, error } = await supabase
      .from("public_teams")
      .select("id, name, overall, tier")
      .eq("id", resolvedId)
      .single();
    if (error || !data) throw new Error(`Team not found: ${resolvedId}`);

    const team: TeamMeta = {
      id: data.id,
      name: data.name,
      overall: data.overall,
      tier: data.tier,
    };

    const seed = `season|${team.id}|${Date.now()}|${Math.random()}`;
    const sim = simulateSeason(team.overall, seed);
    const grade = seasonGrade(sim.wins);

    const result: SeasonResult = {
      team,
      wins: sim.wins,
      losses: sim.losses,
      winRate: sim.winRate,
      label: grade.label,
      blurb: grade.blurb,
      games: sim.games,
    };
    return NextResponse.json(result);
  } catch (e) {
    console.error("[season simulate]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to simulate season", detail }, { status: 500 });
  }
}
