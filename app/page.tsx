import Image from "next/image";
import { Suspense } from "react";

export const revalidate = 60;
import LatestTeams from "@/components/home/LatestTeams";
import LatestBuilderTeams from "@/components/home/LatestBuilderTeams";
import RankingPreview from "@/components/home/RankingPreview";
import HomeTabs from "@/components/home/HomeTabs";
import HeaderAuth from "@/components/auth/HeaderAuth";

export default function Home() {
  return (
    <div className="court-bg text-white relative overflow-hidden">

      {/* Floating auth — top right */}
      <div className="absolute top-4 right-4 z-50">
        <HeaderAuth />
      </div>

      {/* Basketball court SVG */}
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
          <rect x="2" y="2" width="936" height="496" />
          <line x1="470" y1="2" x2="470" y2="498" />
          <circle cx="470" cy="250" r="60" />
          <circle cx="470" cy="250" r="20" />
          <rect x="2" y="170" width="190" height="160" />
          <circle cx="190" cy="250" r="60" />
          <circle cx="52" cy="250" r="9" strokeWidth="2" />
          <line x1="43" y1="219" x2="43" y2="281" strokeWidth="2" />
          <path d="M 52 210 A 40 40 0 0 1 52 290" />
          <line x1="2" y1="30" x2="142" y2="30" />
          <line x1="2" y1="470" x2="142" y2="470" />
          <path d="M 142 30 A 237.5 237.5 0 0 1 142 470" />
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

      {/* Hero */}
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

          {/* Tabbed mode selector */}
          <HomeTabs
            builderFeed={
              <Suspense fallback={null}>
                <LatestBuilderTeams />
              </Suspense>
            }
            dreamFeed={
              <Suspense fallback={null}>
                <LatestTeams />
              </Suspense>
            }
            dreamRanking={
              <Suspense fallback={null}>
                <RankingPreview />
              </Suspense>
            }
          />

        </div>
      </div>
    </div>
  );
}
