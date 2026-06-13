import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { overallColor } from "@/lib/overallColor";
import { PublicTeam, STARTER_SLOTS } from "@/types";
import { currentCupWeek } from "@/lib/cupWeek";
import LikeButton from "@/components/common/LikeButton";
import RadarChart from "@/components/result/RadarChart";
import HeaderAuth from "@/components/auth/HeaderAuth";

export const dynamic = "force-dynamic";

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

type CupRecord = { wins: number; losses: number; pointDiff: number; cupWeek: string } | null;

async function getCupRecord(teamId: string): Promise<CupRecord> {
  try {
    const supabase = createServerClient();
    const cupWeek = currentCupWeek();
    const { data, error } = await supabase
      .from("cup_entries")
      .select("wins, losses, points_for, points_against, cup_week")
      .eq("public_team_id", teamId)
      .eq("cup_week", cupWeek)
      .neq("browser_id", "__legend__")
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return {
      wins: data.wins,
      losses: data.losses,
      pointDiff: data.points_for - data.points_against,
      cupWeek: data.cup_week,
    };
  } catch {
    return null;
  }
}

async function getTeam(id: string): Promise<PublicTeam | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("public_teams")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as PublicTeam;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return { title: "NBA TeamCraft" };

  const title = `${team.name} | NBA TeamCraft`;
  const description = `Overall: ${team.overall} (${team.tier} Tier) — NBA TeamCraft`;

  // Reuse share OGP image if share_id exists
  const siteUrl = await getSiteUrl();
  const ogImageUrl = `${siteUrl}/api/og?name=${encodeURIComponent(team.name)}&overall=${team.overall}&tier=${team.tier}`;

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

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400",
  A: "text-orange-400",
  B: "text-sky-400",
  C: "text-zinc-400",
  D: "text-zinc-500",
};

const STAT_LABELS = [
  { key: "overall",    label: "Overall"    },
  { key: "offense",    label: "Offense"    },
  { key: "defense",    label: "Defense"    },
  { key: "rebound",    label: "Rebound"    },
  { key: "playmaking", label: "Playmaking" },
] as const;

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [team, cupRecord] = await Promise.all([getTeam(id), getCupRecord(id)]);
  if (!team) notFound();

  const starters = STARTER_SLOTS.map((slot) =>
    team.roster_json.find((e) => e.slot === slot)
  );
  const bench = team.roster_json.filter((e) => e.slot === "BENCH1");

  const tierColor = TIER_COLORS[team.tier] ?? "text-zinc-400";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/ranking" className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">
              ← Rankings
            </Link>
            <HeaderAuth />
          </div>
        </div>
      </header>

      <div className="fade-up fade-up-1 max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Hero */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs font-bold text-zinc-500 tracking-[0.2em] mb-1">TEAM</p>
              <h1 className="font-display text-2xl font-black text-white leading-tight truncate">{team.name}</h1>
              <p className={`font-display text-5xl font-black leading-none mt-3 ${overallColor(team.overall)}`}>
                {team.overall}
              </p>
              <p className={`font-display text-sm font-bold mt-1 ${tierColor}`}>{team.tier} Tier</p>
            </div>
            <div className="shrink-0">
              <RadarChart
                offense={team.offense}
                defense={team.defense}
                rebound={team.rebound}
                playmaking={team.playmaking}
                size={120}
              />
            </div>
          </div>

          {/* Stat bars */}
          <div className="mt-5 space-y-2.5">
            {STAT_LABELS.map(({ key, label }) => {
              const value = team[key as keyof PublicTeam] as number;
              const color =
                value >= 88 ? "bg-yellow-400" :
                value >= 76 ? "bg-emerald-400" :
                value >= 65 ? "bg-sky-400" :
                "bg-zinc-500";
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="font-display text-xs font-bold text-zinc-400 tracking-widest w-20 shrink-0">
                    {label.toUpperCase()}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`bar-grow h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
                  </div>
                  <span className="font-display text-sm font-black text-white w-8 text-right">{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cup Record */}
        {cupRecord && (
          <div className="bg-zinc-900 border border-amber-700/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">🏆 TeamCraft Cup · {cupRecord.cupWeek}</p>
              <a href="/cup" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Standings →</a>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="font-display text-3xl font-black text-white">{cupRecord.wins}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">W</p>
              </div>
              <div className="text-zinc-600 text-xl font-thin">—</div>
              <div className="text-center">
                <p className="font-display text-3xl font-black text-zinc-400">{cupRecord.losses}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">L</p>
              </div>
              <div className="ml-auto text-right">
                <p className={`font-display text-xl font-black ${cupRecord.pointDiff > 0 ? "text-orange-400" : cupRecord.pointDiff < 0 ? "text-zinc-500" : "text-zinc-600"}`}>
                  {cupRecord.pointDiff > 0 ? "+" : ""}{cupRecord.pointDiff}
                </p>
                <p className="text-xs text-zinc-500">Pt Diff</p>
              </div>
            </div>
          </div>
        )}

        {/* Roster */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Roster</h2>

          <p className="text-xs text-zinc-600 mb-2">STARTERS</p>
          <div className="space-y-2 mb-4">
            {starters.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-400 w-8 shrink-0">
                  {STARTER_SLOTS[i]}
                </span>
                {entry ? (
                  <>
                    <span className="text-sm font-semibold text-white flex-1 truncate">{entry.name}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{entry.season}</span>
                    <span className={`font-display text-xs font-black w-6 text-right shrink-0 ${overallColor(entry.overall)}`}>
                      {entry.overall}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-700 flex-1">—</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600 mb-2">6TH MAN</p>
          <div className="space-y-2">
            {bench.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 w-8 shrink-0">BN</span>
                <span className="text-xs text-zinc-400 mr-1 shrink-0">{entry.assignedPosition}</span>
                <span className="text-sm font-semibold text-white flex-1 truncate">{entry.name}</span>
                <span className="text-xs text-zinc-500 shrink-0">{entry.season}</span>
                <span className={`font-display text-xs font-black w-6 text-right shrink-0 ${overallColor(entry.overall)}`}>
                  {entry.overall}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LikeButton teamId={team.id} initialCount={team.like_count} />
          <Link
            href="/draft"
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm text-center transition-colors"
          >
            Build Your Own Team →
          </Link>
        </div>
      </div>
    </div>
  );
}
