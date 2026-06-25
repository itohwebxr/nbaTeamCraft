"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";
import { gtm } from "@/lib/gtm";

type Author = { xHandle: string | null; displayName: string | null; avatarUrl: string | null } | null;

type Comment = {
  id: string;
  body: string;
  likeCount: number;
  createdAt: string;
  likedByMe: boolean;
  isMine: boolean;
  author: Author;
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

function authorLabel(author: Author): string {
  if (!author) return "Guest";
  return author.displayName ?? (author.xHandle ? `@${author.xHandle}` : "Guest");
}

export default function TeamComments({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const browserId = getBrowserId();
    fetch(`/api/public-teams/${teamId}/comments?browserId=${encodeURIComponent(browserId ?? "")}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  const handlePost = async () => {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public-teams/${teamId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, browserId: getBrowserId(), userId: user?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post comment.");
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setBody("");
      gtm.postComment({ team_id: teamId, logged_in: !!user });
    } catch {
      setError("Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (c: Comment) => {
    // Optimistic toggle
    const liked = !c.likedByMe;
    setComments((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, likedByMe: liked, likeCount: x.likeCount + (liked ? 1 : -1) } : x
      )
    );
    try {
      const res = await fetch(`/api/comments/${c.id}/like`, {
        method: liked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: getBrowserId() }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, likeCount: data.likeCount } : x)));
        if (liked) gtm.likeComment({ team_id: teamId });
      }
    } catch {
      // Revert on failure
      setComments((prev) =>
        prev.map((x) =>
          x.id === c.id ? { ...x, likedByMe: c.likedByMe, likeCount: c.likeCount } : x
        )
      );
    }
  };

  const handleDelete = async (c: Comment) => {
    if (!confirm("Delete this comment?")) return;
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    try {
      await fetch(`/api/comments/${c.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: getBrowserId(), userId: user?.id ?? null }),
      });
    } catch {
      // best-effort; on failure the next load will restore it
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
          placeholder="Agree? Disagree? Drop your take on this lineup…"
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-zinc-600">
            {user ? `Posting as ${user.displayName ?? `@${user.xHandle}`}` : "Posting as Guest"} · {body.trim().length}/{MAX_LENGTH}
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
        <p className="text-sm text-zinc-600">No comments yet. Start the debate 🏀</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.author?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.author.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-500 shrink-0">
                  {authorLabel(c.author).charAt(c.author ? 1 : 0).toUpperCase() || "G"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.author?.xHandle ? (
                    <a
                      href={`https://x.com/${c.author.xHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-white hover:text-orange-400 transition-colors truncate"
                    >
                      {authorLabel(c.author)}
                    </a>
                  ) : (
                    <span className="text-sm font-bold text-zinc-300 truncate">{authorLabel(c.author)}</span>
                  )}
                  <span className="text-xs text-zinc-600">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-zinc-200 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <button
                    onClick={() => handleLike(c)}
                    className={`flex items-center gap-1 text-xs transition-colors ${c.likedByMe ? "text-orange-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <span>{c.likedByMe ? "❤️" : "🤍"}</span>
                    {c.likeCount > 0 && <span>{c.likeCount}</span>}
                  </button>
                  {c.isMine && (
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
