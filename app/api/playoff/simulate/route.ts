import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { loadSimTeam, simulateSeries, TeamMeta } from "@/lib/loadSimTeam";
import { SimTeam } from "@/lib/simulateGame";

export const dynamic = "force-dynamic";

// POST /api/playoff/simulate
// Body: { teamIds: string[], size: 4 | 8 | 16 }
//
// Conference-style single-elimination bracket with best-of-7 series. The field
// is split into two groups (East/West feel, but neutrally named A / B):
//   teamIds[0 .. size/2-1]      → Group A  (seeds A1..A8)
//   teamIds[size/2 .. size-1]   → Group B  (seeds B1..B8)
// Each group plays its own bracket; the two group winners meet in the Finals.

const VALID_SIZES = [4, 8, 16] as const;
type BracketSize = (typeof VALID_SIZES)[number];

export type SeriesSummary = {
  group: "A" | "B" | null; // null = the cross-group Finals
  homeId: string;
  awayId: string;
  home: TeamMeta;
  away: TeamMeta;
  wins: { home: number; away: number };
  winner: "home" | "away";
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
  // rounds[0] = first round, rounds[last] = Finals. Non-final rounds contain
  // both groups' matches (each tagged with its group).
  rounds: SeriesSummary[][];
};

type Contestant = { meta: TeamMeta; simTeam: SimTeam; id: string };

function topScorer(box: { name: string; pts: number }[]): { name: string; pts: number } {
  return box.reduce(
    (best, l) => (l.pts > best.pts ? { name: l.name, pts: l.pts } : best),
    { name: "", pts: -1 }
  );
}

function playSeries(
  home: Contestant,
  away: Contestant,
  seriesKey: string,
  group: "A" | "B" | null
): { summary: SeriesSummary; winner: Contestant } {
  const sr = simulateSeries(home.simTeam, home.id, away.simTeam, away.id, seriesKey);
  const summary: SeriesSummary = {
    group,
    homeId: home.id,
    awayId: away.id,
    home: home.meta,
    away: away.meta,
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
  return { summary, winner: sr.winner === "home" ? home : away };
}

// Run a single-group bracket (fold seeding: 1vN, 2v(N-1), …) to a single
// winner, returning each round's series.
function simulateGroupBracket(
  contestants: Contestant[],
  group: "A" | "B"
): { rounds: SeriesSummary[][]; winner: Contestant } {
  const rounds: SeriesSummary[][] = [];
  let current = contestants;
  let roundIndex = 0;

  while (current.length > 1) {
    const roundSeries: SeriesSummary[] = [];
    const next: Contestant[] = [];
    const half = current.length / 2;
    for (let i = 0; i < half; i++) {
      const home = current[i];
      const away = current[current.length - 1 - i];
      const { summary, winner } = playSeries(home, away, `playoff|${group}|r${roundIndex}|m${i}`, group);
      roundSeries.push(summary);
      next.push(winner);
    }
    rounds.push(roundSeries);
    current = next;
    roundIndex++;
  }

  return { rounds, winner: current[0] };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamIds, size } = body as { teamIds: string[]; size: number };

    if (!VALID_SIZES.includes(size as BracketSize)) {
      return NextResponse.json({ error: "size must be 4, 8, or 16" }, { status: 400 });
    }
    if (!Array.isArray(teamIds) || teamIds.length !== size) {
      return NextResponse.json({ error: `Provide exactly ${size} team IDs` }, { status: 400 });
    }

    const supabase = createServerClient();

    // Resolve __random__ sentinels and deduplicate
    const resolved: string[] = [];
    for (const id of teamIds) {
      if (id !== "__random__") {
        resolved.push(id);
        continue;
      }
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

    const loaded = await Promise.all(resolved.map((id) => loadSimTeam(supabase, id)));
    const contestants: Contestant[] = loaded.map((l, i) => ({
      meta: l.meta,
      simTeam: l.simTeam,
      id: resolved[i],
    }));

    // Split into Group A (first half) and Group B (second half)
    const half = size / 2;
    const groupA = simulateGroupBracket(contestants.slice(0, half), "A");
    const groupB = simulateGroupBracket(contestants.slice(half), "B");

    // Combine each group's rounds side by side, then add the cross-group Finals.
    const rounds: SeriesSummary[][] = [];
    const groupRoundCount = groupA.rounds.length; // === groupB.rounds.length
    for (let i = 0; i < groupRoundCount; i++) {
      rounds.push([...groupA.rounds[i], ...groupB.rounds[i]]);
    }
    const { summary: finalSummary, winner: champion } = playSeries(
      groupA.winner,
      groupB.winner,
      "playoff|final",
      null
    );
    rounds.push([finalSummary]);

    const result: PlayoffResult = {
      size: size as BracketSize,
      champion: champion.meta,
      rounds,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("[playoff simulate]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to simulate playoff", detail }, { status: 500 });
  }
}
