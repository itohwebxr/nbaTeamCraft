export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type StarterSlot = Position;
export type BenchSlot = "BENCH1" | "BENCH2" | "BENCH3";
export type RosterSlot = StarterSlot | BenchSlot;

export interface Player {
  id: string;
  nba_player_id: string;
  name: string;
}

export interface PlayerSeasonPosition {
  position: Position;
  is_primary: boolean;
}

export interface PlayerSeason {
  id: string;
  player_id: string;
  team_id: string;
  season: string;
  positions: PlayerSeasonPosition[];
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
  overall: number;
  cost: number;
  // joined from players
  name: string;
  nba_player_id: string;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  season: string;
}

export interface RosterEntry {
  playerSeason: PlayerSeason;
  slot: RosterSlot;
  assignedPosition: Position;
}

export interface TeamEvaluation {
  overall: number;
  offense: number;
  defense: number;
  rebound: number;
  playmaking: number;
  tier: Tier;
}

export type Tier = "S" | "A" | "B" | "C" | "D";

export const STARTER_SLOTS: StarterSlot[] = ["PG", "SG", "SF", "PF", "C"];
export const BENCH_SLOTS: BenchSlot[] = ["BENCH1", "BENCH2", "BENCH3"];
export const ALL_SLOTS: RosterSlot[] = [...STARTER_SLOTS, ...BENCH_SLOTS];

export const TOTAL_BUDGET = 25;
