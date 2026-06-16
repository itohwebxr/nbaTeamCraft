import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { RosterEntry } from "@/types";

export const dynamic = "force-dynamic";

function generateId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (const byte of arr) {
    id += chars[byte % chars.length];
  }
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      share_id,
      name,
      evaluation,
      roster,
      created_by_browser_id,
      user_id,
      is_sandbox = false,
    }: {
      share_id?: string;
      name: string;
      evaluation: { overall: number; tier: string; offense: number; defense: number; rebound: number; playmaking: number };
      roster: RosterEntry[];
      created_by_browser_id?: string;
      user_id?: string | null;
      is_sandbox?: boolean;
    } = body;

    if ((!share_id && !is_sandbox) || !name || !evaluation || !roster) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const roster_json = roster.map((e) => ({
      slot: e.slot,
      name: e.playerSeason.name,
      season: e.playerSeason.season,
      overall: e.playerSeason.overall,
      assignedPosition: e.assignedPosition,
    }));

    const metadata = {
      players: roster.map((e) => ({
        playerId: e.playerSeason.nba_player_id,
        name: e.playerSeason.name,
        season: e.playerSeason.season,
        team: e.playerSeason.team_id,
      })),
    };

    const supabase = createServerClient();

    // Include is_sandbox unless the column is missing (migration 005 pending),
    // in which case we drop it so the save still succeeds.
    let includeSandbox = true;
    const buildRow = (id: string) => {
      const row: Record<string, unknown> = {
        id,
        share_id: share_id ?? null,
        name,
        overall: evaluation.overall,
        tier: evaluation.tier,
        offense: evaluation.offense,
        defense: evaluation.defense,
        rebound: evaluation.rebound,
        playmaking: evaluation.playmaking,
        roster_json,
        metadata,
        created_by_browser_id: created_by_browser_id ?? null,
        user_id: user_id ?? null,
      };
      if (includeSandbox) row.is_sandbox = is_sandbox;
      return row;
    };

    let id: string = "";
    let attempts = 0;
    while (true) {
      id = generateId();
      const { error } = await supabase.from("public_teams").insert(buildRow(id));
      if (!error) break;
      if ((error as { code?: string }).code === "42703" && includeSandbox) {
        // is_sandbox column doesn't exist yet — retry without it
        includeSandbox = false;
        continue;
      }
      if (attempts++ > 5) throw new Error("Failed to create public team");
    }

    // Calculate ranks (count of non-sandbox teams with higher score in each dimension)
    const dims = ["overall", "offense", "defense", "rebound", "playmaking"] as const;
    const rankQuery = (dim: string, applySandbox: boolean) => {
      let q = supabase
        .from("public_teams")
        .select("id", { count: "exact", head: true })
        .neq("created_by_browser_id", "__legend__")
        .gt(dim, evaluation[dim as keyof typeof evaluation] as number);
      if (applySandbox) q = q.eq("is_sandbox", false);
      return q;
    };
    const rankResults = await Promise.all(
      dims.map(async (dim) => {
        let res = await rankQuery(dim, includeSandbox);
        if (res.error && (res.error as { code?: string }).code === "42703") {
          res = await rankQuery(dim, false);
        }
        return res;
      })
    );

    const rank: Record<string, number> = {};
    dims.forEach((dim, i) => {
      rank[dim] = (rankResults[i].count ?? 0) + 1;
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    return NextResponse.json({ id, url: `${siteUrl}/team/${id}`, rank });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to publish team" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sort = searchParams.get("sort") ?? "trending";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const cursor = searchParams.get("cursor");
    // builder=1 → Roster Builder gallery (is_sandbox = true), always latest-first
    const builder = searchParams.get("builder") === "1";

    const supabase = createServerClient();

    // Build the query; `applySandbox` is skipped on the retry path when the
    // is_sandbox column doesn't exist yet (migration 005 pending).
    const buildQuery = (applySandbox: boolean) => {
      let query = supabase.from("public_teams").select("*")
        .neq("created_by_browser_id", "__legend__");
      if (applySandbox) query = query.eq("is_sandbox", builder);

      if (builder) {
        if (cursor) query = query.lt("created_at", cursor);
        query = query.order("created_at", { ascending: false }).limit(limit);
      } else if (sort === "trending") {
        // Computed in-query: (like_count + 1) / POWER(days_since_created + 2, 0.8)
        // Supabase doesn't support ORDER BY computed expressions directly,
        // so we fetch recent records and sort client-side for MVP
        query = query.order("created_at", { ascending: false }).limit(200);
      } else if (sort === "latest") {
        if (cursor) query = query.lt("created_at", cursor);
        query = query.order("created_at", { ascending: false }).limit(limit);
      } else {
        const col = ["overall", "offense", "defense", "rebound", "playmaking"].includes(sort)
          ? sort
          : "overall";
        if (cursor) query = query.lt(col, Number(cursor));
        query = query.order(col, { ascending: false }).limit(limit);
      }
      return query;
    };

    let { data, error } = await buildQuery(true);
    if (error && (error as { code?: string }).code === "42703") {
      // is_sandbox column missing — builder lists are empty, dream lists unfiltered
      if (builder) {
        data = [];
        error = null;
      } else {
        ({ data, error } = await buildQuery(false));
      }
    }
    if (error) throw error;

    let teams = data ?? [];

    if (!builder && sort === "trending") {
      const now = Date.now();
      teams = teams
        .map((t) => {
          const days = (now - new Date(t.created_at).getTime()) / 86400000;
          return { ...t, _score: (t.like_count + 1) / Math.pow(days + 2, 0.8) };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, limit);
    }

    let nextCursor: string | null = null;
    if (teams.length === limit) {
      const last = teams[teams.length - 1];
      if (builder || sort === "latest") {
        nextCursor = String(last.created_at);
      } else if (sort !== "trending") {
        nextCursor = String(last[sort as keyof typeof last]);
      }
    }

    return NextResponse.json({ teams, nextCursor });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
