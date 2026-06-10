"use client";

import { useEffect, useState } from "react";
import { overallColor } from "@/lib/overallColor";
import { TeamEvaluation } from "@/types";
import TierBadge from "./TierBadge";
import RadarChart from "./RadarChart";

interface TeamStatsProps {
  evaluation: TeamEvaluation;
  teamName: string;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

const STAT_ITEMS = [
  { key: "overall",    label: "Overall"    },
  { key: "offense",    label: "Offense"    },
  { key: "defense",    label: "Defense"    },
  { key: "rebound",    label: "Rebound"    },
  { key: "playmaking", label: "Playmaking" },
] as const;

function StatBar({ label, value }: { label: string; value: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  const color =
    value >= 88 ? "bg-yellow-400" :
    value >= 76 ? "bg-emerald-400" :
    value >= 65 ? "bg-sky-400" :
    "bg-zinc-500";

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xs font-bold text-zinc-400 tracking-widest w-20 shrink-0">{label.toUpperCase()}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-display text-sm font-black text-white w-8 text-right">{value}</span>
    </div>
  );
}

export default function TeamStats({ evaluation, teamName }: TeamStatsProps) {
  const displayOverall = useCountUp(evaluation.overall);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      {/* Overall hero */}
      <div className="flex items-center gap-4 mb-5">
        <TierBadge tier={evaluation.tier} />
        <div className="flex-1">
          <p className="font-display text-xs font-bold text-zinc-500 tracking-[0.2em]">TEAM RATING</p>
          <p className="font-display text-5xl font-black text-white leading-none scale-in">
            {displayOverall}
          </p>
          {teamName && (
            <p className="font-display text-sm text-orange-400 font-bold mt-0.5 truncate tracking-wide">{teamName}</p>
          )}
        </div>
        <RadarChart
          offense={evaluation.offense}
          defense={evaluation.defense}
          rebound={evaluation.rebound}
          playmaking={evaluation.playmaking}
          size={120}
        />
      </div>

      <div className="space-y-3">
        {STAT_ITEMS.map(({ key, label }) => (
          <StatBar key={key} label={label} value={evaluation[key]} />
        ))}
      </div>
    </div>
  );
}
