"use client";

import { useEffect, useRef } from "react";
import { useBuildTheme } from "@/hooks/useBuildTheme";
import { gtm } from "@/lib/gtm";
import type { Theme } from "@/lib/themes";
import FollowBrandButton from "@/components/common/FollowBrandButton";
import AttachExistingTeam from "@/components/themes/AttachExistingTeam";

// Fires the feed-view event and renders the "Build for this theme" CTA on a
// theme feed page.
export default function ThemePageActions({ theme }: { theme: Theme }) {
  const buildTheme = useBuildTheme();
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      gtm.themeFeedView({ theme_slug: theme.slug });
    }
  }, [theme.slug]);

  return (
    <div className="space-y-2">
      <button
        onClick={() => buildTheme(theme, "landing")}
        className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-black text-sm transition-colors"
      >
        Build your take on {theme.emoji ?? ""} #{theme.hashtag} →
      </button>
      <AttachExistingTeam themeId={theme.id} themeSlug={theme.slug} />
      <FollowBrandButton placement="theme_feed" />
    </div>
  );
}
