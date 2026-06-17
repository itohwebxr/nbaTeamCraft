import Link from "next/link";

// Consistent cross-navigation footer shown at the bottom of each simulator's
// picker screen. Renders links to the *other* two simulators so the three
// screens share the same wayfinding.

type SimKey = "match" | "playoff" | "season";

const SIMS: Record<SimKey, { href: string; label: string }> = {
  match: { href: "/matchup", label: "⚔️ Match Simulator" },
  playoff: { href: "/playoffs", label: "🏆 Playoff Simulator" },
  season: { href: "/season", label: "📅 Season Simulator" },
};

const ORDER: SimKey[] = ["match", "playoff", "season"];

export function SimCrossLinks({ current }: { current: SimKey }) {
  const others = ORDER.filter((k) => k !== current);
  return (
    <div className="pt-2 flex items-center justify-center gap-4 text-xs">
      {others.map((key, i) => (
        <span key={key} className="flex items-center gap-4">
          {i > 0 && <span className="text-zinc-700">·</span>}
          <Link href={SIMS[key].href} className="text-zinc-500 hover:text-orange-400 transition-colors">
            {SIMS[key].label}
          </Link>
        </span>
      ))}
    </div>
  );
}
