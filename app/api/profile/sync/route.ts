// POST /api/profile/sync
// Refreshes the caller's profiles row from their live auth session metadata.
// profiles is otherwise only written on an explicit /auth/callback sign-in, so
// a user who changed their X name/avatar but hasn't re-signed-in would show
// stale data in feeds. The identity comes from the server-verified session
// (cookies), never from the client, so callers can only update their own row.

import { NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient as createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(toSet) {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const meta = user.user_metadata ?? {};
    const db = createServiceClient();
    const { error: upErr } = await db.from("profiles").upsert(
      {
        id: user.id,
        x_handle: meta.user_name ?? null,
        display_name: meta.full_name ?? null,
        avatar_url: meta.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("profile sync error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
