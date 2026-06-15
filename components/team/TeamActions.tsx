"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";
import LikeButton from "@/components/common/LikeButton";

// Client-side actions for the team detail page.
// - Share on X (orange, primary)
// - Build Your Own Team (secondary). Its destination mode mirrors the source
//   team: a Roster Builder team launches the Builder, a Dream Draft team
//   launches the Draft. `/draft` reads mode from the persisted store, so we
//   set it here before navigating.
export default function TeamActions({
  teamId,
  teamName,
  overall,
  tier,
  likeCount,
  isSandbox,
}: {
  teamId: string;
  teamName: string;
  overall: number;
  tier: string;
  likeCount: number;
  isSandbox: boolean;
}) {
  const router = useRouter();
  const { setMode, reset, sandboxConfig } = useDraftStore();

  const handleShare = () => {
    const label = teamName || "My NBA Team";
    const text = `🏀 ${label}\nOverall: ${overall} (${tier} Tier)\n#NBATeamCraft\n`;
    const url = `${window.location.origin}/team/${teamId}`;
    gtm.shareTeam({ team_name: label, overall, tier, mode: isSandbox ? "sandbox" : "draft" });
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, "_blank", "noopener");
  };

  const handleBuild = () => {
    reset();
    if (isSandbox) {
      setMode("sandbox");
      gtm.sandboxStart({ team_filter: sandboxConfig.teamFilter, season_filter: sandboxConfig.seasonFilter });
    } else {
      setMode("draft");
    }
    router.push("/draft");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <LikeButton teamId={teamId} initialCount={likeCount} />
        <button
          onClick={handleShare}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm text-center transition-colors"
        >
          Share on 𝕏
        </button>
      </div>
      <button
        onClick={handleBuild}
        className="block w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm text-center transition-colors"
      >
        {isSandbox ? "🔧 Build Your Own Team →" : "🏀 Build Your Own Team →"}
      </button>
    </div>
  );
}
