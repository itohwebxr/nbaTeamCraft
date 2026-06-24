"use client";

import Link from "next/link";

interface Props {
  title: string;
  shareId: string | null;
  resultUrl: string | null;
  kind: string;
}

const KIND_ROUTE: Record<string, string> = {
  matchup: "/matchup",
  playoff: "/playoffs",
  season: "/season",
};

const KIND_LABEL: Record<string, string> = {
  matchup: "Try Match Simulator →",
  playoff: "Try Playoff Simulator →",
  season: "Try Season Simulator →",
};

export default function SimDetailActions({ title, shareId, resultUrl, kind }: Props) {
  const shareUrl = shareId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}`
    : resultUrl ?? "";

  const handleShare = () => {
    const text = `${title}\nSimulated by @nbaTeamCraft`;
    const url = shareUrl
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
      : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const simRoute = KIND_ROUTE[kind] ?? "/matchup";
  const simLabel = KIND_LABEL[kind] ?? "Try Simulator →";

  return (
    <div className="space-y-3 pt-3 border-t border-zinc-800">
      <button
        onClick={handleShare}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm transition-colors"
      >
        Share on 𝕏
      </button>
      <Link
        href={simRoute}
        className="block w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm text-center transition-colors"
      >
        {simLabel}
      </Link>
    </div>
  );
}
