"use client";

import { useEffect, useState, useCallback } from "react";
import { gtm } from "@/lib/gtm";
import { currentCupWeek } from "@/lib/cupWeek";
import { useAuth } from "@/hooks/useAuth";
import XLoginButton from "@/components/auth/XLoginButton";
import { CupEntry, CupMatchSummary } from "@/types";
import ExhibitionMatch from "./ExhibitionMatch";
import { GameResult } from "@/lib/simulateGame";

interface Props {
  entryId: string;
  browserId: string;
  teamName: string;
  teamOverall: number;
  teamTier: string;
  sharePageUrl?: string | null;
  cupWeek?: string;
  /** Show team name in the panel header (useful when multiple panels are stacked) */
  showTeamName?: boolean;
}

const MAX_MATCHES = 7;

export default function CupStatus({ entryId, browserId, teamName, teamOverall, teamTier, sharePageUrl, cupWeek: cupWeekProp, showTeamName }: Props) {
  const [entry, setEntry] = useState<CupEntry | null>(null);
  const [matches, setMatches] = useState<CupMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const { user } = useAuth();
  const [liveMatch, setLiveMatch] = useState<{
    opponent: { id: string; name: string; overall: number; tier: string; isLegend?: boolean };
    result: GameResult;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/cup/status?entryId=${encodeURIComponent(entryId)}&browserId=${encodeURIComponent(browserId)}`);
    const json = await res.json();
    if (json.entry) setEntry(json.entry);
    if (json.matches) setMatches(json.matches);
    setLoading(false);
  }, [browserId, entryId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const playToday = async () => {
    if (playing) return;
    setPlaying(true);
    setPlayError(null);
    try {
      const res = await fetch("/api/cup/daily-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, browserId, userId: user?.id }),
      });
      const json = await res.json();
      if (json.alreadyPlayed) {
        await fetchStatus();
        return;
      }
      if (json.cupFinished) {
        await fetchStatus();
        return;
      }
      if (!res.ok) {
        setPlayError(json.error ?? `Match failed (${res.status})`);
        return;
      }
      if (json.result) {
        gtm.cupDailyMatch({
          result: json.result.won ? "win" : "loss",
          score_for: json.result.userScore,
          score_against: json.result.oppScore,
          opponent_name: json.opponent.name,
          is_legend_opponent: !!json.opponent.isLegend,
          match_number: entry ? entry.wins + entry.losses + 1 : 1,
          cup_week: entry?.cup_week ?? "",
        });
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
    } catch (e) {
      setPlayError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPlaying(false);
    }
  };

  const shareCupResult = (wins: number, losses: number) => {
    const week = cupWeekProp ?? entry?.cup_week ?? "";
    const text = `🏀 ${teamName}\nTeamCraft Cup ${week}: ${wins}W–${losses}L\nOverall: ${teamOverall} (${teamTier} Tier)\nCreated by #NBATeamCraft`;
    // Build OG URL for cup mode
    const origin = window.location.origin;
    const ogParams = new URLSearchParams({
      name: teamName,
      overall: String(teamOverall),
      tier: teamTier,
      mode: "cup",
      cup_wins: String(wins),
      cup_losses: String(losses),
      cup_week: week,
    });
    const shareUrl = sharePageUrl ?? origin;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, "_blank", "noopener");
    gtm.cupShare({ wins, losses, cup_week: week, team_overall: teamOverall });
    // Preload OG image so Twitter card picks it up
    void fetch(`${origin}/api/og?${ogParams.toString()}`);
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
  // The cup is over either when all 7 matches are played OR when the entry's
  // week is no longer the current one (past weeks can't be played anymore).
  const weekEnded = entry.cup_week !== currentCupWeek();
  const cupFinished = played >= MAX_MATCHES || weekEnded;

  return (
    <>
      <div className="bg-zinc-900 border border-amber-700/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-amber-900/10 border-b border-amber-700/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-black text-amber-400 shrink-0">🏆 TEAMCRAFT CUP</span>
            {showTeamName ? (
              <span className="text-sm font-bold text-white truncate">{teamName}</span>
            ) : (
              <span className="text-xs text-zinc-500">{entry.cup_week}</span>
            )}
          </div>
          {!cupFinished && (
            <span className="text-xs text-zinc-400 shrink-0 ml-2">{remaining} match{remaining !== 1 ? "es" : ""} left</span>
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
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-bold text-amber-400">
                  {entry.wins >= 6 ? "🏆 Dominant performance!" : entry.wins >= 4 ? "💪 Solid Cup run!" : entry.wins >= 2 ? "Keep building!" : "Tough week — draft again!"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Final: {entry.wins}–{entry.losses} · Pts diff: {entry.points_for - entry.points_against > 0 ? "+" : ""}{entry.points_for - entry.points_against}
                </p>
              </div>
              <button
                onClick={() => shareCupResult(entry.wins, entry.losses)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>𝕏</span> Share Cup Result
              </button>
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

          {playError && (
            <p className="mt-2 text-center text-xs text-red-400">{playError}</p>
          )}

          {/* X login prompt / logged-in indicator */}
          {!user ? (
            !cupFinished && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <XLoginButton user={null} browserId={browserId} returnTo="/result" />
                <p className="text-[10px] text-zinc-600 text-center mt-1.5">
                  Sign in to show your X handle on the Cup leaderboard
                </p>
              </div>
            )
          ) : (
            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-400 truncate">
                Signed in{user.xHandle ? <span className="text-zinc-500"> · @{user.xHandle}</span> : null}
              </p>
              <XLoginButton user={user} browserId={browserId} returnTo="/result" compact />
            </div>
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
          cupMode
        />
      )}
    </>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
