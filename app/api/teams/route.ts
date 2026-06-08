import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET /api/teams?exclude=id1,id2,id3
// Returns a single random team not in the exclude list
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const excludeParam = searchParams.get("exclude") ?? "";
  const excludeIds = excludeParam ? excludeParam.split(",").filter(Boolean) : [];

  const supabase = createServerClient();
  let query = supabase
    .from("teams")
    .select("id, name, abbreviation, season");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  // Fetch a random subset then pick one — Supabase doesn't support ORDER BY RANDOM() directly
  const { data, error } = await query.limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No teams available" }, { status: 404 });
  }

  const team = data[Math.floor(Math.random() * data.length)];
  return NextResponse.json(team);
}
