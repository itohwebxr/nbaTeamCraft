import { Position } from "@/types";

interface RawStats {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
  win_shares: number;
}

// Position-based weights
const WEIGHTS: Record<Position, Record<keyof Omit<RawStats, "mpg">, number>> = {
  PG: { ppg: 0.25, rpg: 0.08, apg: 0.25, spg: 0.15, bpg: 0.07, win_shares: 0.20 },
  SG: { ppg: 0.30, rpg: 0.08, apg: 0.15, spg: 0.15, bpg: 0.07, win_shares: 0.25 },
  SF: { ppg: 0.28, rpg: 0.12, apg: 0.12, spg: 0.15, bpg: 0.08, win_shares: 0.25 },
  PF: { ppg: 0.25, rpg: 0.22, apg: 0.08, spg: 0.12, bpg: 0.13, win_shares: 0.20 },
  C:  { ppg: 0.22, rpg: 0.28, apg: 0.05, spg: 0.08, bpg: 0.17, win_shares: 0.20 },
};

/**
 * Calculate percentile rank of a value within a population.
 * Returns 0.0–1.0.
 */
export function percentileRank(value: number, population: number[]): number {
  const sorted = [...population].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return (below + equal * 0.5) / sorted.length;
}

/**
 * Given a player's stats and the full population of stats,
 * calculate an overall rating (60–100).
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

  // MPG penalty: players with low minutes are penalised
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
