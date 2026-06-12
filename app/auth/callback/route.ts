// OAuth callback handler for Supabase Auth (X / Twitter).
// Supabase redirects here after the user approves OAuth.
// We exchange the code for a session, migrate browser_id data to user_id,
// then redirect back to the return URL.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseServer } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");

  // returnTo and browserId are stored in cookies because Supabase strips
  // query params from the redirectTo URL during the OAuth flow.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const parseCookie = (name: string) => {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };
  const returnTo = parseCookie("auth_return_to") ?? searchParams.get("returnTo") ?? "/";
  const browserId = parseCookie("auth_browser_id") ?? searchParams.get("browserId");

  if (!code) {
    return NextResponse.redirect(`${origin}${returnTo}`);
  }

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { session }, error } = await supabaseAuth.auth.exchangeCodeForSession(code);

  if (!error && session?.user && browserId) {
    // Migrate browser_id → user_id on cup_entries and public_teams
    const db = createSupabaseServer();
    await Promise.all([
      db.from("cup_entries")
        .update({ user_id: session.user.id })
        .eq("browser_id", browserId)
        .is("user_id", null),
      db.from("public_teams")
        .update({ user_id: session.user.id })
        .eq("created_by_browser_id", browserId)
        .is("user_id", null),
    ]);
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
