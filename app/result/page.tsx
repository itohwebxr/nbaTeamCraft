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
import ExhibitionMatch from "@/components/cup/ExhibitionMatch";
import CupStatus from "@/components/cup/CupStatus";
import { GameResult } from "@/lib/simulateGame";
import { gtm } from "@/lib/gtm";
import HeaderAuth from "@/components/auth/HeaderAuth";

function SlotLabel({ slot }: { slot: string }) {
  if (slot === "BENCH1") return "6TH";
  return slot;
}

// Rank card with count-down reveal (#99 → #12) and staggered flip-in
function RankCard({ label, rank, index }: { label: string; rank: number; index: number }) {
  const [display, setDisplay] = useState(Math.min(rank + 60, 99));

  useEffect(() => {
    const delay = 400 + index * 180; // wait for flip-in
    const duration = 700;
    let raf = 0;
    const timer = setTimeout(() => {
      const from = Math.min(rank + 60, 99);
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(from - eased * (from - rank)));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [rank, index]);

  return (
    <div
      className="flip-in bg-zinc-800 rounded-xl p-3 text-center"
      style={{ animationDelay: `${index * 180}ms` }}
    >
      <p className="font-display text-xl font-black text-white tabular-nums">#{display}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const { roster, usedBudget, reset, mode, sandboxConfig } = useDraftStore();
  const isSandbox = mode === "sandbox";
  const [evaluation, setEvaluation] = useState<TeamEvaluation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishedRank, setPublishedRank] = useState<PublicTeamRank | null>(null);
  const [sharePageUrl, setSharePageUrl] = useState<string | null>(null);
  // Exhibition match state
  const [matchLoading, setMatchLoading] = useState(false);
  const [match, setMatch] = useState<{
    opponent: { id: string; name: string; overall: number; tier: string };
    result: GameResult;
  } | null>(null);
  const [sessionRecord, setSessionRecord] = useState({ wins: 0, losses: 0 });
  const [recentOpponentIds, setRecentOpponentIds] = useState<string[]>([]);
  // Cup state
  const [cupEntryId, setCupEntryId] = useState<string | null>(null);
  const [isEnteringCup, setIsEnteringCup] = useState(false);
  // Wait for zustand persist rehydration before judging roster emptiness —
  // on a full page load (e.g. returning from OAuth) roster is [] until then.
  const [hydrated, setHydrated] = useState(useDraftStore.persist?.hasHydrated?.() ?? false);

  useEffect(() => {
    if (hydrated) return;
    const unsub = useDraftStore.persist.onFinishHydration(() => setHydrated(true));
    if (useDraftStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (roster.length === 0) {
      router.replace("/draft");
      return;
    }

    fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster, sandbox: isSandbox }),
    })
      .then((r) => r.json())
      .then((data) => {
        setEvaluation(data);
        gtm.viewResult({
          overall: data.overall,
          tier: data.tier,
          used_budget: usedBudget,
          mode,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    // Open the window synchronously within the tap gesture — mobile browsers
    // only hand off to the X app when navigation starts from a user gesture.
    const shareWindow = window.open("about:blank", "_blank");
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
    if (isSandbox) {
      shareData.mode = "sandbox";
      if (sandboxConfig.teamFilter !== "Random") shareData.sandbox_team = sandboxConfig.teamFilter;
      if (sandboxConfig.seasonFilter !== "Random") shareData.sandbox_season = sandboxConfig.seasonFilter;
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
      gtm.shareTeam({ team_name: label, overall: evaluation.overall, tier: evaluation.tier, mode });
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
    if (shareWindow) {
      shareWindow.location.href = tweetUrl;
    } else {
      // Popup blocked — navigate in place as a fallback
      window.location.href = tweetUrl;
    }
  };

  const handleExhibition = async () => {
    if (matchLoading || !evaluation) return;
    setMatchLoading(true);
    setMatch(null);
    gtm.exhibitionStart({
      team_overall: evaluation.overall,
      tier: evaluation.tier,
      session_match_number: sessionRecord.wins + sessionRecord.losses + 1,
    });
    try {
      const res = await fetch("/api/exhibition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roster,
          evaluation,
          teamName: teamName || "My Team",
          excludeOpponentIds: recentOpponentIds,
        }),
      });
      const json = await res.json();
      if (!json.result) throw new Error(json.error ?? "No result");

      const won = json.result.winner === "home";
      const newRecord = {
        wins: sessionRecord.wins + (won ? 1 : 0),
        losses: sessionRecord.losses + (won ? 0 : 1),
      };
      setSessionRecord(newRecord);
      // Avoid repeating the last 3 opponents
      setRecentOpponentIds((prev) => [...prev, json.opponent.id].slice(-3));
      setMatch({ opponent: json.opponent, result: json.result });

      gtm.exhibitionResult({
        result: won ? "win" : "loss",
        score_for: json.result.homeTotal,
        score_against: json.result.awayTotal,
        opponent_name: json.opponent.name,
        opponent_overall: json.opponent.overall,
        session_wins: newRecord.wins,
        session_losses: newRecord.losses,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleEnterCup = async () => {
    if (isEnteringCup || !publishedId) return;
    setIsEnteringCup(true);
    try {
      const res = await fetch("/api/cup/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicTeamId: publishedId, browserId: getBrowserId() }),
      });
      const json = await res.json();
      if (json.entry?.id) {
        setCupEntryId(json.entry.id);
        gtm.cupEnter({ team_overall: evaluation?.overall ?? 0, tier: evaluation?.tier ?? "D", cup_week: json.cupWeek ?? "" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnteringCup(false);
    }
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
          <div className="flex items-center gap-3">
            {!isSandbox && (
              <span className="text-xs text-zinc-500">Budget used: {usedBudget}/{TOTAL_BUDGET}</span>
            )}
            <HeaderAuth />
          </div>
        </div>
      </header>

      <div className="fade-up fade-up-1 max-w-lg mx-auto px-4 py-6 space-y-5">
        {isSandbox && (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl">
            <span className="text-xs font-black text-orange-400 uppercase tracking-widest">🎨 Sandbox Mode</span>
            <span className="text-xs text-zinc-500">
              {sandboxConfig.teamFilter !== "Random" ? sandboxConfig.teamFilter : "Any team"}{" · "}
              {sandboxConfig.seasonFilter !== "Random" ? sandboxConfig.seasonFilter : "Any season"}
            </span>
          </div>
        )}

        {/* Published panel — shown at top after entering rankings */}
        {publishedId && publishedRank && (
          <div className="slide-in-down bg-zinc-900 border border-amber-700/50 rounded-2xl p-5">
            <p className="font-display text-xs font-bold text-amber-400 tracking-[0.2em] mb-3">🏆 PUBLISHED SUCCESSFULLY</p>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Your Ranking</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                ["Overall", publishedRank.overall],
                ["Offense", publishedRank.offense],
                ["Defense", publishedRank.defense],
              ] as [string, number][]).map(([label, rank], i) => (
                <RankCard key={label} label={label} rank={rank} index={i} />
              ))}
            </div>
            <div className="flex gap-2 mb-3">
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
            {/* Enter the Cup */}
            {!cupEntryId ? (
              <button
                onClick={handleEnterCup}
                disabled={isEnteringCup}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isEnteringCup ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Entering Cup...</>
                ) : (
                  <>🏆 Enter the Cup — compete all week</>
                )}
              </button>
            ) : (
              <CupStatus
                entryId={cupEntryId}
                browserId={getBrowserId()}
                teamName={teamName || "My Team"}
                teamOverall={evaluation?.overall ?? 0}
                teamTier={evaluation?.tier ?? "D"}
                sharePageUrl={sharePageUrl}
              />
            )}
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

        {/* PRIMARY CTA: Enter Rankings → unlock Cup */}
        {!isSandbox && !publishedId && (
          <div className="space-y-2">
            <button
              onClick={() => setShowEnterModal(true)}
              disabled={!evaluation || loading}
              className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base transition-colors"
            >
              🏆 Enter Rankings & the Cup
            </button>
            <p className="text-center text-xs text-zinc-600">
              Register your team to compete in the weekly Cup tournament
            </p>
          </div>
        )}
        {isSandbox && (
          <p className="text-center text-xs text-zinc-600">
            Sandbox Mode teams cannot enter the rankings.
          </p>
        )}

        {/* Exhibition Match — try your team before committing to the Cup */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">⚔️ Exhibition</p>
            {(sessionRecord.wins > 0 || sessionRecord.losses > 0) && (
              <p className="text-xs text-zinc-500">
                <span className="text-white font-bold">{sessionRecord.wins}W–{sessionRecord.losses}L</span>
              </p>
            )}
          </div>
          <p className="text-xs text-zinc-600 mb-3">
            Scrimmage against other rosters — quarter scores + box score. No stakes, unlimited.
          </p>
          <button
            onClick={handleExhibition}
            disabled={!evaluation || loading || matchLoading}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-orange-500/60 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 hover:text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {matchLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding opponent...
              </>
            ) : (
              <>⚔️ Play Exhibition Match</>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (evaluation) {
                gtm.draftAgain({ previous_overall: evaluation.overall, previous_tier: evaluation.tier, mode });
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
      {match && evaluation && (
        <ExhibitionMatch
          userTeamName={teamName || "My Team"}
          userOverall={evaluation.overall}
          userTier={evaluation.tier}
          opponent={match.opponent}
          result={match.result}
          sessionRecord={sessionRecord}
          onRematch={() => {
            setMatch(null);
            handleExhibition();
          }}
          onClose={() => setMatch(null)}
        />
      )}
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
