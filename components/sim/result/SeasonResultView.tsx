import type { SeasonShareData } from "@/app/api/season/share/route";
import type { PublicTeamRosterItem } from "@/types";
import { STARTER_SLOTS } from "@/types";
import { overallColor } from "@/lib/overallColor";
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
  roster,
}: {
  data: SeasonShareData;
  links?: Record<string, string>;
  roster?: PublicTeamRosterItem[];
}) {
  const gradeClass = GRADE_TEXT[data.label] ?? "text-white";
  const games = data.games;

  const starters = roster
    ? STARTER_SLOTS.map((slot) => roster.find((e) => e.slot === slot))
    : [];
  const bench = roster ? roster.filter((e) => e.slot === "BENCH1") : [];

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

      {/* Roster of the simulated team */}
      {roster && roster.length > 0 && (
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Roster</h3>

          <p className="text-xs text-zinc-600 mb-2">STARTERS</p>
          <div className="space-y-2 mb-4">
            {starters.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-400 w-8 shrink-0">{STARTER_SLOTS[i]}</span>
                {entry ? (
                  <>
                    <span className="text-sm font-semibold text-white flex-1 truncate">{entry.name}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{entry.season}</span>
                    <span className={`font-display text-xs font-black w-6 text-right shrink-0 ${overallColor(entry.overall)}`}>
                      {entry.overall}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-zinc-700 flex-1">—</span>
                )}
              </div>
            ))}
          </div>

          {bench.length > 0 && (
            <>
              <p className="text-xs text-zinc-600 mb-2">6TH MAN</p>
              <div className="space-y-2">
                {bench.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500 w-8 shrink-0">BN</span>
                    <span className="text-xs text-zinc-400 mr-1 shrink-0">{entry.assignedPosition}</span>
                    <span className="text-sm font-semibold text-white flex-1 truncate">{entry.name}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{entry.season}</span>
                    <span className={`font-display text-xs font-black w-6 text-right shrink-0 ${overallColor(entry.overall)}`}>
                      {entry.overall}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
