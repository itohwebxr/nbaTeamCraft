"use client";

import { TOTAL_BUDGET } from "@/types";

interface BudgetBarProps {
  used: number;
}

export default function BudgetBar({ used }: BudgetBarProps) {
  const remaining = TOTAL_BUDGET - used;
  const pct = Math.min(100, (used / TOTAL_BUDGET) * 100);

  const barColor =
    remaining <= 3 ? "bg-red-500" :
    remaining <= 6 ? "bg-yellow-400" :
    "bg-emerald-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 whitespace-nowrap">BUDGET</span>
      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-white whitespace-nowrap">
        {used}
        <span className="text-zinc-400 font-normal"> / {TOTAL_BUDGET}</span>
      </span>
    </div>
  );
}
