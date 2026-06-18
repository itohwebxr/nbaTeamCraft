import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/teams/[id]/simulations  { type, result_data }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { type, result_data } = await req.json();

    if (!type || !result_data) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["match", "playoff", "season"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify team exists
    const { data: team } = await supabase
      .from("public_teams")
      .select("id")
      .eq("id", teamId)
      .single();
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("team_simulations")
      .insert({ team_id: teamId, type, result_data })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET /api/teams/[id]/simulations
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("team_simulations")
      .select("id, type, result_data, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ simulations: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
