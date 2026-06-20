import { createServerClient } from "@/lib/supabase";
import AppHeader from "@/components/layout/AppHeader";
import FeedLikeButton from "@/components/common/FeedLikeButton";
import FeedComments from "@/components/common/FeedComments";
import Link from "next/link";
import { notFound } from "next/navigation";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function TriviaFeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: entry, error } = await supabase
    .from("trivia_feed")
    .select("id, share_id, score, total, gmode, difficulty, display_name, avatar_url, like_count, comment_count, created_at")
    .eq("id", id)
    .single();

  if (error || !entry) return notFound();

  const pct = Math.round((entry.score / entry.total) * 100);
  const emoji = entry.score === entry.total ? "🔥" : entry.score >= entry.total * 0.6 ? "💪" : "📚";
  const modeLabel = entry.gmode === "daily" ? "Daily" : "Practice";
  const diffLabel = entry.difficulty === "hard" ? "Hard" : "Normal";

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            {/* Author row */}
            <div className="flex items-center gap-2 mb-4">
              {entry.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.avatar_url} alt="" className="w-8 h-8 rounded-full border border-zinc-700 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {(entry.display_name ?? "A").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">{entry.display_name ?? "Anonymous"}</p>
                <p className="text-xs text-zinc-500">{timeAgo(entry.created_at)}</p>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="text-2xl font-black text-orange-400">{entry.score}/{entry.total}</p>
                <p className="text-sm text-zinc-400">{pct}% · {modeLabel} · {diffLabel}</p>
              </div>
            </div>

            {/* View details link */}
            {entry.share_id && (
              <Link
                href={`/trivia/result/${entry.share_id}`}
                className="inline-block text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors mb-4"
              >
                View Details →
              </Link>
            )}

            {/* Like button */}
            <div className="mt-4">
              <FeedLikeButton
                feedType="trivia"
                feedId={entry.id}
                initialCount={entry.like_count ?? 0}
              />
            </div>
          </div>

          {/* Comments */}
          <FeedComments feedType="trivia" feedId={entry.id} />
        </div>
      </main>
    </>
  );
}
