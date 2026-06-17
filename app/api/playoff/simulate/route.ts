import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { loadSimTeam, simulateSeries, TeamMeta, SeriesResult } from "@/lib/loadSimTeam";
import { SimTeam } from "@/lib/simulateGame";

export const dynamic = "force-dynamic";

// POST /api/playoff/simulate
// Body: { teamIds: string[], size: 4 | 8 | 16 }
//
// Runs a single-elimination tournament with best-of-7 series for each matchup.
// Seeds are assigned in the order the IDs are provided (seed 1 = teamIds[0]).
// The bracket is structured as:
//   Round 1: (1v16, 2v15, 3v14, 4v13, 5v12, 6v11, 7v10, 8v9) — for size 16
//   Round 1: (1v8,  2v7,  3v6,  4v5)                          — for size 8
//   Round 1: (1v4,  2v3)                                       — for size 4
//
// Returns every round with series results so the client can render a full bracket.

const VALID_SIZES = [4, 8, 16] as const;
type BracketSize = (typeof VALID_SIZES)[number];

export type SeriesSummary = {
  homeId: string;
  awayId: string;
  home: TeamMeta;
  away: TeamMeta;
  wins: { home: number; away: number };
  winner: "home" | "away";
  // Per-game scores and top scorer (enough to render the bracket + OGP)
  games: Array<{
    homeTotal: number;
    awayTotal: number;
    winner: "home" | "away";
    overtime: boolean;
    hTopName: string;
    hTopPts: number;
    aTopName: string;
    aTopPts: number;
  }>;
};

export type PlayoffResult = {
  size: BracketSize;
  champion: TeamMeta;
  // rounds[0] = first round, rounds[last] = finals
  rounds: SeriesSummary[][];
};

function topScorer(box: { name: string; pts: number }[]): { name: string; pts: number } {
  return box.reduce(
    (best, l) => (l.pts > best.pts ? { name: l.name, pts: l.pts } : best),
    { name: "", pts: -1 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamIds, size } = body as { teamIds: string[]; size: number };

    if (!VALID_SIZES.includes(size as BracketSize)) {
      return NextResponse.json({ error: "size must be 4, 8, or 16" }, { status: 400 });
    }
    if (!Array.isArray(teamIds) || teamIds.length !== size) {
      return NextResponse.json(
        { error: `Provide exactly ${size} team IDs` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Resolve __random__ sentinels and deduplicate
    const resolved: string[] = [];
    for (const id of teamIds) {
      if (id !== "__random__") {
        resolved.push(id);
        continue;
      }
      // Pick a random team not already in the bracket
      const { data } = await supabase
        .from("public_teams")
        .select("id")
        .not("id", "in", `(${resolved.join(",") || "00000000-0000-0000-0000-000000000000"})`)
        .neq("created_by_browser_id", "__legend__")
        .limit(500);
      const pool = ((data ?? []) as { id: string }[]).filter((r) => !resolved.includes(r.id));
      if (pool.length === 0) throw new Error("Not enough teams for random picks");
      resolved.push(pool[Math.floor(Math.random() * pool.length)].id);
    }

    // Load all teams in parallel
    const loaded = await Promise.all(
      resolved.map((id) => loadSimTeam(supabase, id))
    );

    const metas = loaded.map((l) => l.meta);
    const simTeams = loaded.map((l) => l.simTeam);

    // Single-elimination bracket: higher seed (lower index) is home.
    // Pairing: 0v(n-1), 1v(n-2), 2v(n-3), …
    // e.g. 8-team: [0v7, 1v6, 2v5, 3v4]
    const rounds: SeriesSummary[][] = [];
    let currentMetas = metas;
    let currentSimTeams = simTeams;
    let currentIds = resolved;
    let roundIndex = 0;

    while (currentMetas.length > 1) {
      const roundSeries: SeriesSummary[] = [];
      const nextMetas: TeamMeta[] = [];
      const nextSimTeams: SimTeam[] = [];
      const nextIds: string[] = [];
      const half = currentMetas.length / 2;

      for (let i = 0; i < half; i++) {
        const hiIdx = i;
        const loIdx = currentMetas.length - 1 - i;
        const homeMeta = currentMetas[hiIdx];
        const awayMeta = currentMetas[loIdx];
        const homeSimTeam = currentSimTeams[hiIdx];
        const awaySimTeam = currentSimTeams[loIdx];
        const homeId = currentIds[hiIdx];
        const awayId = currentIds[loIdx];

        const seriesKey = `playoff|r${roundIndex}|m${i}`;
        const sr: SeriesResult = simulateSeries(homeSimTeam, homeId, awaySimTeam, awayId, seriesKey);

        const summary: SeriesSummary = {
          homeId,
          awayId,
          home: homeMeta,
          away: awayMeta,
          wins: sr.wins,
          winner: sr.winner,
          games: sr.games.map((g) => {
            const ht = topScorer(g.homeBox);
            const at = topScorer(g.awayBox);
            return {
              homeTotal: g.homeTotal,
              awayTotal: g.awayTotal,
              winner: g.winner,
              overtime: g.overtime,
              hTopName: ht.name,
              hTopPts: ht.pts,
              aTopName: at.name,
              aTopPts: at.pts,
            };
          }),
        };

        roundSeries.push(summary);

        const winnerMeta = sr.winner === "home" ? homeMeta : awayMeta;
        const winnerSimTeam = sr.winner === "home" ? homeSimTeam : awaySimTeam;
        const winnerId = sr.winner === "home" ? homeId : awayId;
        nextMetas.push(winnerMeta);
        nextSimTeams.push(winnerSimTeam);
        nextIds.push(winnerId);
      }

      rounds.push(roundSeries);
      currentMetas = nextMetas;
      currentSimTeams = nextSimTeams;
      currentIds = nextIds;
      roundIndex++;
    }

    const result: PlayoffResult = {
      size: size as BracketSize,
      champion: currentMetas[0],
      rounds,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("[playoff simulate]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to simulate playoff", detail }, { status: 500 });
  }
}
