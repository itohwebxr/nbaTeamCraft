import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { PlayoffShareData } from "@/app/api/playoff/share/route";
import WhatsNext from "@/components/common/WhatsNext";
import StickyCtaBar from "@/components/common/StickyCtaBar";

export const dynamic = "force-dynamic";

async function getShare(id: string): Promise<PlayoffShareData | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("shares").select("data").eq("id", id).single();
  if (error || !data) return null;
  const d = data.data as PlayoffShareData;
  return d?.kind === "playoff" ? d : null;
}

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) return { title: "NBA TeamCraft" };

  const siteUrl = await getSiteUrl();
  const title = `🏆 ${share.champion.name} wins the ${share.size}-Team Playoff | NBA TeamCraft`;
  const description = `${share.champion.name} takes the ${share.size}-team bracket — simulated on NBA TeamCraft`;
  const ogImageUrl = `${siteUrl}/api/og?mode=playoff&id=${id}`;

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

export default async function PlayoffResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
        </div>
      </header>

      <div className="fade-up max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em] mb-2">
            🏆 Champion · {share.size}-Team Playoff
          </p>
          <h1 className="font-display text-3xl font-black text-white">{share.champion.name}</h1>
          <p className="text-sm text-zinc-400 mt-1">{share.champion.tier} Tier · {share.champion.overall} OVR</p>
        </div>

        {/* Champion's road to the title */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60">
          {share.path.map((p, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <span className="font-display text-[11px] font-bold text-zinc-500 w-32 shrink-0 uppercase tracking-wider">{p.round}</span>
              <span className="flex-1 text-sm font-bold text-white truncate">def. {p.opp}</span>
              <span className="font-display text-sm font-black text-orange-400 shrink-0">{p.score}</span>
            </div>
          ))}
        </div>

        <Link
          href="/playoffs"
          className="block w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-display font-black text-base uppercase tracking-widest text-center transition-colors"
        >
          🏆 Run Your Own Playoff
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
