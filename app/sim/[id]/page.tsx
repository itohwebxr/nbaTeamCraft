import type { ReactNode } from "react";
import { createServerClient } from "@/lib/supabase";
import AppHeader from "@/components/layout/AppHeader";
import FeedLikeButton from "@/components/common/FeedLikeButton";
import FeedComments from "@/components/common/FeedComments";
import { notFound } from "next/navigation";
import SimDetailActions from "./SimDetailActions";
import WhatsNext from "@/components/common/WhatsNext";
import RelatedFeed from "@/components/common/RelatedFeed";
import StickyCtaBar from "@/components/common/StickyCtaBar";
import InlineTriviaNudge from "@/components/common/InlineTriviaNudge";
import ScrollToTop from "@/components/common/ScrollToTop";
import MatchupResultView from "@/components/sim/result/MatchupResultView";
import SeasonResultView from "@/components/sim/result/SeasonResultView";
import PlayoffResultView from "@/components/sim/result/PlayoffResultView";
import { parseMatchupUrl } from "@/lib/matchupResult";
import type { SeasonShareData } from "@/app/api/season/share/route";
import type { PlayoffShareData } from "@/app/api/playoff/share/route";
import type { PublicTeamRosterItem } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

// Resolve the team names shown in a result to public-team ids so the detail
// page can link each name to its team page. Names are user-chosen and not
// guaranteed unique, so we pick the most-liked match for each name.
async function resolveTeamLinks(
  supabase: SupabaseClient,
  names: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("public_teams")
    .select("id, name, like_count")
    .in("name", unique)
    .order("like_count", { ascending: false });
  const map: Record<string, string> = {};
  for (const t of (data ?? []) as { id: string; name: string }[]) {
    if (!(t.name in map)) map[t.name] = t.id;
  }
  return map;
}

// Reconstruct the full result view from whatever the feed entry persisted:
// matchup → result_url query string; season/playoff → the shares row. Returns
// the rendered detail plus the team names it references (for link resolution).
async function buildDetail(
  supabase: SupabaseClient,
  entry: { kind: string; share_id: string | null; result_url: string | null }
): Promise<{ render: (links: Record<string, string>) => ReactNode; names: string[] } | null> {
  if (entry.kind === "matchup" && entry.result_url) {
    const parsed = parseMatchupUrl(entry.result_url);
    if (!parsed) return null;
    return {
      names: [parsed.home, parsed.away],
      render: (links) => <MatchupResultView result={parsed} links={links} />,
    };
  }

  if ((entry.kind === "season" || entry.kind === "playoff") && entry.share_id) {
    const { data: share } = await supabase
      .from("shares")
      .select("data")
      .eq("id", entry.share_id)
      .single();
    const d = share?.data as SeasonShareData | PlayoffShareData | undefined;
    if (entry.kind === "season" && d?.kind === "season") {
      let roster: PublicTeamRosterItem[] | undefined;
      if (d.teamId) {
        const { data: t } = await supabase
          .from("public_teams")
          .select("roster_json")
          .eq("id", d.teamId)
          .single();
        roster = (t?.roster_json as PublicTeamRosterItem[] | undefined) ?? undefined;
      }
      return { names: [d.team.name], render: (links) => <SeasonResultView data={d} links={links} roster={roster} /> };
    }
    if (entry.kind === "playoff" && d?.kind === "playoff") {
      return {
        names: [d.champion.name, ...d.path.map((p) => p.opp)],
        render: (links) => <PlayoffResultView data={d} links={links} />,
      };
    }
  }

  return null;
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
  const built = await buildDetail(supabase, entry);
  const links = built ? await resolveTeamLinks(supabase, built.names) : {};
  const detail = built ? built.render(links) : null;
  const displayName = entry.display_name ?? "Anonymous";

  return (
    <>
      <ScrollToTop />
      <AppHeader />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

          {/* Author */}
          <div className="flex items-center gap-2">
            {entry.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.avatar_url} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-zinc-700 object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{displayName}</p>
              <p className="text-xs text-zinc-500">{timeAgo(entry.created_at)}</p>
            </div>
          </div>

          {/* Full result — or a title/subtitle fallback for legacy entries
              that didn't persist their result data */}
          {detail ?? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-start gap-3">
              <span className="text-2xl shrink-0">{emoji}</span>
              <div>
                <h1 className="text-lg font-black text-white leading-tight">{entry.title}</h1>
                {entry.subtitle && <p className="text-sm text-zinc-400 mt-1">{entry.subtitle}</p>}
              </div>
            </div>
          )}

          {/* Experiment ① (variant B): in-context trivia nudge */}
          <InlineTriviaNudge pageType="sim" />

          {/* Engagement + actions */}
          <div className="space-y-3">
            <FeedLikeButton feedType="sim" feedId={entry.id} initialCount={entry.like_count ?? 0} />
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
