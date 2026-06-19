"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";
import dynamic from "next/dynamic";

const TriviaClient = dynamic(() => import("@/app/trivia/TriviaClient"), { ssr: false });

type MainTab = "craft" | "simulate" | "trivia";
type FeedTab = "crafted" | "dream";

export default function HomeTabs({
  builderFeed,
  dreamFeed,
}: {
  builderFeed: React.ReactNode;
  dreamFeed: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<MainTab>("craft");
  const [feedTab, setFeedTab] = useState<FeedTab>("crafted");
  const router = useRouter();
  const { reset, setMode, sandboxConfig } = useDraftStore();

  const startSandbox = () => {
    reset();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: sandboxConfig.teamFilter, season_filter: sandboxConfig.seasonFilter });
    router.push("/draft");
  };

  const startDraft = () => {
    reset();
    setMode("draft");
    gtm.dreamDraftStart();
    router.push("/draft");
  };

  const MAIN_TABS: { key: MainTab; label: string; emoji: string }[] = [
    { key: "craft",    label: "Craft",    emoji: "🏗️" },
    { key: "simulate", label: "Simulate", emoji: "⚔️" },
    { key: "trivia",   label: "Trivia",   emoji: "🧠" },
  ];

  return (
    <div className="fade-up fade-up-2 space-y-5">
      {/* Main tab switcher */}
      <div className="flex gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-1.5">
        {MAIN_TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-colors ${
              activeTab === key
                ? "bg-orange-500 text-white"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Craft a Team ── */}
      {activeTab === "craft" && (
        <div className="space-y-4">
          {/* Two CTA buttons */}
          <button
            onClick={startSandbox}
            className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
              text-white font-black text-lg tracking-tight transition-colors"
          >
            🏗️ Craft a Team →
          </button>
          <button
            onClick={startDraft}
            className="w-full py-4 rounded-2xl border border-orange-500/50 hover:border-orange-500
              bg-zinc-900/80 hover:bg-orange-500/10 text-orange-400 hover:text-orange-300
              font-black text-lg tracking-tight transition-colors"
          >
            🏀 Dream Draft →
          </button>

          {/* Feed sub-tabs */}
          <div className="space-y-3">
            <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setFeedTab("crafted")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  feedTab === "crafted"
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🔥 Crafted Teams
              </button>
              <button
                onClick={() => setFeedTab("dream")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  feedTab === "dream"
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🏀 Dream Teams
              </button>
            </div>
            <div>
              {feedTab === "crafted" ? builderFeed : dreamFeed}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Simulate ── */}
      {activeTab === "simulate" && (
        <div className="space-y-3">
          <p className="text-zinc-400 text-sm text-left leading-relaxed">
            Pick your teams and run the numbers —<br />
            <span className="text-orange-400 font-bold">see who really wins.</span>
          </p>

          <a
            href="/matchup"
            className="flex items-center gap-4 w-full py-4 px-5 rounded-2xl
              bg-gradient-to-r from-orange-500/15 to-zinc-900 border border-orange-500/30
              hover:border-orange-500/60 transition-colors group"
          >
            <span className="text-3xl">⚔️</span>
            <div className="text-left">
              <p className="font-black text-white text-base leading-tight">Match Simulator</p>
              <p className="text-xs text-zinc-400 mt-0.5">1v1 · single game or 7-game series</p>
            </div>
            <span className="ml-auto text-orange-400 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
          </a>

          <a
            href="/playoffs"
            className="flex items-center gap-4 w-full py-4 px-5 rounded-2xl
              bg-gradient-to-r from-yellow-500/10 to-zinc-900 border border-yellow-500/20
              hover:border-yellow-500/40 transition-colors group"
          >
            <span className="text-3xl">🏆</span>
            <div className="text-left">
              <p className="font-black text-white text-base leading-tight">Playoff Simulator</p>
              <p className="text-xs text-zinc-400 mt-0.5">4 / 8 / 16 teams · full bracket</p>
            </div>
            <span className="ml-auto text-yellow-400 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
          </a>

          <a
            href="/season"
            className="flex items-center gap-4 w-full py-4 px-5 rounded-2xl
              bg-gradient-to-r from-sky-500/10 to-zinc-900 border border-sky-500/20
              hover:border-sky-500/40 transition-colors group"
          >
            <span className="text-3xl">📅</span>
            <div className="text-left">
              <p className="font-black text-white text-base leading-tight">Season Simulator</p>
              <p className="text-xs text-zinc-400 mt-0.5">82-game schedule · W-L record & grade</p>
            </div>
            <span className="ml-auto text-sky-400 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      )}

      {/* ── Tab 3: Trivia ── */}
      {activeTab === "trivia" && (
        <div>
          <TriviaClient />
        </div>
      )}

      <p className="text-xs text-zinc-600 font-display tracking-widest">
        DATA: NBA SEASONS 2001–2026
      </p>
    </div>
  );
}
