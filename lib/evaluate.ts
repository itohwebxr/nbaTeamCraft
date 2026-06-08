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
}

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

function toRating(score: number): number {
  return Math.round(Math.max(0, Math.min(100, 60 + Math.pow(score, 1.3) * 40)));
}

export function calcTeamEvaluation(
  roster: RosterEntry[],
  population: PopulationStats
): TeamEvaluation {
  const avgOverall = weightedAvg(roster, (ps) => ps.overall);
  const maxOverall = Math.max(...roster.map((e) => e.playerSeason.overall));
  const starBonus = (maxOverall - avgOverall) * 0.4;
  const overall = Math.round(Math.max(0, Math.min(100, avgOverall + starBonus)));

  const offense = toRating(
    weightedAvg(roster, (ps) => {
      const ppgPct = percentileRank(ps.ppg, population.ppg);
      const apgPct = percentileRank(ps.apg, population.apg);
      return ppgPct * 0.65 + apgPct * 0.35;
    })
  );

  // Defense: SPG(0.40) + BPG(0.35) + RPG(0.25) — RPG captures defensive rebounding
  const defense = toRating(
    weightedAvg(roster, (ps) => {
      const spgPct = percentileRank(ps.spg, population.spg);
      const bpgPct = percentileRank(ps.bpg, population.bpg);
      const rpgPct = percentileRank(ps.rpg, population.rpg);
      return spgPct * 0.40 + bpgPct * 0.35 + rpgPct * 0.25;
    })
  );

  const rebound = toRating(
    weightedAvg(roster, (ps) => percentileRank(ps.rpg, population.rpg))
  );

  const playmaking = toRating(
    weightedAvg(roster, (ps) => percentileRank(ps.apg, population.apg))
  );

  return {
    overall,
    offense,
    defense,
    rebound,
    playmaking,
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
