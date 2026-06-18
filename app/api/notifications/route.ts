import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/notifications?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, team_id, team_name, actor_display_name, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });

  const items = data ?? [];
  const unreadCount = items.filter((n) => !n.is_read).length;
  return NextResponse.json({ unreadCount, notifications: items });
}

// POST /api/notifications/read-all { userId }
export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = createServerClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return NextResponse.json({ ok: true });
}
