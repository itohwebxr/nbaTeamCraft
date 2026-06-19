"use client";

import { useState } from "react";
import Link from "next/link";
import { overallColor } from "@/lib/overallColor";

type Team = {
  id: string;
  name: string;
  overall: number;
  tier: string;
  like_count: number;
  is_sandbox: boolean;
};

type MainTab = "craft" | "simulate" | "trivia";
type CraftTab = "crafted" | "dream";

const MAIN_TABS: { key: MainTab; label: string; emoji: string }[] = [
  { key: "craft",    label: "Craft",    emoji: "🏗️" },
  { key: "simulate", label: "Simulate", emoji: "⚔️" },
  { key: "trivia",   label: "Trivia",   emoji: "🧠" },
];

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400", A: "text-orange-400", B: "text-sky-400",
  C: "text-zinc-400", D: "text-zinc-500",
};

export default function UserProfileTabs({ teams }: { teams: Team[] }) {
  const [mainTab, setMainTab] = useState<MainTab>("craft");
  const [craftTab, setCraftTab] = useState<CraftTab>("crafted");

  const sandboxTeams = teams.filter((t) => t.is_sandbox);
  const dreamTeams = teams.filter((t) => !t.is_sandbox);

  return (
    <div className="space-y-3">
      {/* Main tabs */}
      <div className="flex gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-1.5">
        {MAIN_TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-colors ${
              mainTab === key ? "bg-orange-500 text-white" : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* ── Craft tab ── */}
      {mainTab === "craft" && (
        <div className="space-y-3">
          {/* Craft / Dream sub-tabs */}
          <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setCraftTab("crafted")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                craftTab === "crafted" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🏗️ Crafted Teams
              {sandboxTeams.length > 0 && (
                <span className="ml-1 text-[10px] bg-zinc-600 text-zinc-300 rounded-full px-1.5 py-0.5">
                  {sandboxTeams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCraftTab("dream")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                craftTab === "dream" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🏀 Dream Teams
              {dreamTeams.length > 0 && (
                <span className="ml-1 text-[10px] bg-zinc-600 text-zinc-300 rounded-full px-1.5 py-0.5">
                  {dreamTeams.length}
                </span>
              )}
            </button>
          </div>

          {/* Crafted Teams */}
          {craftTab === "crafted" && (
            sandboxTeams.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm bg-zinc-900 border border-zinc-800 rounded-2xl">
                No crafted teams yet.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {sandboxTeams.map((t) => (
                  <Link
                    key={t.id}
                    href={`/team/${t.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors"
                  >
                    <span className={`font-display text-xl font-black w-9 text-right shrink-0 ${overallColor(t.overall)}`}>
                      {t.overall}
                    </span>
                    <span className={`font-display text-xs font-bold w-4 shrink-0 ${TIER_COLORS[t.tier] ?? "text-zinc-500"}`}>
                      {t.tier}
                    </span>
                    <span className="flex-1 text-sm font-bold text-white truncate">{t.name}</span>
                    <span className="text-xs text-zinc-500">❤️ {t.like_count}</span>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* Dream Teams */}
          {craftTab === "dream" && (
            dreamTeams.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm bg-zinc-900 border border-zinc-800 rounded-2xl">
                No Dream Teams yet.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {dreamTeams.map((t) => (
                  <Link
                    key={t.id}
                    href={`/team/${t.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors"
                  >
                    <span className={`font-display text-xl font-black w-9 text-right shrink-0 ${overallColor(t.overall)}`}>
                      {t.overall}
                    </span>
                    <span className={`font-display text-xs font-bold w-4 shrink-0 ${TIER_COLORS[t.tier] ?? "text-zinc-500"}`}>
                      {t.tier}
                    </span>
                    <span className="flex-1 text-sm font-bold text-white truncate">{t.name}</span>
                    <span className="text-xs text-zinc-500">❤️ {t.like_count}</span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Simulate tab ── */}
      {mainTab === "simulate" && (
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

      {/* ── Trivia tab ── */}
      {mainTab === "trivia" && (
        <div className="text-center py-10 px-4 space-y-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-2xl">🧠</p>
          <p className="text-sm text-zinc-400">Test your NBA knowledge!</p>
          <a
            href="/trivia"
            className="inline-flex px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-colors"
          >
            Play Trivia →
          </a>
        </div>
      )}
    </div>
  );
}
