"use client";

import { useEffect, useState, useCallback } from "react";
import { CupEntry, CupMatchSummary } from "@/types";
import ExhibitionMatch from "./ExhibitionMatch";
import { GameResult } from "@/lib/simulateGame";

interface Props {
  entryId: string;
  browserId: string;
  teamName: string;
  teamOverall: number;
  teamTier: string;
}

const MAX_MATCHES = 7;

export default function CupStatus({ entryId, browserId, teamName, teamOverall, teamTier }: Props) {
  const [entry, setEntry] = useState<CupEntry | null>(null);
  const [matches, setMatches] = useState<CupMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [liveMatch, setLiveMatch] = useState<{
    opponent: { id: string; name: string; overall: number; tier: string; isLegend?: boolean };
    result: GameResult;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/cup/status?browserId=${encodeURIComponent(browserId)}`);
    const json = await res.json();
    if (json.entry) setEntry(json.entry);
    if (json.matches) setMatches(json.matches);
    setLoading(false);
  }, [browserId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const playToday = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      const res = await fetch("/api/cup/daily-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, browserId }),
      });
      const json = await res.json();
      if (json.alreadyPlayed) {
        await fetchStatus();
        return;
      }
      if (json.result) {
        setLiveMatch({
          opponent: json.opponent,
          result: {
            quarters: json.result.quarters,
            homeTotal: json.result.userScore,
            awayTotal: json.result.oppScore,
            winner: json.result.won ? "home" : "away",
            overtime: json.result.overtime ?? false,
            homeBox: json.result.userBox,
            awayBox: json.result.oppBox,
          },
        });
        await fetchStatus();
      }
    } finally {
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-center h-28 text-zinc-500 text-sm">
        Loading cup status...
      </div>
    );
  }
  if (!entry) return null;

  const played = entry.wins + entry.losses;
  const remaining = MAX_MATCHES - played;
  const alreadyPlayedToday = matches.some((m) => m.played_on === todayStr());
  const cupFinished = played >= MAX_MATCHES;

  return (
    <>
      <div className="bg-zinc-900 border border-amber-700/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-amber-900/10 border-b border-amber-700/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-400">🏆 TEAMCRAFT CUP</span>
            <span className="text-xs text-zinc-500">{entry.cup_week}</span>
          </div>
          {!cupFinished && (
            <span className="text-xs text-zinc-400">{remaining} match{remaining !== 1 ? "es" : ""} left</span>
          )}
        </div>

        {/* Record + progress */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="font-display text-3xl font-black text-white">{entry.wins}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">W</p>
            </div>
            <div className="text-zinc-600 text-xl font-thin">—</div>
            <div className="text-center">
              <p className="font-display text-3xl font-black text-zinc-400">{entry.losses}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">L</p>
            </div>
            <div className="flex-1">
              <div className="flex gap-1 justify-end">
                {Array.from({ length: MAX_MATCHES }).map((_, i) => {
                  const m = matches[i];
                  return (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-sm text-[9px] flex items-center justify-center font-black ${
                        !m ? "bg-zinc-800 text-zinc-600" :
                        m.won ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {m ? (m.won ? "W" : "L") : (i < played ? "?" : i + 1)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Match history */}
          {matches.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {matches.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-xs">
                  <span className={`w-4 font-black ${m.won ? "text-orange-400" : "text-zinc-500"}`}>
                    {m.won ? "W" : "L"}
                  </span>
                  <span className="font-bold text-white tabular-nums w-14">
                    {m.userScore}–{m.oppScore}
                  </span>
                  <span className="text-zinc-500 flex-1 truncate">{m.opponent.name ?? "—"}</span>
                  <span className="text-zinc-600 shrink-0">{m.played_on.slice(5)}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          {cupFinished ? (
            <div className="text-center py-2">
              <p className="text-sm font-bold text-amber-400">Cup complete!</p>
              <p className="text-xs text-zinc-500 mt-1">
                Final record: {entry.wins}–{entry.losses} · Pts diff: {entry.points_for - entry.points_against > 0 ? "+" : ""}{entry.points_for - entry.points_against}
              </p>
            </div>
          ) : alreadyPlayedToday ? (
            <p className="text-center text-xs text-zinc-500">
              Today's match played. Come back tomorrow for the next one!
            </p>
          ) : (
            <button
              onClick={playToday}
              disabled={playing}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
            >
              {playing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Finding opponent...
                </>
              ) : (
                <>🏆 Play Today's Match (Day {played + 1}/7)</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Live match overlay */}
      {liveMatch && (
        <ExhibitionMatch
          userTeamName={teamName}
          userOverall={teamOverall}
          userTier={teamTier}
          opponent={liveMatch.opponent}
          result={liveMatch.result}
          sessionRecord={{ wins: entry.wins, losses: entry.losses }}
          onRematch={() => setLiveMatch(null)}
          onClose={() => setLiveMatch(null)}
        />
      )}
    </>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
