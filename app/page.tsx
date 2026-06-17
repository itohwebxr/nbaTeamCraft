import Image from "next/image";
import { Suspense } from "react";

// Latest teams / ranking preview must refresh — regenerate at most every 60s
export const revalidate = 60;
import RankingPreview from "@/components/home/RankingPreview";
import LatestTeams from "@/components/home/LatestTeams";
import LatestBuilderTeams from "@/components/home/LatestBuilderTeams";
import TeamCraftCupTeaser from "@/components/home/TeamCraftCupTeaser";
import ModeSelector from "@/components/home/ModeSelector";
import HeaderAuth from "@/components/auth/HeaderAuth";

export default function Home() {
  return (
    <div className="court-bg text-white relative overflow-hidden">

      {/* Floating auth — top right */}
      <div className="absolute top-4 right-4 z-50">
        <HeaderAuth />
      </div>

      {/* Basketball court SVG — anchored to top of page, behind hero */}
      <div className="absolute top-0 left-0 right-0 h-screen flex items-center justify-center pointer-events-none select-none">
          <svg
            viewBox="0 0 940 500"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-w-5xl opacity-[0.13] -translate-y-[18vh] md:translate-y-0"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            {/* Court boundary */}
            <rect x="2" y="2" width="936" height="496" />
            {/* Half-court line */}
            <line x1="470" y1="2" x2="470" y2="498" />
            {/* Center circle */}
            <circle cx="470" cy="250" r="60" />
            <circle cx="470" cy="250" r="20" />
            {/* ── LEFT SIDE ── */}
            <rect x="2" y="170" width="190" height="160" />
            <circle cx="190" cy="250" r="60" />
            <circle cx="52" cy="250" r="9" strokeWidth="2" />
            <line x1="43" y1="219" x2="43" y2="281" strokeWidth="2" />
            <path d="M 52 210 A 40 40 0 0 1 52 290" />
            <line x1="2" y1="30" x2="142" y2="30" />
            <line x1="2" y1="470" x2="142" y2="470" />
            <path d="M 142 30 A 237.5 237.5 0 0 1 142 470" />
            {/* ── RIGHT SIDE ── */}
            <rect x="748" y="170" width="190" height="160" />
            <circle cx="750" cy="250" r="60" />
            <circle cx="888" cy="250" r="9" strokeWidth="2" />
            <line x1="897" y1="219" x2="897" y2="281" strokeWidth="2" />
            <path d="M 888 210 A 40 40 0 0 0 888 290" />
            <line x1="938" y1="30" x2="798" y2="30" />
            <line x1="938" y1="470" x2="798" y2="470" />
            <path d="M 798 30 A 237.5 237.5 0 0 0 798 470" />
          </svg>
        </div>

      {/* ── Hero + Section ①: Roster Builder (front door) ── */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative py-16">
        <div className="max-w-md w-full text-center space-y-7 relative z-10">

          {/* Logo */}
          <div className="fade-up fade-up-1 relative">
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none
                w-[420px] h-[280px]
                bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.35)_0%,rgba(249,115,22,0.12)_45%,transparent_70%)]
                md:w-[720px] md:h-[480px]
                md:bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.18)_0%,rgba(249,115,22,0.06)_45%,transparent_70%)]"
            />
            <Image
              src="/logo.png?v=2"
              alt="NBA TeamCraft"
              width={280}
              height={94}
              className="relative mx-auto object-contain w-40 md:w-[280px] drop-shadow-[0_0_48px_rgba(249,115,22,0.45)] drop-shadow-[0_0_96px_rgba(249,115,22,0.2)]"
            />
            <p className="mt-4 text-zinc-300 text-base leading-relaxed font-display tracking-wide">
              Build any NBA roster.<br />
              <span className="text-orange-400 font-bold">Settle the debate.</span>
            </p>
          </div>

          {/* Roster Builder CTA */}
          <div className="fade-up fade-up-2 space-y-2.5">
            <ModeSelector variant="builder" />

            {/* Match Simulator — sits directly under the Roster Builder button */}
            <a
              href="/matchup"
              className="group w-full block bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 hover:border-orange-500/60 rounded-2xl p-5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl shrink-0">⚔️</span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-display text-sm font-black text-white">Match Simulator</p>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                    Pit any two lineups against each other — single game or 4-win series.
                  </p>
                </div>
                <span className="font-display text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
              </div>
            </a>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Test any trade or FA rumor — build the roster &amp; see how strong it is
            </p>
          </div>

          {/* Latest Builds — visible proof of the trade-scenario loop */}
          <Suspense fallback={null}>
            <LatestBuilderTeams />
          </Suspense>

          <p className="fade-up fade-up-4 text-xs text-zinc-600 font-display tracking-widest">
            DATA: NBA SEASONS 2001–2026
          </p>
        </div>
      </div>

      {/* ── Section ②: Dream Draft × Cup (depth / retention) ── */}
      <div className="relative z-10 flex flex-col items-center px-4 py-10 gap-8">

        {/* Section divider */}
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap">
            Dream Draft × Cup
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* How to Play — explains the Dream Draft → Cup loop */}
        <div className="w-full max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 text-left backdrop-blur-sm">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.2em] mb-4">How to Play</p>
          <div className="flex items-start gap-0">
            {[
              { step: "Draft", icon: "🏀", desc: "Pick 6 players from any historic NBA roster within a 17-pt budget" },
              { step: "Battle", icon: "⚔️", desc: "Play exhibition matches or enter the weekly Cup — quarter scores & full box score" },
              { step: "Climb", icon: "🏆", desc: "Earn your spot on the leaderboard. 7 matches over 7 days decides the champion" },
            ].map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center px-2">
                <span className="text-2xl mb-2">{item.icon}</span>
                <p className="font-display font-black text-white text-sm mb-1">{item.step}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800">
            <div className="flex-1 h-px bg-orange-500/30 rounded" />
            <span className="text-xs text-zinc-600 font-display tracking-widest">DRAFT → BATTLE → CLIMB</span>
            <div className="flex-1 h-px bg-orange-500/30 rounded" />
          </div>
        </div>

        {/* Dream Draft CTA */}
        <div className="w-full max-w-md mx-auto">
          <ModeSelector variant="draft" />
        </div>

        {/* TeamCraft Cup — this week's standings */}
        <TeamCraftCupTeaser />

        {/* Overall Ranking */}
        <Suspense fallback={null}>
          <RankingPreview />
        </Suspense>

        {/* Latest Dream Draft Teams */}
        <Suspense fallback={null}>
          <LatestTeams />
        </Suspense>

      </div>
    </div>
  );
}
