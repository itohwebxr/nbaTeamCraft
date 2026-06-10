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

  // Return all pairs so the client can cross-filter
  return NextResponse.json({ pairs: data as { abbreviation: string; season: string }[] });
}
