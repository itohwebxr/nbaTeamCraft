// GET /api/me?browserId=xxx&userId=yyy
// Returns the caller's published teams and cup entry history.
// Matches by user_id (logged in) OR browser_id so pre-login data shows too.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const browserId = searchParams.get("browserId");
    const userId = searchParams.get("userId");
    if (!browserId && !userId) {
      return NextResponse.json({ error: "browserId or userId is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Claim this device's browser_id records for the logged-in user, so teams
    // saved on one device (before/without this user_id link) surface on every
    // device the user signs in on. Best-effort: ignore errors (e.g. missing
    // column on a pending migration).
    if (userId && browserId) {
      await supabase
        .from("public_teams")
        .update({ user_id: userId })
        .eq("created_by_browser_id", browserId)
        .is("user_id", null);
      await supabase
        .from("cup_entries")
        .update({ user_id: userId })
        .eq("browser_id", browserId)
        .is("user_id", null);
    }

    const orFilter = [
      userId ? `user_id.eq.${userId}` : null,
      browserId ? `created_by_browser_id.eq.${browserId}` : null,
    ].filter(Boolean).join(",");

    type TeamRow = {
      id: string; name: string; overall: number; tier: string;
      offense: number; defense: number; rebound: number; playmaking: number;
      like_count: number; created_at: string; is_sandbox?: boolean;
    };

    // Try to include is_sandbox; fall back if migration hasn't been applied yet
    let teams: TeamRow[] | null = null;
    let teamsErr: { code?: string; message?: string } | null = null;

    const fullRes = await supabase
      .from("public_teams")
      .select("id, name, overall, tier, offense, defense, rebound, playmaking, like_count, created_at, is_sandbox")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fullRes.error && (fullRes.error as { code?: string }).code === "42703") {
      // Column not found (migration pending) — fall back to safe column set
      const fallbackRes = await supabase
        .from("public_teams")
        .select("id, name, overall, tier, offense, defense, rebound, playmaking, like_count, created_at")
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(50);
      teams = fallbackRes.data as TeamRow[] | null;
      teamsErr = fallbackRes.error;
    } else {
      teams = fullRes.data as TeamRow[] | null;
      teamsErr = fullRes.error;
    }

    if (teamsErr) throw teamsErr;

    const entryFilter = [
      userId ? `user_id.eq.${userId}` : null,
      browserId ? `browser_id.eq.${browserId}` : null,
    ].filter(Boolean).join(",");

    const { data: entries, error: entriesErr } = await supabase
      .from("cup_entries")
      .select("id, cup_week, public_team_id, wins, losses, points_for, points_against, created_at")
      .or(entryFilter)
      .order("created_at", { ascending: false })
      .limit(20);
    if (entriesErr && entriesErr.code !== "42P01") throw entriesErr;

    const teamNameMap: Record<string, string> = {};
    for (const t of (teams ?? [])) teamNameMap[t.id] = t.name;
    // Resolve names for cup teams not in the user's team list (edge case)
    const missingIds = (entries ?? [])
      .map((e) => e.public_team_id)
      .filter((id) => !teamNameMap[id]);
    if (missingIds.length > 0) {
      const { data: extra } = await supabase
        .from("public_teams").select("id, name").in("id", missingIds);
      for (const t of (extra ?? [])) teamNameMap[t.id] = t.name;
    }

    const cupHistory = (entries ?? []).map((e) => ({
      entryId: e.id,
      cupWeek: e.cup_week,
      teamId: e.public_team_id,
      teamName: teamNameMap[e.public_team_id] ?? "—",
      wins: e.wins,
      losses: e.losses,
      pointDiff: e.points_for - e.points_against,
    }));

    return NextResponse.json({ teams: teams ?? [], cupHistory });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch my page data" }, { status: 500 });
  }
}
