import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import RankingPreview from "@/components/home/RankingPreview";
import LatestTeams from "@/components/home/LatestTeams";
import TeamCraftCupTeaser from "@/components/home/TeamCraftCupTeaser";

export default function Home() {
  return (
    <div className="bg-zinc-950 text-white">

      {/* ── Hero (court-bg: single viewport, original design) ── */}
      <div className="min-h-screen court-bg text-white flex flex-col items-center justify-center px-4 overflow-hidden relative">

        {/* Basketball court SVG — NBA full court, landscape */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <svg
            viewBox="0 0 940 500"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-w-5xl opacity-[0.13]"
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

        <div className="max-w-md w-full text-center space-y-8 relative z-10">

          {/* Logo */}
          <div className="fade-up fade-up-1">
            <Image
              src="/logo.png"
              alt="NBA TeamCraft"
              width={280}
              height={94}
              className="mx-auto object-contain w-40 md:w-[280px] drop-shadow-[0_0_48px_rgba(249,115,22,0.45)] drop-shadow-[0_0_96px_rgba(249,115,22,0.2)]"
            />
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed font-display tracking-wide">
              Draft 6 players from historic NBA rosters.<br />
              Build the greatest team ever assembled.
            </p>
          </div>

          {/* Rules */}
          <div className="fade-up fade-up-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 text-left space-y-3 backdrop-blur-sm">
            <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.2em]">How to Play</p>
            <ul className="space-y-2.5 text-sm text-zinc-300">
              {[
                "Random historical NBA teams appear one by one",
                "Draft players to fill 5 starter slots (PG/SG/SF/PF/C) + 1 bench",
                <>Budget: <span className="font-bold text-white font-display text-base">17 pts</span> — star players cost more</>,
                "Get your team rated and enter the rankings",
              ].map((text, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="font-display text-orange-400 font-bold text-base leading-tight shrink-0 w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="fade-up fade-up-3">
            <Link
              href="/draft"
              className="pulse-glow block w-full py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400
                text-white font-display font-black text-2xl tracking-widest uppercase transition-all
                hover:from-orange-400 hover:to-amber-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Drafting →
            </Link>
          </div>

          <p className="fade-up fade-up-4 text-xs text-zinc-600 font-display tracking-widest">
            DATA: NBA SEASONS 2001–2026
          </p>
        </div>
      </div>

      {/* ── Sections below hero (bg-zinc-950 base) ── */}
      <div className="bg-zinc-950 flex flex-col items-center px-4 py-10 gap-10">

        {/* Ranking Preview */}
        <Suspense fallback={null}>
          <RankingPreview />
        </Suspense>

        {/* Latest Teams */}
        <Suspense fallback={null}>
          <LatestTeams />
        </Suspense>

        {/* TeamCraft Cup Teaser */}
        <TeamCraftCupTeaser />

      </div>
    </div>
  );
}
