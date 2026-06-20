import { createServerClient } from "@/lib/supabase";
import AppHeader from "@/components/layout/AppHeader";
import FeedLikeButton from "@/components/common/FeedLikeButton";
import FeedComments from "@/components/common/FeedComments";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type TriviaAnswer = {
  question: string;
  correct: boolean;
  submitted?: string;
  correct_answer?: string;
};
type TriviaShareData = {
  kind: "trivia";
  score: number;
  total: number;
  difficulty: string;
  gmode: string;
  answers: TriviaAnswer[];
};

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

  // Fetch full answer breakdown from shares table if available
  let answers: TriviaAnswer[] | null = null;
  if (entry.share_id) {
    const { data: share } = await supabase
      .from("shares")
      .select("data")
      .eq("id", entry.share_id)
      .single();
    const d = share?.data as TriviaShareData | undefined;
    if (d?.kind === "trivia") answers = d.answers;
  }

  const pct = Math.round((entry.score / entry.total) * 100);
  const emoji = entry.score === entry.total ? "🔥" : entry.score >= entry.total * 0.6 ? "💪" : "📚";
  const modeLabel = entry.gmode === "daily" ? "Daily Challenge" : "Practice";
  const diffLabel = entry.difficulty === "hard" ? "Hard" : "Normal";

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

          {/* Result card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">

            {/* Author row */}
            <div className="flex items-center gap-2">
              {entry.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.avatar_url} alt="" className="w-8 h-8 rounded-full border border-zinc-700 object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                  {(entry.display_name ?? "A").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{entry.display_name ?? "Anonymous"}</p>
                <p className="text-xs text-zinc-500">{timeAgo(entry.created_at)}</p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-xs text-zinc-500">{modeLabel} · {diffLabel}</p>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4 py-2 border-t border-zinc-800">
              <span className="text-4xl">{emoji}</span>
              <div>
                <p className="text-3xl font-black text-orange-400 font-display leading-none">
                  {entry.score}<span className="text-xl text-zinc-500">/{entry.total}</span>
                </p>
                <p className="text-sm text-zinc-500 mt-0.5">{pct}% correct</p>
              </div>
            </div>

            {/* Answer breakdown */}
            {answers && answers.length > 0 && (
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                {answers.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 border ${
                      a.correct
                        ? "bg-green-950/40 border-green-800/40"
                        : "bg-red-950/40 border-red-800/40"
                    }`}
                  >
                    <p className="text-xs text-zinc-400 mb-0.5">Q{i + 1}</p>
                    <p className="text-sm font-medium text-white leading-snug">{a.question}</p>
                    {!a.correct && a.correct_answer && (
                      <p className="text-xs text-zinc-500 mt-1">
                        → {a.correct_answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Like button */}
            <div className="border-t border-zinc-800 pt-3">
              <FeedLikeButton
                feedType="trivia"
                feedId={entry.id}
                initialCount={entry.like_count ?? 0}
              />
            </div>
          </div>

          {/* Comments */}
          <FeedComments feedType="trivia" feedId={entry.id} />

          {/* CTA */}
          <Link
            href="/trivia"
            className="block w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm text-center transition-colors"
          >
            Play Trivia →
          </Link>
        </div>
      </main>
    </>
  );
}
