import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { containsProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 280;
const RATE_WINDOW_MS = 30_000; // min gap between a browser's comments
const RATE_MAX_PER_HOUR = 15;

type CommentRow = {
  id: string;
  body: string;
  like_count: number;
  created_at: string;
  browser_id: string | null;
  user_id: string | null;
};

// GET /api/public-teams/[id]/comments?browserId=xxx
// Returns visible comments (newest first) with author profile and liked-by-me.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const browserId = req.nextUrl.searchParams.get("browserId");
    const supabase = createServerClient();

    const { data: comments, error } = await supabase
      .from("team_comments")
      .select("id, body, like_count, created_at, browser_id, user_id")
      .eq("team_id", teamId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const rows = (comments ?? []) as CommentRow[];

    // Resolve author profiles in one query.
    const userIds = [...new Set(rows.map((c) => c.user_id).filter(Boolean))] as string[];
    const profileMap: Record<string, { xHandle: string | null; displayName: string | null; avatarUrl: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, x_handle, display_name, avatar_url")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profileMap[p.id] = { xHandle: p.x_handle, displayName: p.display_name, avatarUrl: p.avatar_url };
      }
    }

    // Which of these comments has the caller liked?
    let likedIds = new Set<string>();
    if (browserId && rows.length > 0) {
      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("browser_id", browserId)
        .in("comment_id", rows.map((c) => c.id));
      likedIds = new Set((likes ?? []).map((l) => l.comment_id));
    }

    const result = rows.map((c) => ({
      id: c.id,
      body: c.body,
      likeCount: c.like_count,
      createdAt: c.created_at,
      likedByMe: likedIds.has(c.id),
      isMine: !!(browserId && c.browser_id === browserId),
      author: c.user_id ? profileMap[c.user_id] ?? null : null,
    }));

    return NextResponse.json({ comments: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

// POST /api/public-teams/[id]/comments  { body, browserId, userId? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { body, browserId, userId } = await req.json();

    if (!browserId) {
      return NextResponse.json({ error: "Missing browserId" }, { status: 400 });
    }
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
    }
    if (text.length > MAX_LENGTH) {
      return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }
    if (containsProfanity(text)) {
      return NextResponse.json({ error: "Your comment contains language that isn't allowed." }, { status: 422 });
    }

    const supabase = createServerClient();

    // Rate limiting by browser_id: cooldown + hourly cap.
    const { data: recent } = await supabase
      .from("team_comments")
      .select("created_at")
      .eq("browser_id", browserId)
      .order("created_at", { ascending: false })
      .limit(RATE_MAX_PER_HOUR);
    if (recent && recent.length > 0) {
      const last = new Date(recent[0].created_at).getTime();
      if (Date.now() - last < RATE_WINDOW_MS) {
        return NextResponse.json({ error: "You're commenting too fast. Please wait a moment." }, { status: 429 });
      }
      if (recent.length >= RATE_MAX_PER_HOUR) {
        const oldest = new Date(recent[recent.length - 1].created_at).getTime();
        if (Date.now() - oldest < 3_600_000) {
          return NextResponse.json({ error: "You've hit the hourly comment limit." }, { status: 429 });
        }
      }
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const { data: inserted, error } = await supabase
      .from("team_comments")
      .insert({ team_id: teamId, browser_id: browserId, user_id: userId ?? null, body: text, ip })
      .select("id, body, like_count, created_at, user_id")
      .single();
    if (error) throw error;

    await supabase.rpc("increment_team_comment_count", { t_id: teamId });

    // Attach author profile for immediate render.
    let author = null;
    if (inserted.user_id) {
      const { data: p } = await supabase
        .from("profiles")
        .select("x_handle, display_name, avatar_url")
        .eq("id", inserted.user_id)
        .maybeSingle();
      if (p) author = { xHandle: p.x_handle, displayName: p.display_name, avatarUrl: p.avatar_url };
    }

    return NextResponse.json({
      comment: {
        id: inserted.id,
        body: inserted.body,
        likeCount: inserted.like_count,
        createdAt: inserted.created_at,
        likedByMe: false,
        isMine: true,
        author,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
