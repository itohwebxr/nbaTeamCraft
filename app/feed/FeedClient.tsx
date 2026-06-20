"use client";

import { useState, useEffect, useCallback } from "react";
import FeedCard from "@/components/home/FeedCard";
import ActivityFeedCard, { type SimEntry, type TriviaEntry } from "@/components/common/ActivityFeedCard";
import type { HomeTeam } from "@/lib/homeTeams";

type MainTab = "craft" | "simulate" | "trivia";
type FeedTab = "crafted" | "dream";

const LIMIT = 20;

function SkeletonRows() {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-b border-zinc-800/60 last:border-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-zinc-800 animate-pulse shrink-0" />
            <div className="h-3 w-24 rounded bg-zinc-800 animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse mb-2" />
          <div className="h-3 w-full rounded bg-zinc-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function CraftFeed({ kind }: { kind: "builder" | "dream" }) {
  const [teams, setTeams] = useState<HomeTeam[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ kind, limit: String(LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/feed?${params}`);
    const data = await res.json();
    return data as { teams: HomeTeam[]; nextCursor: string | null };
  }, [kind]);

  useEffect(() => {
    setLoading(true);
    setTeams([]);
    setNextCursor(null);
    fetchFeed()
      .then(({ teams, nextCursor }) => { setTeams(teams); setNextCursor(nextCursor); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchFeed]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { teams: more, nextCursor: next } = await fetchFeed(nextCursor);
      setTeams((prev) => [...prev, ...more]);
      setNextCursor(next);
    } finally { setLoadingMore(false); }
  };

  if (loading) return <SkeletonRows />;
  if (teams.length === 0) return (
    <div className="text-center py-16 text-zinc-600 text-sm">No posts yet.</div>
  );

  return (
    <>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {teams.map((team) => <FeedCard key={team.id} team={team} />)}
      </div>
      {nextCursor && (
        <button onClick={loadMore} disabled={loadingMore}
          className="w-full mt-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-colors disabled:opacity-50">
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}

function ActivityFeed({ kind }: { kind: "sim" | "trivia" }) {
  const [feed, setFeed] = useState<(SimEntry | TriviaEntry)[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const apiPath = kind === "sim" ? "/api/sim/feed" : "/api/trivia/feed";

  const fetchFeed = useCallback(async (off: number) => {
    const res = await fetch(`${apiPath}?limit=${LIMIT}&offset=${off}`);
    const data = await res.json();
    return data as { feed: (SimEntry | TriviaEntry)[]; hasMore: boolean };
  }, [apiPath]);

  useEffect(() => {
    setLoading(true);
    setFeed([]);
    setOffset(0);
    fetchFeed(0)
      .then(({ feed, hasMore }) => { setFeed(feed); setHasMore(hasMore); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchFeed]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const newOffset = offset + LIMIT;
    try {
      const { feed: more, hasMore: next } = await fetchFeed(newOffset);
      setFeed((prev) => [...prev, ...more]);
      setHasMore(next);
      setOffset(newOffset);
    } finally { setLoadingMore(false); }
  };

  if (loading) return <SkeletonRows />;
  if (feed.length === 0) return (
    <div className="text-center py-16 text-zinc-600 text-sm">No posts yet. Be the first!</div>
  );

  return (
    <>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {feed.map((entry) => (
          <ActivityFeedCard key={entry.id} type={kind} entry={entry as never} />
        ))}
      </div>
      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore}
          className="w-full mt-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-colors disabled:opacity-50">
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}

const MAIN_TABS: { key: MainTab; label: string; emoji: string }[] = [
  { key: "craft",    label: "Craft",    emoji: "🏗️" },
  { key: "simulate", label: "Simulate", emoji: "⚔️" },
  { key: "trivia",   label: "Trivia",   emoji: "🧠" },
];

function resolveMainTab(tab?: string): MainTab {
  if (tab === "sim") return "simulate";
  if (tab === "trivia") return "trivia";
  if (tab === "craft" || tab === "builder" || tab === "dream") return "craft";
  return "craft";
}

function resolveSubTab(tab?: string): FeedTab {
  return tab === "dream" ? "dream" : "crafted";
}

export default function FeedClient({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<MainTab>(resolveMainTab(initialTab));
  const [feedTab, setFeedTab] = useState<FeedTab>(resolveSubTab(initialTab));

  return (
    <div className="space-y-4">
      {/* Main tabs */}
      <div className="flex gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-1.5">
        {MAIN_TABS.map(({ key, label, emoji }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-colors ${
              activeTab === key ? "bg-orange-500 text-white" : "text-zinc-500 hover:text-zinc-200"
            }`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Craft tab */}
      {activeTab === "craft" && (
        <div className="space-y-3">
          <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
            <button onClick={() => setFeedTab("crafted")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                feedTab === "crafted" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              🔥 Crafted Teams
            </button>
            <button onClick={() => setFeedTab("dream")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                feedTab === "dream" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              🏀 Dream Teams
            </button>
          </div>
          <CraftFeed key={feedTab} kind={feedTab === "crafted" ? "builder" : "dream"} />
        </div>
      )}

      {/* Simulate tab */}
      {activeTab === "simulate" && <ActivityFeed key="sim" kind="sim" />}

      {/* Trivia tab */}
      {activeTab === "trivia" && <ActivityFeed key="trivia" kind="trivia" />}
    </div>
  );
}
