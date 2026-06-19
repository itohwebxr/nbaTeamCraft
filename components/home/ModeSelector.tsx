"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";

// Single CTA button. `variant` selects which mode it launches so the two
// home sections (Roster Builder / Dream Draft) can place them independently.
export default function ModeSelector({ variant }: { variant: "builder" | "draft" }) {
  const router = useRouter();
  const { setMode, reset, sandboxConfig } = useDraftStore();

  const startDraft = () => {
    reset();
    setMode("draft");
    gtm.dreamDraftStart();
    router.push("/draft");
  };

  const startSandbox = () => {
    reset();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: sandboxConfig.teamFilter, season_filter: sandboxConfig.seasonFilter });
    router.push("/draft");
  };

  if (variant === "builder") {
    return (
      <button
        onClick={startSandbox}
        className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
          text-white font-black text-lg tracking-tight transition-colors"
      >
        🏗️ Craft a Team →
      </button>
    );
  }

  return (
    <button
      onClick={startDraft}
      className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
        text-white font-black text-lg tracking-tight transition-colors"
    >
      🏀 Start Dream Draft →
    </button>
  );
}
