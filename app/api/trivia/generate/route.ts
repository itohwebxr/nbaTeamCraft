import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  StatKey,
  STAT_LABELS,
  StatsLeaderParams,
  PlayedForAllParams,
  GeneratedQuestion,
} from "@/lib/triviaTemplates";

export const dynamic = "force-dynamic";

type CsvRow = Record<string, string>;

function parseCsv(content: string): CsvRow[] {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function loadCsv(): CsvRow[] {
  const csvPath = path.join(process.cwd(), "data", "player_per_game.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parseCsv(content);
  return records.filter((row) => {
    const g = parseInt(row.g, 10);
    const team = row.team;
    return !isNaN(g) && g >= 20 && team !== "2TM" && team !== "3TM";
  });
}

function seasonLabelToYear(season: string): number {
  // "2005-06" -> 2006
  const parts = season.split("-");
  const startYear = parseInt(parts[0], 10);
  return startYear + 1;
}

function fmtFloat(val: string): number {
  const f = parseFloat(val);
  return isNaN(f) ? 0 : f;
}

const STAT_ABBREV: Record<StatKey, string> = {
  pts_per_game: "PPG",
  trb_per_game: "RPG",
  ast_per_game: "APG",
  stl_per_game: "SPG",
  blk_per_game: "BPG",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateStatsLeader(
  rows: CsvRow[],
  params: StatsLeaderParams
): GeneratedQuestion {
  const { season, team_id, stat } = params;
  const year = seasonLabelToYear(season);

  const teamRows = rows.filter(
    (r) => r.team === team_id && parseInt(r.season, 10) === year
  );

  if (teamRows.length < 4) {
    throw new Error(`Not enough players for ${team_id} ${season}`);
  }

  const sorted = [...teamRows].sort(
    (a, b) => fmtFloat(b[stat]) - fmtFloat(a[stat])
  );

  const correct = sorted[0];
  const wrongPool = sorted.slice(1, 10);
  if (wrongPool.length < 3) {
    throw new Error(`Not enough wrong answers for ${team_id} ${season} ${stat}`);
  }
  const wrongThree = shuffle(wrongPool).slice(0, 3);

  const correctName = correct.player;
  const options = shuffle([correctName, ...wrongThree.map((r) => r.player)]);
  const answer_index = options.indexOf(correctName);
  const val = fmtFloat(correct[stat]).toFixed(1);
  const statLabel = STAT_LABELS[stat];
  const statAbbrev = STAT_ABBREV[stat];

  return {
    question: `Who led the ${season} ${team_id} in ${statLabel}?`,
    options,
    answer_index,
    explanation: `${correctName} averaged ${val} ${statAbbrev} for the ${season} ${team_id}.`,
    player_name: correctName,
  };
}

function generatePlayedForAll(
  rows: CsvRow[],
  params: PlayedForAllParams
): GeneratedQuestion {
  const { teams } = params;

  // Find players who have rows for ALL specified teams
  const playerTeams = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!playerTeams.has(row.player_id)) {
      playerTeams.set(row.player_id, new Set());
    }
    playerTeams.get(row.player_id)!.add(row.team);
  }

  const playerNames = new Map<string, string>();
  for (const row of rows) {
    if (!playerNames.has(row.player_id)) {
      playerNames.set(row.player_id, row.player);
    }
  }

  const qualifyingAll: string[] = [];
  const qualifyingSome: string[] = [];

  for (const [pid, teamSet] of playerTeams.entries()) {
    const hasAll = teams.every((t) => teamSet.has(t));
    const hasSome = teams.some((t) => teamSet.has(t));
    if (hasAll) {
      qualifyingAll.push(pid);
    } else if (hasSome) {
      qualifyingSome.push(pid);
    }
  }

  if (qualifyingAll.length === 0) {
    throw new Error(`No player found who played for ALL of: ${teams.join(", ")}`);
  }
  if (qualifyingSome.length < 3) {
    throw new Error(`Not enough wrong answers for teams: ${teams.join(", ")}`);
  }

  const correctPid = shuffle(qualifyingAll)[0];
  const correctName = playerNames.get(correctPid)!;

  const wrongPids = shuffle(qualifyingSome).slice(0, 3);
  const wrongNames = wrongPids.map((pid) => playerNames.get(pid)!);

  const options = shuffle([correctName, ...wrongNames]);
  const answer_index = options.indexOf(correctName);

  return {
    question: `Which player played for ALL of these teams? ${teams.join(" · ")}`,
    options,
    answer_index,
    explanation: `${correctName} played for ${teams.join(", ")} during their career.`,
    player_name: correctName,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { template, params } = body as {
      template: string;
      params: Record<string, unknown>;
    };

    const rows = loadCsv();

    let result: GeneratedQuestion;

    if (template === "stats_leader") {
      result = generateStatsLeader(rows, params as StatsLeaderParams);
    } else if (template === "played_for_all") {
      result = generatePlayedForAll(rows, params as PlayedForAllParams);
    } else {
      return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
