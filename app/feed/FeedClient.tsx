"use client";

import { useState, useEffect, useCallback } from "react";
import FeedCard from "@/components/home/FeedCard";
import type { HomeTeam } from "@/lib/homeTeams";

const TABS = [
  { key: "builder", label: "🔥 Latest Builds" },
  { key: "dream",   label: "🏀 Latest Teams"  },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function FeedClient({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab === "dream" ? "dream" : "builder"
  );
  const [teams, setTeams] = useState<HomeTeam[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = useCallback(async (kind: TabKey, cursor?: string) => {
    const params = new URLSearchParams({ kind, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/feed?${params}`);
    const data = await res.json();
    return data as { teams: HomeTeam[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    setLoading(true);
    setTeams([]);
    setNextCursor(null);
    fetchFeed(activeTab)
      .then(({ teams, nextCursor }) => {
        setTeams(teams);
        setNextCursor(nextCursor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, fetchFeed]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { teams: more, nextCursor: next } = await fetchFeed(activeTab, nextCursor);
      setTeams((prev) => [...prev, ...more]);
      setNextCursor(next);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === key
                ? "bg-orange-500 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-zinc-800/60 last:border-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                <div className="h-3 w-24 rounded bg-zinc-800 animate-pulse" />
                <div className="ml-auto h-3 w-10 rounded bg-zinc-800 animate-pulse" />
              </div>
              <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse mb-2" />
              <div className="h-3 w-full rounded bg-zinc-800 animate-pulse mb-1" />
              <div className="h-3 w-1/2 rounded bg-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-sm">No posts yet.</p>
          <p className="text-xs mt-1">Be the first to post a team!</p>
        </div>
      ) : (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          {teams.map((team) => (
            <FeedCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {/* Load more */}
      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
