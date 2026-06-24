import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import AppHeader from "@/components/layout/AppHeader";
import FeedCard from "@/components/home/FeedCard";
import ScrollToTop from "@/components/common/ScrollToTop";
import ThemePageActions from "@/components/themes/ThemePageActions";
import { getThemeBySlug, getThemeTeams } from "@/lib/themes";

export const dynamic = "force-dynamic";

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const theme = await getThemeBySlug(slug);
  if (!theme) return { title: "NBA TeamCraft" };
  const title = `${theme.emoji ?? ""} ${theme.title} | NBA TeamCraft`;
  const description = theme.description ?? `Build your take on ${theme.title}.`;
  const ogParams = new URLSearchParams({ title: theme.title, hashtag: theme.hashtag });
  if (theme.emoji) ogParams.set("emoji", theme.emoji);
  if (theme.description) ogParams.set("desc", theme.description);
  const ogImage = `${await getSiteUrl()}/api/og/theme?${ogParams.toString()}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = await getThemeBySlug(slug);
  if (!theme) notFound();
  const teams = await getThemeTeams(theme.id);

  return (
    <>
      <ScrollToTop />
      <AppHeader />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

          {/* Theme header */}
          <div className="text-center space-y-2">
            <p className="text-5xl leading-none">{theme.emoji ?? "🏀"}</p>
            <h1 className="font-display text-2xl font-black text-white">{theme.title}</h1>
            <p className="text-sm font-bold text-violet-300">#{theme.hashtag}</p>
            {theme.description && <p className="text-sm text-zinc-400">{theme.description}</p>}
          </div>

          <ThemePageActions theme={theme} />

          {/* Entries */}
          {teams.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <p className="text-sm">No entries yet.</p>
              <p className="text-xs mt-1">Be the first to post a team for this theme!</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-0.5">
                {teams.length} {teams.length === 1 ? "entry" : "entries"}
              </p>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                {teams.map((team) => (
                  <FeedCard key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
