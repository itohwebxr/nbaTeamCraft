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

type MyTeam = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  like_count: number;
  created_at: string;
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
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [cupHistory, setCupHistory] = useState<CupHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleSignOut = async () => {
    setSigningOut(true);
    await createAuthClient().auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <Link href="/draft" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
            Draft →
          </Link>
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

        {/* Cup history */}
        <div className="bg-zinc-900 border border-amber-700/30 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-amber-900/10 border-b border-amber-700/20 flex items-center justify-between">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">🏆 Cup History</p>
            <Link href="/cup" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Standings →</Link>
          </div>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
          ) : cupHistory.length === 0 ? (
            <div className="text-center py-6 px-4">
              <p className="text-sm text-zinc-500">No cup entries yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Draft a team and enter the Cup from the result screen!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {cupHistory.map((c) => (
                <div key={c.entryId} className="flex items-center gap-3 px-4 py-3 group">
                  <Link href={`/team/${c.teamId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:bg-zinc-800/50 transition-colors rounded-lg -mx-2 px-2">
                    <span className="text-xs text-zinc-500 font-bold w-20 shrink-0">{c.cupWeek}</span>
                    <span className="flex-1 text-sm font-semibold text-white truncate">{c.teamName}</span>
                    <span className="font-display text-sm font-black tabular-nums shrink-0">
                      <span className="text-white">{c.wins}</span>
                      <span className="text-zinc-600">–</span>
                      <span className="text-zinc-400">{c.losses}</span>
                    </span>
                    <span className={`text-xs font-bold tabular-nums w-12 text-right shrink-0 ${
                      c.pointDiff > 0 ? "text-orange-400" : c.pointDiff < 0 ? "text-zinc-500" : "text-zinc-600"
                    }`}>
                      {c.pointDiff > 0 ? "+" : ""}{c.pointDiff}
                    </span>
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(c.teamId)}
                    className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 text-lg leading-none"
                    title="Delete team"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My teams */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">My Teams</p>
          </div>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-6 px-4 space-y-3">
              <p className="text-sm text-zinc-500">No published teams yet.</p>
              <Link
                href="/draft"
                className="inline-flex px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
              >
                Start Drafting →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {teams.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 group">
                  <Link href={`/team/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:bg-zinc-800/50 transition-colors rounded-lg -mx-2 px-2">
                    <span className={`font-display text-lg font-black w-9 text-right shrink-0 ${overallColor(t.overall)}`}>
                      {t.overall}
                    </span>
                    <span className={`text-xs font-bold w-4 shrink-0 ${TIER_COLORS[t.tier] ?? "text-zinc-500"}`}>{t.tier}</span>
                    <span className="flex-1 text-sm font-semibold text-white truncate">{t.name}</span>
                    <span className="text-xs text-zinc-600 shrink-0">❤️ {t.like_count}</span>
                    <span className="text-xs text-zinc-600 shrink-0">{t.created_at.slice(5, 10)}</span>
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(t.id)}
                    className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 text-lg leading-none"
                    title="Delete team"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
