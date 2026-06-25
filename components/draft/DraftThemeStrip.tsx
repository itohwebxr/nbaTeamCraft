"use client";

import Link from "next/link";
import { useFeaturedTheme } from "@/hooks/useFeaturedTheme";

// Slim, always-on strip under the draft header reminding the user that today's
// theme exists and their build can join it. Links to the theme feed.
export default function DraftThemeStrip() {
  const featured = useFeaturedTheme();
  const theme = featured?.main;
  if (!theme) return null;

  return (
    <Link
      href={`/theme/${theme.slug}`}
      className="block bg-violet-600/10 border-b border-violet-500/20 hover:bg-violet-600/15 transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-2 text-xs">
        <span className="shrink-0">🔥</span>
        <span className="font-bold text-violet-200 shrink-0">Today&apos;s theme</span>
        <span className="text-violet-300 font-bold truncate">#{theme.hashtag}</span>
        <span className="ml-auto text-violet-300/80 font-medium shrink-0">your build can join →</span>
      </div>
    </Link>
  );
}
