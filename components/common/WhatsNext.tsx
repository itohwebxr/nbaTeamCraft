"use client";

import Link from "next/link";
import { useStartCraft } from "@/hooks/useStartCraft";
import { gtm } from "@/lib/gtm";

type PageType = "team" | "sim" | "trivia";
type Target = "craft" | "simulate" | "trivia";

// Which two destinations to surface per landing type. We always cross-sell the
// categories the visitor is NOT currently on, filling the gaps called out in
// the retention plan (e.g. craft + trivia links from sim/trivia pages).
const NEXT: Record<PageType, Target[]> = {
  team: ["craft", "trivia"],
  sim: ["craft", "trivia"],
  trivia: ["craft", "simulate"],
};

const CARD: Record<Target, { emoji: string; title: string; sub: string; href: string; accent: string }> = {
  craft: {
    emoji: "🏗️",
    title: "Craft a Team",
    sub: "Build any NBA roster from any era",
    href: "/draft",
    accent: "from-orange-500/15 border-orange-500/30 hover:border-orange-500/60 text-orange-400",
  },
  simulate: {
    emoji: "⚔️",
    title: "Simulate a Matchup",
    sub: "Pit any two teams and run the numbers",
    href: "/matchup",
    accent: "from-sky-500/10 border-sky-500/20 hover:border-sky-500/40 text-sky-400",
  },
  trivia: {
    emoji: "🧠",
    title: "Play Daily Trivia",
    sub: "Test your NBA knowledge — new every day",
    href: "/trivia",
    accent: "from-purple-500/10 border-purple-500/20 hover:border-purple-500/40 text-purple-400",
  },
};

export default function WhatsNext({ pageType }: { pageType: PageType }) {
  const startCraft = useStartCraft();
  const targets = NEXT[pageType];

  const cardClass = (accent: string) =>
    `flex items-center gap-4 w-full py-4 px-5 rounded-2xl bg-gradient-to-r to-zinc-900 border transition-colors group text-left ${accent}`;

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-0.5">What&apos;s next?</p>
      {targets.map((target) => {
        const c = CARD[target];
        const inner = (
          <>
            <span className="text-3xl shrink-0">{c.emoji}</span>
            <div className="min-w-0">
              <p className="font-black text-white text-base leading-tight">{c.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{c.sub}</p>
            </div>
            <span className={`ml-auto font-bold text-sm shrink-0 group-hover:translate-x-1 transition-transform ${c.accent.split(" ").pop()}`}>→</span>
          </>
        );

        if (target === "craft") {
          return (
            <button
              key={target}
              onClick={() => startCraft({ pageType, placement: "whatsnext" })}
              className={cardClass(c.accent)}
            >
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={target}
            href={c.href}
            onClick={() => gtm.landingNextCta({ page_type: pageType, target, placement: "whatsnext" })}
            className={cardClass(c.accent)}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
