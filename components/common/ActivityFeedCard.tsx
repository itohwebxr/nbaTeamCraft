"use client";

import Link from "next/link";
import FeedLikeButton from "./FeedLikeButton";

export type SimEntry = {
  id: string;
  kind: "matchup" | "playoff" | "season";
  share_id: string | null;
  result_url: string | null;
  title: string;
  subtitle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

export type TriviaEntry = {
  id: string;
  share_id: string;
  score: number;
  total: number;
  gmode: string;
  difficulty: string;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  questions_preview?: { q: string; c: boolean }[] | null;
  created_at: string;
};

type Props =
  | { type: "sim"; entry: SimEntry }
  | { type: "trivia"; entry: TriviaEntry };

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Parse sim title/subtitle into structured display data
function parseSimEntry(entry: SimEntry) {
  const { kind, title, subtitle } = entry;
  // Strip leading emoji from title (⚔️, 🏆, 🏀)
  const bare = title.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\s]+/u, "").trim();

  if (kind === "matchup") {
    // title: "[Winner] def. [Loser]"
    const parts = bare.split(" def. ");
    const winner = parts[0]?.trim() ?? bare;
    const loser = parts[1]?.trim() ?? "";
    // subtitle: "Match · Single" or "Match · Series · 4-2"
    const seriesScore = subtitle?.includes("Series")
      ? subtitle.split("Series · ")[1] ?? null
      : null;
    return { kind: "matchup" as const, winner, loser, seriesScore };
  }

  if (kind === "playoff") {
    // title: "[Champion] wins!"
    const champion = bare.replace(" wins!", "").trim();
    // subtitle: "Playoff · 8-Team"
    const size = subtitle?.split("Playoff · ")[1] ?? null;
    return { kind: "playoff" as const, champion, size };
  }

  // season
  // title: "[Team]: W-L"
  const colonIdx = bare.indexOf(": ");
  const teamName = colonIdx >= 0 ? bare.slice(0, colonIdx).trim() : bare;
  const record = colonIdx >= 0 ? bare.slice(colonIdx + 2).trim() : "";
  // subtitle: "Season · GRADE"
  const grade = subtitle?.split("Season · ")[1] ?? null;
  return { kind: "season" as const, teamName, record, grade };
}

const GRADE_COLOR: Record<string, string> = {
  ELITE: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  GREAT: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  GOOD: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  AVERAGE: "text-zinc-400 bg-zinc-800 border-zinc-700",
  BELOW: "text-zinc-500 bg-zinc-800 border-zinc-700",
};

export default function ActivityFeedCard(props: Props) {
  const { type, entry } = props;
  const href = type === "sim" ? `/sim/${entry.id}` : `/trivia/feed/${entry.id}`;
  const displayName = entry.display_name ?? "Anonymous";
  const likeCount = entry.like_count ?? 0;
  const commentCount = entry.comment_count ?? 0;

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <Link
        href={href}
        className="block px-4 pt-4 pb-2 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {/* Author row */}
        <div className="flex items-center gap-2 mb-3">
          {entry.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.avatar_url} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-zinc-700 shrink-0 object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-[10px] font-bold text-zinc-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-bold text-zinc-300 truncate">{displayName}</span>
          <span className="text-zinc-600 text-xs shrink-0">·</span>
          <span className="text-zinc-600 text-xs shrink-0">{timeAgo(entry.created_at)}</span>
        </div>

        {/* Content */}
        {type === "sim" && <SimContent entry={entry as SimEntry} />}
        {type === "trivia" && <TriviaContent entry={entry as TriviaEntry} />}
      </Link>

      {/* Engagement — outside Link */}
      <div
        className="flex items-center gap-3 px-4 pb-3 pt-1"
        onClick={(e) => e.preventDefault()}
      >
        <FeedLikeButton feedType={type} feedId={entry.id} initialCount={likeCount} size="sm" />
        {commentCount > 0 && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <span>💬</span><span>{commentCount}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function SimContent({ entry }: { entry: SimEntry }) {
  const parsed = parseSimEntry(entry);

  if (parsed.kind === "matchup") {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">⚔️ Match Simulator</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-orange-400 truncate flex-1">{parsed.winner}</p>
          <span className="text-xs text-zinc-600 font-bold shrink-0">def.</span>
          <p className="text-sm font-bold text-zinc-400 truncate flex-1 text-right">{parsed.loser}</p>
        </div>
        {parsed.seriesScore && (
          <p className="text-xs text-zinc-500">Series · {parsed.seriesScore}</p>
        )}
      </div>
    );
  }

  if (parsed.kind === "playoff") {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          🏆 Playoff Simulator{parsed.size ? ` · ${parsed.size}` : ""}
        </p>
        <p className="text-sm font-black text-yellow-400 truncate">🏆 {parsed.champion}</p>
        <p className="text-xs text-zinc-500">Tournament Champion</p>
      </div>
    );
  }

  // season
  const gradeClass = GRADE_COLOR[parsed.grade ?? ""] ?? "text-zinc-400 bg-zinc-800 border-zinc-700";
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">📅 Season Simulator</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-black text-white truncate flex-1">{parsed.teamName}</p>
        <span className="text-sm font-black text-orange-400 shrink-0">{parsed.record}</span>
        {parsed.grade && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${gradeClass}`}>
            {parsed.grade}
          </span>
        )}
      </div>
    </div>
  );
}

function TriviaContent({ entry }: { entry: TriviaEntry }) {
  const pct = Math.round((entry.score / entry.total) * 100);
  const emoji = entry.score === entry.total ? "🔥" : entry.score >= entry.total * 0.6 ? "💪" : "📚";
  const modeLabel = entry.gmode === "daily" ? "Daily" : "Practice";
  const diffLabel = entry.difficulty === "hard" ? "Hard" : "Normal";
  const preview = entry.questions_preview;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">🧠 Trivia · {modeLabel} · {diffLabel}</p>
      {/* Score */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-lg font-black text-orange-400">{entry.score}/{entry.total}</span>
        <span className="text-xs text-zinc-500">{pct}% correct</span>
      </div>
      {/* Question list */}
      {preview && preview.length > 0 && (
        <div className="space-y-1.5 mt-1 border-t border-zinc-800/60 pt-2">
          {preview.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs shrink-0 mt-0.5">{item.c ? "✅" : "❌"}</span>
              <p className="text-xs text-zinc-400 leading-snug">{item.q}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
