"use client";

import { TOTAL_BUDGET } from "@/types";

interface BudgetBarProps {
  used: number;
}

export default function BudgetBar({ used }: BudgetBarProps) {
  const remaining = TOTAL_BUDGET - used;
  const pct = Math.min(100, (used / TOTAL_BUDGET) * 100);
  const isCritical = remaining <= 3;
  const isWarning = remaining <= 6;

  const barColor = isCritical ? "bg-red-500" : isWarning ? "bg-yellow-400" : "bg-emerald-400";
  const numColor = isCritical ? "text-red-400" : isWarning ? "text-yellow-300" : "text-white";

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xs font-bold text-zinc-400 tracking-widest whitespace-nowrap">BUDGET</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} ${isCritical ? "pulse-red" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        {/* key forces a remount so the tick animation replays each time the
            remaining budget changes — makes the count-down visceral on camera */}
        <span key={remaining} className={`budget-tick font-display text-lg font-black tabular-nums ${numColor}`}>
          {remaining}
        </span>
        <span className="text-zinc-500 font-normal text-xs">/ {TOTAL_BUDGET} left</span>
      </span>
    </div>
  );
}
