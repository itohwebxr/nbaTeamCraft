"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVariant } from "@/hooks/useVariant";
import { ENTRY_NUDGE_EXPERIMENT } from "@/lib/experiments";
import { gtm } from "@/lib/gtm";

// Experiment ① variant B: an in-context trivia entry card rendered inside the
// result content (vs. the bottom sticky bar in variant A). Only renders for
// visitors bucketed into B; fires the same nudge_shown / landing_next_cta
// events tagged with the experiment + variant so CTR is comparable.
export default function InlineTriviaNudge({ pageType }: { pageType: "team" | "sim" }) {
  const router = useRouter();
  const variant = useVariant(ENTRY_NUDGE_EXPERIMENT);
  const shownFired = useRef(false);

  useEffect(() => {
    if (variant === "B" && !shownFired.current) {
      shownFired.current = true;
      gtm.nudgeShown({
        page_type: pageType,
        placement: "inline",
        target: "trivia",
        experiment: ENTRY_NUDGE_EXPERIMENT,
        variant,
      });
    }
  }, [variant, pageType]);

  if (variant !== "B") return null;

  const go = () => {
    gtm.landingNextCta({
      page_type: pageType,
      target: "trivia",
      placement: "inline",
      experiment: ENTRY_NUDGE_EXPERIMENT,
      variant,
    });
    router.push("/trivia");
  };

  return (
    <button
      onClick={go}
      className="flex items-center gap-3 w-full text-left rounded-2xl p-3 pl-3
        bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500
        ring-1 ring-white/15 shadow-lg shadow-fuchsia-900/30 transition-transform active:scale-[0.99]"
    >
      <span className="shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
        🧠
      </span>
      <span className="min-w-0">
        <span className="block font-black text-white text-[15px] leading-tight">Test your NBA IQ</span>
        <span className="block text-white/85 text-xs leading-tight">Play today&apos;s Trivia Challenge</span>
      </span>
      <span className="ml-auto text-white font-black text-lg shrink-0 pr-1">→</span>
    </button>
  );
}
