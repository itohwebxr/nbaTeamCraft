import type { SeasonShareData } from "@/app/api/season/share/route";

// Presentational 82-game season result. Shared by /season/result/[id] and /sim/[id].
export default function SeasonResultView({ data }: { data: SeasonShareData }) {
  return (
    <div className="space-y-6 text-center">
      <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em]">
        82-Game Season
      </p>
      <h1 className="font-display text-3xl font-black text-white">{data.team.name}</h1>

      <div className="flex items-baseline justify-center gap-3">
        <span className="font-display text-7xl font-black text-orange-400 tabular-nums">{data.wins}</span>
        <span className="font-display text-4xl font-black text-zinc-600">—</span>
        <span className="font-display text-7xl font-black text-zinc-500 tabular-nums">{data.losses}</span>
      </div>

      <div>
        <p className="font-display text-3xl font-black text-white">{data.label}</p>
        <p className="text-sm text-zinc-400 mt-1">{data.blurb}</p>
        <p className="text-xs text-zinc-500 mt-2">{data.team.tier} Tier · {data.team.overall} OVR</p>
      </div>
    </div>
  );
}
