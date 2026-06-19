"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TriviaEntryCard() {
  const [todayDone, setTodayDone] = useState(false);

  useEffect(() => {
    // Check localStorage for daily completion (same key as TriviaClient)
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem("trivia_daily_done");
    if (stored === today) setTodayDone(true);
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-zinc-400 text-sm leading-relaxed">
        Stats, trades, and career paths —<br />
        <span className="text-sky-400 font-bold">how deep is your NBA knowledge?</span>
      </p>

      <Link
        href="/trivia?mode=daily"
        className={`flex items-center gap-4 w-full py-4 px-5 rounded-2xl transition-colors group
          ${todayDone
            ? "bg-zinc-900/60 border border-zinc-800 opacity-60 pointer-events-none"
            : "bg-gradient-to-r from-sky-500/15 to-zinc-900 border border-sky-500/30 hover:border-sky-500/60"
          }`}
      >
        <span className="text-3xl">🧠</span>
        <div className="text-left">
          <p className="font-black text-white text-base leading-tight">
            {todayDone ? "✅ Today's Challenge Complete" : "Today's Challenge"}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">5 questions · daily reset</p>
        </div>
        {!todayDone && (
          <span className="ml-auto text-sky-400 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
        )}
      </Link>

      <Link
        href="/trivia?mode=practice"
        className="flex items-center gap-4 w-full py-4 px-5 rounded-2xl
          bg-gradient-to-r from-zinc-800/60 to-zinc-900 border border-zinc-700
          hover:border-zinc-500 transition-colors group"
      >
        <span className="text-3xl">🏋️</span>
        <div className="text-left">
          <p className="font-black text-white text-base leading-tight">Practice</p>
          <p className="text-xs text-zinc-400 mt-0.5">Unlimited · choose Stats or Career</p>
        </div>
        <span className="ml-auto text-zinc-400 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
      </Link>
    </div>
  );
}
