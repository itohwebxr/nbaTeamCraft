import { PlayerSeason, RosterEntry, TeamEvaluation, Tier } from "@/types";
import { percentileRank } from "./overall";

const STARTER_WEIGHT = 1.0;
const BENCH_WEIGHT = 0.5;

function isStarter(slot: string): boolean {
  return ["PG", "SG", "SF", "PF", "C"].includes(slot);
}

interface PopulationStats {
  ppg: number[];
  apg: number[];
  spg: number[];
  bpg: number[];
  rpg: number[];
  win_shares: number[];
  dws: number[];
  overall: number[];
}

/**
 * Weighted average of a mapped value over roster entries.
 */
function weightedAvg(
  roster: RosterEntry[],
  fn: (ps: PlayerSeason) => number
): number {
  let sum = 0;
  let totalWeight = 0;
  for (const entry of roster) {
    const w = isStarter(entry.slot) ? STARTER_WEIGHT : BENCH_WEIGHT;
    sum += fn(entry.playerSeason) * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? sum / totalWeight : 0;
}

function toRating(pct: number): number {
  return Math.round(Math.max(60, Math.min(100, 60 + pct * 40)));
}

export function calcTeamEvaluation(
  roster: RosterEntry[],
  population: PopulationStats
): TeamEvaluation {
  const avgOverall = weightedAvg(roster, (ps) => ps.overall);
  const overall = Math.round(Math.max(60, Math.min(100, avgOverall)));

  const offenseScore = weightedAvg(roster, (ps) => {
    const ppgPct = percentileRank(ps.ppg, population.ppg);
    const apgPct = percentileRank(ps.apg, population.apg);
    return ppgPct * 0.6 + apgPct * 0.4;
  });

  const defenseScore = weightedAvg(roster, (ps) => {
    const dwsPct = percentileRank(ps.dws, population.dws);
    const spgPct = percentileRank(ps.spg, population.spg);
    const bpgPct = percentileRank(ps.bpg, population.bpg);
    return dwsPct * 0.6 + spgPct * 0.25 + bpgPct * 0.15;
  });

  const reboundScore = weightedAvg(roster, (ps) =>
    percentileRank(ps.rpg, population.rpg)
  );

  const playmakingScore = weightedAvg(roster, (ps) => {
    const apgPct = percentileRank(ps.apg, population.apg);
    const wsPct = percentileRank(ps.win_shares, population.win_shares);
    return apgPct * 0.8 + wsPct * 0.2;
  });

  return {
    overall,
    offense: toRating(offenseScore),
    defense: toRating(defenseScore),
    rebound: toRating(reboundScore),
    playmaking: toRating(playmakingScore),
    tier: calcTier(overall),
  };
}

export function calcTier(overall: number): Tier {
  if (overall >= 88) return "S";
  if (overall >= 80) return "A";
  if (overall >= 72) return "B";
  if (overall >= 65) return "C";
  return "D";
}
