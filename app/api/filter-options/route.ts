import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Pair = { abbreviation: string; season: string };

// PostgREST caps a single response at the project's max-rows (1000 by default).
// The teams table already exceeds that, so a plain select silently drops the
// alphabetically-last rows (POR, TOR, WAS, ...) and they vanish from the
// filter dropdowns. Page through with .range() to fetch every row.
const PAGE_SIZE = 1000;

export async function GET() {
  const supabase = createServerClient();

  const pairs: Pair[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("teams")
      .select("abbreviation, season")
      .order("abbreviation")
      .order("season")
      .range(from, from + PAGE_SIZE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;

    pairs.push(...(data as Pair[]));
    if (data.length < PAGE_SIZE) break;
  }

  // Return all pairs so the client can cross-filter
  return NextResponse.json({ pairs });
}
