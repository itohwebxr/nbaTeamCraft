"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStartCraft } from "@/hooks/useStartCraft";
import { gtm } from "@/lib/gtm";

type PageType = "team" | "sim" | "trivia";
type Target = "craft" | "trivia";

// The single highest-intent next action per landing type. team/sim push the
// lateral creation loop (craft); trivia pushes the daily-challenge re-visit hook.
const PRIMARY: Record<PageType, { target: Target; emoji: string; label: string }> = {
  team:   { target: "craft",  emoji: "🏗️", label: "Craft your own team" },
  sim:    { target: "craft",  emoji: "🏗️", label: "Craft a team to simulate" },
  trivia: { target: "trivia", emoji: "🧠", label: "Play today's Daily Challenge" },
};

const DISMISS_DAYS = 7;
const SCROLL_TRIGGER = 600;

export default function StickyCtaBar({ pageType }: { pageType: PageType }) {
  const router = useRouter();
  const startCraft = useStartCraft();
  const [visible, setVisible] = useState(false);
  const shownFired = useRef(false);
  const primary = PRIMARY[pageType];

  useEffect(() => {
    const key = `tc_nudge_${pageType}`;
    try {
      const ts = Number(localStorage.getItem(key) ?? 0);
      if (ts && Date.now() - ts < DISMISS_DAYS * 86400_000) return; // recently dismissed
    } catch {
      /* ignore */
    }

    const onScroll = () => {
      if (window.scrollY > SCROLL_TRIGGER) {
        setVisible(true);
        if (!shownFired.current) {
          shownFired.current = true;
          gtm.nudgeShown({ page_type: pageType, placement: "sticky" });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pageType]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(`tc_nudge_${pageType}`, String(Date.now()));
    } catch {
      /* ignore */
    }
    gtm.nudgeDismissed({ page_type: pageType, placement: "sticky" });
  };

  const handleCta = () => {
    if (primary.target === "craft") {
      startCraft({ pageType, placement: "sticky" });
    } else {
      gtm.landingNextCta({ page_type: pageType, target: "trivia", placement: "sticky" });
      router.push("/trivia");
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto flex items-center gap-2 pointer-events-auto rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl shadow-black/50 p-2 pl-4">
        <button
          onClick={handleCta}
          className="flex-1 flex items-center gap-2 py-2.5 text-left"
        >
          <span className="text-xl shrink-0">{primary.emoji}</span>
          <span className="font-black text-white text-sm leading-tight">{primary.label}</span>
          <span className="ml-auto text-orange-400 font-bold text-sm shrink-0">→</span>
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}
