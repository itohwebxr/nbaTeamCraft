import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { loadSimTeam, simulateSeries } from "@/lib/loadSimTeam";
import { simulateGame } from "@/lib/simulateGame";

export const dynamic = "force-dynamic";

// POST /api/matchup/simulate
// Body: { homeTeamId, awayTeamId, mode: "single" | "series" }
export async function POST(req: NextRequest) {
  try {
    const { homeTeamId, awayTeamId, mode = "single" } = await req.json();
    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: "Missing team ids" }, { status: 400 });
    }

    const supabase = createServerClient();

    async function resolveId(id: string, excludeId: string): Promise<string> {
      if (id !== "__random__") return id;
      const { data } = await supabase
        .from("public_teams")
        .select("id")
        .neq("id", excludeId)
        .neq("created_by_browser_id", "__legend__")
        .limit(300);
      const rows = (data ?? []) as { id: string }[];
      if (rows.length === 0) throw new Error("No teams available for random pick");
      return rows[Math.floor(Math.random() * rows.length)].id;
    }

    const resolvedHomeId = await resolveId(homeTeamId, awayTeamId);
    const resolvedAwayId = await resolveId(awayTeamId, resolvedHomeId);

    if (resolvedHomeId === resolvedAwayId) {
      return NextResponse.json({ error: "Pick two different teams" }, { status: 400 });
    }

    const [{ meta: homeMeta, simTeam: homeTeam }, { meta: awayMeta, simTeam: awayTeam }] =
      await Promise.all([
        loadSimTeam(supabase, resolvedHomeId),
        loadSimTeam(supabase, resolvedAwayId),
      ]);

    const meta = { home: homeMeta, away: awayMeta };

    if (mode === "series") {
      const series = simulateSeries(homeTeam, resolvedHomeId, awayTeam, resolvedAwayId, "series");
      return NextResponse.json({
        mode: "series",
        ...meta,
        games: series.games,
        seriesWins: series.wins,
        seriesWinner: series.winner,
      });
    }

    const seed = `${resolvedHomeId}|${resolvedAwayId}|${crypto.randomUUID()}`;
    const result = simulateGame(homeTeam, awayTeam, seed);
    return NextResponse.json({ mode: "single", ...meta, result });
  } catch (e) {
    console.error("[matchup simulate]", e);
    const detail = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: "Failed to simulate matchup", detail }, { status: 500 });
  }
}
