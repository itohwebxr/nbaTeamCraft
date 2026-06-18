import Image from "next/image";
import { Suspense } from "react";

// Latest teams / ranking preview must refresh — regenerate at most every 60s
export const revalidate = 60;
import RankingPreview from "@/components/home/RankingPreview";
import LatestTeams from "@/components/home/LatestTeams";
import LatestBuilderTeams from "@/components/home/LatestBuilderTeams";
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

          {/* Craft a Team CTA */}
          <div className="fade-up fade-up-2 space-y-2.5">
            <ModeSelector variant="builder" />

            {/* Simulators — sit directly under the Roster Builder button */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href="/matchup"
                className="group block bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 hover:border-orange-500/60 rounded-2xl p-3 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-2xl">⚔️</span>
                  <p className="font-display text-[13px] font-black text-white leading-tight">Match Simulator</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    1v1 · game or series
                  </p>
                </div>
              </a>
              <a
                href="/playoffs"
                className="group block bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-900 border border-yellow-500/20 hover:border-yellow-500/40 rounded-2xl p-3 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-2xl">🏆</span>
                  <p className="font-display text-[13px] font-black text-white leading-tight">Playoff Simulator</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    4/8/16 · full bracket
                  </p>
                </div>
              </a>
              <a
                href="/season"
                className="group block bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-900 border border-sky-500/20 hover:border-sky-500/40 rounded-2xl p-3 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-2xl">📅</span>
                  <p className="font-display text-[13px] font-black text-white leading-tight">Season Simulator</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    82 games · W-L record
                  </p>
                </div>
              </a>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Test any trade or FA rumor — craft the roster &amp; see how strong it is
            </p>
          </div>

          {/* Latest Builds */}
          <Suspense fallback={null}>
            <LatestBuilderTeams />
          </Suspense>

          <p className="fade-up fade-up-4 text-xs text-zinc-600 font-display tracking-widest">
            DATA: NBA SEASONS 2001–2026
          </p>
        </div>
      </div>

      {/* ── Section ②: Dream Draft ── */}
      <div className="relative z-10 flex flex-col items-center px-4 py-10 gap-8">

        {/* Section divider */}
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap">
            Dream Draft
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Dream Draft CTA */}
        <div className="w-full max-w-md mx-auto">
          <ModeSelector variant="draft" />
        </div>

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
