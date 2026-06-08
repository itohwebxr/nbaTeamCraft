import { Position } from "@/types";

interface RawStats {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
}

// Position-based weights (sum = 1.0 per position)
const WEIGHTS: Record<Position, Record<keyof Omit<RawStats, "mpg">, number>> = {
  PG: { ppg: 0.30, rpg: 0.10, apg: 0.30, spg: 0.18, bpg: 0.12 },
  SG: { ppg: 0.35, rpg: 0.10, apg: 0.18, spg: 0.18, bpg: 0.19 },
  SF: { ppg: 0.32, rpg: 0.15, apg: 0.15, spg: 0.18, bpg: 0.20 },
  PF: { ppg: 0.28, rpg: 0.27, apg: 0.10, spg: 0.15, bpg: 0.20 },
  C:  { ppg: 0.25, rpg: 0.35, apg: 0.06, spg: 0.10, bpg: 0.24 },
};

export function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 0;
  const sorted = [...population].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return (below + equal * 0.5) / sorted.length;
}

/**
 * Calculate overall rating (60–100) using position-weighted percentile scores.
 */
export function calcOverall(
  stats: RawStats,
  primaryPosition: Position,
  population: RawStats[]
): number {
  const weights = WEIGHTS[primaryPosition];
  const keys = Object.keys(weights) as Array<keyof typeof weights>;

  let rawScore = 0;
  for (const key of keys) {
    const pop = population.map((p) => p[key]);
    const pct = percentileRank(stats[key], pop);
    rawScore += pct * weights[key];
  }

  // MPG penalty for low-minute players
  const mpgPenalty = stats.mpg < 10 ? -5 : 0;

  const overall = Math.round(60 + rawScore * 40) + mpgPenalty;
  return Math.max(60, Math.min(100, overall));
}

export function calcCost(overall: number): number {
  if (overall >= 95) return 5;
  if (overall >= 88) return 4;
  if (overall >= 76) return 3;
  if (overall >= 65) return 2;
  return 1;
}
