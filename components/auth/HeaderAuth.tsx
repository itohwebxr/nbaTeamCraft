"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";
import { startXLogin } from "@/lib/xLogin";
import { gtm } from "@/lib/gtm";

export default function HeaderAuth() {
  const { user, loading } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (!res.ok) return;
        const json = await res.json();
        setUnreadCount(json.unreadCount ?? 0);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-zinc-900 animate-pulse" />;
  }

  if (user) {
    return (
      <Link href="/me" aria-label="My Page" className="relative shrink-0">
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
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
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
