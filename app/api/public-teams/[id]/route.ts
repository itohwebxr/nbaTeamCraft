// DELETE /api/public-teams/:id
// Deletes a team owned by the caller (matched by browserId or userId).
// Cascades to cup_entries via FK.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const browserId = searchParams.get("browserId");
    const userId = searchParams.get("userId");

    if (!browserId && !userId) {
      return NextResponse.json({ error: "browserId or userId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: team, error: fetchErr } = await supabase
      .from("public_teams")
      .select("id, created_by_browser_id, user_id")
      .eq("id", id)
      .single();

    if (fetchErr || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const ownerByBrowser = browserId && team.created_by_browser_id === browserId;
    const ownerByUser = userId && team.user_id === userId;
    if (!ownerByBrowser && !ownerByUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteErr } = await supabase
      .from("public_teams")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
