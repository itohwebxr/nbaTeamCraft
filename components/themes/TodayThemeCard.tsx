"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFeaturedTheme } from "@/hooks/useFeaturedTheme";
import { useBuildTheme } from "@/hooks/useBuildTheme";
import { gtm } from "@/lib/gtm";

// Home (Craft tab) surface: today's featured theme (1 main + 2 subs). The main
// prompt drives a themed build; subs link to their theme feeds.
export default function TodayThemeCard() {
  const featured = useFeaturedTheme();
  const buildTheme = useBuildTheme();
  const viewFired = useRef(false);

  useEffect(() => {
    if (featured?.main && !viewFired.current) {
      viewFired.current = true;
      gtm.themeFeaturedView({ theme_slug: featured.main.slug, placement: "home" });
    }
  }, [featured]);

  if (!featured?.main) return null;
  const { main, subs } = featured;

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/15 via-zinc-900 to-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">🔥 Today&apos;s Theme</p>
        <Link href={`/theme/${main.slug}`} className="text-xs font-bold text-violet-300 hover:text-violet-200 transition-colors">
          See entries →
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0 leading-none">{main.emoji ?? "🏀"}</span>
        <div className="min-w-0">
          <p className="font-black text-white text-base leading-tight">{main.title}</p>
          {main.description && <p className="text-xs text-zinc-400 mt-0.5">{main.description}</p>}
        </div>
      </div>

      <button
        onClick={() => buildTheme(main, "home")}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-black text-sm transition-colors"
      >
        Build your take →
      </button>

      {subs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {subs.map((s) => (
            <Link
              key={s.id}
              href={`/theme/${s.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            >
              {s.emoji && <span>{s.emoji}</span>}
              <span>#{s.hashtag}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
