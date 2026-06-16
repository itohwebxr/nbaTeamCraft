"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CupLeaderboardEntry, CupMatchSummary } from "@/types";
import { currentCupWeek, isoWeekLabel, weekStart } from "@/lib/cupWeek";
import HeaderAuth from "@/components/auth/HeaderAuth";

type LeaderboardEntry = CupLeaderboardEntry & { avatarUrl?: string; xHandle?: string };

function weekLabel(weekStr: string): string {
  const start = weekStart(weekStr);
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return `${fmt(start)}–${fmt(end)}`;
}

function previousWeek(weekStr: string): string {
  const start = weekStart(weekStr);
  const prev = new Date(start.getTime() - 7 * 86400000);
  return isoWeekLabel(prev);
}

function nextWeek(weekStr: string): string {
  const start = weekStart(weekStr);
  const next = new Date(start.getTime() + 7 * 86400000);
  return isoWeekLabel(next);
}

const TIER_COLORS: Record<string, string> = {
  S: "text-amber-400", A: "text-green-400", B: "text-blue-400",
  C: "text-purple-400", D: "text-zinc-500",
};

export default function CupPage() {
  const router = useRouter();
  const [cupWeek, setCupWeek] = useState(currentCupWeek());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cup/leaderboard?cupWeek=${cupWeek}`)
      .then((r) => r.json())
      .then((data) => setLeaderboard(data.leaderboard ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cupWeek]);

  const currentWeek = currentCupWeek();
  const isCurrentWeek = cupWeek === currentWeek;
  const canGoNext = cupWeek < currentWeek;

  const ranked = leaderboard.filter((e) => e.matchesPlayed > 0);
  const waiting = leaderboard.filter((e) => e.matchesPlayed === 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={28} width={52} className="object-contain" />
          </Link>
          <div className="flex-1" />
          <span className="text-sm font-black text-amber-400">🏆 CUP</span>
          <HeaderAuth />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Week selector */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCupWeek(previousWeek(cupWeek))}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-display font-black text-white text-base">{cupWeek}</p>
            <p className="text-xs text-zinc-500">{weekLabel(cupWeek)}</p>
            {isCurrentWeek && (
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Current Week</span>
            )}
          </div>
          <button
            onClick={() => canGoNext && setCupWeek(nextWeek(cupWeek))}
            disabled={!canGoNext}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>

        {/* Leaderboard */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Standings</p>
            {isCurrentWeek && (
              <p className="text-xs text-zinc-600">Updates in real-time</p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
              Loading...
            </div>
          ) : ranked.length === 0 ? (
            <div className="text-center py-10 px-6 space-y-3">
              <p className="text-3xl">🏀</p>
              <p className="text-sm text-zinc-400">
                {isCurrentWeek ? "No matches played yet this week." : "No data for this week."}
              </p>
              {isCurrentWeek && (
                <p className="text-xs text-zinc-600">
                  Draft a team and enter the Cup from the result screen!
                </p>
              )}
              <button
                onClick={() => router.push("/draft")}
                className="inline-flex mt-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
              >
                Start Drafting →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {ranked.map((entry, i) => (
                <LeaderboardRow key={entry.entryId} entry={entry} rank={i + 1} />
              ))}
              {waiting.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-zinc-900/50">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Entered — awaiting first match</p>
                  </div>
                  {waiting.map((entry) => (
                    <div key={entry.entryId} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-5 text-zinc-600 text-xs font-bold text-right">—</span>
                      <span className="flex-1 text-sm text-zinc-500 truncate">{entry.name}</span>
                      <span className="text-xs text-zinc-600">0W–0L</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* How the Cup works */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">How the Cup Works</p>
          <div className="space-y-2.5">
            {[
              { n: "01", text: "Draft your team and enter the Rankings & Cup from the result screen" },
              { n: "02", text: "Come back each day to play your daily match — full quarter scores & box score" },
              { n: "03", text: "7 matches over 7 days. Final standings lock on Sunday" },
              { n: "04", text: "Wins then point differential decides the champion" },
            ].map((item) => (
              <div key={item.n} className="flex gap-3">
                <span className="font-display text-orange-400 font-bold text-sm w-5 shrink-0">{item.n}</span>
                <span className="text-sm text-zinc-400 leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/draft")}
            className="w-full mt-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm transition-colors"
          >
            🏀 Draft & Enter the Cup →
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const maxMatches = 7;
  const perfColor =
    entry.wins >= 6 ? "text-amber-400" :
    entry.wins >= 4 ? "text-green-400" :
    entry.wins >= 2 ? "text-blue-400" : "text-zinc-400";

  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* Rank */}
      <div className="w-7 text-center shrink-0">
        {medal ? (
          <span className="text-base">{medal}</span>
        ) : (
          <span className="text-xs font-bold text-zinc-600">#{rank}</span>
        )}
      </div>

      {/* Avatar or placeholder */}
      {entry.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-zinc-700 shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <span className="text-xs text-zinc-500">🏀</span>
        </div>
      )}

      {/* Name + handle */}
      <div className="flex-1 min-w-0">
        <Link href={`/team/${entry.teamId}`} className="text-sm font-bold text-white hover:text-orange-400 transition-colors truncate block">
          {entry.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.xHandle && (
            <span className="text-[10px] text-zinc-600">@{entry.xHandle}</span>
          )}
          <span className={`text-[10px] font-bold ${TIER_COLORS[entry.tier] ?? "text-zinc-500"}`}>
            {entry.tier} · OVR {entry.overall}
          </span>
        </div>
      </div>

      {/* Record */}
      <div className="text-right shrink-0">
        <span className={`font-display font-black text-sm tabular-nums ${perfColor}`}>
          {entry.wins}–{entry.losses}
        </span>
        <div className="flex gap-0.5 mt-1 justify-end">
          {Array.from({ length: maxMatches }).map((_, i) => {
            const played = i < entry.matchesPlayed;
            // We don't have per-match results here, just aggregate — shade by win rate
            return (
              <div
                key={i}
                className={`w-2 h-2 rounded-sm ${
                  !played ? "bg-zinc-800" :
                  i < entry.wins ? "bg-orange-500" : "bg-zinc-600"
                }`}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1 tabular-nums">
          {entry.pointDiff > 0 ? "+" : ""}{entry.pointDiff} pts
        </p>
      </div>
    </div>
  );
}
