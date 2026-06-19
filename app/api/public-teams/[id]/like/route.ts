import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { browserId, userId } = await req.json();

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

    // Notify team owner (fire-and-forget)
    void (async () => {
      try {
        const { data: team } = await supabase
          .from("public_teams")
          .select("user_id, name")
          .eq("id", teamId)
          .single();
        if (!team?.user_id) return;

        // Skip self-like notification
        if (userId && team.user_id === userId) return;

        // Look up actor display name if logged in
        let actorDisplayName: string | null = null;
        let actorUserId: string | null = null;
        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", userId)
            .single();
          actorDisplayName = profile?.display_name ?? null;
          actorUserId = userId;
        }

        await supabase.from("notifications").insert({
          user_id: team.user_id,
          type: "like",
          team_id: teamId,
          team_name: team.name,
          actor_browser_id: browserId,
          actor_display_name: actorDisplayName,
          actor_user_id: actorUserId,
        });
      } catch {
        // ignore notification errors
      }
    })();

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
