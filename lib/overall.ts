import { Position } from "@/types";

interface RawStats {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
}

const WEIGHTS = { ppg: 0.50, rpg: 0.12, apg: 0.18, spg: 0.10, bpg: 0.10 };

export function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 0;
  const sorted = [...population].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return (below + equal * 0.5) / sorted.length;
}

export function calcOverall(
  stats: RawStats,
  _primaryPosition: Position,
  population: RawStats[]
): number {
  let rawScore = 0;
  for (const key of Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>) {
    const pop = population.map((p) => p[key]);
    const pct = percentileRank(stats[key], pop);
    rawScore += pct * WEIGHTS[key];
  }

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
