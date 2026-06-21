"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type FeedPayload = {
  kind: "matchup" | "playoff" | "season";
  title: string;
  subtitle?: string;
  share_id?: string;
  result_url?: string;
};

export default function PostToSimFeedButton({
  payload,
  getShareId,
}: {
  payload: FeedPayload;
  // Optional: lazily create a share (e.g. the full season result) at post time
  // and attach its id so the detail page can render the rich result.
  getShareId?: () => Promise<string | null>;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "posting" | "done">("idle");

  const post = async () => {
    if (state !== "idle") return;
    setState("posting");
    try {
      const shareId = payload.share_id ?? (getShareId ? (await getShareId()) ?? undefined : undefined);
      const res = await fetch("/api/sim/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          share_id: shareId,
          user_id: user?.id ?? null,
          display_name: user?.displayName ?? null,
          avatar_url: user?.avatarUrl ?? null,
        }),
      });
      if (res.ok) {
        setState("done");
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        console.error("sim feed post failed", res.status, body.detail ?? body.error ?? "");
        setState("idle");
      }
    } catch (e) {
      console.error("sim feed post error", e);
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
