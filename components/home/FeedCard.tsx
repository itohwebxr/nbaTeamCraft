"use client";

import Link from "next/link";
import { overallColor } from "@/lib/overallColor";
import type { HomeTeam } from "@/lib/homeTeams";
import LikeButton from "@/components/common/LikeButton";
import Avatar from "@/components/common/Avatar";

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


export default function FeedCard({
  team,
  onDelete,
}: {
  team: HomeTeam;
  onDelete?: () => void;
}) {
  const starters = team.roster_json.slice(0, 5);

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <Link
        href={`/team/${team.id}`}
        className="block px-4 pt-4 pb-2 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {/* Header row: creator + time */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar
            src={team.creator?.avatarUrl}
            name={team.creator?.displayName ?? team.creator?.xHandle}
            className="w-6 h-6 rounded-full border border-zinc-700 shrink-0"
            textClassName="text-[10px]"
          />
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

        {/* Roster preview */}
        <div className="space-y-1 mt-1">
          {starters.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] font-black w-6 shrink-0 text-zinc-400">
                {p.assignedPosition}
              </span>
              <span className="text-xs text-zinc-300 truncate flex-1">{p.name}</span>
              <span className="text-xs font-black shrink-0 text-white">{p.overall}</span>
            </div>
          ))}
        </div>
      </Link>

      {/* Engagement row — outside Link so like button works independently */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        <LikeButton teamId={team.id} initialCount={team.like_count ?? 0} size="sm" />
        {(team.comment_count ?? 0) > 0 && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <span>💬</span>{team.comment_count}
          </span>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto shrink-0 text-zinc-600 hover:text-red-400 text-lg leading-none transition-colors"
            title="Delete team"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
