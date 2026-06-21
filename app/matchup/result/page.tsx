import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import HeaderAuth from "@/components/auth/HeaderAuth";
import WhatsNext from "@/components/common/WhatsNext";
import StickyCtaBar from "@/components/common/StickyCtaBar";
import MatchupResultView from "@/components/sim/result/MatchupResultView";
import InlineTriviaNudge from "@/components/common/InlineTriviaNudge";
import { parseMatchupSearchParams } from "@/lib/matchupResult";

export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { home, away, hs, as, kind, homeWon, games } = parseMatchupSearchParams(sp);
  const siteUrl = await getSiteUrl();

  const winner = homeWon ? home : away;
  const title = `${home} ${hs}–${as} ${away} | NBA TeamCraft`;
  const description =
    kind === "series"
      ? `${winner} takes the series ${hs}–${as} — simulated on NBA TeamCraft`
      : `${winner} wins ${hs}–${as} — simulated on NBA TeamCraft`;

  const qs = new URLSearchParams({ mode: "matchup", home, away, hs, as, kind });
  if (games.length > 0) {
    qs.set("games", games.map((g) => `${g.h}-${g.a}`).join(","));
    if (games.some((g) => g.top)) {
      qs.set(
        "tops",
        games
          .map((g) => (g.top ? `${g.top.hName}~${g.top.hPts}~${g.top.aName}~${g.top.aPts}` : "~~~"))
          .join(",")
      );
    }
  }
  const ogImageUrl = `${siteUrl}/api/og?${qs.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function MatchupResultPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { home, away, hs, as, kind, homeWon, games } = parseMatchupSearchParams(sp);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <HeaderAuth />
        </div>
      </header>

      <div className="fade-up max-w-lg mx-auto px-4 py-8 space-y-6">
        <MatchupResultView result={{ home, away, hs, as, kind, homeWon, games }} />

        {/* Experiment ① (variant B): in-context trivia nudge */}
        <InlineTriviaNudge pageType="sim" />

        {/* CTA into the simulator */}
        <Link
          href="/matchup"
          className="block w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-display font-black text-base uppercase tracking-widest text-center transition-colors"
        >
          ⚔️ Simulate Your Own
        </Link>

        {/* What's next — cross-sell into craft & trivia */}
        <WhatsNext pageType="sim" />

        <Link
          href="/"
          className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to NBA TeamCraft
        </Link>
      </div>

      <StickyCtaBar pageType="sim" />
    </div>
  );
}
