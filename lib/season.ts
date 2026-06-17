// Season simulation: how many of 82 games a single team is projected to win,
// driven purely by its overall rating + randomness (à la 82-0.com). No real
// opponents are modelled — each game is an independent coin flip whose bias is
// derived from the team's strength against a league-average field.

// League-average reference overall. A team at this level is a true .500 club.
const LEAGUE_AVG_OVERALL = 75;

// Per-game win probability from a logistic curve. The 0.05 slope spreads the
// field realistically: ~50 OVR ≈ 18 wins, 75 ≈ 41, 85 ≈ 51, 95 ≈ 60.
export function seasonWinProbability(overall: number): number {
  const x = (overall - LEAGUE_AVG_OVERALL) * 0.05;
  return 1 / (1 + Math.exp(-x));
}

// ── Seeded RNG (mulberry32) so a given seed always replays the same season ──
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SeasonSim = {
  wins: number;
  losses: number;
  games: boolean[]; // true = win, length 82
  winRate: number; // base per-game win probability
};

const GAMES = 82;

export function simulateSeason(overall: number, seed: string): SeasonSim {
  const base = seasonWinProbability(overall);
  const rng = mulberry32(hashSeed(seed));
  const games: boolean[] = [];
  let wins = 0;
  for (let g = 0; g < GAMES; g++) {
    // Small per-game form swing (±6%) gives hot/cold streaks without changing
    // the long-run expectation much — keeps the game-by-game reveal lively.
    const swing = (rng() * 2 - 1) * 0.06;
    const p = Math.min(0.97, Math.max(0.03, base + swing));
    const win = rng() < p;
    if (win) wins++;
    games.push(win);
  }
  return { wins, losses: GAMES - wins, games, winRate: base };
}

// ── Season grade based on win total ──────────────────────────────────────
export type SeasonGrade = { label: string; blurb: string; color: string };

// `color` is a hex used by the OG image; the client maps to Tailwind classes.
export function seasonGrade(wins: number): SeasonGrade {
  if (wins >= 70) return { label: "DYNASTY", blurb: "All-time great season", color: "#f59e0b" };
  if (wins >= 60) return { label: "ELITE", blurb: "Title favorite", color: "#f97316" };
  if (wins >= 50) return { label: "CONTENDER", blurb: "Deep playoff run", color: "#22c55e" };
  if (wins >= 41) return { label: "PLAYOFF", blurb: "Postseason bound", color: "#3b82f6" };
  if (wins >= 30) return { label: "FRINGE", blurb: "In the hunt", color: "#0ea5e9" };
  if (wins >= 20) return { label: "LOTTERY", blurb: "Eyes on the draft", color: "#a855f7" };
  return { label: "REBUILD", blurb: "Long road ahead", color: "#6b7280" };
}
