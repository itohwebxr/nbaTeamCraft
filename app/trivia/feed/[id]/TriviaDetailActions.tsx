"use client";

import { gtm } from "@/lib/gtm";

interface Props {
  score: number;
  total: number;
  shareId: string | null;
  gmode: "daily" | "practice";
  difficulty: "normal" | "hard";
}

export default function TriviaDetailActions({ score, total, shareId, gmode, difficulty }: Props) {
  const handleShare = () => {
    gtm.triviaShare({ gmode, difficulty, score, total, source: "detail" });
    const emoji = score === total ? "🔥" : score >= total * 0.6 ? "💪" : "📚";
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
    const resultUrl = shareId ? `${siteUrl}/trivia/result/${shareId}` : `${siteUrl}/trivia`;
    const text = `${emoji} Trivia Challenge: ${score}/${total} correct!\nTest your NBA knowledge at @nbaTeamCraft\n${resultUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm transition-colors"
    >
      Share on 𝕏
    </button>
  );
}
