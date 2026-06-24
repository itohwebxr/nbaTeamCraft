// POST /api/team-themes
// Attaches an existing team to a theme. Only the team's owner (matched by
// userId or browserId) may attach, and only if the team is not already entered
// into a theme (Phase 1: one theme per team).
// Body: { teamId, themeId, userId?, browserId? }

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { teamId, themeId, userId, browserId } = await req.json();
    if (!teamId || !themeId) {
      return NextResponse.json({ error: "teamId and themeId required" }, { status: 400 });
    }
    if (!userId && !browserId) {
      return NextResponse.json({ error: "userId or browserId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Ownership check (mirrors the team-delete endpoint).
    const { data: team, error: teamErr } = await supabase
      .from("public_teams")
      .select("id, created_by_browser_id, user_id")
      .eq("id", teamId)
      .single();
    if (teamErr || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const ownerByBrowser = browserId && team.created_by_browser_id === browserId;
    const ownerByUser = userId && team.user_id === userId;
    if (!ownerByBrowser && !ownerByUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The theme must exist and be active.
    const { data: theme, error: themeErr } = await supabase
      .from("themes")
      .select("id, slug")
      .eq("id", themeId)
      .eq("is_active", true)
      .maybeSingle();
    if (themeErr || !theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Reject if the team is already entered into a theme.
    const { data: existing } = await supabase
      .from("team_themes")
      .select("theme_id")
      .eq("team_id", teamId)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Team already entered in a theme" }, { status: 409 });
    }

    const { error: insertErr } = await supabase
      .from("team_themes")
      .insert({ team_id: teamId, theme_id: themeId });
    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, theme_slug: theme.slug });
  } catch (e) {
    console.error("team-themes attach error:", e);
    return NextResponse.json({ error: "Failed to attach theme" }, { status: 500 });
  }
}
