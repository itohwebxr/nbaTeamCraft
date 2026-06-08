import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { RosterEntry, TeamEvaluation } from "@/types";
import { calcTeamEvaluation } from "@/lib/evaluate";

// POST /api/evaluate
// Body: { roster: RosterEntry[] }
// Returns TeamEvaluation
export async function POST(request: NextRequest) {
  let roster: RosterEntry[];
  try {
    const body = await request.json();
    roster = body.roster;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!roster || roster.length === 0) {
    return NextResponse.json({ error: "roster is required" }, { status: 400 });
  }

  // Fetch population stats for percentile calculation
  // Use all player_seasons as the reference population
  const { data: population, error: popErr } = await supabase
    .from("player_seasons")
    .select("ppg, rpg, apg, spg, bpg");

  if (popErr) {
    return NextResponse.json({ error: popErr.message }, { status: 500 });
  }

  const pop = population ?? [];
  const populationStats = {
    ppg: pop.map((p: any) => p.ppg),
    rpg: pop.map((p: any) => p.rpg),
    apg: pop.map((p: any) => p.apg),
    spg: pop.map((p: any) => p.spg),
    bpg: pop.map((p: any) => p.bpg),
  };

  const evaluation: TeamEvaluation = calcTeamEvaluation(roster, populationStats);
  return NextResponse.json(evaluation);
}
