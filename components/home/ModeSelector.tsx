"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";

export default function ModeSelector() {
  const router = useRouter();
  const { setMode, reset, sandboxConfig } = useDraftStore();

  const startDraft = () => {
    reset();
    setMode("draft");
    router.push("/draft");
  };

  const startSandbox = () => {
    reset();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: sandboxConfig.teamFilter, season_filter: sandboxConfig.seasonFilter });
    router.push("/draft");
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startSandbox}
        className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
          text-white font-black text-lg tracking-tight transition-colors"
      >
        🔧 Roster Builder →
      </button>
      <p className="text-xs text-zinc-500 -mt-1">
        Test any trade or FA rumor — build the roster &amp; see how strong it is
      </p>
      <button
        onClick={startDraft}
        className="block w-full py-3 rounded-2xl border border-zinc-700 hover:border-zinc-500
          bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm transition-colors"
      >
        🏀 Dream Draft — pick 6 in a 17-pt budget &amp; enter the Cup
      </button>
    </div>
  );
}
