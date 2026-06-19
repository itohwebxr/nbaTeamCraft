"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";
import ModeSelector from "@/components/home/ModeSelector";

type Tab = "builder" | "draft" | "trivia";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "builder", label: "Craft a Team", emoji: "🏗️" },
  { key: "draft",   label: "Dream Draft",  emoji: "🏀" },
  { key: "trivia",  label: "Trivia",       emoji: "🧠" },
];

export default function HomeTabs({
  builderFeed,
  dreamFeed,
}: {
  builderFeed: React.ReactNode;
  dreamFeed: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("builder");
  const router = useRouter();
  const { reset, setMode, sandboxConfig } = useDraftStore();

  const startSandbox = () => {
    reset();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: sandboxConfig.teamFilter, season_filter: sandboxConfig.seasonFilter });
    router.push("/draft");
  };

  return (
    <div className="fade-up fade-up-2 space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-1.5">
        {TABS.map(({ key, label, emoji }) => (
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

      {/* Craft a Team */}
      {activeTab === "builder" && (
        <div className="space-y-4">
          <div className="space-y-1 text-left">
            <p className="text-zinc-300 text-sm leading-relaxed">
              Any trade, any rumor, any dream line-up —<br />
              <span className="text-orange-400 font-bold">craft the roster &amp; see how strong it is.</span>
            </p>
          </div>

          <button
            onClick={startSandbox}
            className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600
              text-white font-black text-lg tracking-tight transition-colors"
          >
            🏗️ Craft a Team →
          </button>

          {/* Simulators */}
          <div className="grid grid-cols-3 gap-2">
            <a href="/matchup" className="group block bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 hover:border-orange-500/60 rounded-2xl p-3 transition-colors">
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-2xl">⚔️</span>
                <p className="font-display text-[13px] font-black text-white leading-tight">Match Simulator</p>
                <p className="text-[10px] text-zinc-400 leading-snug">1v1 · game or series</p>
              </div>
            </a>
            <a href="/playoffs" className="group block bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-900 border border-yellow-500/20 hover:border-yellow-500/40 rounded-2xl p-3 transition-colors">
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-2xl">🏆</span>
                <p className="font-display text-[13px] font-black text-white leading-tight">Playoff Simulator</p>
                <p className="text-[10px] text-zinc-400 leading-snug">4/8/16 · full bracket</p>
              </div>
            </a>
            <a href="/season" className="group block bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-900 border border-sky-500/20 hover:border-sky-500/40 rounded-2xl p-3 transition-colors">
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-2xl">📅</span>
                <p className="font-display text-[13px] font-black text-white leading-tight">Season Simulator</p>
                <p className="text-[10px] text-zinc-400 leading-snug">82 games · W-L record</p>
              </div>
            </a>
          </div>

          {builderFeed}
        </div>
      )}

      {/* Dream Draft */}
      {activeTab === "draft" && (
        <div className="space-y-4">
          <div className="space-y-1 text-left">
            <p className="text-zinc-300 text-sm leading-relaxed">
              17-point budget · players from every era —<br />
              <span className="text-orange-400 font-bold">build your all-time dream squad.</span>
            </p>
          </div>

          <ModeSelector variant="draft" />

          {dreamFeed}
        </div>
      )}

      {/* Trivia Challenge */}
      {activeTab === "trivia" && (
        <div className="space-y-4">
          <div className="space-y-1 text-left">
            <p className="text-zinc-300 text-sm leading-relaxed">
              Stats, trades, and career paths —<br />
              <span className="text-orange-400 font-bold">how deep is your NBA knowledge?</span>
            </p>
          </div>

          <Link
            href="/trivia"
            className="block w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700
              text-white font-black text-lg tracking-tight transition-colors text-center"
          >
            🧠 Start Trivia Challenge →
          </Link>

          {/* Teaser cards */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 text-left">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sample Questions</p>
            {[
              { q: "Who led the 2005-06 LAL in scoring?", hint: "Stats · Normal" },
              { q: "Which player's career path included LAL → MIA → CLE?", hint: "Career · Normal" },
              { q: "Who led the 2003-04 DET in scoring?", hint: "Stats · Hard" },
            ].map((item, i) => (
              <div key={i} className="border-t border-zinc-800 pt-3 first:border-0 first:pt-0">
                <p className="text-sm text-white font-medium leading-snug">{item.q}</p>
                <p className="text-xs text-zinc-600 mt-1">{item.hint}</p>
              </div>
            ))}
            <Link
              href="/trivia"
              className="block w-full py-2.5 rounded-xl border border-sky-600/50 text-sky-400 hover:bg-sky-600/10 font-bold text-sm text-center transition-colors"
            >
              Answer These →
            </Link>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-600 font-display tracking-widest">
        DATA: NBA SEASONS 2001–2026
      </p>
    </div>
  );
}
