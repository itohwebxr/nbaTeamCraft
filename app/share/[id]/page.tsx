import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type ShareData = {
  name?: string;
  overall?: string;
  tier?: string;
  mode?: string;
  sandbox_team?: string;
  sandbox_season?: string;
  pg?: string; pg_s?: string;
  sg?: string; sg_s?: string;
  sf?: string; sf_s?: string;
  pf?: string; pf_s?: string;
  c?: string;  c_s?: string;
  "6th"?: string; "6th_s"?: string;
};

async function getShareData(id: string): Promise<ShareData | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("shares")
    .select("data")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data.data as ShareData;
}

async function buildOgUrl(params: ShareData): Promise<string> {
  const siteUrl = await getSiteUrl();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, String(v));
  }
  return `${siteUrl}/api/og?${qs.toString()}`;
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
  const share = await getShareData(id);
  if (!share) return { title: "NBA TeamCraft" };

  const name = share.name || "My NBA Team";
  const overall = share.overall || "";
  const tier = share.tier || "";
  const ogImageUrl = await buildOgUrl(share);
  const title = `${name} | NBA TeamCraft`;
  const description = overall
    ? `Overall: ${overall} (${tier} Tier) — NBA TeamCraft`
    : "NBA TeamCraft";

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

const SLOT_ORDER = ["pg", "sg", "sf", "pf", "c", "6th"] as const;
const SLOT_LABEL: Record<string, string> = { "6th": "6TH" };

// Client-side redirect so bots (Twitter crawler) still receive the OGP HTML,
// while human visitors are forwarded to the top page.
function ClientRedirect() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.replace("/");`,
      }}
    />
  );
}

export default async function ShareIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getShareData(id);
  if (!share) notFound();

  const name = share.name || "My NBA Team";
  const overall = share.overall || "";
  const tier = share.tier || "";
  const isSandbox = share.mode === "sandbox";

  const players = SLOT_ORDER.map((key) => ({
    slot: SLOT_LABEL[key] ?? key.toUpperCase(),
    name: (share as Record<string, string | undefined>)[key] || "",
    season: (share as Record<string, string | undefined>)[`${key}_s`] || "",
  })).filter((e) => e.name);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
      <ClientRedirect />
      <header className="mb-8">
        <Image src="/logo.png" alt="NBA TeamCraft" height={40} width={75} className="object-contain" />
      </header>

      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        {isSandbox && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-orange-400 uppercase tracking-widest">🎨 Sandbox Mode</span>
            {(share.sandbox_team || share.sandbox_season) && (
              <span className="text-xs text-zinc-500">
                {share.sandbox_team ?? "Any team"}{" · "}{share.sandbox_season ?? "Any season"}
              </span>
            )}
          </div>
        )}
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Team</p>
          <h1 className="text-xl font-black text-white truncate">{name}</h1>
        </div>

        {overall && (
          <div className="flex items-center gap-3">
            <span className="text-5xl font-black text-white">{overall}</span>
            <span className="text-sm font-bold text-zinc-400">{tier} Tier</span>
          </div>
        )}

        {players.length > 0 && (
          <div className="space-y-2">
            {players.map((p) => (
              <div key={p.slot} className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-400 w-10 shrink-0">{p.slot}</span>
                <span className="text-sm font-semibold text-white flex-1 truncate">{p.name}</span>
                {p.season && <span className="text-xs text-zinc-500 shrink-0">{p.season}</span>}
              </div>
            ))}
          </div>
        )}

        <Link
          href="/draft"
          className="block w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm text-center transition-colors"
        >
          Build Your Team →
        </Link>
      </div>
    </div>
  );
}
