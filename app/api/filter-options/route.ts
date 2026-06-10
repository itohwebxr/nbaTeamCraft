import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("teams")
    .select("abbreviation, season")
    .order("abbreviation");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const teams = [...new Set(data.map((t) => t.abbreviation))].sort();
  const seasons = [...new Set(data.map((t) => t.season))].sort().reverse();

  return NextResponse.json({ teams, seasons });
}
