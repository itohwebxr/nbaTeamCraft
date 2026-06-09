"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDraftStore } from "@/stores/draftStore";
import { TeamEvaluation, STARTER_SLOTS, BENCH_SLOTS, TOTAL_BUDGET } from "@/types";
import TeamStats from "@/components/result/TeamStats";
import TeamNameInput from "@/components/result/TeamNameInput";
import { gtm } from "@/lib/gtm";

function SlotLabel({ slot }: { slot: string }) {
  if (slot === "BENCH1") return "6TH";
  return slot;
}

export default function ResultPage() {
  const router = useRouter();
  const { roster, usedBudget, reset } = useDraftStore();
  const [evaluation, setEvaluation] = useState<TeamEvaluation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roster.length === 0) {
      router.replace("/draft");
      return;
    }

    fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster }),
    })
      .then((r) => r.json())
      .then((data) => {
        setEvaluation(data);
        gtm.viewResult({
          overall: data.overall,
          tier: data.tier,
          used_budget: usedBudget,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleShare = () => {
    const label = teamName || "My NBA Team";
    const formatName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return name;
      return `${parts[0][0]} ${parts[parts.length - 1]}`;
    };
    const slotKey = (slot: string) => slot === "BENCH1" ? "6th" : slot.toLowerCase();

    const shareParams = new URLSearchParams({ name: label });
    if (evaluation) {
      shareParams.set("overall", String(evaluation.overall));
      shareParams.set("tier", evaluation.tier);
    }
    [...starters, ...bench].forEach((e) => {
      if (e) {
        const key = slotKey(e.slot);
        shareParams.set(key, formatName(e.playerSeason.name));
        shareParams.set(`${key}_s`, e.playerSeason.season);
      }
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const sharePageUrl = `${siteUrl}/share?${shareParams.toString()}`;

    const slotLabel = (slot: string) => slot === "BENCH1" ? "6TH" : slot;
    const rosterLines = [...starters, ...bench]
      .filter((e): e is NonNullable<typeof e> => e != null)
      .map((e) => `${slotLabel(e.slot)} : ${formatName(e.playerSeason.name)}`)
      .join("\n");
    const text = evaluation
      ? `🏀 ${label}\nOverall: ${evaluation.overall} (${evaluation.tier} Tier)\n${rosterLines}\n#NBATeamCraft`
      : `🏀 ${label}\n${rosterLines}\n#NBATeamCraft`;

    if (evaluation) {
      gtm.shareTeam({ team_name: label, overall: evaluation.overall, tier: evaluation.tier });
    }
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(sharePageUrl)}`;
    window.open(tweetUrl, "_blank", "noopener");
  };

  const starters = STARTER_SLOTS.map((slot) => roster.find((e) => e.slot === slot));
  const bench = BENCH_SLOTS.map((slot) => roster.find((e) => e.slot === slot));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          <span className="text-xs text-zinc-500">Budget used: {usedBudget}/{TOTAL_BUDGET}</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <TeamNameInput value={teamName} onChange={setTeamName} />

        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            Evaluating team...
          </div>
        ) : evaluation ? (
          <TeamStats evaluation={evaluation} teamName={teamName} />
        ) : null}

        {/* Roster */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Roster</h3>

          <p className="text-xs text-zinc-600 mb-2">STARTERS</p>
          <div className="space-y-2 mb-4">
            {starters.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-400 w-16 shrink-0">
                  {STARTER_SLOTS[i]}
                </span>
                {entry ? (
                  <>
                    <span className="text-sm font-semibold text-white flex-1 truncate">
                      {entry.playerSeason.name}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {entry.playerSeason.season}
                    </span>
                    <span className="text-xs font-bold text-zinc-300 w-6 text-right shrink-0">
                      {entry.playerSeason.overall}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-700 flex-1">—</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600 mb-2">6TH MAN</p>
          <div className="space-y-2">
            {bench.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 w-8 shrink-0">BN</span>
                {entry ? (
                  <>
                    <span className="text-xs text-zinc-400 mr-1 shrink-0">
                      {entry.assignedPosition}
                    </span>
                    <span className="text-sm font-semibold text-white flex-1 truncate">
                      {entry.playerSeason.name}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {entry.playerSeason.season}
                    </span>
                    <span className="text-xs font-bold text-zinc-300 w-6 text-right shrink-0">
                      {entry.playerSeason.overall}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-700 flex-1">—</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>𝕏</span> Share
          </button>
          <button
            onClick={() => {
              if (evaluation) {
                gtm.draftAgain({ previous_overall: evaluation.overall, previous_tier: evaluation.tier });
              }
              reset();
              router.push("/draft");
            }}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
          >
            Draft Again
          </button>
        </div>
      </div>
    </div>
  );
}
