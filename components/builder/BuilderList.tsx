"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicTeam } from "@/types";
import RankingRow from "@/components/ranking/RankingRow";

// Latest-first gallery of Roster Builder (trade/FA scenario) rosters.
export default function BuilderList() {
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTeams = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ builder: "1", limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/public-teams?${params}`);
    const data = await res.json();
    return data as { teams: PublicTeam[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    fetchTeams()
      .then(({ teams, nextCursor }) => {
        setTeams(teams);
        setNextCursor(nextCursor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchTeams]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { teams: more, nextCursor: next } = await fetchTeams(nextCursor);
      setTeams((prev) => [...prev, ...more]);
      setNextCursor(next);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-900 animate-pulse" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <p className="text-2xl mb-2">🔧</p>
        <p className="text-sm">No builds yet.</p>
        <p className="text-xs mt-1">Be the first to build a trade or FA scenario!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {teams.map((team, i) => (
          <RankingRow key={team.id} team={team} rank={i + 1} sortKey="overall" />
        ))}
      </div>

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
