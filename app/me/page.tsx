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

type MyTeam = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  like_count: number;
  created_at: string;
  is_sandbox?: boolean;
  comment_count?: number;
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
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/notifications?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setNotifLoaded(true);
        // Mark all as read
        if ((data.unreadCount ?? 0) > 0) {
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id }),
          }).catch(() => {});
        }
      })
      .catch(() => setNotifLoaded(true));
  }, [user?.id]);

  useEffect(() => {
    const browserId = getBrowserId();
    const params = new URLSearchParams();
    if (browserId) params.set("browserId", browserId);
    if (user) params.set("userId", user.id);
    fetch(`/api/me?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const t = data.teams ?? [];
        setTeams(t);
        gtm.mypageView({ teams_count: t.length, cup_entries_count: 0 });
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

  const startRosterBuilder = () => {
    resetDraft();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: "Random", season_filter: "Random" });
    router.push("/draft");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await createAuthClient().auth.signOut();
    router.push("/");
  };

  const regularTeams = teams.filter((t) => !t.is_sandbox);
  const sandboxTeams = teams.filter((t) => t.is_sandbox);

  const [activeTab, setActiveTab] = useState<"crafted" | "dream" | "trivia">("crafted");

  type TriviaStats = { total: number; correct: number; streak: number };
  const [triviaStats, setTriviaStats] = useState<TriviaStats | null>(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [triviaLoaded, setTriviaLoaded] = useState(false);

  useEffect(() => {
    if (activeTab !== "trivia" || triviaLoaded || !user?.id) return;
    setTriviaLoading(true);
    fetch(`/api/trivia/results?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => setTriviaStats(data.stats ?? null))
      .catch(() => {})
      .finally(() => { setTriviaLoading(false); setTriviaLoaded(true); });
  }, [activeTab, triviaLoaded, user?.id]);

  type NotificationItem = {
    id: string;
    type: "like" | "comment";
    team_id: string | null;
    team_name: string | null;
    actor_display_name: string | null;
    actor_user_id: string | null;
    is_read: boolean;
    created_at: string;
  };
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoaded, setNotifLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          {activeTab === "trivia" ? (
            <Link href="/trivia" className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors">
              Trivia →
            </Link>
          ) : (
            <button
              onClick={activeTab === "crafted" ? startRosterBuilder : startNewDraft}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
            >
              {activeTab === "crafted" ? "Craft a Team →" : "Dream Draft →"}
            </button>
          )}
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

        {/* Notifications — only shown when logged in and there are items */}
        {user && notifLoaded && notifications.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">🔔 Notifications</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {notifications.slice(0, 10).map((n) => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.is_read ? "opacity-60" : ""}`}>
                  <span className="text-base shrink-0 mt-0.5">{n.type === "like" ? "❤️" : "💬"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug">
                      {(() => {
                        const actor = n.actor_display_name
                          ? n.actor_user_id
                            ? <a href={`/user/${n.actor_user_id}`} className="font-bold hover:text-orange-400 transition-colors">{n.actor_display_name}</a>
                            : <span className="font-bold">{n.actor_display_name}</span>
                          : <span>Someone</span>;
                        return n.type === "like"
                          ? <>{actor} liked <span className="font-bold">{n.team_name ?? "your team"}</span></>
                          : <>{actor} commented on <span className="font-bold">{n.team_name ?? "your team"}</span></>;
                      })()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {n.team_id && (
                    <a href={`/team/${n.team_id}`} className="text-xs text-zinc-500 hover:text-orange-400 transition-colors shrink-0">View →</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex border-b border-zinc-800">
            {([
              { key: "crafted", label: "Crafted Teams", count: sandboxTeams.length },
              { key: "dream",   label: "Dream Teams",   count: regularTeams.length },
              { key: "trivia",  label: "Trivia",        count: null },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                  activeTab === key
                    ? "text-white border-b-2 border-orange-500 -mb-px"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className="ml-1 text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Crafted Teams */}
          {activeTab === "crafted" && (
            loading ? (
              <div className="h-20 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
            ) : sandboxTeams.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3">
                <p className="text-2xl">🏗️</p>
                <p className="text-sm text-zinc-500">No crafted teams yet.</p>
                <button
                  onClick={startRosterBuilder}
                  className="inline-flex px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                >
                  Craft a Team →
                </button>
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
                    {(t.comment_count ?? 0) > 0 && (
                      <span className="text-xs text-zinc-600 shrink-0">💬 {t.comment_count}</span>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 text-lg leading-none"
                      title="Delete team"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Dream Teams */}
          {activeTab === "dream" && (
            loading ? (
              <div className="h-20 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
            ) : regularTeams.length === 0 ? (
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
              <div className="divide-y divide-zinc-800">
                {regularTeams.map((t) => (
                  <div key={t.id} className="group flex items-center gap-2 px-4 py-3">
                    <Link href={`/team/${t.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-display text-xl font-black w-9 text-right shrink-0 ${overallColor(t.overall)}`}>
                        {t.overall}
                      </span>
                      <span className={`text-xs font-bold w-4 shrink-0 ${TIER_COLORS[t.tier] ?? "text-zinc-500"}`}>{t.tier}</span>
                      <span className="flex-1 text-sm font-semibold text-white truncate">{t.name}</span>
                    </Link>
                    {(t.comment_count ?? 0) > 0 && (
                      <span className="text-xs text-zinc-600 shrink-0">💬 {t.comment_count}</span>
                    )}
                    <span className="text-xs text-zinc-600 shrink-0">❤️ {t.like_count}</span>
                    <button
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 text-lg leading-none"
                      title="Delete team"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Trivia */}
          {activeTab === "trivia" && (
            !user ? (
              <div className="text-center py-8 px-4 space-y-3">
                <p className="text-2xl">🧠</p>
                <p className="text-sm text-zinc-500">Log in to track your Trivia stats.</p>
                <a
                  href="/auth/login"
                  className="inline-flex px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                >
                  Log in with X →
                </a>
              </div>
            ) : triviaLoading ? (
              <div className="h-20 flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
            ) : !triviaStats || triviaStats.total === 0 ? (
              <div className="text-center py-8 px-4 space-y-3">
                <p className="text-2xl">🧠</p>
                <p className="text-sm text-zinc-500">No Trivia results yet.</p>
                <Link
                  href="/trivia"
                  className="inline-flex px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-colors"
                >
                  Start Trivia →
                </Link>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-800 rounded-xl p-3 text-center">
                    <p className="font-display text-2xl font-black text-white">{triviaStats.total}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Answered</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-3 text-center">
                    <p className="font-display text-2xl font-black text-green-400">{triviaStats.correct}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Correct</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-3 text-center">
                    <p className="font-display text-2xl font-black text-orange-400">
                      {triviaStats.total > 0 ? Math.round((triviaStats.correct / triviaStats.total) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Accuracy</p>
                  </div>
                </div>
                {/* Streak */}
                <div className="bg-zinc-800 rounded-xl p-4 flex items-center gap-4">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <p className="font-display text-xl font-black text-white">{triviaStats.streak}-day streak</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Daily Challenge consecutive days</p>
                  </div>
                </div>
                <Link
                  href="/trivia"
                  className="block w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm text-center transition-colors"
                >
                  Play Today&apos;s Challenge →
                </Link>
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
            <p className="text-sm text-zinc-400">This action cannot be undone.</p>
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
