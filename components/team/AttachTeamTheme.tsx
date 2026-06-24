"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getBrowserId } from "@/lib/browserId";
import { gtm } from "@/lib/gtm";
import type { Theme } from "@/lib/themes";
import ThemePicker from "@/components/themes/ThemePicker";

// Team detail page: lets the team's owner attach it to a theme, but only while
// the team is not yet entered into one.
export default function AttachTeamTheme({
  teamId,
  teamUserId,
  teamBrowserId,
  hasTheme,
}: {
  teamId: string;
  teamUserId: string | null;
  teamBrowserId: string | null;
  hasTheme: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [browserId, setBrowserId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBrowserId(getBrowserId());
  }, []);

  if (hasTheme || loading) return null;

  const ownerByUser = !!user?.id && user.id === teamUserId;
  const ownerByBrowser = !!browserId && browserId === teamBrowserId;
  if (!ownerByUser && !ownerByBrowser) return null;

  const attach = async () => {
    if (!theme || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          themeId: theme.id,
          userId: user?.id ?? null,
          browserId,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Couldn't add to theme. Try again.");
        setSubmitting(false);
        return;
      }
      gtm.themeAttach({ theme_slug: theme.slug, source: "team_page" });
      router.refresh();
    } catch {
      setError("Couldn't add to theme. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-4 space-y-3">
      <div>
        <p className="font-display text-xs font-bold text-violet-300 tracking-[0.2em] mb-1">🏷️ ADD TO A THEME</p>
        <p className="text-xs text-zinc-500">Enter this team into a theme to get it in front of more people.</p>
      </div>
      <ThemePicker value={theme} onChange={setTheme} />
      <button
        onClick={attach}
        disabled={!theme || submitting}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Adding…
          </>
        ) : (
          "Add to theme"
        )}
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
