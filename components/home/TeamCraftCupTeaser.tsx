"use client";

import { useEffect, useState } from "react";
import { CupLeaderboardEntry } from "@/types";
import { currentCupWeek } from "@/lib/cupWeek";

export default function TeamCraftCupTeaser() {
  const [leaderboard, setLeaderboard] = useState<CupLeaderboardEntry[]>([]);
  const [cupWeek, setCupWeek] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const week = currentCupWeek();
    setCupWeek(week);
    fetch(`/api/cup/leaderboard?cupWeek=${week}`)
      .then((r) => r.json())
      .then((data) => {
        setLeaderboard(data.leaderboard ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasEntries = leaderboard.length > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-amber-800/40 bg-gradient-to-br from-amber-900/20 via-zinc-900 to-zinc-900 p-5">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="glow-breathe absolute -top-8 -right-8 w-40 h-40 rounded-full bg-amber-500/8 blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-base font-black text-white tracking-widest uppercase">
                🏆 TeamCraft Cup
              </p>
              {cupWeek && (
                <p className="text-xs text-amber-400 font-bold tracking-wider mt-0.5">{cupWeek}</p>
              )}
            </div>
            <a
              href="/cup"
              className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors"
            >
              View All →
            </a>
          </div>

          {loading ? (
            <div className="h-24 flex items-center justify-center text-zinc-600 text-sm">
              Loading standings...
            </div>
          ) : !hasEntries ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-zinc-400">No teams entered this week yet.</p>
              <p className="text-xs text-zinc-600">Draft your squad and enter the Cup from the result screen!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={entry.entryId} className="flex items-center gap-3">
                  <span className={`text-xs font-black w-5 text-right shrink-0 ${
                    i === 0 ? "text-amber-400" :
                    i === 1 ? "text-zinc-300" :
                    i === 2 ? "text-orange-600" : "text-zinc-600"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-white truncate">{entry.name}</span>
                  <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                    {entry.wins}W–{entry.losses}L
                  </span>
                  <span className={`text-xs font-bold shrink-0 tabular-nums ${
                    entry.pointDiff > 0 ? "text-orange-400" : entry.pointDiff < 0 ? "text-zinc-500" : "text-zinc-600"
                  }`}>
                    {entry.pointDiff > 0 ? "+" : ""}{entry.pointDiff}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-600 text-center">
              Draft a team → Enter Rankings → Enter the Cup → 7 matches over 7 days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
