"use client";

import { useState } from "react";
import { createAuthClient, AuthUser } from "@/lib/supabaseAuth";

interface Props {
  user: AuthUser | null;
  browserId: string;
  returnTo?: string;
  onLogin?: (user: AuthUser) => void;
  onLogout?: () => void;
  /** When true, shows a compact avatar-only version */
  compact?: boolean;
}

export default function XLoginButton({ user, browserId, returnTo = "/result", onLogin, onLogout, compact = false }: Props) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const supabase = createAuthClient();
    // Always use window.location.origin on non-production so OAuth
    // returns to the same host (localhost vs production).
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
    // Store returnTo and browserId in cookies before OAuth redirect,
    // because Supabase strips query params from the redirectTo URL.
    document.cookie = `auth_return_to=${encodeURIComponent(returnTo)}; path=/; max-age=600; SameSite=Lax`;
    document.cookie = `auth_browser_id=${encodeURIComponent(browserId)}; path=/; max-age=600; SameSite=Lax`;
    const redirectUrl = `${siteUrl}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      // "x" = X (OAuth 2.0) provider; "twitter" is the legacy OAuth 1.0a one
      provider: "x" as "twitter",
      options: { redirectTo: redirectUrl },
    });
    if (error) {
      console.error("X login error:", error.message);
      setLoading(false);
    }
    // On success the page navigates away — no need to clear loading
  };

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    onLogout?.();
    setLoading(false);
  };

  if (user) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName ?? ""} className="w-7 h-7 rounded-full border border-zinc-700" />
          )}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
        {user.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full border border-zinc-700 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
          {user.xHandle && <p className="text-xs text-zinc-500">@{user.xHandle}</p>}
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span className="font-bold text-base">𝕏</span>
      )}
      {loading ? "Connecting..." : "Sign in with X to save your Cup record"}
    </button>
  );
}
