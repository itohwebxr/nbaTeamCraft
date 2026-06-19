import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PlayedForAllParams } from "@/lib/triviaTemplates";

export const dynamic = "force-dynamic";

type CsvRow = Record<string, string>;

function parseCsv(content: string): CsvRow[] {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: CsvRow = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? "").trim(); });
    return row;
  });
}

function loadCsv(): CsvRow[] {
  const content = fs.readFileSync(path.join(process.cwd(), "data", "player_per_game.csv"), "utf-8");
  return parseCsv(content).filter((r) => {
    const g = parseInt(r.g, 10);
    return !isNaN(g) && g >= 20 && r.team !== "2TM" && r.team !== "3TM";
  });
}

// POST /api/trivia/validate
// Body: { template: "played_for_all", params: { teams: string[] }, player_name: string }
// Returns: { is_correct: boolean, all_correct: string[] }
export async function POST(req: NextRequest) {
  try {
    const { template, params, player_name } = await req.json() as {
      template: string;
      params: PlayedForAllParams;
      player_name: string;
    };

    if (template !== "played_for_all") {
      return NextResponse.json({ error: "Only played_for_all supported" }, { status: 400 });
    }

    const { teams } = params;
    const rows = loadCsv();

    // Build map: player_id -> { name, teams played }
    const playerTeams = new Map<string, Set<string>>();
    const playerNames = new Map<string, string>();
    for (const row of rows) {
      if (!playerTeams.has(row.player_id)) playerTeams.set(row.player_id, new Set());
      playerTeams.get(row.player_id)!.add(row.team);
      if (!playerNames.has(row.player_id)) playerNames.set(row.player_id, row.player);
    }

    const all_correct: string[] = [];
    for (const [pid, teamSet] of playerTeams.entries()) {
      if (teams.every((t) => teamSet.has(t))) {
        all_correct.push(playerNames.get(pid)!);
      }
    }
    all_correct.sort();

    const is_correct = all_correct.some(
      (n) => n.toLowerCase() === player_name.toLowerCase()
    );

    return NextResponse.json({ is_correct, all_correct });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
