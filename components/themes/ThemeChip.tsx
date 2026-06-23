import Link from "next/link";
import type { Theme } from "@/lib/themes";

// Small theme tag → links to the theme feed. Used on team detail pages.
export default function ThemeChip({ theme }: { theme: Pick<Theme, "slug" | "hashtag" | "emoji"> }) {
  return (
    <Link
      href={`/theme/${theme.slug}`}
      className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-1 text-xs font-bold text-violet-300 hover:bg-violet-500/25 transition-colors"
    >
      {theme.emoji && <span>{theme.emoji}</span>}
      <span>#{theme.hashtag}</span>
    </Link>
  );
}
