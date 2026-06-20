import type { PlayoffShareData } from "@/app/api/playoff/share/route";

// Presentational playoff champion + bracket road. Shared by /playoffs/result/[id] and /sim/[id].
export default function PlayoffResultView({ data }: { data: PlayoffShareData }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em] mb-2">
          🏆 Champion · {data.size}-Team Playoff
        </p>
        <h1 className="font-display text-3xl font-black text-white">{data.champion.name}</h1>
        <p className="text-sm text-zinc-400 mt-1">{data.champion.tier} Tier · {data.champion.overall} OVR</p>
      </div>

      {/* Champion's road to the title */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60">
        {data.path.map((p, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <span className="font-display text-[11px] font-bold text-zinc-500 w-32 shrink-0 uppercase tracking-wider">{p.round}</span>
            <span className="flex-1 text-sm font-bold text-white truncate">def. {p.opp}</span>
            <span className="font-display text-sm font-black text-orange-400 shrink-0">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
