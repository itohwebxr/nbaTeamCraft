"use client";

import { useEffect, useState } from "react";
import { getBrowserId } from "@/lib/browserId";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  feedType: "sim" | "trivia";
  feedId: string;
  initialCount: number;
  size?: "sm" | "md";
}

function getLikedFeedKey(feedType: string, feedId: string): string {
  return `liked_feed_${feedType}_${feedId}`;
}

function isLikedLocally(feedType: string, feedId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getLikedFeedKey(feedType, feedId)) === "1";
}

function setLikedLocally(feedType: string, feedId: string, liked: boolean): void {
  if (typeof window === "undefined") return;
  const key = getLikedFeedKey(feedType, feedId);
  if (liked) localStorage.setItem(key, "1");
  else localStorage.removeItem(key);
}

export default function FeedLikeButton({ feedType, feedId, initialCount, size = "md" }: Props) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const browserId = getBrowserId();
    const userId = user?.id;
    const params = new URLSearchParams({ browserId });
    if (userId) params.set("userId", userId);

    fetch(`/api/feed-entry/${feedType}/${feedId}/like?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.liked === "boolean") setLiked(d.liked);
      })
      .catch(() => setLiked(isLikedLocally(feedType, feedId)));
  }, [feedType, feedId, user?.id]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    const browserId = getBrowserId();
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setLikedLocally(feedType, feedId, next);
    if (next) setBurst((b) => b + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/feed-entry/${feedType}/${feedId}/like`, {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId, userId: user?.id ?? null }),
      });
      const json = await res.json();
      if (typeof json.likeCount === "number") setCount(json.likeCount);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
      setLikedLocally(feedType, feedId, !next);
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === "sm";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative flex items-center gap-1.5 rounded-full border transition-all active:scale-90 disabled:opacity-60
        ${liked
          ? "text-red-400 border-red-400/40 bg-red-400/10 hover:bg-red-400/20"
          : "text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:text-red-400 hover:border-red-400/30"
        }
        ${isSmall ? "px-2.5 py-1" : "px-3.5 py-2"}
      `}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <svg
        key={liked ? `on-${burst}` : "off"}
        viewBox="0 0 24 24"
        className={`shrink-0 ${liked ? "heart-pop" : ""} ${isSmall ? "w-3.5 h-3.5" : "w-4 h-4"}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span className={`font-display font-black tabular-nums ${isSmall ? "text-xs" : "text-sm"}`}>
        {count}
      </span>
    </button>
  );
}
