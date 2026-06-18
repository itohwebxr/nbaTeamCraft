"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { overallColor } from "@/lib/overallColor";
import { useDraftStore } from "@/stores/draftStore";
import { TeamEvaluation, STARTER_SLOTS, BENCH_SLOTS, TOTAL_BUDGET, PublicTeamRank } from "@/types";
import TeamStats from "@/components/result/TeamStats";
import TeamNameInput from "@/components/result/TeamNameInput";
import EnterRankingsModal from "@/components/result/EnterRankingsModal";
import SaveBuildModal from "@/components/result/SaveBuildModal";
import ExhibitionMatch from "@/components/cup/ExhibitionMatch";
import { GameResult } from "@/lib/simulateGame";
import { gtm } from "@/lib/gtm";
import HeaderAuth from "@/components/auth/HeaderAuth";
import { useAuth } from "@/hooks/useAuth";
import { startXLogin } from "@/lib/xLogin";
import { withShareUtm } from "@/lib/utm";

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
  const { user } = useAuth();
  const isSandbox = mode === "sandbox";
  const [evaluation, setEvaluation] = useState<TeamEvaluation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
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
  // Sandbox save state
  const [sandboxSaved, setSandboxSaved] = useState(false);
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null);
  const [sandboxSaving, setSandboxSaving] = useState(false);
  const [sandboxError, setSandboxError] = useState(false);
  const [xLoginLoading, setXLoginLoading] = useState(false);
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
    const NAME_SUFFIXES_1 = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
    const formatName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return name;
      const suffix = NAME_SUFFIXES_1.has(parts[parts.length - 1].toLowerCase()) ? parts[parts.length - 1] : null;
      const lastName = suffix ? parts[parts.length - 2] ?? parts[0] : parts[parts.length - 1];
      return suffix ? `${parts[0][0]} ${lastName} ${suffix}` : `${parts[0][0]} ${lastName}`;
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
      ? `🏀 ${label}\nOverall: ${evaluation.overall} (${evaluation.tier} Tier)\n${rosterLines}\nCreated by #NBATeamCraft`
      : `🏀 ${label}\n${rosterLines}\nCreated by #NBATeamCraft`;

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

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(withShareUtm(sharePageUrl, { handle: user?.xHandle, campaign: "team_share" }))}`;
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


  const getBrowserId = (): string => {
    const key = "nba_tc_browser_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  };

  // Publishes the team to the rankings. Returns the new public_team id (and rank)
  // on success, or null on failure. Sets the related state as a side effect so
  // callers can chain the cup entry without waiting on React state updates.
  const publishToRankings = async (
    name: string,
    description = ""
  ): Promise<{ id: string; rank: PublicTeamRank } | null> => {
    if (!evaluation) return null;

    // Ensure share URL exists first
    let resolvedShareId: string | null = null;
    try {
      const NAME_SUFFIXES_2 = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
      const formatName = (n: string) => {
        const parts = n.trim().split(/\s+/);
        if (parts.length === 1) return n;
        const suffix = NAME_SUFFIXES_2.has(parts[parts.length - 1].toLowerCase()) ? parts[parts.length - 1] : null;
        const lastName = suffix ? parts[parts.length - 2] ?? parts[0] : parts[parts.length - 1];
        return suffix ? `${parts[0][0]} ${lastName} ${suffix}` : `${parts[0][0]} ${lastName}`;
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

    if (!resolvedShareId) return null;

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
          user_id: user?.id ?? null,
          description,
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
          has_description: description.trim().length > 0,
        });
        return { id: json.id, rank: json.rank };
      }
    } catch {
      // silently fail — user can retry
    }
    return null;
  };

  // Publish to feed then redirect to team detail page.
  const handleEnterCupFlow = async (name: string, description = "") => {
    if (isPublishing || !evaluation) return;
    setIsPublishing(true);
    try {
      const published = await publishToRankings(name, description);
      if (!published) return;
      router.push(`/team/${published.id}`);
    } finally {
      setIsPublishing(false);
      setShowEnterModal(false);
    }
  };

  const handleShareRanking = () => {
    if (!evaluation || !publishedRank) return;
    const label = teamName || "My NBA Team";
    const text = `🏀 ${label}\nOverall: ${evaluation.overall} (${evaluation.tier} Tier)\nRanked #${publishedRank.overall} Overall\nCreated by #NBATeamCraft`;
    const url = withShareUtm(sharePageUrl ?? `${window.location.origin}/`, { handle: user?.xHandle, campaign: "ranking_share" });
    gtm.shareRanking({ team_name: label, overall: evaluation.overall, rank_overall: publishedRank.overall });
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, "_blank", "noopener");
  };

  const handleSandboxSave = async (nameOverride?: string, descriptionOverride = "") => {
    if (sandboxSaving || sandboxSaved || !evaluation) return;
    setSandboxSaving(true);
    setSandboxError(false);
    const name = (nameOverride ?? teamName).trim();
    if (!name) {
      setSandboxSaving(false);
      setShowSaveModal(true);
      return;
    }
    try {
      // public_teams.share_id references a shares row, so create the share
      // first (same as the normal publish flow) before saving the team.
      const NAME_SUFFIXES_3 = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
      const formatName = (n: string) => {
        const parts = n.trim().split(/\s+/);
        if (parts.length === 1) return n;
        const suffix = NAME_SUFFIXES_3.has(parts[parts.length - 1].toLowerCase()) ? parts[parts.length - 1] : null;
        const lastName = suffix ? parts[parts.length - 2] ?? parts[0] : parts[parts.length - 1];
        return suffix ? `${parts[0][0]} ${lastName} ${suffix}` : `${parts[0][0]} ${lastName}`;
      };
      const slotKey = (slot: string) => (slot === "BENCH1" ? "6th" : slot.toLowerCase());
      const shareData: Record<string, string> = {
        name,
        overall: String(evaluation.overall),
        tier: evaluation.tier,
        mode: "sandbox",
      };
      if (sandboxConfig.teamFilter !== "Random") shareData.sandbox_team = sandboxConfig.teamFilter;
      if (sandboxConfig.seasonFilter !== "Random") shareData.sandbox_season = sandboxConfig.seasonFilter;
      [...starters, ...bench].forEach((e) => {
        if (e) {
          const key = slotKey(e.slot);
          shareData[key] = formatName(e.playerSeason.name);
          shareData[`${key}_s`] = e.playerSeason.season;
        }
      });

      let shareId: string | null = null;
      const shareRes = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareData),
      });
      const shareJson = await shareRes.json();
      if (shareJson.url) {
        const parts = shareJson.url.split("/");
        shareId = parts[parts.length - 1];
      }
      if (!shareId) throw new Error("Failed to create share");

      const res = await fetch("/api/public-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_id: shareId,
          name,
          evaluation,
          roster,
          created_by_browser_id: getBrowserId(),
          user_id: user?.id ?? null,
          description: descriptionOverride,
          is_sandbox: true,
        }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const newId = json?.id ?? null;
        if (newId) setSavedTeamId(newId);
        setSandboxSaved(true);
        gtm.sandboxSave({ team_name: name, overall: evaluation.overall, tier: evaluation.tier, has_description: descriptionOverride.trim().length > 0 });
        // Redirect to team detail after brief success pause
        if (newId) setTimeout(() => router.push(`/team/${newId}`), 1200);
      } else {
        setSandboxError(true);
      }
    } catch (e) {
      console.error(e);
      setSandboxError(true);
    } finally {
      setSandboxSaving(false);
    }
  };

  const handleXLogin = async () => {
    if (xLoginLoading) return;
    setXLoginLoading(true);
    const error = await startXLogin(window.location.pathname, getBrowserId());
    if (error) {
      console.error("X login error:", error);
      setXLoginLoading(false);
    }
  };

  const starters = STARTER_SLOTS.map((slot) => roster.find((e) => e.slot === slot));
  const bench = BENCH_SLOTS.map((slot) => roster.find((e) => e.slot === slot));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/"><Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" /></Link>
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
            <span className="text-xs font-black text-orange-400 uppercase tracking-widest">🔧 Roster Builder</span>
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
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base transition-colors"
            >
              🏆 Enter the Cup
            </button>
            <p className="text-center text-xs text-zinc-600">
              Play your first match instantly · you'll also be added to the rankings
            </p>
          </div>
        )}
        {isSandbox && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div>
              <p className="font-display text-xs font-bold text-orange-400 tracking-[0.2em] mb-1">🔧 ROSTER BUILDER</p>
              <p className="text-xs text-zinc-500">Post this build to the feed — get likes and comments from the community.</p>
            </div>
            {sandboxSaved ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 py-2.5 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-sm font-bold text-emerald-400">Posted to the feed!</span>
                </div>
                {!user && (
                  <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-zinc-400 font-bold">Keep it across devices</p>
                    <p className="text-xs text-zinc-500">Sign in with X to sync your saved teams across all your devices.</p>
                    <button
                      onClick={handleXLogin}
                      disabled={xLoginLoading}
                      className="w-full py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {xLoginLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="text-base leading-none">𝕏</span>
                      )}
                      Sign in with X
                    </button>
                  </div>
                )}
                <button
                  onClick={() => router.push("/me")}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-colors"
                >
                  View on My Page →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={sandboxSaving || !evaluation || loading}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm transition-colors"
                >
                  {sandboxSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Posting...
                    </span>
                  ) : sandboxError ? (
                    "Retry — Post to Feed"
                  ) : (
                    "🔥 Post to Feed"
                  )}
                </button>
                {sandboxError && (
                  <p className="text-center text-xs text-red-400">
                    Couldn't post. Please try again.
                  </p>
                )}
                {!user && !sandboxError && (
                  <p className="text-center text-xs text-zinc-600">
                    Sign in with X after saving to keep your teams across devices.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Simulators — same entry points as the home page. When the team has
            been saved/published it has an id, so we pre-select it in each sim. */}
        {(() => {
          const simTeamId = publishedId ?? savedTeamId;
          // Matchup pre-selects via home* keys; playoff/season use team* keys.
          const q = (idKey: "homeTeamId" | "teamId", prefix: "home" | "team") => {
            if (!simTeamId) return "";
            const p = new URLSearchParams();
            p.set(idKey, simTeamId);
            p.set(`${prefix}Name`, teamName || "My Team");
            if (evaluation) {
              p.set(`${prefix}Overall`, String(evaluation.overall));
              p.set(`${prefix}Tier`, evaluation.tier);
            }
            if (isSandbox) p.set(`${prefix}Sandbox`, "1");
            return `?${p.toString()}`;
          };
          return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">🎮 Simulators</p>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href={`/matchup${q("homeTeamId", "home")}`}
                  className="group block bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 hover:border-orange-500/60 rounded-xl p-3 transition-colors"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xl">⚔️</span>
                    <p className="font-display text-[13px] font-black text-white leading-tight">Match Simulator</p>
                    <p className="text-[10px] text-zinc-400 leading-snug">1v1 · game or series</p>
                  </div>
                </Link>
                <Link
                  href={`/playoffs${q("teamId", "team")}`}
                  className="group block bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-900 border border-yellow-500/20 hover:border-yellow-500/40 rounded-xl p-3 transition-colors"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xl">🏆</span>
                    <p className="font-display text-[13px] font-black text-white leading-tight">Playoff Simulator</p>
                    <p className="text-[10px] text-zinc-400 leading-snug">4/8/16 · full bracket</p>
                  </div>
                </Link>
                <Link
                  href={`/season${q("teamId", "team")}`}
                  className="group block bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-900 border border-sky-500/20 hover:border-sky-500/40 rounded-xl p-3 transition-colors"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xl">📅</span>
                    <p className="font-display text-[13px] font-black text-white leading-tight">Season Simulator</p>
                    <p className="text-[10px] text-zinc-400 leading-snug">82 games · W-L record</p>
                  </div>
                </Link>
              </div>
            </div>
          );
        })()}

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
          onConfirm={handleEnterCupFlow}
          onCancel={() => setShowEnterModal(false)}
          isSubmitting={isPublishing}
        />
      )}
      {showSaveModal && (
        <SaveBuildModal
          initialName={teamName}
          onConfirm={(name, description) => {
            setTeamName(name);
            setShowSaveModal(false);
            handleSandboxSave(name, description);
          }}
          onCancel={() => setShowSaveModal(false)}
          isSubmitting={sandboxSaving}
        />
      )}
    </div>
  );
}
