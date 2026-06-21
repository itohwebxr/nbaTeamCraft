import type { SeasonShareData } from "@/app/api/season/share/route";
import TeamName from "./TeamName";

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  A: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  B: "text-sky-400 border-sky-400/40 bg-sky-400/10",
  C: "text-zinc-400 border-zinc-600 bg-zinc-800",
  D: "text-zinc-500 border-zinc-700 bg-zinc-900",
};

// Tailwind text color for a season grade (mirrors SeasonClient / lib/season).
const GRADE_TEXT: Record<string, string> = {
  DYNASTY: "text-amber-400",
  ELITE: "text-orange-400",
  CONTENDER: "text-green-400",
  PLAYOFF: "text-blue-400",
  FRINGE: "text-sky-400",
  LOTTERY: "text-purple-400",
  REBUILD: "text-zinc-400",
};

// Full 82-game season result — mirrors the in-app result screen (pip grid,
// grade, OVR, win odds). Shared by /season/result/[id] and /sim/[id].
export default function SeasonResultView({
  data,
  links,
}: {
  data: SeasonShareData;
  links?: Record<string, string>;
}) {
  const gradeClass = GRADE_TEXT[data.label] ?? "text-white";
  const games = data.games;

  return (
    <div className="flex flex-col items-center text-center space-y-5">
      <p className="font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em]">
        82-Game Season
      </p>
      <TeamName
        name={data.team.name}
        teamId={links?.[data.team.name]}
        className="block font-display text-2xl font-black text-white leading-tight"
      />

      {/* Record */}
      <div>
        <div className="flex items-baseline justify-center gap-3">
          <span className="font-display text-6xl font-black text-orange-400 tabular-nums">{data.wins}</span>
          <span className="font-display text-3xl font-black text-zinc-600">—</span>
          <span className="font-display text-6xl font-black text-zinc-500 tabular-nums">{data.losses}</span>
        </div>
        <p className="text-[11px] text-zinc-600 font-display tracking-widest mt-1">
          {games?.length ?? data.wins + data.losses} GP
        </p>
      </div>

      {/* 82-game pip grid */}
      {games && games.length > 0 && (
        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 w-full">
          {games.map((win, i) => (
            <span
              key={i}
              className={`aspect-square rounded-[2px] ${win ? "bg-green-500" : "bg-rose-600/70"}`}
            />
          ))}
        </div>
      )}

      {/* Grade */}
      <div>
        <p className={`font-display text-4xl font-black ${gradeClass}`}>{data.label}</p>
        <p className="text-sm text-zinc-400 mt-1">{data.blurb}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`font-display text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[data.team.tier] ?? TIER_COLORS.D}`}>
            {data.team.tier}
          </span>
          <span className="font-display text-sm font-black text-orange-400">{data.team.overall} OVR</span>
          {data.winRate != null && (
            <>
              <span className="text-zinc-600 text-xs">·</span>
              <span className="text-xs text-zinc-400">{(data.winRate * 100).toFixed(0)}% per-game win odds</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
