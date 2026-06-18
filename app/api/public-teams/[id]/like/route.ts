import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { browserId } = await req.json();

    if (!browserId) {
      return NextResponse.json({ error: "Missing browserId" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("team_likes")
      .insert({ team_id: teamId, browser_id: browserId });

    if (error) {
      // Unique constraint violation = already liked
      if (error.code === "23505") {
        const { data } = await supabase
          .from("public_teams")
          .select("like_count")
          .eq("id", teamId)
          .single();
        return NextResponse.json({ liked: true, likeCount: data?.like_count ?? 0 });
      }
      throw error;
    }

    // Increment like_count
    const { data } = await supabase.rpc("increment_like_count", { team_id: teamId });
    const likeCount = data ?? 0;

    // Notify team owner (fire-and-forget, skip self-like check — we only have browserId)
    void Promise.resolve(
      supabase.from("public_teams").select("user_id, name").eq("id", teamId).single()
    ).then(({ data: team }) => {
      if (team?.user_id) {
        return Promise.resolve(supabase.from("notifications").insert({
          user_id: team.user_id,
          type: "like",
          team_id: teamId,
          team_name: team.name,
          actor_browser_id: browserId,
        }));
      }
    }).catch(() => {});

    return NextResponse.json({ liked: true, likeCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to like" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { browserId } = await req.json();

    if (!browserId) {
      return NextResponse.json({ error: "Missing browserId" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("team_likes")
      .delete()
      .eq("team_id", teamId)
      .eq("browser_id", browserId);

    if (error) throw error;

    // Decrement like_count (floor at 0)
    const { data } = await supabase.rpc("decrement_like_count", { team_id: teamId });
    const likeCount = data ?? 0;

    return NextResponse.json({ liked: false, likeCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to unlike" }, { status: 500 });
  }
}
