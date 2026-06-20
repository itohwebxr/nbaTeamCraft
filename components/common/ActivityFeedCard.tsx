"use client";

import Link from "next/link";
import FeedLikeButton from "./FeedLikeButton";

type SimEntry = {
  id: string;
  kind: "matchup" | "playoff" | "season";
  share_id: string | null;
  result_url: string | null;
  title: string;
  subtitle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

type TriviaEntry = {
  id: string;
  share_id: string;
  score: number;
  total: number;
  gmode: string;
  difficulty: string;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

type Props =
  | { type: "sim"; entry: SimEntry }
  | { type: "trivia"; entry: TriviaEntry };

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const KIND_EMOJI: Record<string, string> = {
  matchup: "⚔️",
  playoff: "🏆",
  season: "📅",
};

export default function ActivityFeedCard(props: Props) {
  const { type, entry } = props;

  const href =
    type === "sim"
      ? `/sim/${entry.id}`
      : `/trivia/feed/${entry.id}`;

  const avatarUrl = entry.avatar_url;
  const displayName = entry.display_name ?? "Anonymous";
  const likeCount = entry.like_count ?? 0;
  const commentCount = entry.comment_count ?? 0;

  let emoji = "🏀";
  let titleLine = "";
  let subtitleLine: string | null = null;

  if (type === "sim") {
    const sim = entry as SimEntry;
    emoji = KIND_EMOJI[sim.kind] ?? "⚔️";
    titleLine = sim.title;
    subtitleLine = sim.subtitle;
  } else {
    const trivia = entry as TriviaEntry;
    const pct = Math.round((trivia.score / trivia.total) * 100);
    emoji = trivia.score === trivia.total ? "🔥" : trivia.score >= trivia.total * 0.6 ? "💪" : "📚";
    titleLine = `${trivia.score}/${trivia.total} (${pct}%)`;
    const modeLabel = trivia.gmode === "daily" ? "Daily" : "Practice";
    const diffLabel = trivia.difficulty === "hard" ? "Hard" : "Normal";
    subtitleLine = `${modeLabel} · ${diffLabel}`;
  }

  return (
    <Link
      href={href}
      className="block px-4 py-4 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/60 last:border-0 text-left"
    >
      {/* Header: avatar + name + time */}
      <div className="flex items-center gap-2 mb-2">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full border border-zinc-700 shrink-0 object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs font-bold text-zinc-300 truncate">{displayName}</span>
        <span className="text-zinc-600 text-xs shrink-0">·</span>
        <span className="text-zinc-600 text-xs shrink-0">{timeAgo(entry.created_at)}</span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-base shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">{titleLine}</p>
          {subtitleLine && <p className="text-xs text-zinc-500">{subtitleLine}</p>}
        </div>
      </div>

      {/* Engagement row */}
      <div
        className="flex items-center gap-3"
        onClick={(e) => e.preventDefault()}
      >
        <FeedLikeButton
          feedType={type}
          feedId={entry.id}
          initialCount={likeCount}
          size="sm"
        />
        {commentCount > 0 && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <span>💬</span>
            <span>{commentCount}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
