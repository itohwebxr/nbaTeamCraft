"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";
import { createAuthClient } from "@/lib/supabaseAuth";
import { overallColor } from "@/lib/overallColor";
import { gtm } from "@/lib/gtm";
import { useDraftStore } from "@/stores/draftStore";
import { currentCupWeek } from "@/lib/cupWeek";
import CupPlayPanel from "@/components/cup/CupPlayPanel";

type MyTeam = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  like_count: number;
  created_at: string;
  is_sandbox?: boolean;
};

type CupHistoryRow = {
  entryId: string;
  cupWeek: string;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointDiff: number;
};

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400", A: "text-orange-400", B: "text-sky-400",
  C: "text-zinc-400", D: "text-zinc-500",
};

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const resetDraft = useDraftStore((s) => s.reset);
  const setMode = useDraftStore((s) => s.setMode);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [cupHistory, setCupHistory] = useState<CupHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Which team cards have cup panel expanded
  const [expandedCup, setExpandedCup] = useState<Set<string>>(new Set());

  useEffect(() => {
    const browserId = getBrowserId();
    const params = new URLSearchParams();
    if (browserId) params.set("browserId", browserId);
    if (user) params.set("userId", user.id);
    fetch(`/api/me?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const t = data.teams ?? [];
        const c = data.cupHistory ?? [];
        setTeams(t);
        setCupHistory(c);
        gtm.mypageView({ teams_count: t.length, cup_entries_count: c.length });
        // Auto-expand cup panel for teams with an active this-week entry
        const week = currentCupWeek();
        const activeIds = new Set(
          (c as CupHistoryRow[]).filter((h) => h.cupWeek === week).map((h) => h.teamId)
        );
        setExpandedCup(activeIds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    setDeleting(true);
    try {
      const browserId = getBrowserId();
      const params = new URLSearchParams();
      if (browserId) params.set("browserId", browserId);
      if (user) params.set("userId", user.id);
      const res = await fetch(`/api/public-teams/${teamId}?${params.toString()}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setCupHistory((prev) => prev.filter((c) => c.teamId !== teamId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }, [user]);

  const startNewDraft = () => {
    resetDraft();
    setMode("draft");
    router.push("/draft");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await createAuthClient().auth.signOut();
    router.push("/");
  };

  const currentWeek = currentCupWeek();

  // Map teamId → cup entry for quick lookup
  const cupByTeam = Object.fromEntries(cupHistory.map((c) => [c.teamId, c]));

  const regularTeams = teams.filter((t) => !t.is_sandbox);
  const sandboxTeams = teams.filter((t) => t.is_sandbox);

  const [activeTab, setActiveTab] = useState<"dream" | "builds">("dream");

  const toggleCup = (teamId: string) => {
    setExpandedCup((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <button onClick={startNewDraft} className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
            Draft →
          </button>
        </div>
      </header>

      <div className="fade-up fade-up-1 max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Profile */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          {authLoading ? (
            <div className="h-16 flex items-center text-zinc-600 text-sm">Loading profile...</div>
          ) : user ? (
            <div className="flex items-center gap-4">
              {user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-full border-2 border-zinc-700 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl font-black text-white truncate">{user.displayName}</h1>
                {user.xHandle && (
                  <a
                    href={`https://x.com/${user.xHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    @{user.xHandle}
                  </a>
                )}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="text-center py-2 space-y-2">
              <p className="text-sm text-zinc-400">You're browsing as a guest.</p>
              <p className="text-xs text-zinc-600">Your teams below are tied to this browser. Sign in with X to keep them across devices.</p>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("dream")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === "dream"
                  ? "text-white border-b-2 border-orange-500 -mb-px"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Dream Teams
              {regularTeams.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-1.5 py-0.5">
                  {regularTeams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("builds")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === "builds"
                  ? "text-orange-400 border-b-2 border-orange-500 -mb-px"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Builds
              {sandboxTeams.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-1.5 py-0.5">
                  {sandboxTeams.length}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="h-20 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
          ) : activeTab === "dream" ? (
            regularTeams.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3">
                <p className="text-2xl">🏀</p>
                <p className="text-sm text-zinc-500">No Dream Teams yet.</p>
                <button
                  onClick={startNewDraft}
                  className="inline-flex px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                >
                  Start Drafting →
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 flex justify-end">
                  <Link href="/cup" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cup Standings →</Link>
                </div>
                <div className="divide-y divide-zinc-800">
                  {regularTeams.map((t) => {
                    const cup = cupByTeam[t.id];
                    const hasCurrentCup = cup?.cupWeek === currentWeek;
                    const hasCup = !!cup;
                    const isExpanded = expandedCup.has(t.id);

                    return (
                      <div key={t.id} className="group">
                        <div className="flex items-center gap-2 px-4 py-3">
                          <Link href={`/team/${t.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`font-display text-xl font-black w-9 text-right shrink-0 ${overallColor(t.overall)}`}>
                              {t.overall}
                            </span>
                            <span className={`text-xs font-bold w-4 shrink-0 ${TIER_COLORS[t.tier] ?? "text-zinc-500"}`}>{t.tier}</span>
                            <span className="flex-1 text-sm font-semibold text-white truncate">{t.name}</span>
                          </Link>
                          {hasCup && (
                            <button
                              onClick={() => toggleCup(t.id)}
                              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                hasCurrentCup
                                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                              }`}
                            >
                              <span>🏆</span>
                              {cup.wins}–{cup.losses}
                              <span className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                            </button>
                          )}
                          <span className="text-xs text-zinc-600 shrink-0">❤️ {t.like_count}</span>
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 text-lg leading-none"
                            title="Delete team"
                          >
                            ×
                          </button>
                        </div>
                        {hasCup && isExpanded && (
                          <div className="px-3 pb-3">
                            <CupPlayPanel
                              entryId={cup.entryId}
                              teamId={t.id}
                              teamName={t.name}
                              teamOverall={t.overall}
                              teamTier={t.tier}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            sandboxTeams.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3">
                <p className="text-2xl">🔧</p>
                <p className="text-sm text-zinc-500">No builds saved yet.</p>
                <Link
                  href="/draft?mode=sandbox"
                  className="inline-flex px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                >
                  Open Roster Builder →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {sandboxTeams.map((t) => (
                  <div key={t.id} className="group flex items-center gap-2 px-4 py-3">
                    <Link href={`/team/${t.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-display text-xl font-black w-9 text-right shrink-0 ${overallColor(t.overall)}`}>
                        {t.overall}
                      </span>
                      <span className={`text-xs font-bold w-4 shrink-0 ${TIER_COLORS[t.tier] ?? "text-zinc-500"}`}>{t.tier}</span>
                      <span className="flex-1 text-sm font-semibold text-white truncate">{t.name}</span>
                    </Link>
                    <button
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 text-lg leading-none"
                      title="Delete build"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-xs w-full space-y-4 shadow-2xl">
            <p className="font-display text-base font-black text-white">Delete this team?</p>
            <p className="text-sm text-zinc-400">This will also remove all Cup entries for this team. This action cannot be undone.</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTeam(confirmDeleteId)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
