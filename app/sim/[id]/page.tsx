import { createServerClient } from "@/lib/supabase";
import AppHeader from "@/components/layout/AppHeader";
import FeedLikeButton from "@/components/common/FeedLikeButton";
import FeedComments from "@/components/common/FeedComments";
import { notFound } from "next/navigation";
import SimDetailActions from "./SimDetailActions";
import WhatsNext from "@/components/common/WhatsNext";
import RelatedFeed from "@/components/common/RelatedFeed";
import StickyCtaBar from "@/components/common/StickyCtaBar";

const KIND_EMOJI: Record<string, string> = {
  matchup: "⚔️",
  playoff: "🏆",
  season: "📅",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function SimFeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: entry, error } = await supabase
    .from("sim_feed")
    .select("id, kind, share_id, result_url, title, subtitle, display_name, avatar_url, like_count, comment_count, created_at")
    .eq("id", id)
    .single();

  if (error || !entry) return notFound();

  const emoji = KIND_EMOJI[entry.kind] ?? "⚔️";

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

            {/* Content */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl shrink-0">{emoji}</span>
              <div>
                <h1 className="text-lg font-black text-white leading-tight">{entry.title}</h1>
                {entry.subtitle && <p className="text-sm text-zinc-400 mt-1">{entry.subtitle}</p>}
              </div>
            </div>

            {/* Like button */}
            <div className="mt-4">
              <FeedLikeButton
                feedType="sim"
                feedId={entry.id}
                initialCount={entry.like_count ?? 0}
              />
            </div>

            {/* Share + Simulate actions */}
            <SimDetailActions
              title={entry.title}
              shareId={entry.share_id}
              resultUrl={entry.result_url}
              kind={entry.kind}
            />
          </div>

          {/* Comments */}
          <FeedComments feedType="sim" feedId={entry.id} />

          {/* Lateral discovery — more simulations to browse */}
          <RelatedFeed variant="sim" excludeId={entry.id} />

          {/* What's next — cross-sell into craft & trivia */}
          <WhatsNext pageType="sim" />
        </div>
      </main>

      <StickyCtaBar pageType="sim" />
    </>
  );
}
