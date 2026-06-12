"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";
import { startXLogin } from "@/lib/xLogin";
import { gtm } from "@/lib/gtm";

// Header auth widget shown on every page:
// - logged in  → X avatar linking to /me
// - logged out → small "Sign in" button starting the X OAuth flow
export default function HeaderAuth() {
  const { user, loading } = useAuth();
  const [connecting, setConnecting] = useState(false);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-zinc-900 animate-pulse" />;
  }

  if (user) {
    return (
      <Link href="/me" aria-label="My Page" className="shrink-0">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName ?? "My Page"}
            className="w-8 h-8 rounded-full border border-zinc-700 hover:border-orange-400 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 hover:border-orange-400 transition-colors flex items-center justify-center text-xs font-bold text-white">
            {(user.displayName ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
    );
  }

  const handleLogin = async () => {
    if (connecting) return;
    setConnecting(true);
    gtm.headerLoginClick({ page_path: window.location.pathname });
    const error = await startXLogin(window.location.pathname, getBrowserId());
    if (error) {
      console.error("X login error:", error);
      setConnecting(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={connecting}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
    >
      {connecting ? (
        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span className="text-sm leading-none">𝕏</span>
      )}
      Sign in
    </button>
  );
}
