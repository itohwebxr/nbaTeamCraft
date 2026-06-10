"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicTeam } from "@/types";
import RankingRow from "./RankingRow";

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "overall",  label: "Overall"  },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function RankingList() {
  const [activeTab, setActiveTab] = useState<TabKey>("trending");
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTeams = useCallback(async (tab: TabKey, cursor?: string) => {
    const params = new URLSearchParams({ sort: tab, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/public-teams?${params}`);
    const data = await res.json();
    return data as { teams: PublicTeam[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    setLoading(true);
    setTeams([]);
    setNextCursor(null);
    fetchTeams(activeTab)
      .then(({ teams, nextCursor }) => {
        setTeams(teams);
        setNextCursor(nextCursor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, fetchTeams]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { teams: more, nextCursor: next } = await fetchTeams(activeTab, nextCursor);
      setTeams((prev) => [...prev, ...more]);
      setNextCursor(next);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === key
                ? "bg-orange-500 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-sm">No teams yet.</p>
          <p className="text-xs mt-1">Be the first to enter the rankings!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((team, i) => (
            <RankingRow
              key={team.id}
              team={team}
              rank={i + 1}
              sortKey={activeTab === "trending" ? "overall" : activeTab}
            />
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
