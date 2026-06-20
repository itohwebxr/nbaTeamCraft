"use client";

import Link from "next/link";
import { overallColor } from "@/lib/overallColor";
import type { HomeTeam } from "@/lib/homeTeams";
import LikeButton from "@/components/common/LikeButton";

const TIER_COLOR: Record<string, string> = {
  S: "text-yellow-400",
  A: "text-orange-400",
  B: "text-sky-400",
  C: "text-zinc-400",
  D: "text-zinc-500",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function FeedCard({ team }: { team: HomeTeam }) {
  const topPlayers = team.roster_json.slice(0, 4).map((p) => p.name.split(" ").pop()).join(" · ");

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <Link
        href={`/team/${team.id}`}
        className="block px-4 pt-4 pb-2 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {/* Header row: creator + time */}
        <div className="flex items-center gap-2 mb-2">
          {team.creator?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.creator.avatarUrl}
              alt=""
              className="w-6 h-6 rounded-full border border-zinc-700 shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-[10px] font-bold text-zinc-400">
              {team.creator?.displayName?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-xs font-bold text-zinc-300 truncate">
            {team.creator?.displayName ?? (team.creator?.xHandle ? `@${team.creator.xHandle}` : "Anonymous")}
          </span>
          <span className="text-zinc-600 text-xs shrink-0">·</span>
          <span className="text-zinc-600 text-xs shrink-0">{timeAgo(team.created_at)}</span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span className={`font-display text-sm font-black ${overallColor(team.overall)}`}>{team.overall}</span>
            <span className={`font-display text-xs font-bold ${TIER_COLOR[team.tier] ?? "text-zinc-500"}`}>{team.tier}</span>
          </div>
        </div>

        {/* Team name */}
        <p className="text-sm font-black text-white leading-tight mb-1 truncate">{team.name}</p>

        {/* Description */}
        {team.description ? (
          <p className="text-xs text-zinc-300 leading-relaxed mb-2 line-clamp-2">{team.description}</p>
        ) : null}

        {/* Players preview */}
        <p className="text-xs text-zinc-600 truncate">{topPlayers}</p>
      </Link>

      {/* Engagement row — outside Link so like button works independently */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        <LikeButton teamId={team.id} initialCount={team.like_count ?? 0} size="sm" />
        {(team.comment_count ?? 0) > 0 && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <span>💬</span>{team.comment_count}
          </span>
        )}
      </div>
    </div>
  );
}
