"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gtm } from "@/lib/gtm";

// Shared team-selection control used by the Match Simulator and the Playoff
// Simulator. Owns the search box, the anchored dropdown (filter + paginated
// results), and the selected-team card.

export type TeamPick = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  is_sandbox: boolean;
  is_historical?: boolean;
  created_at: string;
};

// Sentinel id used when the user wants a random opponent resolved server-side.
export const RANDOM_ID = "__random__";
export const RANDOM_PICK: TeamPick = {
  id: RANDOM_ID,
  name: "🎲 Random",
  overall: 0,
  tier: "C",
  is_sandbox: false,
  created_at: "",
};

type Filter = "all" | "real" | "built";
const PAGE = 20; // results per page / "show more" increment

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

export function sourceLabel(t: { is_historical?: boolean; is_sandbox: boolean; id: string }): string {
  if (t.id === RANDOM_ID) return "Any team, chosen at random";
  if (t.is_historical) return "🏀 Real NBA Team";
  return t.is_sandbox ? "Roster Builder" : "Dream Draft";
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "real", label: "Real NBA" },
  { key: "built", label: "Built" },
];

export function TeamPicker({
  variant = "stacked",
  label,
  accent = "text-orange-400",
  seedLabel,
  selected,
  onSelect,
  usedIds,
  showRandom = true,
}: {
  variant?: "stacked" | "inline";
  label?: string;
  accent?: string;
  seedLabel?: string;
  selected: TeamPick | null;
  onSelect: (t: TeamPick | null) => void;
  usedIds?: Set<string>;
  showRandom?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [results, setResults] = useState<TeamPick[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropTop, setDropTop] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (q: string, f: Filter, lim: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/matchup/search?q=${encodeURIComponent(q)}&limit=${lim}&filter=${f}`
        );
        const json = await res.json();
        const teams: TeamPick[] = (json.teams ?? []).filter(
          (t: TeamPick) => !usedIds?.has(t.id) || t.id === selected?.id
        );
        setResults(teams);
        setHasMore(!!json.hasMore);
      } catch {
        setResults([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [usedIds, selected]
  );

  const positionDropdown = useCallback(() => {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setDropTop(r.bottom + 6);
  }, []);

  // Reset to the first page whenever the query or filter changes (handled in
  // the setters below so we don't trigger a cascading setState-in-effect).
  const changeQuery = (v: string) => {
    setQuery(v);
    setLimit(PAGE);
  };
  const changeFilter = (f: Filter) => {
    setFilter(f);
    setLimit(PAGE);
    gtm.teamSearchFilter({ filter: f });
  };
  const showMore = () => {
    setLimit((l) => l + PAGE);
    gtm.teamSearchShowMore({ shown: results.length + PAGE });
  };

  // Debounced fetch (query/filter/limit/open).
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => runSearch(query.trim(), filter, limit), 220);
    return () => clearTimeout(id);
  }, [query, filter, limit, open, runSearch]);

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

  const choose = (t: TeamPick | null) => {
    onSelect(t);
    setOpen(false);
    setQuery("");
  };

  // ── Selected card ──────────────────────────────────────────────────
  if (selected) {
    if (variant === "inline") {
      return (
        <div className="flex items-center gap-2">
          {seedLabel && <span className="font-display text-xs font-bold text-zinc-500 w-7 shrink-0">{seedLabel}</span>}
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
        </div>
      );
    }
    return (
      <div className="flex-1 min-w-0">
        {label && <p className={`font-display text-xs font-bold uppercase tracking-[0.2em] mb-2 ${accent}`}>{label}</p>}
        <button
          onClick={() => onSelect(null)}
          className="group w-full text-left bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-xl p-3 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-white truncate">{selected.name}</span>
            {selected.id !== RANDOM_ID && <TierBadge tier={selected.tier} />}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{sourceLabel(selected)}</span>
            {selected.id !== RANDOM_ID && (
              <span className="font-display text-sm font-black text-orange-400">{selected.overall}</span>
            )}
          </div>
          <span className="block text-[10px] text-zinc-600 mt-1 group-hover:text-zinc-400">Tap to change</span>
        </button>
      </div>
    );
  }

  // ── Dropdown (shared) ──────────────────────────────────────────────
  const dropdown = open && (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-1.5rem)] max-w-lg max-h-[60vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"
      style={{ top: dropTop }}
    >
      {/* Filter toggle — sticky so it stays visible while scrolling results */}
      <div className="sticky top-0 z-10 flex gap-1 p-2 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => changeFilter(f.key)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              filter === f.key ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Random pick — only when not searching */}
      {showRandom && !query && (
        <button
          onClick={() => choose(RANDOM_PICK)}
          className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 border-b border-zinc-800/60 transition-colors"
        >
          <span className="text-sm font-semibold text-white">🎲 Random</span>
          <span className="block text-[10px] text-zinc-500">Any team, chosen at random</span>
        </button>
      )}

      {loading && results.length === 0 && <p className="px-3 py-3 text-xs text-zinc-500">Searching…</p>}
      {!loading && results.length === 0 && <p className="px-3 py-3 text-xs text-zinc-500">No teams found.</p>}

      {results.map((t) => (
        <button
          key={t.id}
          onClick={() => choose(t)}
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
            {sourceLabel(t)}
          </span>
        </button>
      ))}

      {hasMore && (
        <button
          onClick={showMore}
          disabled={loading}
          className="w-full px-3 py-2.5 text-center text-[12px] font-bold text-orange-400 hover:text-orange-300 bg-zinc-900/80 border-t border-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : `Show ${PAGE} more →`}
        </button>
      )}
    </div>
  );

  const input = (
    <input
      ref={inputRef}
      value={query}
      onChange={(e) => changeQuery(e.target.value)}
      onFocus={() => {
        setOpen(true);
        positionDropdown();
        if (results.length === 0) runSearch(query.trim(), filter, limit);
      }}
      placeholder={variant === "inline" ? "Search team…" : "Team, player, NBA team…"}
      className={
        variant === "inline"
          ? "w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
          : "w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
      }
    />
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        {seedLabel && <span className="font-display text-xs font-bold text-zinc-500 w-7 shrink-0">{seedLabel}</span>}
        <div ref={boxRef} className="flex-1">
          {input}
          {dropdown}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      {label && <p className={`font-display text-xs font-bold uppercase tracking-[0.2em] mb-2 ${accent}`}>{label}</p>}
      <div ref={boxRef}>
        {input}
        {dropdown}
      </div>
    </div>
  );
}
