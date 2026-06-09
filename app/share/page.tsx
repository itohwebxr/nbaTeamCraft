import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

async function buildOgUrl(params: { [key: string]: string | undefined }): Promise<string> {
  const siteUrl = await getSiteUrl();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  return `${siteUrl}/api/og?${qs.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const name = params.name || "My NBA Team";
  const overall = params.overall || "";
  const tier = params.tier || "";
  const ogImageUrl = await buildOgUrl(params);
  const title = `${name} | NBA TeamCraft`;
  const description = overall ? `Overall: ${overall} (${tier} Tier) — NBA TeamCraft` : "NBA TeamCraft";

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

const SLOT_ORDER = ["pg", "sg", "sf", "pf", "c", "6th"];
const SLOT_LABEL: Record<string, string> = { "6th": "6TH" };

function ClientRedirect() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.replace("/");`,
      }}
    />
  );
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const name = params.name || "My NBA Team";
  const overall = params.overall || "";
  const tier = params.tier || "";

  const players = SLOT_ORDER.map((key) => ({
    slot: SLOT_LABEL[key] ?? key.toUpperCase(),
    name: params[key] || "",
    season: params[`${key}_s`] || "",
  })).filter((e) => e.name);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
      <ClientRedirect />
      <header className="mb-8">
        <Image src="/logo.png" alt="NBA TeamCraft" height={40} width={75} className="object-contain" />
      </header>

      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
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
