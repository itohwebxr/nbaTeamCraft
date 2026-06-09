/**
 * NBA TeamCraft — Kaggle CSV importer
 * Dataset: sumitrodatta/nba-aba-baa-stats
 *
 * Usage:
 *   npx tsx scripts/import.ts <path-to-per-game-csv>
 *   npx tsx scripts/import.ts "data/Player Per Game.csv"
 *
 * The CSV should contain columns:
 *   player_id (or player), pos, tm, season, g, mp, pts, trb, ast, stl, blk
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import ws from "ws";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
);

// 2000-01 season onwards (season column value "2001" = 2000-01)
const MIN_SEASON_YEAR = 2001;
const MIN_GAMES = 5;

// Normalize column names from CSV (case-insensitive, strip spaces)
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

// Parse CSV into array of objects with normalized keys
function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(normalizeKey);
  console.log(`CSV columns: ${headers.join(", ")}`);

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const fields: string[] = [];
    let current = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { fields.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    fields.push(current.trim());

    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (fields[i] ?? "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

function safeFloat(v: string | undefined): number {
  if (!v || v === "" || v === "NA" || v === "null") return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function safeInt(v: string | undefined): number {
  return Math.round(safeFloat(v));
}

// Position mapping
const POS_MAP: Record<string, string> = {
  PG: "PG", SG: "SG", SF: "SF", PF: "PF", C: "C",
  G: "SG", F: "SF", "F-C": "PF", "C-F": "C",
  "G-F": "SG", "F-G": "SF",
};

function normalizePosition(raw: string | undefined): string {
  if (!raw) return "SF";
  const t = raw.trim().toUpperCase();
  // Take primary position (before hyphen)
  const primary = t.split("-")[0];
  return POS_MAP[primary] ?? POS_MAP[t] ?? "SF";
}

// Convert season string to our "YYYY-YY" format
// Input examples: "2001", "2000-01", "2001-02", 2001
function normalizeSeason(raw: string | undefined): { label: string; year: number } | null {
  if (!raw) return null;
  const s = raw.trim();

  // Already "YYYY-YY" format
  if (/^\d{4}-\d{2}$/.test(s)) {
    const year = parseInt(s.slice(0, 4)) + 1;
    return { label: s, year };
  }
  // Pure year number e.g. "2001" means 2000-01 season
  if (/^\d{4}$/.test(s)) {
    const year = parseInt(s);
    const prev = year - 1;
    const label = `${prev}-${String(year).slice(2)}`;
    return { label, year };
  }
  // "2000-2001" format
  if (/^\d{4}-\d{4}$/.test(s)) {
    const year = parseInt(s.slice(5));
    const prev = year - 1;
    const label = `${prev}-${String(year).slice(2)}`;
    return { label, year };
  }
  return null;
}

// Team name lookup — supplemented by team abbreviation
const TEAM_NAMES: Record<string, string> = {
  ATL: "Atlanta Hawks", BOS: "Boston Celtics", BRK: "Brooklyn Nets",
  CHA: "Charlotte Hornets", CHH: "Charlotte Hornets", CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers", DAL: "Dallas Mavericks", DEN: "Denver Nuggets",
  DET: "Detroit Pistons", GSW: "Golden State Warriors", HOU: "Houston Rockets",
  IND: "Indiana Pacers", LAC: "LA Clippers", LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies", MIA: "Miami Heat", MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves", NJN: "New Jersey Nets", NOH: "New Orleans Hornets",
  NOK: "New Orleans/OKC Hornets", NOP: "New Orleans Pelicans", NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder", ORL: "Orlando Magic", PHI: "Philadelphia 76ers",
  PHO: "Phoenix Suns", POR: "Portland Trail Blazers", SAC: "Sacramento Kings",
  SAS: "San Antonio Spurs", SEA: "Seattle SuperSonics", TOR: "Toronto Raptors",
  UTA: "Utah Jazz", VAN: "Vancouver Grizzlies", WAS: "Washington Wizards",
  WSB: "Washington Bullets",
};

interface PlayerStats {
  player_id: string;
  name: string;
  position: string;
  team_abbr: string;
  season_label: string;
  season_year: number;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
}

const WEIGHTS = { ppg: 0.45, rpg: 0.15, apg: 0.22, spg: 0.08, bpg: 0.10 };

function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 0;
  const sorted = [...population].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return (below + equal * 0.5) / sorted.length;
}

function calcOverall(stats: PlayerStats, population: PlayerStats[]): number {
  const weights = WEIGHTS;
  let rawScore = 0;
  for (const key of Object.keys(weights)) {
    const pop = population.map((p) => p[key as keyof PlayerStats] as number);
    const pct = percentileRank(stats[key as keyof PlayerStats] as number, pop);
    rawScore += pct * weights[key];
  }
  const mpgPenalty = stats.mpg < 10 ? -5 : 0;
  return Math.max(60, Math.min(100, Math.round(60 + Math.pow(rawScore, 1.3) * 40) + mpgPenalty));
}

function calcCost(overall: number): number {
  if (overall >= 95) return 5;
  if (overall >= 88) return 4;
  if (overall >= 76) return 3;
  if (overall >= 65) return 2;
  return 1;
}

function loadCSV(filePath: string): PlayerStats[] {
  const rows = parseCSV(filePath);
  if (rows.length === 0) throw new Error("CSV is empty or malformed");

  // Show first row to verify column mapping
  console.log("First row sample:", JSON.stringify(rows[0]));

  const result: PlayerStats[] = [];
  let debugCount = 0;

  for (const row of rows) {
    // Detect column names flexibly
    const playerIdRaw = row["player_id"] ?? row["player_additional"] ?? "";
    const nameRaw = row["player"] ?? row["name"] ?? "";
    const posRaw = row["pos"] ?? row["position"] ?? "";
    const tmRaw = (row["team"] ?? row["tm"] ?? "").toUpperCase();
    const seasonRaw = row["season"] ?? row["year"] ?? "";
    const gRaw = row["g"] ?? row["games"] ?? "0";

    // Skip traded player total rows
    if (tmRaw === "TOT" || tmRaw === "2TM" || tmRaw === "3TM" || tmRaw === "4TM") continue;

    const seasonResult = normalizeSeason(seasonRaw);
    if (!seasonResult) continue;
    if (seasonResult.year < MIN_SEASON_YEAR) continue;

    const games = safeInt(gRaw);
    if (games < MIN_GAMES) continue;

    if (!nameRaw) continue;

    const entry: PlayerStats = {
      player_id: playerIdRaw || nameRaw.toLowerCase().replace(/\s+/g, "_"),
      name: nameRaw,
      position: normalizePosition(posRaw),
      team_abbr: tmRaw,
      season_label: seasonResult.label,
      season_year: seasonResult.year,
      games,
      ppg: safeFloat(row["pts_per_game"] ?? row["pts"] ?? row["ppg"]),
      rpg: safeFloat(row["trb_per_game"] ?? row["trb"] ?? row["reb"] ?? row["rpg"]),
      apg: safeFloat(row["ast_per_game"] ?? row["ast"] ?? row["apg"]),
      spg: safeFloat(row["stl_per_game"] ?? row["stl"] ?? row["spg"]),
      bpg: safeFloat(row["blk_per_game"] ?? row["blk"] ?? row["bpg"]),
      mpg: safeFloat(row["mp_per_game"] ?? row["mp"] ?? row["mpg"] ?? row["min"]),
    };
    // Print first 3 entries to verify stats mapping
    if (debugCount < 3) {
      console.log(`  [debug] ${entry.name} | ppg=${entry.ppg} rpg=${entry.rpg} apg=${entry.apg} mpg=${entry.mpg}`);
      debugCount++;
    }
    result.push(entry);
  }

  return result;
}

async function upsertAll(players: PlayerStats[]): Promise<void> {
  // Group by season for percentile calculation
  const bySeason = new Map<number, PlayerStats[]>();
  for (const p of players) {
    const arr = bySeason.get(p.season_year) ?? [];
    arr.push(p);
    bySeason.set(p.season_year, arr);
  }

  let processed = 0;
  const total = players.length;

  for (const [seasonYear, seasonPlayers] of [...bySeason.entries()].sort((a, b) => a[0] - b[0])) {
    const season = seasonPlayers[0].season_label;
    const byTeam = new Map<string, PlayerStats[]>();
    for (const p of seasonPlayers) {
      const arr = byTeam.get(p.team_abbr) ?? [];
      arr.push(p);
      byTeam.set(p.team_abbr, arr);
    }

    process.stdout.write(`Season ${season}: ${seasonPlayers.length} players, ${byTeam.size} teams\n`);

    for (const [abbr, teamPlayers] of byTeam) {
      const teamFullName = `${season} ${TEAM_NAMES[abbr] ?? abbr}`;

      const { data: teamData, error: teamErr } = await supabase
        .from("teams")
        .upsert({ name: teamFullName, abbreviation: abbr, season }, { onConflict: "abbreviation,season" })
        .select("id").single();

      if (teamErr || !teamData) {
        console.error(`  [error] team ${abbr}:`, teamErr?.message); continue;
      }

      for (const ps of teamPlayers) {
        const { data: playerData, error: playerErr } = await supabase
          .from("players")
          .upsert({ nba_player_id: ps.player_id, name: ps.name }, { onConflict: "nba_player_id" })
          .select("id").single();

        if (playerErr || !playerData) {
          console.error(`  [error] player ${ps.name}:`, playerErr?.message); continue;
        }

        // Use MPG >= 20 players as population; fall back to full season if too small
        const qualifiedPop = seasonPlayers.filter((p) => p.mpg >= 20);
        const overall = calcOverall(ps, qualifiedPop.length >= 30 ? qualifiedPop : seasonPlayers);
        const cost = calcCost(overall);

        const { data: psData, error: psErr } = await supabase
          .from("player_seasons")
          .upsert({
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
          }, { onConflict: "player_id,team_id,season" })
          .select("id").single();

        if (psErr || !psData) {
          console.error(`  [error] player_season ${ps.name}:`, psErr?.message); continue;
        }

        await supabase.from("player_season_positions").delete().eq("player_season_id", psData.id);
        await supabase.from("player_season_positions").insert({
          player_season_id: psData.id,
          position: ps.position,
          is_primary: true,
        });

        processed++;
        if (processed % 200 === 0) {
          process.stdout.write(`  Progress: ${processed}/${total}\n`);
        }
      }
    }
  }
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/import.ts "data/Player Per Game.csv"');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Loading: ${csvPath}`);
  const players = loadCSV(csvPath);
  console.log(`Loaded ${players.length} player-season-team records (season >= 2000-01, games >= ${MIN_GAMES})`);

  if (players.length === 0) {
    console.error("No records loaded. Check CSV column names in the output above.");
    process.exit(1);
  }

  await upsertAll(players);
  console.log("\nImport complete.");
}

main().catch(console.error);
