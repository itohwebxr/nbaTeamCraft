"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStartCraft } from "@/hooks/useStartCraft";
import { useVariant } from "@/hooks/useVariant";
import { ENTRY_NUDGE_EXPERIMENT } from "@/lib/experiments";
import { gtm } from "@/lib/gtm";

type PageType = "team" | "sim" | "trivia";
type Target = "craft" | "trivia";

// Experiment: funnel landing traffic (team / sim detail) into Trivia, the
// repeat-usage hook. All landing types currently push Trivia with a bold,
// hard-to-miss bar so we can measure whether the導線 drives retention.
const PRIMARY: Record<PageType, { target: Target; title: string; subtitle: string }> = {
  team:   { target: "trivia", title: "Test your NBA IQ", subtitle: "Play today's Trivia Challenge" },
  sim:    { target: "trivia", title: "Test your NBA IQ", subtitle: "Play today's Trivia Challenge" },
  trivia: { target: "trivia", title: "Daily Challenge", subtitle: "Play today's Trivia" },
};

const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 3000;

export default function StickyCtaBar({ pageType }: { pageType: PageType }) {
  const router = useRouter();
  const startCraft = useStartCraft();
  const [visible, setVisible] = useState(false);
  const shownFired = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const primary = PRIMARY[pageType];
  const isTrivia = primary.target === "trivia";

  // Experiment ① (placement): on team/sim landings the sticky bar is variant A;
  // variant B replaces it with an inline nudge, so suppress the bar there.
  // Trivia pages are outside the experiment and always show the bar.
  const inExperiment = pageType !== "trivia";
  const variant = useVariant(ENTRY_NUDGE_EXPERIMENT);
  const stickyEnabled = !inExperiment || variant === "A";
  const expProps: { experiment?: string; variant?: string } =
    inExperiment && variant ? { experiment: ENTRY_NUDGE_EXPERIMENT, variant } : {};

  // While the bar is on screen, reserve space at the bottom of the page equal
  // to the bar's height so it never overlaps the last content (e.g. What's next).
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.paddingBottom;
    const apply = () => {
      const h = barRef.current?.offsetHeight ?? 0;
      document.body.style.paddingBottom = `${h + 16}px`;
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.body.style.paddingBottom = prev;
    };
  }, [visible]);

  useEffect(() => {
    if (!stickyEnabled) return;
    const key = `tc_nudge_${pageType}`;
    try {
      const ts = Number(localStorage.getItem(key) ?? 0);
      if (ts && Date.now() - ts < DISMISS_DAYS * 86400_000) return; // recently dismissed
    } catch {
      /* ignore */
    }

    // Surface the nudge a few seconds after the visitor lands.
    const timer = setTimeout(() => {
      setVisible(true);
      if (!shownFired.current) {
        shownFired.current = true;
        gtm.nudgeShown({ page_type: pageType, placement: "sticky", target: primary.target, ...expProps });
      }
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageType, primary.target, stickyEnabled]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(`tc_nudge_${pageType}`, String(Date.now()));
    } catch {
      /* ignore */
    }
    gtm.nudgeDismissed({ page_type: pageType, placement: "sticky", target: primary.target, ...expProps });
  };

  const handleCta = () => {
    if (primary.target === "craft") {
      startCraft({ pageType, placement: "sticky" });
    } else {
      gtm.landingNextCta({ page_type: pageType, target: "trivia", placement: "sticky", ...expProps });
      router.push("/trivia");
    }
  };

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none"
    >
      <div
        className={`max-w-lg mx-auto flex items-center gap-2 pointer-events-auto rounded-2xl p-2 pl-3 ${
          isTrivia
            ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 ring-1 ring-white/15 shadow-2xl shadow-fuchsia-900/40"
            : "bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl shadow-black/50"
        }`}
      >
        <button onClick={handleCta} className="flex-1 flex items-center gap-3 py-1.5 text-left min-w-0">
          {isTrivia ? (
            <>
              <span className="shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                🧠
              </span>
              <span className="min-w-0">
                <span className="block font-black text-white text-[15px] leading-tight">{primary.title}</span>
                <span className="block text-white/85 text-xs leading-tight">{primary.subtitle}</span>
              </span>
              <span className="ml-auto text-white font-black text-lg shrink-0 pr-1">→</span>
            </>
          ) : (
            <>
              <span className="text-xl shrink-0">🏗️</span>
              <span className="font-black text-white text-sm leading-tight">{primary.title}</span>
              <span className="ml-auto text-orange-400 font-bold text-sm shrink-0">→</span>
            </>
          )}
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none transition-colors ${
            isTrivia ? "text-white/70 hover:text-white hover:bg-white/15" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
          }`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
