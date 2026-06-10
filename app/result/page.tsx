"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { overallColor } from "@/lib/overallColor";
import { useDraftStore } from "@/stores/draftStore";
import { TeamEvaluation, STARTER_SLOTS, BENCH_SLOTS, TOTAL_BUDGET, PublicTeamRank } from "@/types";
import TeamStats from "@/components/result/TeamStats";
import TeamNameInput from "@/components/result/TeamNameInput";
import EnterRankingsModal from "@/components/result/EnterRankingsModal";
import { gtm } from "@/lib/gtm";

function SlotLabel({ slot }: { slot: string }) {
  if (slot === "BENCH1") return "6TH";
  return slot;
}

export default function ResultPage() {
  const router = useRouter();
  const { roster, usedBudget, reset } = useDraftStore();
  const [evaluation, setEvaluation] = useState<TeamEvaluation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishedRank, setPublishedRank] = useState<PublicTeamRank | null>(null);
  const [sharePageUrl, setSharePageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (roster.length === 0) {
      router.replace("/draft");
      return;
    }

    fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster }),
    })
      .then((r) => r.json())
      .then((data) => {
        setEvaluation(data);
        gtm.viewResult({
          overall: data.overall,
          tier: data.tier,
          used_budget: usedBudget,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const label = teamName || "My NBA Team";
    const formatName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return name;
      return `${parts[0][0]} ${parts[parts.length - 1]}`;
    };
    const slotKey = (slot: string) => slot === "BENCH1" ? "6th" : slot.toLowerCase();
    const slotLabel = (slot: string) => slot === "BENCH1" ? "6TH" : slot;

    const shareData: Record<string, string> = { name: label };
    if (evaluation) {
      shareData.overall = String(evaluation.overall);
      shareData.tier = evaluation.tier;
    }
    [...starters, ...bench].forEach((e) => {
      if (e) {
        const key = slotKey(e.slot);
        shareData[key] = formatName(e.playerSeason.name);
        shareData[`${key}_s`] = e.playerSeason.season;
      }
    });

    const rosterLines = [...starters, ...bench]
      .filter((e): e is NonNullable<typeof e> => e != null)
      .map((e) => `${slotLabel(e.slot)} : ${formatName(e.playerSeason.name)}`)
      .join("\n");
    const text = evaluation
      ? `🏀 ${label}\nOverall: ${evaluation.overall} (${evaluation.tier} Tier)\n${rosterLines}\n#NBATeamCraft\n`
      : `🏀 ${label}\n${rosterLines}\n#NBATeamCraft\n`;

    if (evaluation) {
      gtm.shareTeam({ team_name: label, overall: evaluation.overall, tier: evaluation.tier });
    }

    const fallbackUrl = `${window.location.origin}/share?${new URLSearchParams(shareData).toString()}`;
    let sharePageUrl = fallbackUrl;
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareData),
      });
      const json = await res.json();
      if (json.url) sharePageUrl = json.url;
    } catch {
      // use fallbackUrl
    } finally {
      setSharing(false);
    }

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(sharePageUrl)}`;
    window.open(tweetUrl, "_blank", "noopener");
  };

  const getBrowserId = (): string => {
    const key = "nba_tc_browser_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  };

  const handleEnterRankings = async (name: string) => {
    if (isPublishing || !evaluation) return;
    setIsPublishing(true);

    // Ensure share URL exists first
    let resolvedShareId: string | null = null;
    try {
      const formatName = (n: string) => {
        const parts = n.trim().split(/\s+/);
        if (parts.length === 1) return n;
        return `${parts[0][0]} ${parts[parts.length - 1]}`;
      };
      const slotKey = (slot: string) => slot === "BENCH1" ? "6th" : slot.toLowerCase();
      const shareData: Record<string, string> = { name };
      shareData.overall = String(evaluation.overall);
      shareData.tier = evaluation.tier;
      [...starters, ...bench].forEach((e) => {
        if (e) {
          const key = slotKey(e.slot);
          shareData[key] = formatName(e.playerSeason.name);
          shareData[`${key}_s`] = e.playerSeason.season;
        }
      });

      const shareRes = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareData),
      });
      const shareJson = await shareRes.json();
      if (shareJson.url) {
        setSharePageUrl(shareJson.url);
        // Extract share ID from URL path /share/{id}
        const parts = shareJson.url.split("/");
        resolvedShareId = parts[parts.length - 1];
      }
    } catch {
      // continue without share_id — will fail validation
    }

    if (!resolvedShareId) {
      setIsPublishing(false);
      return;
    }

    try {
      const res = await fetch("/api/public-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_id: resolvedShareId,
          name,
          evaluation,
          roster,
          created_by_browser_id: getBrowserId(),
        }),
      });
      const json = await res.json();
      if (json.id) {
        setPublishedId(json.id);
        setPublishedRank(json.rank);
        setTeamName(name);
        gtm.enterRankings({
          team_name: name,
          overall: evaluation.overall,
          tier: evaluation.tier,
          rank_overall: json.rank.overall,
        });
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setIsPublishing(false);
      setShowEnterModal(false);
    }
  };

  const handleShareRanking = () => {
    if (!evaluation || !publishedRank) return;
    const label = teamName || "My NBA Team";
    const text = `🏀 ${label}\nOverall: ${evaluation.overall} (${evaluation.tier} Tier)\nRanked #${publishedRank.overall} Overall\n#NBATeamCraft\n`;
    const url = sharePageUrl ?? `${window.location.origin}/`;
    gtm.shareRanking({ team_name: label, overall: evaluation.overall, rank_overall: publishedRank.overall });
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, "_blank", "noopener");
  };

  const starters = STARTER_SLOTS.map((slot) => roster.find((e) => e.slot === slot));
  const bench = BENCH_SLOTS.map((slot) => roster.find((e) => e.slot === slot));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          <span className="text-xs text-zinc-500">Budget used: {usedBudget}/{TOTAL_BUDGET}</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Published panel — shown at top after entering rankings */}
        {publishedId && publishedRank && (
          <div className="bg-zinc-900 border border-amber-700/50 rounded-2xl p-5">
            <p className="font-display text-xs font-bold text-amber-400 tracking-[0.2em] mb-3">🏆 PUBLISHED SUCCESSFULLY</p>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Your Ranking</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                ["Overall", publishedRank.overall],
                ["Offense", publishedRank.offense],
                ["Defense", publishedRank.defense],
              ] as [string, number][]).map(([label, rank]) => (
                <div key={label} className="bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="font-display text-xl font-black text-white">#{rank}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/ranking")}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
              >
                View Ranking →
              </button>
              <button
                onClick={handleShareRanking}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>𝕏</span> Share Ranking
              </button>
            </div>
          </div>
        )}

        <TeamNameInput value={teamName} onChange={setTeamName} />

        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            Evaluating team...
          </div>
        ) : evaluation ? (
          <TeamStats evaluation={evaluation} teamName={teamName} />
        ) : null}

        {/* Roster */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Roster</h3>

          <p className="text-xs text-zinc-600 mb-2">STARTERS</p>
          <div className="space-y-2 mb-4">
            {starters.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-400 w-16 shrink-0">
                  {STARTER_SLOTS[i]}
                </span>
                {entry ? (
                  <>
                    <span className="text-sm font-semibold text-white flex-1 truncate">
                      {entry.playerSeason.name}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {entry.playerSeason.season}
                    </span>
                    <span className={`font-display text-xs font-black w-6 text-right shrink-0 ${overallColor(entry.playerSeason.overall)}`}>
                      {entry.playerSeason.overall}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-700 flex-1">—</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600 mb-2">6TH MAN</p>
          <div className="space-y-2">
            {bench.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 w-8 shrink-0">BN</span>
                {entry ? (
                  <>
                    <span className="text-xs text-zinc-400 mr-1 shrink-0">
                      {entry.assignedPosition}
                    </span>
                    <span className="text-sm font-semibold text-white flex-1 truncate">
                      {entry.playerSeason.name}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {entry.playerSeason.season}
                    </span>
                    <span className={`font-display text-xs font-black w-6 text-right shrink-0 ${overallColor(entry.playerSeason.overall)}`}>
                      {entry.playerSeason.overall}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-700 flex-1">—</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enter Rankings */}
        {!publishedId && (
          <button
            onClick={() => setShowEnterModal(true)}
            disabled={!evaluation || loading}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            🏆 Enter Rankings
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (evaluation) {
                gtm.draftAgain({ previous_overall: evaluation.overall, previous_tier: evaluation.tier });
              }
              reset();
              router.push("/draft");
            }}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
          >
            Draft Again
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {sharing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sharing...
              </>
            ) : (
              <><span>𝕏</span> Share</>
            )}
          </button>
        </div>
      </div>
      {showEnterModal && (
        <EnterRankingsModal
          initialName={teamName}
          onConfirm={handleEnterRankings}
          onCancel={() => setShowEnterModal(false)}
          isSubmitting={isPublishing}
        />
      )}
    </div>
  );
}
