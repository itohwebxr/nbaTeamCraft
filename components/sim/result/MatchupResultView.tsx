import type { ParsedMatchup } from "@/lib/matchupResult";
import TeamName from "./TeamName";

function shortScorer(name: string, max = 13): string {
  const parts = name.trim().split(/\s+/);
  let s = parts.length >= 2 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
  if (s.length > max) s = `${s.slice(0, max - 1)}…`;
  return s;
}

// Presentational scoreboard + per-game breakdown for a single match or series.
// Shared by /matchup/result and /sim/[id]. `links` maps a team name to its
// public-team id so the sim detail page can make the names tappable.
export default function MatchupResultView({
  result,
  links,
}: {
  result: ParsedMatchup;
  links?: Record<string, string>;
}) {
  const { home, away, hs, as, kind, homeWon, games } = result;
  const winner = homeWon ? home : away;

  return (
    <div className="space-y-4">
      <p className="text-center font-display text-xs font-bold text-orange-400 uppercase tracking-[0.3em]">
        {kind === "series" ? "Series · Best of 7" : "Match Simulator"}
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 text-center">
            <TeamName name={home} teamId={links?.[home]} className={`block text-sm font-bold truncate ${homeWon ? "text-white" : "text-zinc-500"}`} />
            <p className={`font-display text-6xl font-black mt-1 ${homeWon ? "text-orange-400" : "text-zinc-600"}`}>{hs}</p>
          </div>
          <span className="font-display text-2xl font-black text-zinc-600 shrink-0">VS</span>
          <div className="flex-1 min-w-0 text-center">
            <TeamName name={away} teamId={links?.[away]} className={`block text-sm font-bold truncate ${!homeWon ? "text-white" : "text-zinc-500"}`} />
            <p className={`font-display text-6xl font-black mt-1 ${!homeWon ? "text-orange-400" : "text-zinc-600"}`}>{as}</p>
          </div>
        </div>
        <p className="text-center text-sm text-zinc-400 mt-5 pt-4 border-t border-zinc-800">
          🏆 <TeamName name={winner} teamId={links?.[winner]} className="text-white font-bold" />{" "}
          {kind === "series" ? "takes the series" : "wins"}
        </p>

        {kind === "series" && games.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800 divide-y divide-zinc-800/60">
            {games.map((g, i) => {
              const hWon = parseInt(g.h, 10) >= parseInt(g.a, 10);
              return (
                <div key={i} className="py-2">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xs font-bold text-zinc-500 w-7 shrink-0">G{i + 1}</span>
                    <span className={`flex-1 text-xs font-bold truncate ${hWon ? "text-white" : "text-zinc-500"}`}>{home}</span>
                    <span className="font-display text-sm font-black tabular-nums shrink-0">
                      <span className={hWon ? "text-orange-400" : "text-zinc-500"}>{g.h}</span>
                      <span className="text-zinc-700 mx-1.5">-</span>
                      <span className={!hWon ? "text-orange-400" : "text-zinc-500"}>{g.a}</span>
                    </span>
                    <span className={`flex-1 text-xs font-bold truncate text-right ${!hWon ? "text-white" : "text-zinc-500"}`}>{away}</span>
                  </div>
                  {g.top && (g.top.hName || g.top.aName) && (
                    <div className="flex items-center gap-3 mt-1 pl-10 text-[11px] text-zinc-500">
                      <span className="flex-1 min-w-0 flex items-center gap-1">
                        <span className="shrink-0">🏀</span>
                        <span className="truncate">{shortScorer(g.top.hName)}</span>
                        <span className="font-bold text-zinc-300 shrink-0">{g.top.hPts}</span>
                      </span>
                      <span className="flex-1 min-w-0 flex items-center justify-end gap-1">
                        <span className="font-bold text-zinc-300 shrink-0">{g.top.aPts}</span>
                        <span className="truncate">{shortScorer(g.top.aName)}</span>
                        <span className="shrink-0">🏀</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
