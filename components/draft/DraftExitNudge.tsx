"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFeaturedTheme } from "@/hooks/useFeaturedTheme";
import { gtm } from "@/lib/gtm";

// Recovery toast for a drafter who is stalling or leaving with an incomplete
// roster. Keeps completion the hero ("⚡ Finish & see results" via auto-fill)
// while giving droppers an exit ramp to today's theme. Non-modal, shows once
// per session, triggered by idle (mobile-friendly) or exit-intent (desktop).
export default function DraftExitNudge({
  rosterSize,
  totalSlots,
  canAutofill,
  onAutofill,
  autofilling,
}: {
  rosterSize: number;
  totalSlots: number;
  canAutofill: boolean;
  onAutofill: () => void;
  autofilling: boolean;
}) {
  const featured = useFeaturedTheme();
  const theme = featured?.main ?? null;
  const [visible, setVisible] = useState(false);
  const shownOnce = useRef(false);

  const eligible = rosterSize >= 1 && rosterSize < totalSlots;

  useEffect(() => {
    if (!eligible || shownOnce.current) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    const trigger = () => {
      if (shownOnce.current) return;
      shownOnce.current = true;
      setVisible(true);
      gtm.draftExitNudge({ action: "shown" });
    };
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(trigger, 40_000);
    };
    const onMouseOut = (e: MouseEvent) => {
      // Cursor leaving toward the top of the viewport ~ intent to leave.
      if (e.clientY <= 0) trigger();
    };

    resetIdle();
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("touchstart", resetIdle);
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [eligible]);

  // Roster completed or cleared — get out of the way.
  if (!visible || !eligible) return null;

  const dismiss = () => {
    setVisible(false);
    gtm.draftExitNudge({ action: "dismiss" });
  };
  const autofill = () => {
    gtm.draftExitNudge({ action: "autofill" });
    onAutofill();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl shadow-black/50 p-3">
        <div className="flex items-start gap-2">
          <p className="text-sm text-zinc-100 font-bold flex-1">Don&apos;t lose your build</p>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-zinc-500 hover:text-white text-lg leading-none -mt-1 shrink-0"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-2.5">Finish in one tap, or check out today&apos;s theme.</p>
        <div className="flex gap-2">
          {canAutofill && (
            <button
              onClick={autofill}
              disabled={autofilling}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-sm transition-colors"
            >
              {autofilling ? "Building…" : "⚡ Finish & see results"}
            </button>
          )}
          {theme && (
            <Link
              href={`/theme/${theme.slug}`}
              onClick={() => gtm.draftExitNudge({ action: "theme" })}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm text-center transition-colors"
            >
              Today&apos;s theme →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
