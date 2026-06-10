"use client";

import { useRouter } from "next/navigation";
import { overallColor } from "@/lib/overallColor";
import { PublicTeam } from "@/types";
import LikeButton from "@/components/common/LikeButton";

interface RankingRowProps {
  team: PublicTeam;
  rank: number;
  sortKey: string;
  highlightStat?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  A: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  B: "text-sky-400 border-sky-400/40 bg-sky-400/10",
  C: "text-zinc-400 border-zinc-600 bg-zinc-800",
  D: "text-zinc-500 border-zinc-700 bg-zinc-900",
};

const TOP_BORDERS: Record<number, string> = {
  1: "border-yellow-400/50 bg-gradient-to-r from-yellow-400/10 to-zinc-900",
  2: "border-zinc-400/50 bg-gradient-to-r from-zinc-400/10 to-zinc-900",
  3: "border-amber-700/60 bg-gradient-to-r from-amber-700/15 to-zinc-900",
};

export default function RankingRow({ team, rank, sortKey, highlightStat = false }: RankingRowProps) {
  const router = useRouter();
  const tierColor = TIER_COLORS[team.tier] ?? TIER_COLORS.D;
  const sortValue = team[sortKey as keyof PublicTeam] as number;
  const topThree = rank <= 3;

  const rankDisplay =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  const rowStyle = topThree
    ? `${TOP_BORDERS[rank]} hover:bg-zinc-800`
    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700";

  return (
    <div
      onClick={() => router.push(`/team/${team.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/team/${team.id}`);
      }}
      className={`row-in w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left cursor-pointer ${rowStyle}`}
      style={{ animationDelay: `${Math.min(rank - 1, 19) * 50}ms` }}
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

      {/* Highlighted stat for non-overall tabs */}
      {highlightStat && (
        <div className="text-right shrink-0">
          <p className={`font-display text-sm font-black ${overallColor(sortValue)}`}>{sortValue}</p>
          <p className="text-xs text-zinc-600 capitalize">{sortKey}</p>
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
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <LikeButton teamId={team.id} initialCount={team.like_count} size="sm" />
      </div>
    </div>
  );
}
