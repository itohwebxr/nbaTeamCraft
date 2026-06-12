// POST /api/cup/enter
// Registers a public_team into the current cup week.
// If the team already has an entry this week, returns it (idempotent).
//
// Body: { publicTeamId: string, browserId: string }

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { currentCupWeek } from "@/lib/cupWeek";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { publicTeamId, browserId } = await req.json();
    if (!publicTeamId || !browserId) {
      return NextResponse.json({ error: "publicTeamId and browserId are required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const cupWeek = currentCupWeek();

    // Verify the public_team exists
    const { data: team, error: teamErr } = await supabase
      .from("public_teams")
      .select("id, name, overall, tier")
      .eq("id", publicTeamId)
      .maybeSingle();
    if (teamErr || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Upsert — if already entered this week, return existing entry
    const { data: entry, error: entryErr } = await supabase
      .from("cup_entries")
      .upsert(
        { cup_week: cupWeek, public_team_id: publicTeamId, browser_id: browserId },
        { onConflict: "cup_week,public_team_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (entryErr) {
      if (entryErr.code === "42P01") return NextResponse.json({ error: "Cup tables not yet available" }, { status: 503 });
      return NextResponse.json({ error: entryErr.message }, { status: 500 });
    }

    return NextResponse.json({ entry, cupWeek, team });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to enter cup" }, { status: 500 });
  }
}
