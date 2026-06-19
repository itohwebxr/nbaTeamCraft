import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ score?: string; total?: string; diff?: string; gmode?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const score = p.score ?? "0";
  const total = p.total ?? "5";
  const diff = p.diff ?? "normal";
  const gmode = p.gmode ?? "practice";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nbateamcraft.com";
  const ogImageUrl = `${siteUrl}/api/og?mode=trivia&score=${score}&total=${total}&diff=${diff}&gmode=${gmode}`;
  const pct = Math.round((parseInt(score) / parseInt(total)) * 100);
  const modeLabel = gmode === "daily" ? "Daily Challenge" : "Practice";
  const title = `${score}/${total} correct (${pct}%) — NBA TeamCraft Trivia`;
  const description = `I scored ${score} out of ${total} on the NBA TeamCraft Trivia ${modeLabel}! Test your NBA knowledge.`;

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

export default async function TriviaResultPage({ searchParams }: Props) {
  const p = await searchParams;
  // If accessed directly without params, redirect to trivia page
  if (!p.score) {
    redirect("/trivia");
  }
  // Otherwise redirect to trivia — the OGP metadata above will be crawled by X
  redirect("/trivia");
}
