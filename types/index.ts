export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type StarterSlot = Position;
export type BenchSlot = "BENCH1";
export type RosterSlot = StarterSlot | BenchSlot;

export type DraftMode = "draft" | "sandbox";

export interface SandboxConfig {
  teamFilter: string;   // "Random" or NBA abbreviation e.g. "SAS"
  seasonFilter: string; // "Random" or season e.g. "2015-16"
}

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
export const BENCH_SLOTS: BenchSlot[] = ["BENCH1"];
export const ALL_SLOTS: RosterSlot[] = [...STARTER_SLOTS, ...BENCH_SLOTS];

export const TOTAL_ROSTER_SIZE = 6;
export const TOTAL_BUDGET = 17;

export interface PublicTeamRosterItem {
  slot: RosterSlot;
  name: string;
  season: string;
  overall: number;
  assignedPosition: Position;
}

export interface PublicTeamMetadataPlayer {
  playerId: string;
  name: string;
  season: string;
  team: string;
}

export interface PublicTeam {
  id: string;
  share_id: string;
  name: string;
  overall: number;
  tier: Tier;
  offense: number;
  defense: number;
  rebound: number;
  playmaking: number;
  roster_json: PublicTeamRosterItem[];
  metadata: { players: PublicTeamMetadataPlayer[] };
  like_count: number;
  created_by_browser_id: string | null;
  created_at: string;
  is_sandbox?: boolean;
}

export interface PublicTeamRank {
  overall: number;
  offense: number;
  defense: number;
  rebound: number;
  playmaking: number;
}

// TeamCraft Cup types

export interface CupEntry {
  id: string;
  cup_week: string;
  public_team_id: string;
  browser_id: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  created_at: string;
}

export interface CupMatchSummary {
  id: string;
  played_on: string;
  userScore: number;
  oppScore: number;
  won: boolean;
  quarters: { home: number; away: number }[];
  userBox: import("@/lib/simulateGame").BoxScoreLine[];
  oppBox: import("@/lib/simulateGame").BoxScoreLine[];
  opponent: { entryId?: string; name?: string; overall?: number; tier?: string };
}

export interface CupLeaderboardEntry {
  entryId: string;
  teamId: string;
  name: string;
  overall: number;
  tier: Tier;
  wins: number;
  losses: number;
  pointDiff: number;
  matchesPlayed: number;
}
