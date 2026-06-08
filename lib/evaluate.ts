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

  // Superstar bonus: exponential curve from overall 90→100, max ~+15
  const superstarBonus = maxOverall >= 90
    ? Math.pow((maxOverall - 89) / 11, 2) * 15
    : 0;

  // Penalize weak starters: exponential curve from overall 75→60, max ~-15
  const starterEntries = roster.filter((e) => isStarter(e.slot));
  const starterOveralls = starterEntries.map((e) => e.playerSeason.overall);
  const minStarterOverall = starterOveralls.length > 0 ? Math.min(...starterOveralls) : 0;
  const weakStarterPenalty = Math.pow(Math.max(0, 75 - minStarterOverall) / 15, 2) * 15;

  // 6th man cover bonus: +3/+2/+1 for covering the weakest/2nd/3rd weakest starter position
  const sixthMan = roster.find((e) => e.slot === "BENCH1");
  const sortedStartersByOverall = [...starterEntries].sort(
    (a, b) => a.playerSeason.overall - b.playerSeason.overall
  );
  const coverBonuses = [3, 2, 1];
  let sixthManCoverBonus = 0;
  if (sixthMan) {
    for (let i = 0; i < Math.min(3, sortedStartersByOverall.length); i++) {
      if (sixthMan.assignedPosition === sortedStartersByOverall[i].assignedPosition) {
        sixthManCoverBonus = coverBonuses[i];
        break;
      }
    }
  }

  // Multi-star bonus: each additional player with overall >= 87 adds +3 (max +9)
  const starCount = roster.filter((e) => e.playerSeason.overall >= 87).length;
  const multiStarBonus = Math.max(0, starCount - 1) * 3;

  // Roster imbalance penalty: penalize when outside (PG/SG) and inside (PF/C) strength gap is large
  const getStarterOverall = (pos: string) =>
    starterEntries.find((e) => e.slot === pos)?.playerSeason.overall ?? 0;
  const outsideStrength = Math.max(getStarterOverall("PG"), getStarterOverall("SG"));
  const insideStrength = Math.max(getStarterOverall("PF"), getStarterOverall("C"));
  const imbalanceDiff = Math.abs(outsideStrength - insideStrength);
  const imbalancePenalty = Math.pow(Math.max(0, (imbalanceDiff - 15) / 25), 2) * 10;

  const overall = Math.round(Math.max(0, Math.min(100, avgOverall + superstarBonus + multiStarBonus + sixthManCoverBonus - weakStarterPenalty - imbalancePenalty)));

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
