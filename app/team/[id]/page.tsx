import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { overallColor } from "@/lib/overallColor";
import { PublicTeam, TeamCreator, STARTER_SLOTS } from "@/types";
import { currentCupWeek } from "@/lib/cupWeek";
import RadarChart from "@/components/result/RadarChart";
import HeaderAuth from "@/components/auth/HeaderAuth";
import CupPlayPanel from "@/components/cup/CupPlayPanel";
import TeamActions from "@/components/team/TeamActions";
import TeamComments from "@/components/team/TeamComments";
import TeamSimHistory from "@/components/team/TeamSimHistory";
import WhatsNext from "@/components/common/WhatsNext";
import RelatedFeed from "@/components/common/RelatedFeed";
import StickyCtaBar from "@/components/common/StickyCtaBar";
import ScrollToTop from "@/components/common/ScrollToTop";

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

// Resolve the creator's public profile so logged-in builders get attribution.
async function getCreator(userId: string | null | undefined): Promise<TeamCreator | null> {
  if (!userId) return null;
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("x_handle, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      xHandle: data.x_handle ?? null,
      displayName: data.display_name ?? null,
      avatarUrl: data.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

const OG_SLOT_KEY: Record<string, string> = { PG: "pg", SG: "sg", SF: "sf", PF: "pf", C: "c", BENCH1: "6th" };
const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
function formatOgName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;
  const suffix = NAME_SUFFIXES.has(parts[parts.length - 1].toLowerCase()) ? parts[parts.length - 1] : null;
  const lastName = suffix ? parts[parts.length - 2] ?? parts[0] : parts[parts.length - 1];
  return suffix ? `${parts[0][0]} ${lastName} ${suffix}` : `${parts[0][0]} ${lastName}`;
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

  // Rich OGP including the roster (mirrors the /share OGP).
  const siteUrl = await getSiteUrl();
  const qs = new URLSearchParams({
    name: team.name,
    overall: String(team.overall),
    tier: team.tier,
  });
  if (team.is_sandbox) qs.set("mode", "sandbox");
  for (const entry of team.roster_json) {
    const key = OG_SLOT_KEY[entry.slot];
    if (!key) continue;
    qs.set(key, formatOgName(entry.name));
    if (entry.season) qs.set(`${key}_s`, entry.season);
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

  const creator = await getCreator(team.user_id);

  const starters = STARTER_SLOTS.map((slot) =>
    team.roster_json.find((e) => e.slot === slot)
  );
  const bench = team.roster_json.filter((e) => e.slot === "BENCH1");

  const tierColor = TIER_COLORS[team.tier] ?? "text-zinc-400";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <ScrollToTop />
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
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

        {/* Hero + Roster — single card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">

          {/* Team name + overall + radar */}
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
          <div className="space-y-2.5">
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

          {/* Roster */}
          <div className="pt-4 border-t border-zinc-800">
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

          {/* Creator attribution + description — below roster */}
          {(creator || team.description) && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              {creator && (
                <a
                  href={creator.xHandle ? `https://x.com/${creator.xHandle}` : undefined}
                  target={creator.xHandle ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2.5 ${creator.xHandle ? "group" : "pointer-events-none"}`}
                >
                  {creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={creator.avatarUrl}
                      alt={creator.displayName ?? "Creator"}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-500 shrink-0">
                      {(creator.displayName ?? creator.xHandle ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                      {creator.displayName ?? (creator.xHandle ? `@${creator.xHandle}` : "Anonymous")}
                    </p>
                    {creator.xHandle && (
                      <p className="text-xs text-zinc-500 truncate">@{creator.xHandle}</p>
                    )}
                  </div>
                </a>
              )}
              {team.description && (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {team.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cup section hidden */}

        {/* Actions */}
        <TeamActions
          teamId={team.id}
          teamName={team.name}
          overall={team.overall}
          tier={team.tier}
          likeCount={team.like_count}
          isSandbox={!!team.is_sandbox}
          roster={team.roster_json}
        />

        {/* Simulators — pit this team against any other lineup */}
        {(() => {
          const base = `teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&teamOverall=${team.overall}&teamTier=${team.tier}${team.is_sandbox ? "&teamSandbox=1" : ""}`;
          const homeBase = `homeTeamId=${team.id}&homeName=${encodeURIComponent(team.name)}&homeOverall=${team.overall}&homeTier=${team.tier}${team.is_sandbox ? "&homeSandbox=1" : ""}`;
          return (
            <div className="grid grid-cols-3 gap-2">
              <Link
                href={`/matchup?${homeBase}`}
                className="group block bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-900 border border-orange-500/30 hover:border-orange-500/60 rounded-xl p-3 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-xl">⚔️</span>
                  <p className="font-display text-[13px] font-black text-white leading-tight">Match Simulator</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">1v1 · game or series</p>
                </div>
              </Link>
              <Link
                href={`/playoffs?${base}`}
                className="group block bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-900 border border-yellow-500/20 hover:border-yellow-500/40 rounded-xl p-3 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-xl">🏆</span>
                  <p className="font-display text-[13px] font-black text-white leading-tight">Playoff Simulator</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">4/8/16 · full bracket</p>
                </div>
              </Link>
              <Link
                href={`/season?${base}`}
                className="group block bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-900 border border-sky-500/20 hover:border-sky-500/40 rounded-xl p-3 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-xl">📅</span>
                  <p className="font-display text-[13px] font-black text-white leading-tight">Season Simulator</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">82 games · W-L record</p>
                </div>
              </Link>
            </div>
          );
        })()}

        {/* Sim history posted by team owner */}
        <TeamSimHistory teamId={team.id} />

        {/* Discussion */}
        <TeamComments teamId={team.id} />

        {/* Lateral discovery — more teams to browse */}
        <RelatedFeed variant="team" kind={team.is_sandbox ? "builder" : "dream"} excludeId={team.id} />

        {/* What's next — cross-sell into craft & trivia */}
        <WhatsNext pageType="team" />
      </div>

      <StickyCtaBar pageType="team" />
    </div>
  );
}
