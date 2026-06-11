"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";

export default function ModeSelector() {
  const router = useRouter();
  const { setMode, reset } = useDraftStore();

  const startDraft = () => {
    reset();
    setMode("draft");
    router.push("/draft");
  };

  const startSandbox = () => {
    reset();
    setMode("sandbox");
    router.push("/draft");
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startDraft}
        className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
          text-white font-black text-lg tracking-tight transition-colors"
      >
        Start Drafting →
      </button>
      <button
        onClick={startSandbox}
        className="block w-full py-3 rounded-2xl border border-zinc-700 hover:border-zinc-500
          bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm transition-colors"
      >
        🎨 Sandbox Mode — pick any team &amp; season
      </button>
    </div>
  );
}
