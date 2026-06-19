"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FeedEntry = {
  id: string;
  kind: "matchup" | "playoff" | "season";
  share_id: string | null;
  result_url: string | null;
  title: string;
  subtitle: string | null;
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

function entryHref(entry: FeedEntry): string {
  if (entry.share_id) return `/share/${entry.share_id}`;
  if (entry.result_url) return entry.result_url;
  return "#";
}

const KIND_EMOJI: Record<string, string> = {
  matchup: "⚔️",
  playoff: "🏆",
  season: "📅",
};

export default function SimFeed() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sim/feed?limit=10")
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
        🔥 Recent Simulations
      </p>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {feed.map((entry) => {
          const href = entryHref(entry);
          const emoji = KIND_EMOJI[entry.kind] ?? "⚔️";
          return (
            <Link
              key={entry.id}
              href={href}
              className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-sm">
                {entry.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  emoji
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{entry.title}</p>
                {entry.subtitle && (
                  <p className="text-xs text-zinc-500">{entry.subtitle}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-zinc-600">{timeAgo(entry.created_at)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
