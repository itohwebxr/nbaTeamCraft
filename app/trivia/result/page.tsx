import type { Metadata } from "next";
import Link from "next/link";
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
  if (!p.score) redirect("/trivia");

  const score = parseInt(p.score ?? "0");
  const total = parseInt(p.total ?? "5");
  const pct = Math.round((score / total) * 100);
  const emoji = score === total ? "🔥" : score >= total * 0.6 ? "💪" : "📚";
  const gmode = p.gmode === "daily" ? "Daily Challenge" : "Practice";
  const diff = p.diff === "hard" ? "Hard" : "Normal";

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "32px 16px" }}>
      <p style={{ fontSize: "14px", color: "#71717a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>NBA TeamCraft · Trivia {gmode} · {diff}</p>
      <p style={{ fontSize: "72px", marginBottom: "8px" }}>{emoji}</p>
      <p style={{ fontSize: "80px", fontWeight: 900, margin: "0 0 8px" }}>
        {score}<span style={{ fontSize: "36px", color: "#52525b" }}>/{total}</span>
      </p>
      <p style={{ fontSize: "18px", color: "#71717a", marginBottom: "32px" }}>{pct}% correct</p>
      <Link
        href="/trivia"
        style={{ padding: "14px 32px", background: "#f97316", color: "#fff", fontWeight: 700, borderRadius: "12px", textDecoration: "none", fontSize: "15px" }}
      >
        Play Trivia →
      </Link>
    </div>
  );
}
