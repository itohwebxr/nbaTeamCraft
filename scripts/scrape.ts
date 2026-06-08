/**
 * NBA TeamCraft — Basketball Reference scraper
 *
 * Usage:
 *   npx tsx scripts/scrape.ts                  # scrape all seasons
 *   npx tsx scripts/scrape.ts LAL 2001         # single team/season (debug)
 *   npx tsx scripts/scrape.ts --calc-overall   # recalculate overall/cost only
 */

import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import ws from "ws";
import puppeteer, { Browser } from "puppeteer";
import { getAllTeamSeasons } from "./teams";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

// Rate limit: 2 sec between requests to respect BBRef
const DELAY_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// Position mapping from BBRef abbreviations
const POS_MAP: Record<string, string[]> = {
  PG:    ["PG"],
  SG:    ["SG"],
  SF:    ["SF"],
  PF:    ["PF"],
  C:     ["C"],
  "PG-SG": ["PG", "SG"],
  "SG-PG": ["SG", "PG"],
  "SG-SF": ["SG", "SF"],
  "SF-SG": ["SF", "SG"],
  "SF-PF": ["SF", "PF"],
  "PF-SF": ["PF", "SF"],
  "PF-C":  ["PF", "C"],
  "C-PF":  ["C", "PF"],
  "C-SF":  ["C", "SF"],
  "SF-C":  ["SF", "C"],
  "G":     ["SG"],
  "F":     ["SF"],
  "F-C":   ["PF", "C"],
  "C-F":   ["C", "PF"],
  "G-F":   ["SG", "SF"],
  "F-G":   ["SF", "SG"],
};

function parsePositions(raw: string): string[] {
  const trimmed = raw.trim();
  return POS_MAP[trimmed] ?? [mapGeneric(trimmed)];
}

function mapGeneric(pos: string): string {
  if (pos.includes("PG")) return "PG";
  if (pos.includes("SG") || pos === "G") return "SG";
  if (pos.includes("SF") || pos === "F") return "SF";
  if (pos.includes("PF")) return "PF";
  if (pos.includes("C")) return "C";
  return "SF"; // fallback
}

// Position-based weights for Overall calculation
const WEIGHTS: Record<string, Record<string, number>> = {
  PG: { ppg: 0.25, rpg: 0.08, apg: 0.25, spg: 0.15, bpg: 0.07, win_shares: 0.20 },
  SG: { ppg: 0.30, rpg: 0.08, apg: 0.15, spg: 0.15, bpg: 0.07, win_shares: 0.25 },
  SF: { ppg: 0.28, rpg: 0.12, apg: 0.12, spg: 0.15, bpg: 0.08, win_shares: 0.25 },
  PF: { ppg: 0.25, rpg: 0.22, apg: 0.08, spg: 0.12, bpg: 0.13, win_shares: 0.20 },
  C:  { ppg: 0.22, rpg: 0.28, apg: 0.05, spg: 0.08, bpg: 0.17, win_shares: 0.20 },
};

function percentileRank(value: number, population: number[]): number {
  const sorted = [...population].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return (below + equal * 0.5) / sorted.length;
}

interface PlayerRow {
  bbref_player_id: string;
  name: string;
  positions: string[];
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
  win_shares: number;
  dws: number;
}

async function fetchTeamPage(abbr: string, year: number): Promise<string | null> {
  const url = `https://www.basketball-reference.com/teams/${abbr}/${year}.html`;
  try {
    const b = await getBrowser();
    const page = await b.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = response?.status() ?? 0;
    if (status === 404) {
      console.log(`  [skip] 404 ${abbr} ${year}`);
      await page.close();
      return null;
    }
    if (status >= 400) {
      console.error(`  [error] HTTP ${status} for ${abbr} ${year}`);
      await page.close();
      return null;
    }
    const html = await page.content();
    await page.close();
    return html;
  } catch (e) {
    console.error(`  [error] fetch failed for ${abbr} ${year}:`, e);
    return null;
  }
}

function parseTeamName(html: string): string {
  const $ = cheerio.load(html);
  return $("h1 span").first().text().trim() || "Unknown Team";
}

function parseRoster(html: string): Array<{ bbref_player_id: string; name: string; positions: string[] }> {
  const $ = cheerio.load(html);
  const players: Array<{ bbref_player_id: string; name: string; positions: string[] }> = [];

  $("#roster tbody tr").each((_, row) => {
    const $row = $(row);
    if ($row.hasClass("thead")) return;

    const playerLink = $row.find('td[data-stat="player"] a');
    const name = playerLink.text().trim();
    const href = playerLink.attr("href") || "";
    const posRaw = $row.find('td[data-stat="pos"]').text().trim();

    if (!name || !href) return;

    // Extract bbref_player_id from href like /players/c/curryst01.html
    const match = href.match(/\/players\/\w\/(\w+)\.html/);
    if (!match) return;

    const bbref_player_id = match[1];
    const positions = parsePositions(posRaw || "SF");

    players.push({ bbref_player_id, name, positions });
  });

  return players;
}

interface PerGameRow {
  bbref_player_id: string;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
}

interface AdvancedRow {
  bbref_player_id: string;
  win_shares: number;
  dws: number;
}

function parsePerGame(html: string): Map<string, PerGameRow> {
  const $ = cheerio.load(html);
  const map = new Map<string, PerGameRow>();

  $("#per_game tbody tr").each((_, row) => {
    const $row = $(row);
    if ($row.hasClass("thead")) return;

    const playerLink = $row.find('td[data-stat="player"] a');
    const href = playerLink.attr("href") || "";
    const match = href.match(/\/players\/\w\/(\w+)\.html/);
    if (!match) return;

    const id = match[1];
    const g = parseFloat($row.find('td[data-stat="g"]').text()) || 0;
    if (g === 0) return;

    map.set(id, {
      bbref_player_id: id,
      ppg: parseFloat($row.find('td[data-stat="pts_per_g"]').text()) || 0,
      rpg: parseFloat($row.find('td[data-stat="trb_per_g"]').text()) || 0,
      apg: parseFloat($row.find('td[data-stat="ast_per_g"]').text()) || 0,
      spg: parseFloat($row.find('td[data-stat="stl_per_g"]').text()) || 0,
      bpg: parseFloat($row.find('td[data-stat="blk_per_g"]').text()) || 0,
      mpg: parseFloat($row.find('td[data-stat="mp_per_g"]').text()) || 0,
    });
  });

  return map;
}

function parseAdvanced(html: string): Map<string, AdvancedRow> {
  const $ = cheerio.load(html);
  const map = new Map<string, AdvancedRow>();

  // Advanced table may be commented out — uncomment it
  const advHtml = html.replace(/<!--([\s\S]*?)-->/g, (_, inner) =>
    inner.includes("id=\"advanced\"") ? inner : `<!--${inner}-->`
  );
  const $adv = cheerio.load(advHtml);

  $adv("#advanced tbody tr").each((_, row) => {
    const $row = $adv(row);
    if ($row.hasClass("thead")) return;

    const playerLink = $row.find('td[data-stat="player"] a');
    const href = playerLink.attr("href") || "";
    const match = href.match(/\/players\/\w\/(\w+)\.html/);
    if (!match) return;

    const id = match[1];
    map.set(id, {
      bbref_player_id: id,
      win_shares: parseFloat($row.find('td[data-stat="ws"]').text()) || 0,
      dws: parseFloat($row.find('td[data-stat="dws"]').text()) || 0,
    });
  });

  return map;
}

function calcOverall(
  stats: PlayerRow,
  population: PlayerRow[]
): number {
  const primaryPos = stats.positions[0];
  const weights = WEIGHTS[primaryPos] ?? WEIGHTS["SF"];
  const keys = Object.keys(weights) as Array<keyof typeof weights>;

  let rawScore = 0;
  for (const key of keys) {
    const pop = population.map((p) => p[key as keyof PlayerRow] as number);
    const pct = percentileRank(stats[key as keyof PlayerRow] as number, pop);
    rawScore += pct * (weights[key] as number);
  }

  const mpgPenalty = stats.mpg < 10 ? -5 : 0;
  const overall = Math.round(60 + rawScore * 40) + mpgPenalty;
  return Math.max(60, Math.min(100, overall));
}

function calcCost(overall: number): number {
  if (overall >= 95) return 5;
  if (overall >= 88) return 4;
  if (overall >= 76) return 3;
  if (overall >= 65) return 2;
  return 1;
}

async function upsertTeamAndPlayers(
  abbr: string,
  year: number,
  teamFullName: string,
  players: PlayerRow[]
): Promise<void> {
  const season = `${year - 1}-${String(year).slice(2)}`; // e.g. "2000-01"

  // Upsert team
  const { data: teamData, error: teamErr } = await supabase
    .from("teams")
    .upsert(
      { name: teamFullName, abbreviation: abbr, season },
      { onConflict: "name" }
    )
    .select("id")
    .single();

  if (teamErr || !teamData) {
    console.error(`  [db error] team upsert ${abbr} ${year}:`, teamErr);
    return;
  }
  const teamId = teamData.id;

  // Build population for overall calculation
  for (const player of players) {
    // Upsert player
    const { data: playerData, error: playerErr } = await supabase
      .from("players")
      .upsert(
        { bbref_player_id: player.bbref_player_id, name: player.name },
        { onConflict: "bbref_player_id" }
      )
      .select("id")
      .single();

    if (playerErr || !playerData) {
      console.error(`  [db error] player upsert ${player.name}:`, playerErr);
      continue;
    }

    const overall = calcOverall(player, players);
    const cost = calcCost(overall);

    // Upsert player_season
    const { data: psData, error: psErr } = await supabase
      .from("player_seasons")
      .upsert(
        {
          player_id: playerData.id,
          team_id: teamId,
          season,
          ppg: player.ppg,
          rpg: player.rpg,
          apg: player.apg,
          spg: player.spg,
          bpg: player.bpg,
          mpg: player.mpg,
          win_shares: player.win_shares,
          dws: player.dws,
          overall,
          cost,
        },
        { onConflict: "player_id,team_id,season" }
      )
      .select("id")
      .single();

    if (psErr || !psData) {
      console.error(`  [db error] player_season upsert ${player.name}:`, psErr);
      continue;
    }

    // Delete existing positions and re-insert
    await supabase
      .from("player_season_positions")
      .delete()
      .eq("player_season_id", psData.id);

    const posRows = player.positions.map((pos, i) => ({
      player_season_id: psData.id,
      position: pos,
      is_primary: i === 0,
    }));

    const { error: posErr } = await supabase
      .from("player_season_positions")
      .insert(posRows);

    if (posErr) {
      console.error(`  [db error] positions insert ${player.name}:`, posErr);
    }
  }
}

async function scrapeTeamSeason(abbr: string, year: number): Promise<void> {
  console.log(`Scraping ${abbr} ${year}...`);

  const html = await fetchTeamPage(abbr, year);
  if (!html) return;

  const teamName = parseTeamName(html);
  const roster = parseRoster(html);
  const perGameMap = parsePerGame(html);
  const advancedMap = parseAdvanced(html);

  const players: PlayerRow[] = [];

  for (const r of roster) {
    const pg = perGameMap.get(r.bbref_player_id);
    const adv = advancedMap.get(r.bbref_player_id);

    players.push({
      bbref_player_id: r.bbref_player_id,
      name: r.name,
      positions: r.positions,
      ppg: pg?.ppg ?? 0,
      rpg: pg?.rpg ?? 0,
      apg: pg?.apg ?? 0,
      spg: pg?.spg ?? 0,
      bpg: pg?.bpg ?? 0,
      mpg: pg?.mpg ?? 0,
      win_shares: adv?.win_shares ?? 0,
      dws: adv?.dws ?? 0,
    });
  }

  if (players.length === 0) {
    console.log(`  [skip] no players found for ${abbr} ${year}`);
    return;
  }

  console.log(`  ${teamName}: ${players.length} players`);
  await upsertTeamAndPlayers(abbr, year, teamName, players);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 2 && !args[0].startsWith("--")) {
    // Single team debug mode: npx tsx scripts/scrape.ts LAL 2001
    const [abbr, yearStr] = args;
    await scrapeTeamSeason(abbr.toUpperCase(), parseInt(yearStr));
    console.log("Done.");
    return;
  }

  const teamSeasons = getAllTeamSeasons();
  console.log(`Total team-seasons to scrape: ${teamSeasons.length}`);

  let count = 0;
  for (const { abbr, year } of teamSeasons) {
    await scrapeTeamSeason(abbr, year);
    count++;
    console.log(`  Progress: ${count}/${teamSeasons.length}`);
    await sleep(DELAY_MS);
  }

  console.log("Scraping complete.");
  await closeBrowser();
}

main().catch(async (e) => {
  console.error(e);
  await closeBrowser();
});
