import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/teams?exclude=id1,id2,id3&teamAbbr=SAS&season=2015-16
// Returns a single random team not in the exclude list, optionally filtered
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const excludeParam = searchParams.get("exclude") ?? "";
  const excludeIds = excludeParam ? excludeParam.split(",").filter(Boolean) : [];
  const teamAbbr = searchParams.get("teamAbbr");
  const season = searchParams.get("season");

  const supabase = createServerClient();
  let query = supabase
    .from("teams")
    .select("id, name, abbreviation, season");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }
  if (teamAbbr) {
    query = query.eq("abbreviation", teamAbbr);
  }
  if (season) {
    query = query.eq("season", season);
  }

  // Fetch all teams then pick one randomly — ~750 total (30 teams × 25 seasons)
  const { data, error } = await query.limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No teams available" }, { status: 404 });
  }

  const team = data[Math.floor(Math.random() * data.length)];
  return NextResponse.json(team);
}
