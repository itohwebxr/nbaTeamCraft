import { createServerClient } from "@/lib/supabase";
import { PublicTeam } from "@/types";

export type HomeTeam = PublicTeam & {
  creator: {
    displayName: string | null;
    avatarUrl: string | null;
    xHandle: string | null;
  } | null;
};

// Shared fetcher for the home page team lists.
// - kind "dream"   → Dream Draft teams (is_sandbox = false)
// - kind "builder" → Roster Builder teams (is_sandbox = true)
export async function fetchHomeTeams(opts: {
  kind: "dream" | "builder";
  orderBy: "created_at" | "overall";
  limit: number;
}): Promise<HomeTeam[]> {
  const { kind, orderBy, limit } = opts;
  try {
    const supabase = createServerClient();
    const base = () =>
      supabase
        .from("public_teams")
        .select("*, profiles!user_id(display_name, avatar_url, x_handle)")
        .neq("created_by_browser_id", "__legend__")
        .neq("created_by_browser_id", "__historical__")
        .order(orderBy, { ascending: false })
        .limit(limit);

    const res = await base().eq("is_sandbox", kind === "builder");
    if (res.error) {
      if ((res.error as { code?: string }).code === "42703") {
        if (kind === "builder") return [];
        const fb = await base();
        return toHomeTeams(fb.data ?? []);
      }
      throw res.error;
    }
    return toHomeTeams(res.data ?? []);
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toHomeTeams(rows: any[]): HomeTeam[] {
  return rows.map((t) => {
    const p = t.profiles;
    const { profiles: _p, ...rest } = t;
    void _p;
    return {
      ...rest,
      creator: p
        ? { displayName: p.display_name ?? null, avatarUrl: p.avatar_url ?? null, xHandle: p.x_handle ?? null }
        : null,
    } as HomeTeam;
  });
}
