import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type TriviaAnswer = { question: string; correct: boolean; submitted?: string; correct_answer?: string };
type TriviaShareData = { kind: "trivia"; score: number; total: number; difficulty: string; gmode: string; answers: TriviaAnswer[] };

async function getShareData(id: string): Promise<TriviaShareData | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("shares").select("data").eq("id", id).single();
    const d = data?.data as TriviaShareData | undefined;
    return d?.kind === "trivia" ? d : null;
  } catch { return null; }
}

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const share = await getShareData(id);
  if (!share) return { title: "NBA TeamCraft Trivia" };

  const { score, total, difficulty, gmode } = share;
  const pct = Math.round((score / total) * 100);
  const modeLabel = gmode === "daily" ? "Daily Challenge" : "Practice";
  const title = `${score}/${total} correct (${pct}%) — NBA TeamCraft Trivia`;
  const description = `I scored ${score} out of ${total} on the NBA TeamCraft Trivia ${modeLabel}! Test your NBA knowledge.`;
  const siteUrl = await getSiteUrl();
  const ogImageUrl = `${siteUrl}/api/og?mode=trivia&id=${id}&score=${score}&total=${total}&diff=${difficulty}&gmode=${gmode}`;

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

export default async function TriviaResultSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const share = await getShareData(id);
  if (!share) redirect("/trivia");

  const { score, total, difficulty, gmode, answers } = share;
  const pct = Math.round((score / total) * 100);
  const emoji = score === total ? "🔥" : score >= total * 0.6 ? "💪" : "📚";
  const modeLabel = gmode === "daily" ? "Daily Challenge" : "Practice";
  const diffLabel = difficulty === "hard" ? "Hard" : "Normal";

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff", fontFamily: "sans-serif", padding: "32px 16px", maxWidth: "560px", margin: "0 auto" }}>
      <p style={{ fontSize: "13px", color: "#71717a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "24px" }}>
        NBA TeamCraft · Trivia {modeLabel} · {diffLabel}
      </p>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{ fontSize: "56px", margin: "0 0 4px" }}>{emoji}</p>
        <p style={{ fontSize: "72px", fontWeight: 900, margin: "0 0 4px", color: "#f97316" }}>
          {score}<span style={{ fontSize: "36px", color: "#52525b" }}>/{total}</span>
        </p>
        <p style={{ fontSize: "16px", color: "#71717a", margin: 0 }}>{pct}% correct</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
        {answers.map((a, i) => (
          <div key={i} style={{ padding: "12px 16px", borderRadius: "12px", background: a.correct ? "#052e16" : "#2d0a0a", border: `1px solid ${a.correct ? "#14532d" : "#7f1d1d"}` }}>
            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#e4e4e7", fontWeight: 600 }}>
              {a.correct ? "✅" : "❌"} {a.question}
            </p>
            {!a.correct && a.correct_answer && (
              <p style={{ margin: 0, fontSize: "12px", color: "#71717a" }}>→ {a.correct_answer}</p>
            )}
          </div>
        ))}
      </div>
      <Link
        href="/trivia"
        style={{ display: "block", padding: "14px 32px", background: "#f97316", color: "#fff", fontWeight: 700, borderRadius: "12px", textDecoration: "none", fontSize: "15px", textAlign: "center" }}
      >
        Play Trivia →
      </Link>
    </div>
  );
}
