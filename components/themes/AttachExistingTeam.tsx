"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";
import { gtm } from "@/lib/gtm";
import type { UnthemedTeam } from "@/lib/themes";

// Theme feed page: lets a logged-in user attach one of their existing posts
// (that isn't already entered into a theme) to this theme.
export default function AttachExistingTeam({
  themeId,
  themeSlug,
}: {
  themeId: string;
  themeSlug: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<UnthemedTeam[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Button is login-only.
  if (loading || !user) return null;

  const openPicker = async () => {
    setOpen(true);
    setError(null);
    setFetching(true);
    try {
      const params = new URLSearchParams({ userId: user.id, browserId: getBrowserId() });
      const res = await fetch(`/api/my-teams/unthemed?${params.toString()}`);
      const json = await res.json();
      setTeams((json.teams ?? []) as UnthemedTeam[]);
    } catch {
      setTeams([]);
    } finally {
      setFetching(false);
    }
  };

  const attach = async (teamId: string) => {
    if (submittingId) return;
    setSubmittingId(teamId);
    setError(null);
    try {
      const res = await fetch("/api/team-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, themeId, userId: user.id, browserId: getBrowserId() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Couldn't add this team. Try again.");
        setSubmittingId(null);
        return;
      }
      gtm.themeAttach({ theme_slug: themeSlug, source: "theme_page" });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't add this team. Try again.");
      setSubmittingId(null);
    }
  };

  return (
    <>
      <button
        onClick={openPicker}
        className="w-full py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 font-bold text-sm transition-colors"
      >
        + Add one of your teams
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-black text-white">Add a team to this theme</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>

            {fetching ? (
              <p className="text-sm text-zinc-500 py-8 text-center">Loading your teams…</p>
            ) : (teams && teams.length > 0) ? (
              <div className="overflow-y-auto -mx-1 px-1 space-y-2">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => attach(t.id)}
                    disabled={submittingId !== null}
                    className="w-full flex items-center gap-3 text-left p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                  >
                    <span className="font-display text-base font-black text-orange-400 w-9 text-center shrink-0">{t.overall}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{t.name}</span>
                      <span className="block text-xs text-zinc-500">{t.tier} Tier · {t.is_sandbox ? "Craft" : "Dream"}</span>
                    </span>
                    {submittingId === t.id && (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 py-8 text-center">
                No eligible teams. All your posts are already in a theme — post a new one!
              </p>
            )}

            {error && <p className="text-center text-xs text-red-400 mt-3">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
