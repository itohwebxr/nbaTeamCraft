"use client";

import { useEffect, useRef } from "react";
import { useVariant } from "@/hooks/useVariant";
import { useFeaturedTheme } from "@/hooks/useFeaturedTheme";
import { useBuildTheme } from "@/hooks/useBuildTheme";
import { ENTRY_NUDGE_EXPERIMENT } from "@/lib/experiments";
import { gtm } from "@/lib/gtm";

// Experiment ① variant B: an in-context nudge rendered inside the result content
// (vs. the bottom sticky bar in variant A). Promotes today's featured Theme.
// Only renders for visitors bucketed into B; fires the same nudge_shown /
// landing_next_cta events tagged with the experiment + variant so CTR is
// comparable across placements.
export default function InlineTriviaNudge({ pageType }: { pageType: "team" | "sim" }) {
  const variant = useVariant(ENTRY_NUDGE_EXPERIMENT);
  const featured = useFeaturedTheme();
  const buildTheme = useBuildTheme();
  const shownFired = useRef(false);
  const theme = featured?.main ?? null;

  useEffect(() => {
    if (variant === "B" && theme && !shownFired.current) {
      shownFired.current = true;
      gtm.nudgeShown({
        page_type: pageType,
        placement: "inline",
        target: "theme",
        experiment: ENTRY_NUDGE_EXPERIMENT,
        variant,
      });
      gtm.themeFeaturedView({ theme_slug: theme.slug, placement: "landing" });
    }
  }, [variant, pageType, theme]);

  if (variant !== "B" || !theme) return null;

  const go = () => {
    gtm.landingNextCta({
      page_type: pageType,
      target: "theme",
      placement: "inline",
      experiment: ENTRY_NUDGE_EXPERIMENT,
      variant,
    });
    buildTheme(theme, "landing");
  };

  return (
    <button
      onClick={go}
      className="flex items-center gap-3 w-full text-left rounded-2xl p-3 pl-3
        bg-gradient-to-r from-violet-600 to-fuchsia-600
        ring-1 ring-white/15 shadow-lg shadow-fuchsia-900/30 transition-transform active:scale-[0.99]"
    >
      <span className="shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
        {theme.emoji ?? "🏗️"}
      </span>
      <span className="min-w-0">
        <span className="block font-black text-white text-[15px] leading-tight truncate">{theme.title}</span>
        <span className="block text-white/85 text-xs leading-tight truncate">#{theme.hashtag} · Build your take</span>
      </span>
      <span className="ml-auto text-white font-black text-lg shrink-0 pr-1">→</span>
    </button>
  );
}
