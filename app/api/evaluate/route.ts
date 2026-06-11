import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { RosterEntry, TeamEvaluation } from "@/types";
import { calcTeamEvaluation } from "@/lib/evaluate";

export const dynamic = "force-dynamic";

// POST /api/evaluate
// Body: { roster: RosterEntry[] }
// Returns TeamEvaluation
export async function POST(request: NextRequest) {
  let roster: RosterEntry[];
  let sandbox = false;
  try {
    const body = await request.json();
    roster = body.roster;
    sandbox = !!body.sandbox;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!roster || roster.length === 0) {
    return NextResponse.json({ error: "roster is required" }, { status: 400 });
  }

  // Fetch population stats — limit to MPG >= 20 to exclude low-minute players
  // and make percentile rankings more representative of real contributors
  const supabase = createServerClient();
  const { data: population, error: popErr } = await supabase
    .from("player_seasons")
    .select("ppg, rpg, apg, spg, bpg")
    .gte("mpg", 20);

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

  const evaluation: TeamEvaluation = calcTeamEvaluation(roster, populationStats, sandbox);
  return NextResponse.json(evaluation);
}
