import { PlayerSeason, RosterEntry, TeamEvaluation, Tier } from "@/types";
import { percentileRank } from "./overall";

const STARTER_WEIGHT = 1.0;
const BENCH_WEIGHT = 0.7;

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
  const starBonus = (maxOverall - avgOverall) * 0.65;

  // Extra bonus for having a generational superstar (overall 95+)
  const superstarBonus = maxOverall >= 95 ? (maxOverall - 94) * 2.5 : 0;

  // Penalize weak starters — weakest starter drags the team rating down
  const starterEntries = roster.filter((e) => isStarter(e.slot));
  const starterOveralls = starterEntries.map((e) => e.playerSeason.overall);
  const minStarterOverall = starterOveralls.length > 0 ? Math.min(...starterOveralls) : 0;
  const weakStarterPenalty = Math.max(0, (72 - minStarterOverall) * 0.7);

  // 6th man position cover bonus: if 6th man plays the same position as the weakest starter
  const sixthMan = roster.find((e) => e.slot === "BENCH1");
  const weakestStarterEntry = starterEntries.length > 0
    ? starterEntries.reduce((min, e) => e.playerSeason.overall < min.playerSeason.overall ? e : min)
    : null;
  const sixthManCoverBonus =
    sixthMan && weakestStarterEntry && sixthMan.assignedPosition === weakestStarterEntry.assignedPosition
      ? Math.max(0, (78 - minStarterOverall) * 0.4)
      : 0;

  const overall = Math.round(Math.max(0, Math.min(100, avgOverall + starBonus + superstarBonus + sixthManCoverBonus - weakStarterPenalty)));

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
  if (overall >= 90) return "S";
  if (overall >= 84) return "A";
  if (overall >= 78) return "B";
  if (overall >= 72) return "C";
  return "D";
}
