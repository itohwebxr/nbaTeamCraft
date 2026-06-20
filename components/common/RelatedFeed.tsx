"use client";

import { useEffect, useState } from "react";
import FeedCard from "@/components/home/FeedCard";
import ActivityFeedCard, { type SimEntry, type TriviaEntry } from "@/components/common/ActivityFeedCard";
import type { HomeTeam } from "@/lib/homeTeams";

type Props =
  | { variant: "team"; kind: "builder" | "dream"; excludeId: string }
  | { variant: "sim"; excludeId: string }
  | { variant: "trivia"; excludeId: string };

const MAX = 5;

// Lateral-discovery block: surfaces a few recent items of the same kind so a
// visitor who landed deep has somewhere to browse next. Reuses the exact cards
// from /feed (FeedCard / ActivityFeedCard).
export default function RelatedFeed(props: Props) {
  const { variant, excludeId } = props;
  const kind = props.variant === "team" ? props.kind : null;
  const [teams, setTeams] = useState<HomeTeam[]>([]);
  const [entries, setEntries] = useState<(SimEntry | TriviaEntry)[]>([]);
  const [loaded, setLoaded] = useState(false);

  const heading =
    variant === "team" ? "More teams" : variant === "sim" ? "Recent simulations" : "Recent results";

  useEffect(() => {
    const url =
      variant === "team"
        ? `/api/feed?kind=${kind}&limit=6`
        : variant === "sim"
        ? `/api/sim/feed?limit=6`
        : `/api/trivia/feed?limit=6`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (variant === "team") {
          setTeams(((data.teams ?? []) as HomeTeam[]).filter((t) => t.id !== excludeId).slice(0, MAX));
        } else {
          setEntries(((data.feed ?? []) as (SimEntry | TriviaEntry)[]).filter((e) => e.id !== excludeId).slice(0, MAX));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [variant, excludeId, kind]);

  if (!loaded) return null;
  if (variant === "team" ? teams.length === 0 : entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-0.5">{heading}</p>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {variant === "team"
          ? teams.map((t) => <FeedCard key={t.id} team={t} />)
          : entries.map((e) =>
              variant === "sim" ? (
                <ActivityFeedCard key={e.id} type="sim" entry={e as SimEntry} />
              ) : (
                <ActivityFeedCard key={e.id} type="trivia" entry={e as TriviaEntry} />
              )
            )}
      </div>
    </div>
  );
}
