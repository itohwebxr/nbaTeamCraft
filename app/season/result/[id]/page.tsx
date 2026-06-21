import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { SeasonShareData } from "@/app/api/season/share/route";
import SeasonResultView from "@/components/sim/result/SeasonResultView";
import WhatsNext from "@/components/common/WhatsNext";
import StickyCtaBar from "@/components/common/StickyCtaBar";
import InlineTriviaNudge from "@/components/common/InlineTriviaNudge";

export const dynamic = "force-dynamic";

async function getShare(id: string): Promise<SeasonShareData | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("shares").select("data").eq("id", id).single();
  if (error || !data) return null;
  const d = data.data as SeasonShareData;
  return d?.kind === "season" ? d : null;
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
  const title = `🏀 ${share.team.name}: ${share.wins}-${share.losses} (${share.label}) | NBA TeamCraft`;
  const description = `${share.team.name} projects to a ${share.wins}-${share.losses} season — simulated on NBA TeamCraft`;
  const ogImageUrl = `${siteUrl}/api/og?mode=season&id=${id}`;

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

export default async function SeasonResultPage({
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

      <div className="fade-up max-w-lg mx-auto px-4 py-10 space-y-6 text-center">
        <SeasonResultView data={share} />

        {/* Experiment ① (variant B): in-context trivia nudge */}
        <InlineTriviaNudge pageType="sim" />

        <Link
          href="/season"
          className="block w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-display font-black text-base uppercase tracking-widest text-center transition-colors"
        >
          📅 Simulate Your Season
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
