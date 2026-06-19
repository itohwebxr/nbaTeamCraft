"use client";

import { useState } from "react";

type FeedPayload = {
  kind: "matchup" | "playoff" | "season";
  title: string;
  subtitle?: string;
  share_id?: string;
  result_url?: string;
};

export default function PostToSimFeedButton({ payload }: { payload: FeedPayload }) {
  const [state, setState] = useState<"idle" | "posting" | "done">("idle");

  const post = async () => {
    if (state !== "idle") return;
    setState("posting");
    try {
      await fetch("/api/sim/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setState("done");
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      onClick={post}
      disabled={state !== "idle"}
      className="w-full py-3 rounded-xl bg-orange-500/20 border border-orange-500/50 hover:bg-orange-500/30
        text-orange-400 font-bold text-sm transition-colors disabled:opacity-60"
    >
      {state === "done" ? "✓ Posted to Feed!" : state === "posting" ? "Posting…" : "📢 Post to Sim Feed"}
    </button>
  );
}
