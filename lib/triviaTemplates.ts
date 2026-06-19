export const STAT_KEYS = ["pts_per_game", "trb_per_game", "ast_per_game", "stl_per_game", "blk_per_game"] as const;
export type StatKey = typeof STAT_KEYS[number];

export const STAT_LABELS: Record<StatKey, string> = {
  pts_per_game: "scoring",
  trb_per_game: "rebounding",
  ast_per_game: "assists",
  stl_per_game: "steals",
  blk_per_game: "blocks",
};

export type TriviaTemplate = "stats_leader" | "played_for_all" | "freetext";

export type StatsLeaderParams = {
  season: string;    // e.g. "2005-06"
  team_id: string;   // e.g. "LAL"
  stat: StatKey;
};

export type PlayedForAllParams = {
  teams: string[];   // e.g. ["MIA", "LAL", "CLE"] — 2 or more
};

export type TriviaParams = StatsLeaderParams | PlayedForAllParams | Record<string, never>;

export type GeneratedQuestion = {
  question: string;
  options: string[];       // exactly 4 player names
  answer_index: number;    // 0-3
  explanation: string;
  player_name: string;     // correct answer player name
};
