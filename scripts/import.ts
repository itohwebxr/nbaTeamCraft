/**
 * NBA TeamCraft — Kaggle SQLite importer
 *
 * Usage:
 *   npx tsx scripts/import.ts <path-to-basketball.sqlite>
 *   npx tsx scripts/import.ts ./basketball.sqlite
 *
 * Downloads: https://www.kaggle.com/datasets/wyattowalsh/basketball
 */

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import ws from "ws";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
);

// Season filter: 2000 = 2000-01 season
const MIN_SEASON = 2000;

// Position mapping from Kaggle data to our PG/SG/SF/PF/C
function normalizePosition(raw: string | null): string {
  if (!raw) return "SF";
  const p = raw.trim().toUpperCase();
  if (p === "PG" || p === "POINT GUARD") return "PG";
  if (p === "SG" || p === "SHOOTING GUARD") return "SG";
  if (p === "SF" || p === "SMALL FORWARD") return "SF";
  if (p === "PF" || p === "POWER FORWARD") return "PF";
  if (p === "C"  || p === "CENTER") return "C";
  // Handle combined e.g. "PG-SG" → take first
  const first = p.split(/[-\/]/)[0].trim();
  return normalizePosition(first);
}

// Parse "MM:SS" or numeric minutes string → decimal minutes
function parseMinutes(raw: string | number | null): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  const str = String(raw).trim();
  if (str.includes(":")) {
    const [m, s] = str.split(":").map(Number);
    return m + (s || 0) / 60;
  }
  const v = parseFloat(str);
  return isNaN(v) ? 0 : v;
}

function safeFloat(v: unknown): number {
  const n = parseFloat(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}

// Position-based weights for Overall
const WEIGHTS: Record<string, Record<string, number>> = {
  PG: { ppg: 0.30, rpg: 0.10, apg: 0.30, spg: 0.18, bpg: 0.12 },
  SG: { ppg: 0.35, rpg: 0.10, apg: 0.18, spg: 0.18, bpg: 0.19 },
  SF: { ppg: 0.32, rpg: 0.15, apg: 0.15, spg: 0.18, bpg: 0.20 },
  PF: { ppg: 0.28, rpg: 0.27, apg: 0.10, spg: 0.15, bpg: 0.20 },
  C:  { ppg: 0.25, rpg: 0.35, apg: 0.06, spg: 0.10, bpg: 0.24 },
};

function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 0;
  const sorted = [...population].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return (below + equal * 0.5) / sorted.length;
}

interface PlayerStats {
  nba_player_id: string;
  name: string;
  position: string;
  team_tricode: string;
  team_name: string;
  season_id: number;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
}

function calcOverall(stats: PlayerStats, population: PlayerStats[]): number {
  const pos = stats.position;
  const weights = WEIGHTS[pos] ?? WEIGHTS["SF"];

  let rawScore = 0;
  for (const key of Object.keys(weights)) {
    const pop = population.map((p) => p[key as keyof PlayerStats] as number);
    const pct = percentileRank(stats[key as keyof PlayerStats] as number, pop);
    rawScore += pct * weights[key];
  }

  const mpgPenalty = stats.mpg < 10 ? -5 : 0;
  return Math.max(60, Math.min(100, Math.round(60 + rawScore * 40) + mpgPenalty));
}

function calcCost(overall: number): number {
  if (overall >= 95) return 5;
  if (overall >= 88) return 4;
  if (overall >= 76) return 3;
  if (overall >= 65) return 2;
  return 1;
}

function seasonLabel(seasonId: number): string {
  // 2000 → "2000-01", 2024 → "2024-25"
  const next = String(seasonId + 1).slice(2);
  return `${seasonId}-${next}`;
}

function buildTeamName(tricode: string, teamFullName: string, season: string): string {
  return `${season} ${teamFullName}`;
}

interface RawRow {
  player_id: string | number;
  first_name: string;
  last_name: string;
  position: string;
  team_tricode: string;
  team_full_name: string;
  season_id: number;
  games: number;
  total_pts: number;
  total_reb: number;
  total_ast: number;
  total_stl: number;
  total_blk: number;
  total_min: number;
}

function loadFromSqlite(dbPath: string): PlayerStats[] {
  const db = new Database(dbPath, { readonly: true });

  // Probe which tables exist
  const tables: string[] = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r: any) => r.name);

  console.log(`Tables found (first 20): ${tables.slice(0, 20).join(", ")}`);

  // Try star schema first (fact_player_game_traditional + dim_player + dim_team)
  const hasFact = tables.includes("fact_player_game_traditional");
  const hasDimPlayer = tables.includes("dim_player");
  const hasDimTeam = tables.includes("dim_team");

  let rows: RawRow[] = [];

  if (hasFact && hasDimPlayer && hasDimTeam) {
    console.log("Using star schema tables...");
    rows = db.prepare(`
      SELECT
        p.personId        AS player_id,
        p.firstName       AS first_name,
        p.familyName      AS last_name,
        p.position        AS position,
        t.teamTricode     AS team_tricode,
        t.teamName        AS team_full_name,
        f.season_id       AS season_id,
        COUNT(f.game_id)  AS games,
        SUM(f.points)           AS total_pts,
        SUM(f.reboundsTotal)    AS total_reb,
        SUM(f.assists)          AS total_ast,
        SUM(f.steals)           AS total_stl,
        SUM(f.blocks)           AS total_blk,
        SUM(f.minutes)          AS total_min
      FROM fact_player_game_traditional f
      JOIN dim_player p ON f.player_id = p.personId
      JOIN dim_team   t ON f.team_id   = t.team_id
      WHERE f.season_id >= ${MIN_SEASON}
      GROUP BY p.personId, t.team_id, f.season_id
      HAVING games >= 5
    `).all() as RawRow[];
  } else {
    // Fallback: try common_player_info + game table structure
    const hasGame = tables.includes("game");
    const hasPlayerInfo = tables.includes("common_player_info");

    if (hasGame && hasPlayerInfo) {
      console.log("Using common_player_info + game tables...");

      // Probe game table columns
      const gameColumns: string[] = db
        .prepare("PRAGMA table_info(game)")
        .all()
        .map((r: any) => r.name);
      console.log(`game columns (first 20): ${gameColumns.slice(0, 20).join(", ")}`);

      const playerInfoCols: string[] = db
        .prepare("PRAGMA table_info(common_player_info)")
        .all()
        .map((r: any) => r.name);
      console.log(`common_player_info columns: ${playerInfoCols.join(", ")}`);
    } else {
      // Dump ALL table schemas for debugging
      console.log("\nDumping ALL table schemas:");
      for (const t of tables) {
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((r: any) => r.name);
        console.log(`  ${t}: ${cols.join(", ")}`);
      }
      db.close();
      throw new Error("Cannot find player stats tables. Check schema above.");
    }
  }

  db.close();

  return rows.map((r) => ({
    nba_player_id: String(r.player_id),
    name: `${r.first_name} ${r.last_name}`.trim(),
    position: normalizePosition(r.position),
    team_tricode: r.team_tricode ?? "UNK",
    team_name: r.team_full_name ?? "Unknown Team",
    season_id: r.season_id,
    games: r.games,
    ppg: r.games > 0 ? safeFloat(r.total_pts) / r.games : 0,
    rpg: r.games > 0 ? safeFloat(r.total_reb) / r.games : 0,
    apg: r.games > 0 ? safeFloat(r.total_ast) / r.games : 0,
    spg: r.games > 0 ? safeFloat(r.total_stl) / r.games : 0,
    bpg: r.games > 0 ? safeFloat(r.total_blk) / r.games : 0,
    mpg: r.games > 0 ? parseMinutes(r.total_min) / r.games : 0,
  }));
}

async function upsertBatch(playerStats: PlayerStats[]): Promise<void> {
  // Group by season for overall calculation within each season pool
  const bySeason = new Map<number, PlayerStats[]>();
  for (const ps of playerStats) {
    const arr = bySeason.get(ps.season_id) ?? [];
    arr.push(ps);
    bySeason.set(ps.season_id, arr);
  }

  let processed = 0;
  const total = playerStats.length;

  for (const [seasonId, seasonPlayers] of bySeason) {
    const season = seasonLabel(seasonId);
    console.log(`\nSeason ${season}: ${seasonPlayers.length} player-team entries`);

    // Group by team within season
    const byTeam = new Map<string, PlayerStats[]>();
    for (const ps of seasonPlayers) {
      const key = ps.team_tricode;
      const arr = byTeam.get(key) ?? [];
      arr.push(ps);
      byTeam.set(key, arr);
    }

    for (const [tricode, teamPlayers] of byTeam) {
      const teamFullName = buildTeamName(tricode, teamPlayers[0].team_name, season);

      // Upsert team
      const { data: teamData, error: teamErr } = await supabase
        .from("teams")
        .upsert(
          { name: teamFullName, abbreviation: tricode, season },
          { onConflict: "abbreviation,season" }
        )
        .select("id")
        .single();

      if (teamErr || !teamData) {
        console.error(`  [error] team ${tricode} ${season}:`, teamErr?.message);
        continue;
      }

      for (const ps of teamPlayers) {
        // Upsert player
        const { data: playerData, error: playerErr } = await supabase
          .from("players")
          .upsert(
            { nba_player_id: ps.nba_player_id, name: ps.name },
            { onConflict: "nba_player_id" }
          )
          .select("id")
          .single();

        if (playerErr || !playerData) {
          console.error(`  [error] player ${ps.name}:`, playerErr?.message);
          continue;
        }

        const overall = calcOverall(ps, seasonPlayers);
        const cost = calcCost(overall);

        // Upsert player_season
        const { data: psData, error: psErr } = await supabase
          .from("player_seasons")
          .upsert(
            {
              player_id: playerData.id,
              team_id: teamData.id,
              season,
              ppg: Math.round(ps.ppg * 100) / 100,
              rpg: Math.round(ps.rpg * 100) / 100,
              apg: Math.round(ps.apg * 100) / 100,
              spg: Math.round(ps.spg * 100) / 100,
              bpg: Math.round(ps.bpg * 100) / 100,
              mpg: Math.round(ps.mpg * 100) / 100,
              overall,
              cost,
            },
            { onConflict: "player_id,team_id,season" }
          )
          .select("id")
          .single();

        if (psErr || !psData) {
          console.error(`  [error] player_season ${ps.name}:`, psErr?.message);
          continue;
        }

        // Upsert position
        await supabase
          .from("player_season_positions")
          .delete()
          .eq("player_season_id", psData.id);

        await supabase.from("player_season_positions").insert({
          player_season_id: psData.id,
          position: ps.position,
          is_primary: true,
        });

        processed++;
        if (processed % 100 === 0) {
          console.log(`  Progress: ${processed}/${total}`);
        }
      }
    }
  }
}

async function main() {
  const dbPath = process.argv[2];
  if (!dbPath) {
    console.error("Usage: npx tsx scripts/import.ts <path-to-basketball.sqlite>");
    process.exit(1);
  }

  console.log(`Loading from: ${dbPath}`);
  const playerStats = loadFromSqlite(dbPath);
  console.log(`Loaded ${playerStats.length} player-season-team records`);

  if (playerStats.length === 0) {
    console.error("No data loaded. Check the schema dump above.");
    process.exit(1);
  }

  await upsertBatch(playerStats);
  console.log("\nImport complete.");
}

main().catch(console.error);
