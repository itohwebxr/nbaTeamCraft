"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";

interface Props {
  feedType: "sim" | "trivia";
  feedId: string;
}

type FeedComment = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  body: string;
  created_at: string;
  isMine: boolean;
};

const MAX_LENGTH = 280;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function FeedComments({ feedType, feedId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/feed-entry/${feedType}/${feedId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [feedType, feedId]);

  const handlePost = async () => {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed-entry/${feedType}/${feedId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          browserId: getBrowserId(),
          userId: user?.id ?? null,
          displayName: user?.displayName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post comment.");
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setBody("");
    } catch {
      setError("Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
        Discussion {comments.length > 0 && <span className="text-zinc-600">· {comments.length}</span>}
      </h2>

      {/* Composer */}
      <div className="mb-5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Share your thoughts..."
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-zinc-600">
            {user ? `Posting as ${user.displayName ?? "User"}` : "Posting as Guest"} · {body.trim().length}/{MAX_LENGTH}
          </span>
          <button
            onClick={handlePost}
            disabled={!body.trim() || posting}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-600">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-500 shrink-0">
                  {(c.display_name ?? "G").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-zinc-300 truncate">
                    {c.display_name ?? "Guest"}
                  </span>
                  <span className="text-xs text-zinc-600">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-zinc-200 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
