import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import HeaderAuth from "@/components/auth/HeaderAuth";

export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

function one(v: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(v)) return v[0] ?? fallback;
  return v ?? fallback;
}

// Reads the matchup result encoded in the query string. The result itself is
// ephemeral (not persisted), so the shareable summary lives in the URL.
function parse(sp: SP) {
  const home = one(sp.home, "Home");
  const away = one(sp.away, "Away");
  const hs = one(sp.hs, "0");
  const as = one(sp.as, "0");
  const kind = one(sp.kind) === "series" ? "series" : "single";
  const homeWon = parseInt(hs, 10) >= parseInt(as, 10);
  return { home, away, hs, as, kind, homeWon };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { home, away, hs, as, kind, homeWon } = parse(sp);
  const siteUrl = await getSiteUrl();

  const winner = homeWon ? home : away;
  const title = `${home} ${hs}–${as} ${away} | NBA TeamCraft`;
  const description =
    kind === "series"
      ? `${winner} takes the series ${hs}–${as} — simulated on NBA TeamCraft`
      : `${winner} wins ${hs}–${as} — simulated on NBA TeamCraft`;

  const qs = new URLSearchParams({ mode: "matchup", home, away, hs, as, kind });
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
  const { home, away, hs, as, kind, homeWon } = parse(sp);
  const winner = homeWon ? home : away;

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
        <p className="text-center font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em]">
          {kind === "series" ? "Series · Best of 7" : "Match Simulator"}
        </p>

        {/* Scoreboard */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 text-center">
              <p className={`text-sm font-bold truncate ${homeWon ? "text-white" : "text-zinc-500"}`}>{home}</p>
              <p className={`font-display text-6xl font-black mt-1 ${homeWon ? "text-orange-400" : "text-zinc-600"}`}>{hs}</p>
            </div>
            <span className="font-display text-2xl font-black text-zinc-600 shrink-0">VS</span>
            <div className="flex-1 min-w-0 text-center">
              <p className={`text-sm font-bold truncate ${!homeWon ? "text-white" : "text-zinc-500"}`}>{away}</p>
              <p className={`font-display text-6xl font-black mt-1 ${!homeWon ? "text-orange-400" : "text-zinc-600"}`}>{as}</p>
            </div>
          </div>
          <p className="text-center text-sm text-zinc-400 mt-5 pt-4 border-t border-zinc-800">
            🏆 <span className="text-white font-bold">{winner}</span>{" "}
            {kind === "series" ? "takes the series" : "wins"}
          </p>
        </div>

        {/* CTA into the simulator */}
        <Link
          href="/matchup"
          className="block w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-display font-black text-base uppercase tracking-widest text-center transition-colors"
        >
          ⚔️ Simulate Your Own
        </Link>
        <Link
          href="/"
          className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to NBA TeamCraft
        </Link>
      </div>
    </div>
  );
}
