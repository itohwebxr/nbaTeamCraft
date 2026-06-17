"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gtm } from "@/lib/gtm";
import type { PlayoffResult, SeriesSummary } from "@/app/api/playoff/simulate/route";

// ── Types ──────────────────────────────────────────────────────────────

type BracketSize = 4 | 8 | 16;

type TeamPick = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  is_historical?: boolean;
  is_sandbox: boolean;
  created_at: string;
};

const RANDOM_ID = "__random__";
const RANDOM_PICK: TeamPick = {
  id: RANDOM_ID,
  name: "🎲 Random",
  overall: 0,
  tier: "C",
  is_sandbox: false,
  created_at: "",
};

// All-Time presets. IDs are resolved server-side — we pass __random__ and the
// server picks real historical teams. The preset names are stored only for GTM.
const PRESETS: Record<BracketSize, { label: string; description: string }[]> = {
  4: [
    { label: "🎲 Random 4", description: "4 random teams" },
  ],
  8: [
    { label: "🎲 Random 8", description: "8 random teams" },
  ],
  16: [
    { label: "🎲 Random 16", description: "16 random teams" },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────

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

function shortScorer(name: string, max = 13): string {
  const parts = name.trim().split(/\s+/);
  let s = parts.length >= 2 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
  if (s.length > max) s = `${s.slice(0, max - 1)}…`;
  return s;
}

function roundName(roundIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIdx;
  if (fromEnd === 0) return "Finals";
  if (fromEnd === 1) return "Conference Finals";
  if (fromEnd === 2) return "Conference Semifinals";
  return `Round ${roundIdx + 1}`;
}

// Build a compact, OGP-friendly summary: the champion's road to the title.
function buildShareData(result: PlayoffResult) {
  const champId = result.champion.id;
  const totalRounds = result.rounds.length;
  const path = result.rounds
    .map((round, roundIdx) => {
      const s = round.find((x) => x.homeId === champId || x.awayId === champId);
      if (!s) return null;
      const champIsHome = s.homeId === champId;
      const opp = champIsHome ? s.away.name : s.home.name;
      const champWins = champIsHome ? s.wins.home : s.wins.away;
      const oppWins = champIsHome ? s.wins.away : s.wins.home;
      return { round: roundName(roundIdx, totalRounds), opp, score: `${champWins}-${oppWins}` };
    })
    .filter((x): x is { round: string; opp: string; score: string } => x !== null);
  const finalSeries = result.rounds[totalRounds - 1][0];
  return {
    kind: "playoff" as const,
    size: result.size,
    champion: { name: result.champion.name, tier: result.champion.tier, overall: result.champion.overall },
    path,
    finals: {
      home: finalSeries.home.name,
      away: finalSeries.away.name,
      hw: finalSeries.wins.home,
      aw: finalSeries.wins.away,
    },
  };
}

// Persist the result to get a short URL (the full bracket is too large for
// query params), then open the X composer with that link so it carries the
// champion OGP image.
async function shareToX(result: PlayoffResult) {
  const { champion, size } = result;
  const text = `🏆 ${champion.name} wins the ${size}-Team Playoff!\nSimulated on NBA TeamCraft ⚔️`;
  // Open the window synchronously to dodge popup blockers, then redirect it.
  const win = window.open("", "_blank", "noopener");
  let shareUrl = window.location.origin + "/playoffs";
  try {
    const res = await fetch("/api/playoff/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildShareData(result)),
    });
    const json = await res.json();
    if (res.ok && json.url) shareUrl = json.url;
  } catch {
    // fall back to the generic playoffs URL
  }
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n#NBATeamCraft #NBA @nbaTeamCraft\n`
  )}&url=${encodeURIComponent(shareUrl)}`;
  if (win) win.location.href = tweetUrl;
  else window.open(tweetUrl, "_blank", "noopener");
}

// ── TeamPicker ─────────────────────────────────────────────────────────

function TeamPicker({
  slot,
  selected,
  onSelect,
  usedIds,
}: {
  slot: number;
  selected: TeamPick | null;
  onSelect: (t: TeamPick | null) => void;
  usedIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeamPick[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropTop, setDropTop] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matchup/search?q=${encodeURIComponent(q)}&limit=10`);
      const json = await res.json();
      setResults((json.teams ?? []).filter((t: TeamPick) => !usedIds.has(t.id) || t.id === selected?.id));
      setHasMore(!!json.hasMore);
    } catch {
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [usedIds, selected]);

  const positionDropdown = useCallback(() => {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setDropTop(r.bottom + 6);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => runSearch(query.trim()), 220);
    return () => clearTimeout(id);
  }, [query, open, runSearch]);

  useEffect(() => {
    if (!open) return;
    positionDropdown();
    window.addEventListener("scroll", positionDropdown, true);
    window.addEventListener("resize", positionDropdown);
    return () => {
      window.removeEventListener("scroll", positionDropdown, true);
      window.removeEventListener("resize", positionDropdown);
    };
  }, [open, positionDropdown]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const seedLabel = `#${slot + 1}`;

  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-xs font-bold text-zinc-500 w-6 shrink-0">{seedLabel}</span>
      {selected ? (
        <button
          onClick={() => onSelect(null)}
          className="group flex-1 text-left bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-lg px-2.5 py-2 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white truncate">{selected.name}</span>
            {selected.id !== RANDOM_ID && <TierBadge tier={selected.tier} />}
          </div>
          <span className="block text-[10px] text-zinc-600 mt-0.5 group-hover:text-zinc-400">Tap to change</span>
        </button>
      ) : (
        <div ref={boxRef} className="flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setOpen(true);
              positionDropdown();
              if (results.length === 0) runSearch("");
            }}
            placeholder="Search team…"
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
          />
          {open && (
            <div
              className="fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-1.5rem)] max-w-lg max-h-[60vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"
              style={{ top: dropTop }}
            >
              {!query && (
                <button
                  onClick={() => { onSelect(RANDOM_PICK); setOpen(false); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 border-b border-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">🎲 Random</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Any team, chosen at random</span>
                </button>
              )}
              {loading && <p className="px-3 py-3 text-xs text-zinc-500">Searching…</p>}
              {!loading && results.length === 0 && query && (
                <p className="px-3 py-3 text-xs text-zinc-500">No teams found.</p>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 border-b border-zinc-800/60 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{t.name}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <TierBadge tier={t.tier} />
                      <span className="font-display text-xs font-black text-orange-400">{t.overall}</span>
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider ${t.is_historical ? "text-orange-400/80" : "text-zinc-600"}`}>
                    {t.is_historical ? "🏀 Real NBA Team" : t.is_sandbox ? "Roster Builder" : "Dream Draft"}
                  </span>
                </button>
              ))}
              {!loading && hasMore && (
                <p className="px-3 py-2.5 text-center text-[11px] text-zinc-500 border-t border-zinc-800">
                  Showing {results.length} — search to find more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Series card (collapsed / expanded) ─────────────────────────────────

function SeriesCard({
  s,
  roundLabel,
  expanded,
  onToggle,
}: {
  s: SeriesSummary;
  roundLabel: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const homeWon = s.winner === "home";
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-zinc-800/60 transition-colors text-left"
      >
        <span className="font-display text-[10px] font-bold text-zinc-500 w-24 shrink-0">{roundLabel}</span>
        <span className={`flex-1 text-xs font-bold truncate ${homeWon ? "text-white" : "text-zinc-500"}`}>{s.home.name}</span>
        <span className="font-display text-xs font-black tabular-nums shrink-0">
          <span className={homeWon ? "text-orange-400" : "text-zinc-500"}>{s.wins.home}</span>
          <span className="text-zinc-700 mx-1">-</span>
          <span className={!homeWon ? "text-orange-400" : "text-zinc-500"}>{s.wins.away}</span>
        </span>
        <span className={`flex-1 text-xs font-bold truncate text-right ${!homeWon ? "text-white" : "text-zinc-500"}`}>{s.away.name}</span>
        <span className="text-zinc-600 text-[10px] ml-1">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {s.games.map((g, i) => {
            const gHomeWon = g.winner === "home";
            return (
              <div key={i} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] font-bold text-zinc-500 w-6 shrink-0">G{i + 1}</span>
                  <span className={`flex-1 text-[11px] font-bold truncate ${gHomeWon ? "text-white" : "text-zinc-500"}`}>{s.home.name}</span>
                  <span className="font-display text-xs font-black tabular-nums shrink-0">
                    <span className={gHomeWon ? "text-orange-400" : "text-zinc-500"}>{g.homeTotal}</span>
                    <span className="text-zinc-700 mx-1">-</span>
                    <span className={!gHomeWon ? "text-orange-400" : "text-zinc-500"}>{g.awayTotal}</span>
                  </span>
                  <span className={`flex-1 text-[11px] font-bold truncate text-right ${!gHomeWon ? "text-white" : "text-zinc-500"}`}>{s.away.name}</span>
                  {g.overtime && <span className="text-[9px] text-amber-400 font-bold shrink-0">OT</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 pl-6 text-[10px] text-zinc-600">
                  <span className="flex-1 min-w-0 flex items-center gap-1">
                    <span className="shrink-0">🏀</span>
                    <span className="truncate">{shortScorer(g.hTopName)}</span>
                    <span className="font-bold text-zinc-400 shrink-0">{g.hTopPts}</span>
                  </span>
                  <span className="flex-1 min-w-0 flex items-center justify-end gap-1">
                    <span className="font-bold text-zinc-400 shrink-0">{g.aTopPts}</span>
                    <span className="truncate">{shortScorer(g.aTopName)}</span>
                    <span className="shrink-0">🏀</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Results view ────────────────────────────────────────────────────────

function PlayoffResults({
  result,
  onReset,
  onRematch,
}: {
  result: PlayoffResult;
  onReset: () => void;
  onRematch: () => void;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const totalRounds = result.rounds.length;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Champion */}
        <div className="text-center">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em] mb-2">
            🏆 Champion · {result.size}-Team Playoff
          </p>
          <h2 className="font-display text-3xl font-black text-white">{result.champion.name}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <TierBadge tier={result.champion.tier} />
            <span className="font-display text-sm font-black text-orange-400">{result.champion.overall}</span>
          </div>
        </div>

        {/* All rounds — latest (Finals) first for drama */}
        {[...result.rounds].reverse().map((round, revIdx) => {
          const roundIdx = result.rounds.length - 1 - revIdx;
          const label = roundName(roundIdx, totalRounds);
          return (
            <div key={roundIdx} className="space-y-2">
              <p className="font-display text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{label}</p>
              {round.map((s, si) => {
                const key = `${roundIdx}-${si}`;
                return (
                  <SeriesCard
                    key={key}
                    s={s}
                    roundLabel={`${label} G`}
                    expanded={expandedKey === key}
                    onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
                  />
                );
              })}
            </div>
          );
        })}

        <button
          onClick={() => {
            gtm.playoffShare({ size: result.size, champion: result.champion.name });
            shareToX(result);
          }}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm transition-colors"
        >
          Share on 𝕏
        </button>
        <button
          onClick={onRematch}
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
        >
          🔄 Run Again (Same Teams)
        </button>
        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-sm transition-colors"
        >
          ⚔️ New Playoff
        </button>
      </div>
    </div>
  );
}

// ── Playback: round-by-round animated reveal ───────────────────────────

function PlayoffPlayback({
  result,
  onReset,
  onRematch,
}: {
  result: PlayoffResult;
  onReset: () => void;
  onRematch: () => void;
}) {
  const [revealedRounds, setRevealedRounds] = useState(0);
  const [championReveal, setChampionReveal] = useState(false);
  const [done, setDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const totalRounds = result.rounds.length;

  useEffect(() => {
    if (done || championReveal || revealedRounds >= totalRounds) return;
    // Reveal one round at a time with a pause between
    const gamesInRound = result.rounds[revealedRounds].length;
    // 1.2s per matchup in the round, minimum 2s, maximum 6s
    const delay = Math.min(6000, Math.max(2000, gamesInRound * 1200));
    const t = setTimeout(() => setRevealedRounds((r) => r + 1), delay);
    return () => clearTimeout(t);
  }, [revealedRounds, done, championReveal, totalRounds, result.rounds]);

  // Once every round is revealed, hold on a champion celebration screen before
  // dropping into the full results — the climactic beat for video.
  useEffect(() => {
    if (revealedRounds > 0 && revealedRounds >= totalRounds && !championReveal) {
      const t = setTimeout(() => setChampionReveal(true), 700);
      return () => clearTimeout(t);
    }
  }, [revealedRounds, totalRounds, championReveal]);

  useEffect(() => {
    if (!championReveal) return;
    const t = setTimeout(() => setDone(true), 3400);
    return () => clearTimeout(t);
  }, [championReveal]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revealedRounds]);

  if (done) {
    return <PlayoffResults result={result} onReset={onReset} onRematch={onRematch} />;
  }

  if (championReveal) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden px-6">
        <style>{`
          @keyframes ch-pop { 0% { transform: scale(.5); opacity: 0 } 55% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
          @keyframes ch-glow { 0%,100% { opacity: .35 } 50% { opacity: .7 } }
          @keyframes ch-fade { 0% { opacity: 0; transform: translateY(10px) } 100% { opacity: 1; transform: translateY(0) } }
          .ch-pop { animation: ch-pop .7s cubic-bezier(.2,.9,.3,1.25) both }
          .ch-glow { animation: ch-glow 2.4s ease-in-out infinite }
          .ch-fade { animation: ch-fade .6s ease .4s both }
        `}</style>
        <div
          aria-hidden
          className="ch-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(245,158,11,0.12) 40%, transparent 70%)" }}
        />
        <button
          onClick={() => setDone(true)}
          className="absolute top-5 right-5 text-[11px] font-bold text-zinc-500 hover:text-white transition-colors z-10"
        >
          Skip ⏭
        </button>
        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="ch-pop text-7xl mb-3">🏆</span>
          <p className="ch-fade font-display text-sm font-bold text-orange-400 uppercase tracking-[0.4em] mb-2">
            {result.size}-Team Playoff Champion
          </p>
          <h2 className="ch-pop font-display text-5xl font-black text-white leading-tight">{result.champion.name}</h2>
          <div className="ch-fade flex items-center justify-center gap-3 mt-4">
            <TierBadge tier={result.champion.tier} />
            <span className="font-display text-lg font-black text-orange-400">{result.champion.overall} OVR</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur overflow-y-auto">
      <style>{`
        @keyframes rd-rise { 0% { transform: translateY(20px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
        .rd-rise { animation: rd-rise .5s cubic-bezier(.2,.7,.2,1) both }
      `}</style>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em]">
            🏆 {result.size}-Team Playoff
          </p>
          <button
            onClick={() => {
              gtm.playoffRoundSkip({ round: revealedRounds, size: result.size });
              setDone(true);
            }}
            className="text-[11px] font-bold text-zinc-500 hover:text-white transition-colors"
          >
            Skip ⏭
          </button>
        </div>

        {result.rounds.slice(0, revealedRounds).map((round, roundIdx) => {
          const label = roundName(roundIdx, totalRounds);
          return (
            <div key={roundIdx} className="rd-rise space-y-2">
              <p className="font-display text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{label}</p>
              {round.map((s, si) => {
                const homeWon = s.winner === "home";
                return (
                  <div key={si} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 text-xs font-bold truncate ${homeWon ? "text-white" : "text-zinc-500"}`}>{s.home.name}</span>
                      <span className="font-display text-sm font-black tabular-nums shrink-0">
                        <span className={homeWon ? "text-orange-400" : "text-zinc-500"}>{s.wins.home}</span>
                        <span className="text-zinc-700 mx-1">-</span>
                        <span className={!homeWon ? "text-orange-400" : "text-zinc-500"}>{s.wins.away}</span>
                      </span>
                      <span className={`flex-1 text-xs font-bold truncate text-right ${!homeWon ? "text-white" : "text-zinc-500"}`}>{s.away.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 text-center">
                      → <span className="text-white font-bold">{homeWon ? s.home.name : s.away.name}</span> advances
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}

        {revealedRounds < totalRounds && (
          <div className="flex items-center gap-2 py-2">
            <span className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin shrink-0" />
            <span className="text-xs text-zinc-500 font-display">
              {roundName(revealedRounds, totalRounds)} in progress…
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Main client ─────────────────────────────────────────────────────────

const SIZE_OPTIONS: BracketSize[] = [4, 8, 16];

export default function PlayoffClient() {
  const router = useRouter();
  const [size, setSize] = useState<BracketSize>(8);
  const [teams, setTeams] = useState<(TeamPick | null)[]>(() => Array(8).fill(null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlayoffResult | null>(null);
  const [presetLabel, setPresetLabel] = useState("custom");

  // Resize team slots when size changes
  const handleSizeChange = (newSize: BracketSize) => {
    setSize(newSize);
    setTeams((prev) => {
      if (newSize > prev.length) {
        return [...prev, ...Array(newSize - prev.length).fill(null)];
      }
      return prev.slice(0, newSize);
    });
    setPresetLabel("custom");
  };

  const usedIds = new Set(
    teams.filter((t): t is TeamPick => t !== null && t.id !== RANDOM_ID).map((t) => t.id)
  );

  const updateTeam = (i: number, t: TeamPick | null) => {
    setTeams((prev) => prev.map((old, idx) => (idx === i ? t : old)));
  };

  const fillRandom = () => {
    setTeams(Array(size).fill(RANDOM_PICK));
    setPresetLabel(PRESETS[size][0].label);
  };

  const filledCount = teams.filter(Boolean).length;
  const canSimulate = filledCount === size;

  const simulate = useCallback(async () => {
    if (!canSimulate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      gtm.playoffStart({ size, preset: presetLabel });
      const res = await fetch("/api/playoff/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds: teams.map((t) => t!.id), size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to simulate");
      gtm.playoffComplete({ size, champion: json.champion.name });
      setResult(json as PlayoffResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to simulate");
    } finally {
      setLoading(false);
    }
  }, [teams, size, canSimulate, presetLabel]);

  const reset = () => {
    setResult(null);
  };

  if (result) {
    return (
      <PlayoffPlayback
        // Remount per simulation so a re-run replays from Round 1
        key={JSON.stringify(result.champion)}
        result={result}
        onReset={reset}
        onRematch={simulate}
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
          <h1 className="font-display text-sm font-black uppercase tracking-widest">🏆 Playoff Simulator</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <p className="text-center text-sm text-zinc-400">
          Build any bracket — pick 4, 8, or 16 teams and simulate the full best-of-7 playoff.
        </p>

        {/* Bracket size selector */}
        <div>
          <p className="font-display text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Bracket Size</p>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSizeChange(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  size === s ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {s} Teams
              </button>
            ))}
          </div>
        </div>

        {/* Quick-fill */}
        <button
          onClick={fillRandom}
          className="w-full py-2.5 rounded-xl border border-zinc-700 hover:border-orange-500/60 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm transition-colors"
        >
          🎲 Fill All with Random Teams
        </button>

        {/* Team pickers */}
        <div>
          <p className="font-display text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">
            Teams ({filledCount}/{size})
          </p>
          <div className="space-y-2">
            {teams.map((t, i) => (
              <TeamPicker
                key={i}
                slot={i}
                selected={t}
                onSelect={(pick) => updateTeam(i, pick)}
                usedIds={usedIds}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={simulate}
          disabled={!canSimulate || loading}
          className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-black text-base uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simulating Playoff…
            </>
          ) : (
            `🏆 Simulate ${size}-Team Playoff`
          )}
        </button>
      </div>
    </div>
  );
}
