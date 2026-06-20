"use client";

import { useEffect, useState } from "react";
import ActivityFeedCard from "@/components/common/ActivityFeedCard";

type FeedEntry = {
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
  created_at: string;
};

export default function TriviaFeed() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trivia/feed?limit=10")
      .then((r) => r.json())
      .then((data) => setFeed(data.feed ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-16 flex items-center justify-center text-zinc-600 text-sm">
        Loading feed...
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-600 text-sm">
        No shared results yet. Be the first!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">🧠 Recent Trivia Results</p>
        <a href="/feed?tab=trivia" className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors">View All →</a>
      </div>
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {feed.map((entry) => (
          <ActivityFeedCard key={entry.id} type="trivia" entry={entry} />
        ))}
      </div>
    </div>
  );
}
