import { createServerClient } from "@/lib/supabase";
import { PublicTeam } from "@/types";

// Shared fetcher for the home page team lists.
// - kind "dream"   → Dream Draft teams (is_sandbox = false)
// - kind "builder" → Roster Builder teams (is_sandbox = true)
// Gracefully falls back when the is_sandbox column doesn't exist yet
// (migration 005 pending): dream lists show everything, builder lists are empty.
export async function fetchHomeTeams(opts: {
  kind: "dream" | "builder";
  orderBy: "created_at" | "overall";
  limit: number;
}): Promise<PublicTeam[]> {
  const { kind, orderBy, limit } = opts;
  try {
    const supabase = createServerClient();
    const base = () =>
      supabase
        .from("public_teams")
        .select("*")
        .neq("created_by_browser_id", "__legend__")
        .order(orderBy, { ascending: false })
        .limit(limit);

    const res = await base().eq("is_sandbox", kind === "builder");
    if (res.error) {
      if ((res.error as { code?: string }).code === "42703") {
        // Column missing — migration pending
        if (kind === "builder") return [];
        const fb = await base();
        return (fb.data ?? []) as PublicTeam[];
      }
      throw res.error;
    }
    return (res.data ?? []) as PublicTeam[];
  } catch {
    return [];
  }
}
