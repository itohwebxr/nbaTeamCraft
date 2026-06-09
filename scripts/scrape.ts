/**
 * NBA TeamCraft — Basketball Reference scraper
 *
 * Usage:
 *   npx tsx scripts/scrape.ts                  # scrape all seasons
 *   npx tsx scripts/scrape.ts LAL 2001         # single team/season (debug)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import ws from "ws";
import puppeteer, { Browser, Page } from "puppeteer";
import { getAllTeamSeasons } from "./teams";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
);

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

const POS_MAP: Record<string, string[]> = {
  PG: ["PG"], SG: ["SG"], SF: ["SF"], PF: ["PF"], C: ["C"],
  "PG-SG": ["PG", "SG"], "SG-PG": ["SG", "PG"],
  "SG-SF": ["SG", "SF"], "SF-SG": ["SF", "SG"],
  "SF-PF": ["SF", "PF"], "PF-SF": ["PF", "SF"],
  "PF-C":  ["PF", "C"],  "C-PF":  ["C", "PF"],
  "C-SF":  ["C", "SF"],  "SF-C":  ["SF", "C"],
  "G": ["SG"], "F": ["SF"],
  "F-C": ["PF", "C"], "C-F": ["C", "PF"],
  "G-F": ["SG", "SF"], "F-G": ["SF", "SG"],
};

function parsePositions(raw: string): string[] {
  const t = raw.trim();
  if (POS_MAP[t]) return POS_MAP[t];
  if (t.includes("PG")) return ["PG"];
  if (t.includes("SG") || t === "G") return ["SG"];
  if (t.includes("SF") || t === "F") return ["SF"];
  if (t.includes("PF")) return ["PF"];
  if (t.includes("C")) return ["C"];
  return ["SF"];
}

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
  ppg: number; rpg: number; apg: number;
  spg: number; bpg: number; mpg: number;
  win_shares: number; dws: number;
}

// Extract all data directly from the rendered DOM via page.evaluate()
// Passed as a string to avoid tsx __name transformation issues
const EXTRACT_SCRIPT = `(function() {
  var getId = function(href) {
    if (!href) return null;
    var m = href.match(/\\/players\\/\\w\\/(\\w+)\\.html/);
    return m ? m[1] : null;
  };
  var pf = function(el) {
    var t = el ? el.innerText : "";
    var v = parseFloat(t);
    return isNaN(v) ? 0 : v;
  };

  var teamName = (document.querySelector("h1 span") || {}).textContent || "Unknown";
  teamName = teamName.trim();

  var roster = [];
  document.querySelectorAll("#roster tbody tr").forEach(function(row) {
    if (row.classList.contains("thead")) return;
    var a = row.querySelector('td[data-stat="player"] a');
    var id = getId(a ? a.getAttribute("href") : null);
    var name = a ? a.textContent.trim() : "";
    var posEl = row.querySelector('td[data-stat="pos"]');
    var posRaw = posEl ? posEl.innerText.trim() : "";
    if (id && name) roster.push({ bbref_player_id: id, name: name, posRaw: posRaw });
  });

  var perGame = [];
  document.querySelectorAll("#per_game_stats tbody tr").forEach(function(row) {
    if (row.classList.contains("thead")) return;
    var a = row.querySelector('td[data-stat="player"] a');
    var id = getId(a ? a.getAttribute("href") : null);
    if (!id) return;
    var g = pf(row.querySelector('td[data-stat="g"]'));
    if (g === 0) return;
    perGame.push({
      bbref_player_id: id,
      ppg: pf(row.querySelector('td[data-stat="pts_per_g"]')),
      rpg: pf(row.querySelector('td[data-stat="trb_per_g"]')),
      apg: pf(row.querySelector('td[data-stat="ast_per_g"]')),
      spg: pf(row.querySelector('td[data-stat="stl_per_g"]')),
      bpg: pf(row.querySelector('td[data-stat="blk_per_g"]')),
      mpg: pf(row.querySelector('td[data-stat="mp_per_g"]')),
    });
  });

  var advanced = [];
  document.querySelectorAll("#advanced tbody tr").forEach(function(row) {
    if (row.classList.contains("thead")) return;
    var a = row.querySelector('td[data-stat="player"] a');
    var id = getId(a ? a.getAttribute("href") : null);
    if (!id) return;
    advanced.push({
      bbref_player_id: id,
      win_shares: pf(row.querySelector('td[data-stat="ws"]')),
      dws: pf(row.querySelector('td[data-stat="dws"]')),
    });
  });

  return { teamName: teamName, roster: roster, perGame: perGame, advanced: advanced };
})()`;

async function extractPageData(page: Page): Promise<{
  teamName: string;
  roster: Array<{ bbref_player_id: string; name: string; posRaw: string }>;
  perGame: Array<{ bbref_player_id: string; ppg: number; rpg: number; apg: number; spg: number; bpg: number; mpg: number }>;
  advanced: Array<{ bbref_player_id: string; win_shares: number; dws: number }>;
}> {
  return page.evaluate(EXTRACT_SCRIPT) as Promise<any>;
}

function calcOverall(stats: PlayerRow, population: PlayerRow[]): number {
  const primaryPos = stats.positions[0];
  const weights = WEIGHTS[primaryPos] ?? WEIGHTS["SF"];
  const keys = Object.keys(weights);

  let rawScore = 0;
  for (const key of keys) {
    const pop = population.map((p) => p[key as keyof PlayerRow] as number);
    const pct = percentileRank(stats[key as keyof PlayerRow] as number, pop);
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

async function scrapeTeamSeason(abbr: string, year: number): Promise<void> {
  const url = `https://www.basketball-reference.com/teams/${abbr}/${year}.html`;
  console.log(`Scraping ${abbr} ${year}...`);

  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  try {
    const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const status = res?.status() ?? 0;
    if (status === 404) { console.log(`  [skip] 404`); return; }
    if (status >= 400) { console.error(`  [error] HTTP ${status}`); return; }

    // Debug: inspect DOM structure
    const domDebug = await page.evaluate(`(function() {
      var t = document.querySelector("#per_game_stats");
      if (!t) return "table NOT FOUND";
      var rows = t.querySelectorAll("tbody tr");
      var firstRow = rows[0] ? rows[0].innerHTML.substring(0, 200) : "no rows";
      return "rows:" + rows.length + " firstRow:" + firstRow;
    })()`);
    console.log(`  DOM debug: ${domDebug}`);

    const { teamName, roster, perGame, advanced } = await extractPageData(page);

    const perGameMap = new Map(perGame.map((r) => [r.bbref_player_id, r]));
    const advancedMap = new Map(advanced.map((r) => [r.bbref_player_id, r]));

    console.log(`  roster:${roster.length} perGame:${perGame.length} advanced:${advanced.length}`);

    const players: PlayerRow[] = roster.map((r) => {
      const pg = perGameMap.get(r.bbref_player_id);
      const adv = advancedMap.get(r.bbref_player_id);
      return {
        bbref_player_id: r.bbref_player_id,
        name: r.name,
        positions: parsePositions(r.posRaw || "SF"),
        ppg: pg?.ppg ?? 0,
        rpg: pg?.rpg ?? 0,
        apg: pg?.apg ?? 0,
        spg: pg?.spg ?? 0,
        bpg: pg?.bpg ?? 0,
        mpg: pg?.mpg ?? 0,
        win_shares: adv?.win_shares ?? 0,
        dws: adv?.dws ?? 0,
      };
    });

    if (players.length === 0) { console.log(`  [skip] no players`); return; }

    const season = `${year - 1}-${String(year).slice(2)}`;
    console.log(`  ${teamName}: ${players.length} players → DB`);
    await upsertTeamAndPlayers(abbr, year, teamName, season, players);

  } finally {
    await page.close();
  }
}

async function upsertTeamAndPlayers(
  abbr: string,
  year: number,
  teamFullName: string,
  season: string,
  players: PlayerRow[]
): Promise<void> {
  const { data: teamData, error: teamErr } = await supabase
    .from("teams")
    .upsert({ name: teamFullName, abbreviation: abbr, season }, { onConflict: "abbreviation,season" })
    .select("id").single();

  if (teamErr || !teamData) {
    console.error(`  [db error] team upsert:`, teamErr?.message);
    return;
  }

  for (const player of players) {
    const { data: playerData, error: playerErr } = await supabase
      .from("players")
      .upsert({ bbref_player_id: player.bbref_player_id, name: player.name }, { onConflict: "bbref_player_id" })
      .select("id").single();

    if (playerErr || !playerData) {
      console.error(`  [db error] player upsert ${player.name}:`, playerErr?.message);
      continue;
    }

    const overall = calcOverall(player, players);
    const cost = calcCost(overall);

    const { data: psData, error: psErr } = await supabase
      .from("player_seasons")
      .upsert({
        player_id: playerData.id, team_id: teamData.id, season,
        ppg: player.ppg, rpg: player.rpg, apg: player.apg,
        spg: player.spg, bpg: player.bpg, mpg: player.mpg,
        win_shares: player.win_shares, dws: player.dws,
        overall, cost,
      }, { onConflict: "player_id,team_id,season" })
      .select("id").single();

    if (psErr || !psData) {
      console.error(`  [db error] player_season ${player.name}:`, psErr?.message);
      continue;
    }

    await supabase.from("player_season_positions").delete().eq("player_season_id", psData.id);
    await supabase.from("player_season_positions").insert(
      player.positions.map((pos, i) => ({
        player_season_id: psData.id,
        position: pos,
        is_primary: i === 0,
      }))
    );
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 2 && !args[0].startsWith("--")) {
    const [abbr, yearStr] = args;
    await scrapeTeamSeason(abbr.toUpperCase(), parseInt(yearStr));
    console.log("Done.");
    await closeBrowser();
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
