"use client";

import { useEffect, useState } from "react";

type SimRecord = {
  id: string;
  type: "match" | "playoff" | "season";
  result_data: Record<string, unknown>;
  created_at: string;
};

function SimCard({ sim }: { sim: SimRecord }) {
  const d = sim.result_data;
  if (sim.type === "season") {
    const wins = d.wins as number;
    const losses = d.losses as number;
    const label = d.label as string;
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-800/60 rounded-xl">
        <span className="text-base shrink-0">📅</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-300">{wins}W – {losses}L</p>
          <p className="text-[10px] text-zinc-500">{label}</p>
        </div>
        <p className="text-[10px] text-zinc-600 shrink-0">
          {new Date(sim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
    );
  }
  if (sim.type === "playoff") {
    const champion = d.champion as string;
    const isChampion = !!d.is_champion;
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-800/60 rounded-xl">
        <span className="text-base shrink-0">🏆</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-300">
            {isChampion ? "🥇 Champion" : `Lost · Finals: ${champion ?? "—"}`}
          </p>
          <p className="text-[10px] text-zinc-500">Playoff Sim</p>
        </div>
        <p className="text-[10px] text-zinc-600 shrink-0">
          {new Date(sim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
    );
  }
  // match
  const result = d.result as string;
  const scoreFor = d.score_for as number;
  const scoreAgainst = d.score_against as number;
  const opponent = d.opponent_name as string;
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-800/60 rounded-xl">
      <span className="text-base shrink-0">⚔️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-zinc-300">
          <span className={result === "win" ? "text-emerald-400" : "text-red-400"}>{result === "win" ? "W" : "L"}</span>
          {" "}{scoreFor}–{scoreAgainst} vs {opponent}
        </p>
        <p className="text-[10px] text-zinc-500">Match Sim</p>
      </div>
      <p className="text-[10px] text-zinc-600 shrink-0">
        {new Date(sim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

export default function TeamSimHistory({ teamId }: { teamId: string }) {
  const [sims, setSims] = useState<SimRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/teams/${teamId}/simulations`)
      .then((r) => r.json())
      .then((data) => setSims(data.simulations ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [teamId]);

  if (!loaded || sims.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">📊 Sim Results</p>
      <div className="space-y-1.5">
        {sims.map((s) => (
          <SimCard key={s.id} sim={s} />
        ))}
      </div>
    </div>
  );
}
