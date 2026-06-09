"use client";

import { Tier } from "@/types";

const TIER_STYLES: Record<Tier, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
  A: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/50" },
  B: { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/50"   },
  C: { bg: "bg-zinc-500/20",   text: "text-zinc-400",   border: "border-zinc-500/50"   },
  D: { bg: "bg-zinc-800/60",   text: "text-zinc-500",   border: "border-zinc-700"      },
};

export default function TierBadge({ tier }: { tier: Tier }) {
  const s = TIER_STYLES[tier];
  return (
    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 ${s.bg} ${s.border}`}>
      <span className={`text-2xl font-black ${s.text}`}>{tier}</span>
    </div>
  );
}
