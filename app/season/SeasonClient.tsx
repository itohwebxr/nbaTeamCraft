"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gtm } from "@/lib/gtm";
import { seasonGrade } from "@/lib/season";
import type { SeasonResult } from "@/app/api/season/simulate/route";
import { TeamPicker, TeamPick, RANDOM_ID } from "@/components/sim/TeamPicker";
import { SimCrossLinks } from "@/components/sim/SimCrossLinks";

// ── Helpers ──────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  A: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  B: "text-sky-400 border-sky-400/40 bg-sky-400/10",
  C: "text-zinc-400 border-zinc-600 bg-zinc-800",
  D: "text-zinc-500 border-zinc-700 bg-zinc-900",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`font-display text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[tier] ?? TIER_COLORS.D}`}>
      {tier}
    </span>
  );
}

// Tailwind text color for a season grade (mirrors the hex in lib/season).
const GRADE_TEXT: Record<string, string> = {
  DYNASTY: "text-amber-400",
  ELITE: "text-orange-400",
  CONTENDER: "text-green-400",
  PLAYOFF: "text-blue-400",
  FRINGE: "text-sky-400",
  LOTTERY: "text-purple-400",
  REBUILD: "text-zinc-400",
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

// Persist the result and open the X composer with the short share URL so the
// tweet carries the season OGP image.
async function shareToX(result: SeasonResult) {
  const { team, wins, losses, label } = result;
  const text = `🏀 ${team.name}: ${wins}-${losses} (${label})\nSimulated by #NBATeamCraft`;
  // Open blank tab synchronously (no noopener — we need to set location after await)
  const win = window.open("", "_blank");
  let shareUrl = window.location.origin + "/season";
  let shareId: string | null = null;
  try {
    const res = await fetch("/api/season/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "season",
        team: { name: team.name, tier: team.tier, overall: team.overall },
        wins,
        losses,
        label,
        blurb: result.blurb,
      }),
    });
    const json = await res.json();
    if (res.ok && json.url) {
      shareUrl = json.url;
      shareId = json.url.split("/share/")[1] ?? null;
    }
  } catch {
    // fall back to the generic season URL
  }
  fetch("/api/sim/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "season",
      share_id: shareId,
      title: `🏀 ${team.name}: ${wins}-${losses}`,
      subtitle: `Season · ${label}`,
    }),
  }).catch(() => {});
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  if (win) win.location.href = tweetUrl;
  else window.open(tweetUrl, "_blank");
}

// ── Playback: game-by-game reveal building to the final record ───────────

function SeasonPlayback({
  result,
  onReset,
  onRematch,
  sourceTeamId,
}: {
  result: SeasonResult;
  onReset: () => void;
  onRematch: () => void;
  sourceTeamId?: string | null;
}) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(0); // games shown so far
  const [done, setDone] = useState(false);
  const [posted, setPosted] = useState(false);
  const [posting, setPosting] = useState(false);
  const total = result.games.length;

  // Advance the game ticker. Eases out near the end for a touch of suspense.
  useEffect(() => {
    if (done || revealed >= total) return;
    if (reduced) {
      const t = setTimeout(() => setRevealed(total), 0);
      return () => clearTimeout(t);
    }
    // ~70ms per game early on, slowing slightly over the final stretch.
    const remaining = total - revealed;
    const step = remaining < 8 ? 150 : 70;
    const t = setTimeout(() => setRevealed((r) => Math.min(total, r + 1)), step);
    return () => clearTimeout(t);
  }, [revealed, done, total, reduced]);

  // Hold on the final grade once every game is in.
  useEffect(() => {
    if (revealed < total) return;
    const t = setTimeout(() => setDone(true), reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [revealed, total, reduced]);

  const winsSoFar = result.games.slice(0, revealed).filter(Boolean).length;
  const lossesSoFar = revealed - winsSoFar;
  const grade = seasonGrade(result.wins);
  const gradeClass = GRADE_TEXT[grade.label] ?? "text-white";

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
      <style>{`
        @keyframes sz-pop { 0% { transform: scale(.6); opacity: 0 } 55% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes sz-glow { 0%,100% { opacity: .3 } 50% { opacity: .65 } }
        @keyframes sz-fade { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
        .sz-pop { animation: sz-pop .7s cubic-bezier(.2,.9,.3,1.25) both }
        .sz-glow { animation: sz-glow 2.4s ease-in-out infinite }
        .sz-fade { animation: sz-fade .6s ease .3s both }
      `}</style>

      {/* Header — Back returns to the picker (same as the TOP screen). */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={onReset}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-display text-sm font-black uppercase tracking-widest">📅 Season Simulator</h1>
          {!done && (
            <button
              onClick={() => setDone(true)}
              className="ml-auto text-[11px] font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Skip ⏭
            </button>
          )}
        </div>
      </header>

      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-3.25rem)] px-5 py-8">
        {done && (
          <div
            aria-hidden
            className="sz-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${grade.color}55 0%, ${grade.color}1f 40%, transparent 70%)` }}
          />
        )}

        <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em] mb-1">
          82-Game Season
        </p>
        <h2 className="font-display text-2xl font-black text-white leading-tight mb-5">{result.team.name}</h2>

        {/* Live record */}
        <div className="flex items-baseline justify-center gap-3 mb-1">
          <span className="font-display text-6xl font-black text-orange-400 tabular-nums">{done ? result.wins : winsSoFar}</span>
          <span className="font-display text-3xl font-black text-zinc-600">—</span>
          <span className="font-display text-6xl font-black text-zinc-500 tabular-nums">{done ? result.losses : lossesSoFar}</span>
        </div>
        <p className="text-[11px] text-zinc-600 font-display tracking-widest mb-5">
          {done ? `${total} GP` : `GAME ${revealed} / ${total}`}
        </p>

        {/* 82-game pip grid */}
        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 w-full mb-6">
          {result.games.map((win, i) => {
            const shown = i < revealed;
            return (
              <span
                key={i}
                className={`aspect-square rounded-[2px] transition-colors duration-150 ${
                  !shown
                    ? "bg-zinc-800"
                    : win
                    ? "bg-green-500"
                    : "bg-rose-600/70"
                }`}
              />
            );
          })}
        </div>

        {/* Final grade */}
        {done ? (
          <div className="sz-fade w-full space-y-4">
            <div>
              <p className={`sz-pop font-display text-4xl font-black ${gradeClass}`}>{grade.label}</p>
              <p className="text-sm text-zinc-400 mt-1">{grade.blurb}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <TierBadge tier={result.team.tier} />
                <span className="font-display text-sm font-black text-orange-400">{result.team.overall} OVR</span>
                <span className="text-zinc-600 text-xs">·</span>
                <span className="text-xs text-zinc-400">{(result.winRate * 100).toFixed(0)}% per-game win odds</span>
              </div>
            </div>

            <button
              onClick={() => {
                gtm.seasonShare({ wins: result.wins, losses: result.losses, label: result.label });
                shareToX(result);
              }}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm transition-colors"
            >
              Share on 𝕏
            </button>
            {sourceTeamId && !posted && (
              <button
                onClick={async () => {
                  setPosting(true);
                  try {
                    await fetch(`/api/teams/${sourceTeamId}/simulations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "season",
                        result_data: {
                          wins: result.wins,
                          losses: result.losses,
                          label: result.label,
                          win_rate: result.winRate,
                        },
                      }),
                    });
                    setPosted(true);
                    setTimeout(() => router.push(`/team/${sourceTeamId}`), 800);
                  } catch {
                    setPosting(false);
                  }
                }}
                disabled={posting}
                className="w-full py-3 rounded-xl bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30 text-sky-300 font-bold text-sm transition-colors disabled:opacity-50"
              >
                {posted ? "✓ Posted!" : posting ? "Posting…" : "📌 Post to Team Page"}
              </button>
            )}
            <button
              onClick={onRematch}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
            >
              🔄 Run Again (Same Team)
            </button>
            <button
              onClick={onReset}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-sm transition-colors"
            >
              🏀 New Team
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <span className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin shrink-0" />
            <span className="text-xs text-zinc-500 font-display">Playing the season…</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ── Main client ─────────────────────────────────────────────────────────

export default function SeasonClient({ initialTeams }: { initialTeams?: import("@/components/sim/TeamPicker").TeamPick[] }) {
  const router = useRouter();
  const params = useSearchParams();

  // Pre-select the team when arriving from a team / result page.
  const [team, setTeam] = useState<TeamPick | null>(() => {
    const id = params.get("teamId");
    if (!id) return null;
    return {
      id,
      name: params.get("teamName") ?? "Selected Team",
      overall: Number(params.get("teamOverall")) || 0,
      tier: params.get("teamTier") ?? "C",
      is_sandbox: params.get("teamSandbox") === "1",
      created_at: "",
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeasonResult | null>(null);

  const simulate = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      gtm.seasonSimulate({ team_overall: team.id === RANDOM_ID ? 0 : team.overall });
      const res = await fetch("/api/season/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to simulate");
      setResult(json as SeasonResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to simulate");
    } finally {
      setLoading(false);
    }
  }, [team]);

  if (result) {
    const sourceId = params.get("teamId");
    return (
      <SeasonPlayback
        key={`${result.team.id}-${result.wins}-${result.losses}`}
        result={result}
        onReset={() => setResult(null)}
        onRematch={simulate}
        sourceTeamId={sourceId && sourceId !== RANDOM_ID ? sourceId : null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-display text-sm font-black uppercase tracking-widest">📅 Season Simulator</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <p className="text-center text-sm text-zinc-400">
          Pick one team and play out a full 82-game season. How many wins can your roster rack up?
        </p>

        {/* Team picker */}
        <div className="flex">
          <TeamPicker
            variant="stacked"
            label="Your Team"
            selected={team}
            onSelect={setTeam}
            initialTeams={initialTeams}
          />
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={simulate}
          disabled={!team || loading}
          className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-black text-base uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simulating…
            </>
          ) : (
            "📅 Simulate Season"
          )}
        </button>

        <SimCrossLinks current="season" />
      </div>
    </div>
  );
}
