import { createServerClient } from "@/lib/supabase";
import type { HomeTeam } from "@/lib/homeTeams";

export type Theme = {
  id: string;
  slug: string;
  title: string;
  hashtag: string;
  emoji: string | null;
  description: string | null;
  category: string | null;
};

const THEME_COLS = "id, slug, title, hashtag, emoji, description, category";

// All active themes (small set) — used for the post-time picker candidates.
export async function getActiveThemes(): Promise<Theme[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("themes")
      .select(THEME_COLS)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Theme[];
  } catch {
    return [];
  }
}

// Today's featured themes: 1 main + up to 2 subs.
// Manual pins (themes.featured_priority) take precedence — the highest-priority
// pinned theme becomes the main and the next pins fill the sub slots. With no
// pins, falls back to a deterministic daily rotation over the featured pool
// (stable per UTC day). Sub slots short of 2 are topped up from the rotation.
export async function getFeaturedThemes(): Promise<{ main: Theme; subs: Theme[] } | null> {
  try {
    const supabase = createServerClient();

    // 1) Manual pins take precedence.
    const { data: pinnedData } = await supabase
      .from("themes")
      .select(THEME_COLS)
      .eq("is_active", true)
      .not("featured_priority", "is", null)
      .order("featured_priority", { ascending: false })
      .order("created_at", { ascending: true });
    const pinned = (pinnedData ?? []) as Theme[];

    // 2) Rotation pool — also used to top up sub slots.
    const { data: poolData, error } = await supabase
      .from("themes")
      .select(THEME_COLS)
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const pool = (poolData ?? []) as Theme[];

    const subs: Theme[] = [];
    const used = new Set<string>();
    let main: Theme | null = null;

    const addSub = (t: Theme) => {
      if (subs.length < 2 && !used.has(t.id)) {
        subs.push(t);
        used.add(t.id);
      }
    };

    if (pinned.length > 0) {
      main = pinned[0];
      used.add(main.id);
      for (let i = 1; i < pinned.length; i++) addSub(pinned[i]);
    } else if (pool.length > 0) {
      const n = pool.length;
      const offset = ((Math.floor(Date.now() / 86_400_000) % n) + n) % n;
      main = pool[offset];
      used.add(main.id);
      for (let k = 1; k < n; k++) addSub(pool[(offset + k) % n]);
    }

    if (!main) return null;

    // Top up remaining sub slots from the rotation pool (deterministic by day).
    if (subs.length < 2 && pool.length > 0) {
      const n = pool.length;
      const offset = ((Math.floor(Date.now() / 86_400_000) % n) + n) % n;
      for (let k = 0; k < n; k++) addSub(pool[(offset + k) % n]);
    }

    return { main, subs };
  } catch {
    return null;
  }
}

export async function getThemeBySlug(slug: string): Promise<Theme | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("themes")
      .select(THEME_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data as Theme;
  } catch {
    return null;
  }
}

// Themes attached to a given team (for the team detail page chips).
export async function getTeamThemes(teamId: string): Promise<Theme[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("team_themes")
      .select(`themes!inner(${THEME_COLS})`)
      .eq("team_id", teamId);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[])
      .map((row) => row.themes)
      .filter(Boolean) as Theme[];
  } catch {
    return [];
  }
}

// A caller-owned team that has not yet been entered into any theme — the
// candidates for the "attach an existing post" flows.
export type UnthemedTeam = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  is_sandbox: boolean;
  created_at: string;
};

// Lists the caller's teams (matched by user_id OR browser_id) that are not yet
// attached to any theme, newest first.
export async function getUnthemedTeams(
  userId: string | null,
  browserId: string | null,
  limit = 50
): Promise<UnthemedTeam[]> {
  if (!userId && !browserId) return [];
  try {
    const supabase = createServerClient();
    const orFilter = [
      userId ? `user_id.eq.${userId}` : null,
      browserId ? `created_by_browser_id.eq.${browserId}` : null,
    ].filter(Boolean).join(",");

    const { data: owned, error } = await supabase
      .from("public_teams")
      .select("id, name, overall, tier, is_sandbox, created_at")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const teams = (owned ?? []) as UnthemedTeam[];
    if (teams.length === 0) return [];

    const { data: tagged } = await supabase
      .from("team_themes")
      .select("team_id")
      .in("team_id", teams.map((t) => t.id));
    const themed = new Set((tagged ?? []).map((r) => r.team_id as string));
    return teams.filter((t) => !themed.has(t.id));
  } catch {
    return [];
  }
}

// Teams tagged with a theme, ordered by the team's POST date (newest first) —
// not the attach date — as HomeTeam[] for FeedCard.
export async function getThemeTeams(themeId: string, limit = 30): Promise<HomeTeam[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("team_themes")
      .select("public_teams!inner(*, profiles!user_id(display_name, avatar_url, x_handle))")
      .eq("theme_id", themeId)
      .order("created_at", { ascending: false, referencedTable: "public_teams" })
      .limit(limit);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[])
      .map((row) => row.public_teams)
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => {
        const p = t.profiles;
        const { profiles: _p, ...rest } = t;
        void _p;
        return {
          ...rest,
          creator: p
            ? { displayName: p.display_name ?? null, avatarUrl: p.avatar_url ?? null, xHandle: p.x_handle ?? null }
            : null,
        } as HomeTeam;
      })
      // Sort by the team's post date (created_at) regardless of when it was
      // attached to the theme.
      .sort((a: HomeTeam, b: HomeTeam) =>
        Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "")
      );
  } catch {
    return [];
  }
}
