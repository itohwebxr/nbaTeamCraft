"use client";

import { useState, useEffect, useCallback } from "react";
import FeedCard from "@/components/home/FeedCard";
import ActivityFeedCard, { type SimEntry, type TriviaEntry } from "@/components/common/ActivityFeedCard";
import type { HomeTeam } from "@/lib/homeTeams";
import { gtm } from "@/lib/gtm";

type MainTab = "craft" | "simulate" | "trivia";
type CraftTab = "builder" | "dream";

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "craft",    label: "🏗️ Craft"    },
  { key: "simulate", label: "⚔️ Simulate" },
  { key: "trivia",   label: "🧠 Trivia"   },
];

const CRAFT_TABS: { key: CraftTab; label: string }[] = [
  { key: "builder", label: "🔥 Crafted Teams" },
  { key: "dream",   label: "🏀 Dream Teams"   },
];

function resolveInitial(initialTab?: string): { main: MainTab; craft: CraftTab } {
  switch (initialTab) {
    case "simulate":
      return { main: "simulate", craft: "builder" };
    case "trivia":
      return { main: "trivia", craft: "builder" };
    case "dream":
      return { main: "craft", craft: "dream" };
    case "craft":
    case "builder":
    default:
      return { main: "craft", craft: "builder" };
  }
}

const PAGE_LIMIT = 20;

export default function FeedClient({ initialTab }: { initialTab?: string }) {
  const initial = resolveInitial(initialTab);
  const [mainTab, setMainTab] = useState<MainTab>(initial.main);
  const [craftTab, setCraftTab] = useState<CraftTab>(initial.craft);

  useEffect(() => {
    gtm.feedTabView({ main_tab: mainTab, sub_tab: mainTab === "craft" ? craftTab : null });
  }, [mainTab, craftTab]);

  return (
    <div>
      {/* Main tabs */}
      <div className="flex gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-1.5 mb-4">
        {MAIN_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-colors ${
              mainTab === key
                ? "bg-orange-500 text-white"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mainTab === "craft" && (
        <>
          {/* Craft sub-tabs */}
          <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 mb-4">
            {CRAFT_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCraftTab(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  craftTab === key
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <CraftFeed kind={craftTab} />
        </>
      )}

      {mainTab === "simulate" && <ActivityFeed type="sim" />}
      {mainTab === "trivia" && <ActivityFeed type="trivia" />}
    </div>
  );
}

/* ─────────────────────────  Craft feed  ───────────────────────── */

function CraftFeed({ kind }: { kind: CraftTab }) {
  const [teams, setTeams] = useState<HomeTeam[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ kind, limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/feed?${params}`);
    return (await res.json()) as { teams: HomeTeam[]; nextCursor: string | null };
  }, [kind]);

  useEffect(() => {
    setLoading(true);
    setTeams([]);
    setNextCursor(null);
    fetchFeed()
      .then(({ teams, nextCursor }) => {
        setTeams(teams);
        setNextCursor(nextCursor);
      })
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
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <FeedSkeleton />;
  if (teams.length === 0) return <EmptyState />;

  return (
    <>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {teams.map((team) => (
          <FeedCard key={team.id} team={team} />
        ))}
      </div>
      <LoadMore show={!!nextCursor} loading={loadingMore} onClick={loadMore} />
    </>
  );
}

/* ─────────────────────  Simulate / Trivia feed  ───────────────────── */

function ActivityFeed({ type }: { type: "sim" | "trivia" }) {
  const [entries, setEntries] = useState<(SimEntry | TriviaEntry)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const endpoint = type === "sim" ? "/api/sim/feed" : "/api/trivia/feed";

  const fetchFeed = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${endpoint}?${params}`);
    return (await res.json()) as { feed: (SimEntry | TriviaEntry)[]; nextCursor: string | null };
  }, [endpoint]);

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    setNextCursor(null);
    fetchFeed()
      .then(({ feed, nextCursor }) => {
        setEntries(feed);
        setNextCursor(nextCursor);
      })
      .catch(console.error)
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

  if (loading) return <FeedSkeleton />;
  if (entries.length === 0) return <EmptyState />;

  return (
    <>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {entries.map((entry) =>
          type === "sim" ? (
            <ActivityFeedCard key={entry.id} type="sim" entry={entry as SimEntry} />
          ) : (
            <ActivityFeedCard key={entry.id} type="trivia" entry={entry as TriviaEntry} />
          )
        )}
      </div>
      <LoadMore show={!!nextCursor} loading={loadingMore} onClick={loadMore} />
    </>
  );
}

/* ────────────────────────────  Shared  ──────────────────────────── */

function FeedSkeleton() {
  return (
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
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-zinc-600">
      <p className="text-sm">No posts yet.</p>
      <p className="text-xs mt-1">Be the first to post!</p>
    </div>
  );
}

function LoadMore({ show, loading, onClick }: { show: boolean; loading: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full mt-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-colors disabled:opacity-50"
    >
      {loading ? "Loading..." : "Load More"}
    </button>
  );
}
