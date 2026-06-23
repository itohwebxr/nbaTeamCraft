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

// Today's featured themes: a deterministic daily rotation over the featured
// pool. 1 main + up to 2 subs. Stable per UTC day.
export async function getFeaturedThemes(): Promise<{ main: Theme; subs: Theme[] } | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("themes")
      .select(THEME_COLS)
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const pool = (data ?? []) as Theme[];
    if (pool.length === 0) return null;

    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const n = pool.length;
    const offset = ((dayIndex % n) + n) % n;
    const pick = (k: number) => pool[(offset + k) % n];
    const main = pick(0);
    const subs: Theme[] = [];
    for (let k = 1; k < n && subs.length < 2; k++) {
      const t = pick(k);
      if (t.id !== main.id && !subs.some((s) => s.id === t.id)) subs.push(t);
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

// Teams tagged with a theme, newest first, as HomeTeam[] for FeedCard.
export async function getThemeTeams(themeId: string, limit = 30): Promise<HomeTeam[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("team_themes")
      .select("public_teams!inner(*, profiles!user_id(display_name, avatar_url, x_handle))")
      .eq("theme_id", themeId)
      .order("created_at", { ascending: false })
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
      });
  } catch {
    return [];
  }
}
