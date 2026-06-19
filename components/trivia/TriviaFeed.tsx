"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FeedEntry = {
  id: string;
  share_id: string;
  score: number;
  total: number;
  gmode: string;
  difficulty: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TriviaFeed() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trivia/feed?limit=10")
      .then((r) => r.json())
      .then((data) => setFeed(data.feed ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-16 flex items-center justify-center text-zinc-600 text-sm">
        Loading feed...
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-600 text-sm">
        No shared results yet. Be the first!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-0.5">
        🏀 Recent Results
      </p>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {feed.map((entry) => {
          const pct = Math.round((entry.score / entry.total) * 100);
          const emoji = entry.score === entry.total ? "🔥" : entry.score >= entry.total * 0.6 ? "💪" : "📚";
          const modeLabel = entry.gmode === "daily" ? "Daily" : "Practice";
          const diffLabel = entry.difficulty === "hard" ? "Hard" : "Normal";

          return (
            <Link
              key={entry.id}
              href={`/trivia/result/${entry.share_id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors"
            >
              {/* Avatar */}
              {entry.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full border border-zinc-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-sm">
                  🧠
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {entry.display_name ?? "Anonymous"}
                </p>
                <p className="text-xs text-zinc-500">
                  {modeLabel} · {diffLabel}
                </p>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-orange-400">
                  {emoji} {entry.score}/{entry.total}
                </p>
                <p className="text-xs text-zinc-600">{pct}% · {timeAgo(entry.created_at)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
