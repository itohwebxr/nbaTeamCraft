import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

function buildOgUrl(params: { [key: string]: string | undefined }): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
  const ogImageUrl = buildOgUrl(params);
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

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await searchParams;
  redirect("/");
}
