"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";
import type { Theme } from "@/lib/themes";

export const PENDING_THEME_KEY = "tc_pending_theme";

// Launches the craft flow seeded with a theme: stash the theme slug so the post
// modal can pre-select it (for attribution), fire GTM, then go to /draft.
export function useBuildTheme() {
  const router = useRouter();
  const reset = useDraftStore((s) => s.reset);
  const setMode = useDraftStore((s) => s.setMode);

  return (theme: Theme, placement: "home" | "landing") => {
    try {
      sessionStorage.setItem(PENDING_THEME_KEY, theme.slug);
    } catch {
      /* ignore */
    }
    gtm.themeCtaClick({ theme_slug: theme.slug, placement });
    reset();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: "Random", season_filter: "Random" });
    router.push("/draft");
  };
}
