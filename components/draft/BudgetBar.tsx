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

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xs font-bold text-zinc-400 tracking-widest whitespace-nowrap">BUDGET</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-display text-sm font-black whitespace-nowrap ${isCritical ? "pulse-red text-red-400" : "text-white"}`}>
        {remaining}
        <span className="text-zinc-500 font-normal text-xs"> / {TOTAL_BUDGET}</span>
      </span>
    </div>
  );
}
