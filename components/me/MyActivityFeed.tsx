"use client";

import { useState, useEffect, useCallback } from "react";
import ActivityFeedCard, { type SimEntry, type TriviaEntry } from "@/components/common/ActivityFeedCard";

const PAGE_LIMIT = 20;

// Shows the signed-in user's own Simulate or Trivia posts, using the same
// ActivityFeedCard rendering as the /feed list.
export default function MyActivityFeed({
  type,
  userId,
}: {
  type: "sim" | "trivia";
  userId: string;
}) {
  const [entries, setEntries] = useState<(SimEntry | TriviaEntry)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const endpoint = type === "sim" ? "/api/sim/feed" : "/api/trivia/feed";
  const label = type === "sim" ? "🔥 Your Simulations" : "🏀 Your Trivia Results";
  const emoji = type === "sim" ? "⚔️" : "🧠";

  const fetchFeed = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ userId, limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${endpoint}?${params}`);
    return (await res.json()) as { feed: (SimEntry | TriviaEntry)[]; nextCursor: string | null };
  }, [endpoint, userId]);

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    setNextCursor(null);
    fetchFeed()
      .then(({ feed, nextCursor }) => {
        setEntries(feed);
        setNextCursor(nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchFeed]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { feed: more, nextCursor: next } = await fetchFeed(nextCursor);
      setEntries((prev) => [...prev, ...more]);
      setNextCursor(next);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <div className="h-16 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 px-4 space-y-2 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <p className="text-2xl">{emoji}</p>
        <p className="text-sm text-zinc-500">No posts yet.</p>
        <p className="text-xs text-zinc-600">Share a result to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-0.5">{label}</p>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {entries.map((entry) =>
          type === "sim" ? (
            <ActivityFeedCard key={entry.id} type="sim" entry={entry as SimEntry} />
          ) : (
            <ActivityFeedCard key={entry.id} type="trivia" entry={entry as TriviaEntry} />
          )
        )}
      </div>
      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-2 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
