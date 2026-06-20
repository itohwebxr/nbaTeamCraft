import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { type: feedType, id: feedId } = await params;
  const browserId = req.nextUrl.searchParams.get("browserId") ?? "";
  const userId = req.nextUrl.searchParams.get("userId") ?? null;

  try {
    const supabase = createServerClient();
    let query = supabase
      .from("feed_likes")
      .select("id")
      .eq("feed_type", feedType)
      .eq("feed_id", feedId);

    if (userId) {
      query = query.or(`browser_id.eq.${browserId},user_id.eq.${userId}`);
    } else {
      query = query.eq("browser_id", browserId);
    }

    const { data } = await query.maybeSingle();
    return NextResponse.json({ liked: !!data });
  } catch {
    return NextResponse.json({ liked: false });
  }
}

async function getAndSyncLikeCount(
  supabase: ReturnType<typeof createServerClient>,
  feedType: string,
  feedId: string
): Promise<number> {
  const table = feedType === "sim" ? "sim_feed" : "trivia_feed";
  const { count } = await supabase
    .from("feed_likes")
    .select("*", { count: "exact", head: true })
    .eq("feed_type", feedType)
    .eq("feed_id", feedId);
  const likeCount = count ?? 0;
  await supabase.from(table).update({ like_count: likeCount }).eq("id", feedId);
  return likeCount;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { type: feedType, id: feedId } = await params;
  const { browserId, userId } = await req.json() as { browserId: string; userId?: string | null };

  try {
    const supabase = createServerClient();
    const { error: insertError } = await supabase.from("feed_likes").insert({
      feed_type: feedType,
      feed_id: feedId,
      browser_id: browserId,
      user_id: userId ?? null,
    });

    // 23505 = unique_violation (already liked), treat as success
    if (insertError && insertError.code !== "23505") throw insertError;

    const likeCount = await getAndSyncLikeCount(supabase, feedType, feedId);
    return NextResponse.json({ liked: true, likeCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to like" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { type: feedType, id: feedId } = await params;
  const { browserId } = await req.json() as { browserId: string };

  try {
    const supabase = createServerClient();
    await supabase
      .from("feed_likes")
      .delete()
      .eq("feed_type", feedType)
      .eq("feed_id", feedId)
      .eq("browser_id", browserId);

    const likeCount = await getAndSyncLikeCount(supabase, feedType, feedId);
    return NextResponse.json({ liked: false, likeCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to unlike" }, { status: 500 });
  }
}
