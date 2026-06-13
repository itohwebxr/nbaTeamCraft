// Shared X (Twitter) OAuth login starter.
// Stores returnTo / browserId in short-lived cookies because Supabase
// strips custom query params from the redirectTo URL during OAuth.

import { createAuthClient } from "@/lib/supabaseAuth";

export async function startXLogin(returnTo: string, browserId: string): Promise<string | null> {
  const supabase = createAuthClient();

  // Use the env site URL only when we're actually on that host —
  // otherwise (localhost, previews) return to the current origin.
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let siteUrl = window.location.origin;
  if (envSiteUrl) {
    try {
      if (new URL(envSiteUrl).hostname === window.location.hostname) {
        siteUrl = envSiteUrl.replace(/\/+$/, "");
      }
    } catch {
      // Malformed env value — keep window.location.origin
    }
  }

  document.cookie = `auth_return_to=${encodeURIComponent(returnTo)}; path=/; max-age=600; SameSite=Lax`;
  document.cookie = `auth_browser_id=${encodeURIComponent(browserId)}; path=/; max-age=600; SameSite=Lax`;

  const { error } = await supabase.auth.signInWithOAuth({
    // "x" = X (OAuth 2.0) provider; "twitter" is the legacy OAuth 1.0a one
    provider: "x" as "twitter",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  return error ? error.message : null;
}
