"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { useAuth } from "@/hooks/useAuth";
import { gtm } from "@/lib/gtm";
import { withShareUtm } from "@/lib/utm";
import { PublicTeamRosterItem } from "@/types";
import LikeButton from "@/components/common/LikeButton";

const SLOT_ORDER: Record<string, number> = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4, BENCH1: 5 };
const formatName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;
  return `${parts[0][0]} ${parts[parts.length - 1]}`;
};
const slotLabel = (slot: string) => (slot === "BENCH1" ? "6TH" : slot);

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
  roster,
  shareId,
}: {
  teamId: string;
  teamName: string;
  overall: number;
  tier: string;
  likeCount: number;
  isSandbox: boolean;
  roster: PublicTeamRosterItem[];
  shareId?: string | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { setMode, reset, loadRoster, sandboxConfig } = useDraftStore();
  const [remixing, setRemixing] = useState(false);
  const [remixError, setRemixError] = useState(false);

  const handleShare = () => {
    const label = teamName || "My NBA Team";
    const rosterLines = [...roster]
      .sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9))
      .map((e) => `${slotLabel(e.slot)} : ${formatName(e.name)}`)
      .join("\n");
    const text = `🏀 ${label}\nOverall: ${overall} (${tier} Tier)\n${rosterLines}\n#NBATeamCraft\n`;
    // Prefer the share page (rich OGP with roster); fall back to the team page.
    const baseUrl = shareId
      ? `${window.location.origin}/share/${shareId}`
      : `${window.location.origin}/team/${teamId}`;
    const url = withShareUtm(baseUrl, { handle: user?.xHandle, campaign: "team_share" });
    gtm.shareTeam({ team_name: label, overall, tier, mode: isSandbox ? "sandbox" : "draft" });
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, "_blank", "noopener");
  };

  const handleRemix = async () => {
    if (remixing) return;
    setRemixing(true);
    setRemixError(false);
    try {
      const res = await fetch(`/api/public-teams/${teamId}/roster`);
      if (!res.ok) throw new Error("Failed to load roster");
      const data = await res.json();
      if (!data.roster?.length) throw new Error("Empty roster");
      loadRoster(data.roster);
      gtm.remixTeam({ team_name: teamName || "team", overall, tier });
      router.push("/draft");
    } catch {
      setRemixError(true);
      setRemixing(false);
    }
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
        onClick={handleRemix}
        disabled={remixing}
        className="block w-full py-3 rounded-xl border-2 border-orange-500/70 hover:border-orange-400 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 font-bold text-sm text-center transition-colors disabled:opacity-60"
      >
        {remixing ? "Loading roster…" : "🔁 Remix This Roster →"}
      </button>
      <p className="text-center text-xs text-zinc-500 -mt-1">
        {remixError ? (
          <span className="text-red-400">Couldn&apos;t load this roster. Please try again.</span>
        ) : (
          "Start from this lineup and swap a player to make your counter."
        )}
      </p>
      <button
        onClick={handleBuild}
        className="block w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm text-center transition-colors"
      >
        {isSandbox ? "🔧 Build Your Own Team →" : "🏀 Build Your Own Team →"}
      </button>
    </div>
  );
}
