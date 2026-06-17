"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GameResult } from "@/lib/simulateGame";
import { gtm } from "@/lib/gtm";
import ExhibitionMatch from "@/components/cup/ExhibitionMatch";

type TeamPick = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  is_sandbox: boolean;
  created_at: string;
};

type SimMeta = { id: string; name: string; overall: number; tier: string };

type SimResponse =
  | { mode: "single"; home: SimMeta; away: SimMeta; result: GameResult }
  | {
      mode: "series";
      home: SimMeta;
      away: SimMeta;
      games: GameResult[];
      seriesWins: { home: number; away: number };
      seriesWinner: "home" | "away";
    };

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

// One side of the matchup: search box + dropdown + selected card.
function TeamPicker({
  label,
  accent,
  selected,
  onSelect,
}: {
  label: string;
  accent: string;
  selected: TeamPick | null;
  onSelect: (t: TeamPick | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeamPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matchup/search?q=${encodeURIComponent(q)}&limit=10`);
      const json = await res.json();
      setResults(json.teams ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search; also primes latest teams when focused with empty query.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => runSearch(query.trim()), 220);
    return () => clearTimeout(id);
  }, [query, open, runSearch]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex-1 min-w-0">
      <p className={`font-display text-xs font-bold uppercase tracking-[0.2em] mb-2 ${accent}`}>{label}</p>

      {selected ? (
        <button
          onClick={() => onSelect(null)}
          className="group w-full text-left bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-xl p-3 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-white truncate">{selected.name}</span>
            <TierBadge tier={selected.tier} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {selected.is_sandbox ? "Roster Builder" : "Dream Draft"}
            </span>
            <span className="font-display text-sm font-black text-orange-400">{selected.overall}</span>
          </div>
          <span className="block text-[10px] text-zinc-600 mt-1 group-hover:text-zinc-400">Tap to change</span>
        </button>
      ) : (
        <div ref={boxRef} className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setOpen(true);
              if (results.length === 0) runSearch("");
            }}
            placeholder="Team, player, or NBA team…"
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
          />
          {open && (
            <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
              {loading && <p className="px-3 py-3 text-xs text-zinc-500">Searching…</p>}
              {!loading && results.length === 0 && (
                <p className="px-3 py-3 text-xs text-zinc-500">No teams found.</p>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelect(t);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 border-b border-zinc-800/60 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{t.name}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <TierBadge tier={t.tier} />
                      <span className="font-display text-xs font-black text-orange-400">{t.overall}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    {t.is_sandbox ? "Roster Builder" : "Dream Draft"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeriesResult({
  home,
  away,
  games,
  wins,
  winner,
  onReset,
}: {
  home: SimMeta;
  away: SimMeta;
  games: GameResult[];
  wins: { home: number; away: number };
  winner: "home" | "away";
  onReset: () => void;
}) {
  const winnerName = winner === "home" ? home.name : away.name;
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="text-center">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em] mb-2">
            Series Final · Best of 7
          </p>
          <h2 className="font-display text-2xl font-black text-white">🏆 {winnerName}</h2>
          <p className="font-display text-5xl font-black text-white mt-3">
            <span className={winner === "home" ? "text-orange-400" : "text-zinc-500"}>{wins.home}</span>
            <span className="text-zinc-700 mx-3">–</span>
            <span className={winner === "away" ? "text-orange-400" : "text-zinc-500"}>{wins.away}</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-sm">
            <span className="text-zinc-300 font-bold truncate max-w-[40%]">{home.name}</span>
            <span className="text-zinc-600">vs</span>
            <span className="text-zinc-300 font-bold truncate max-w-[40%]">{away.name}</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60">
          {games.map((g, i) => {
            const homeWon = g.winner === "home";
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="font-display text-xs font-bold text-zinc-500 w-12 shrink-0">G{i + 1}</span>
                <span className={`flex-1 text-sm font-bold truncate ${homeWon ? "text-white" : "text-zinc-500"}`}>
                  {home.name}
                </span>
                <span className="font-display text-sm font-black tabular-nums shrink-0">
                  <span className={homeWon ? "text-orange-400" : "text-zinc-500"}>{g.homeTotal}</span>
                  <span className="text-zinc-700 mx-1.5">-</span>
                  <span className={!homeWon ? "text-orange-400" : "text-zinc-500"}>{g.awayTotal}</span>
                </span>
                <span className={`flex-1 text-sm font-bold truncate text-right ${!homeWon ? "text-white" : "text-zinc-500"}`}>
                  {away.name}
                </span>
                {g.overtime && <span className="text-[10px] text-amber-400 font-bold shrink-0">OT</span>}
              </div>
            );
          })}
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
        >
          New Matchup
        </button>
      </div>
    </div>
  );
}

export default function MatchupClient() {
  const router = useRouter();
  const params = useSearchParams();

  // Pre-select the HOME team when arriving from a team page / result page.
  const [home, setHome] = useState<TeamPick | null>(() => {
    const id = params.get("homeTeamId");
    if (!id) return null;
    return {
      id,
      name: params.get("homeName") ?? "Selected Team",
      overall: Number(params.get("homeOverall")) || 0,
      tier: params.get("homeTier") ?? "C",
      is_sandbox: params.get("homeSandbox") === "1",
      created_at: "",
    };
  });
  const [away, setAway] = useState<TeamPick | null>(null);
  const [mode, setMode] = useState<"single" | "series">("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<SimResponse | null>(null);

  const simulate = useCallback(async () => {
    if (!home || !away) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matchup/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeamId: home.id, awayTeamId: away.id, mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to simulate");
      setSim(json as SimResponse);
      const winnerName =
        json.mode === "series"
          ? json.seriesWinner === "home" ? home.name : away.name
          : json.result.winner === "home" ? home.name : away.name;
      gtm.simulateMatch({ home_team: home.name, away_team: away.name, mode, winner: winnerName });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to simulate");
    } finally {
      setLoading(false);
    }
  }, [home, away, mode]);

  const reset = () => setSim(null);

  // ── Result overlays ──────────────────────────────────────────────
  if (sim?.mode === "single" && home && away) {
    return (
      <ExhibitionMatch
        userTeamName={sim.home.name}
        userOverall={sim.home.overall}
        userTier={sim.home.tier}
        opponent={{ id: sim.away.id, name: sim.away.name, overall: sim.away.overall, tier: sim.away.tier }}
        result={sim.result}
        sessionRecord={{ wins: 0, losses: 0 }}
        onRematch={simulate}
        onClose={reset}
        cupMode
      />
    );
  }

  if (sim?.mode === "series") {
    return (
      <SeriesResult
        home={sim.home}
        away={sim.away}
        games={sim.games}
        wins={sim.seriesWins}
        winner={sim.seriesWinner}
        onReset={reset}
      />
    );
  }

  // ── Picker ───────────────────────────────────────────────────────
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
          <h1 className="font-display text-sm font-black uppercase tracking-widest">⚔️ Match Simulator</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <p className="text-center text-sm text-zinc-400">
          Pit any two lineups against each other — Dream Draft or Roster Builder.
        </p>

        <div className="flex items-start gap-3">
          <TeamPicker label="Home" accent="text-orange-400" selected={home} onSelect={setHome} />
          <div className="pt-7 shrink-0">
            <span className="font-display text-lg font-black text-zinc-600">VS</span>
          </div>
          <TeamPicker label="Away" accent="text-sky-400" selected={away} onSelect={setAway} />
        </div>

        {/* Mode toggle */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {([
            { key: "single", label: "Single Game" },
            { key: "series", label: "Series (4-Win)" },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                mode === m.key ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={simulate}
          disabled={!home || !away || loading}
          className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-black text-base uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === "series" ? "Playing series…" : "Simulating…"}
            </>
          ) : (
            "⚔️ Simulate"
          )}
        </button>
      </div>
    </div>
  );
}
