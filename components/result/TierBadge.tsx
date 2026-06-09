"use client";

import { Tier } from "@/types";

const TIER_STYLES: Record<Tier, { bg: string; text: string; border: string; glow: string }> = {
  S: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-400/60", glow: "tier-glow-S" },
  A: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-400/60", glow: "tier-glow-A" },
  B: { bg: "bg-blue-500/20",   text: "text-blue-300",   border: "border-blue-400/60",   glow: "tier-glow-B" },
  C: { bg: "bg-zinc-500/20",   text: "text-zinc-300",   border: "border-zinc-500/50",   glow: "" },
  D: { bg: "bg-zinc-800/60",   text: "text-zinc-500",   border: "border-zinc-700",      glow: "" },
};

export default function TierBadge({ tier }: { tier: Tier }) {
  const s = TIER_STYLES[tier];
  return (
    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${s.bg} ${s.border} ${s.glow}`}>
      <span className={`font-display text-3xl font-black ${s.text}`}>{tier}</span>
    </div>
  );
}
