"use client";

import { useRouter } from "next/navigation";
import { overallColor } from "@/lib/overallColor";
import { PublicTeam } from "@/types";

interface RankingRowProps {
  team: PublicTeam;
  rank: number;
  sortKey: string;
}

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  A: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  B: "text-sky-400 border-sky-400/40 bg-sky-400/10",
  C: "text-zinc-400 border-zinc-600 bg-zinc-800",
  D: "text-zinc-500 border-zinc-700 bg-zinc-900",
};

export default function RankingRow({ team, rank, sortKey }: RankingRowProps) {
  const router = useRouter();
  const tierColor = TIER_COLORS[team.tier] ?? TIER_COLORS.D;
  const sortValue = team[sortKey as keyof PublicTeam] as number;
  const topThree = rank <= 3;

  const rankDisplay =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <button
      onClick={() => router.push(`/team/${team.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors text-left"
    >
      {/* Rank */}
      <span className={`font-display font-black w-8 shrink-0 text-center ${topThree ? "text-lg" : "text-sm text-zinc-500"}`}>
        {rankDisplay}
      </span>

      {/* Team info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{team.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">
          {team.roster_json.slice(0, 3).map((p) => p.name.split(" ").pop()).join(" · ")}
        </p>
      </div>

      {/* Sort key value */}
      {sortKey !== "overall" && (
        <div className="text-right shrink-0">
          <p className={`font-display text-xs font-black ${overallColor(sortValue)}`}>{sortValue}</p>
          <p className="text-xs text-zinc-600">{sortKey}</p>
        </div>
      )}

      {/* Overall + Tier */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-display text-lg font-black ${overallColor(team.overall)}`}>{team.overall}</span>
        <span className={`font-display text-xs font-bold px-1.5 py-0.5 rounded border ${tierColor}`}>
          {team.tier}
        </span>
      </div>

      {/* Likes */}
      <div className="flex items-center gap-1 shrink-0 w-12 justify-end">
        <span className="text-xs text-zinc-500">❤️</span>
        <span className="text-xs text-zinc-500">{team.like_count}</span>
      </div>
    </button>
  );
}
