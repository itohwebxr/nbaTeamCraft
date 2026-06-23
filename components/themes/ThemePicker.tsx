"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/themes";
import { PENDING_THEME_KEY } from "@/hooks/useBuildTheme";

// Post-time theme selector. Lets the user attach ONE curated theme to their
// post (Phase 1: pick from candidates, no free input). Pre-selects a theme that
// was carried over from a "Build this theme" CTA via sessionStorage.
export default function ThemePicker({
  value,
  onChange,
}: {
  value: Theme | null;
  onChange: (theme: Theme | null) => void;
}) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const appliedPending = useRef(false);

  useEffect(() => {
    fetch("/api/themes")
      .then((r) => r.json())
      .then((d) => setThemes((d.themes ?? []) as Theme[]))
      .catch(() => {});
  }, []);

  // Pre-select the theme carried from a "Build this theme" CTA (once).
  useEffect(() => {
    if (appliedPending.current || value || themes.length === 0) return;
    appliedPending.current = true;
    let slug: string | null = null;
    try {
      slug = sessionStorage.getItem(PENDING_THEME_KEY);
    } catch {
      /* ignore */
    }
    if (slug) {
      const match = themes.find((t) => t.slug === slug);
      if (match) onChange(match);
      try { sessionStorage.removeItem(PENDING_THEME_KEY); } catch { /* ignore */ }
    }
  }, [themes, value, onChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? themes.filter((t) =>
        `${t.title} ${t.hashtag}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : themes.slice(0, 8);

  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
        Theme <span className="text-zinc-600 normal-case">(optional)</span>
      </label>

      {value ? (
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
          {value.emoji && <span className="text-base">{value.emoji}</span>}
          <span className="text-sm font-bold text-white truncate">{value.title}</span>
          <span className="text-xs text-violet-300 font-bold">#{value.hashtag}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto text-zinc-500 hover:text-white text-lg leading-none shrink-0"
            aria-label="Clear theme"
          >
            ×
          </button>
        </div>
      ) : (
        <div ref={boxRef} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Add a theme — e.g. All-Time Defense"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500"
          />
          {open && filtered.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 max-h-56 overflow-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(t); setOpen(false); setQuery(""); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-2"
                  >
                    {t.emoji && <span>{t.emoji}</span>}
                    <span className="text-sm text-zinc-200 truncate">{t.title}</span>
                    <span className="ml-auto text-xs text-violet-300 font-bold shrink-0">#{t.hashtag}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
