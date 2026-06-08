"use client";

import { TeamEvaluation } from "@/types";
import TierBadge from "./TierBadge";
import RadarChart from "./RadarChart";

interface TeamStatsProps {
  evaluation: TeamEvaluation;
  teamName: string;
}

const STAT_ITEMS = [
  { key: "overall",    label: "Overall"    },
  { key: "offense",    label: "Offense"    },
  { key: "defense",    label: "Defense"    },
  { key: "rebound",    label: "Rebound"    },
  { key: "playmaking", label: "Playmaking" },
] as const;

function StatBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-orange-400" :
    value >= 65 ? "bg-blue-400" :
    "bg-zinc-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-bold text-white w-8 text-right">{value}</span>
    </div>
  );
}

export default function TeamStats({ evaluation, teamName }: TeamStatsProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start gap-4 mb-5">
        <TierBadge tier={evaluation.tier} />
        <div className="flex-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Team Rating</p>
          <p className="text-3xl font-black text-white leading-tight">{evaluation.overall}</p>
          {teamName && (
            <p className="text-sm text-orange-400 font-semibold mt-0.5 truncate">{teamName}</p>
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
