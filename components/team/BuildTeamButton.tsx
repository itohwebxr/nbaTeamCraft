"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";

export default function BuildTeamButton({ isSandbox }: { isSandbox: boolean }) {
  const router = useRouter();
  const { setMode, reset } = useDraftStore();

  const handleBuild = () => {
    reset();
    setMode(isSandbox ? "sandbox" : "draft");
    router.push("/draft");
  };

  return (
    <button
      onClick={handleBuild}
      className="block w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm text-center transition-colors"
    >
      {isSandbox ? "🔧 Build Your Own Team →" : "🏀 Build Your Own Team →"}
    </button>
  );
}
