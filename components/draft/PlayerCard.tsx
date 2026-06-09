"use client";

import { PlayerSeason, Position } from "@/types";

interface PlayerCardProps {
  player: PlayerSeason;
  draftablePositions: Position[];
  isDrafted: boolean;
  isReplaceable: boolean;
  budgetOk: boolean;
  onDraft: (player: PlayerSeason, positions: Position[]) => void;
  onBudgetBlock?: (player: PlayerSeason) => void;
}

const POSITION_COLORS: Record<Position, { border: string; text: string; bg: string }> = {
  PG: { border: "border-l-sky-400",     text: "text-sky-400",     bg: "bg-sky-400/10"     },
  SG: { border: "border-l-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10" },
  SF: { border: "border-l-violet-400",  text: "text-violet-400",  bg: "bg-violet-400/10"  },
  PF: { border: "border-l-rose-400",    text: "text-rose-400",    bg: "bg-rose-400/10"    },
  C:  { border: "border-l-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/10"   },
};

const OVERALL_COLOR = (v: number) =>
  v >= 88 ? "text-yellow-400" :
  v >= 76 ? "text-emerald-400" :
  v >= 65 ? "text-sky-400" :
  "text-zinc-400";

export default function PlayerCard({
  player,
  draftablePositions,
  isDrafted,
  isReplaceable,
  budgetOk,
  onDraft,
  onBudgetBlock,
}: PlayerCardProps) {
  const canDraft = draftablePositions.length > 0 && !isDrafted && budgetOk;
  const primaryPos = player.positions[0]?.position ?? "PG";
  const posStyle = POSITION_COLORS[primaryPos] ?? POSITION_COLORS.PG;
  const positionStr = player.positions.map((p) => p.position).join("/");

  return (
    <div
      className={`relative p-3 rounded-xl border-l-4 border border-zinc-700/60 transition-all duration-200
        ${isDrafted
          ? `opacity-40 bg-zinc-900/50 cursor-not-allowed ${posStyle.border}`
          : !canDraft
          ? `opacity-50 bg-zinc-900/50 cursor-not-allowed border-l-zinc-700`
          : `bg-zinc-900 cursor-pointer card-draftable hover:bg-zinc-800/80 ${posStyle.border}`
        }`}
      onClick={() => {
        if (canDraft) {
          onDraft(player, draftablePositions);
        } else if (!isDrafted && draftablePositions.length > 0 && !budgetOk) {
          onBudgetBlock?.(player);
        }
      }}
    >
      {isDrafted && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 z-10">
          <span className="font-display text-xs font-black text-zinc-400 tracking-[0.3em] border border-zinc-600 px-2 py-0.5 rounded">
            DRAFTED
          </span>
        </div>
      )}

      {isReplaceable && !isDrafted && (
        <div className="absolute top-2 right-2 z-10">
          <span className="font-display text-[10px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-1.5 py-0.5 rounded tracking-widest">
            SWAP
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-bold text-white truncate leading-tight tracking-wide">
            {player.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`font-display text-[11px] font-bold ${posStyle.text} ${posStyle.bg} px-1.5 py-0.5 rounded tracking-widest`}>
              {positionStr}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-display text-4xl font-black leading-none ${OVERALL_COLOR(player.overall)}`}>
            {player.overall}
          </p>
          <div className="flex gap-0.5 justify-end mt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i < player.cost ? "bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.6)]" : "bg-zinc-700"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-xs">
        {[
          { label: "PPG", value: player.ppg },
          { label: "RPG", value: player.rpg },
          { label: "APG", value: player.apg },
          { label: "SPG", value: player.spg },
          { label: "BPG", value: player.bpg },
          { label: "MPG", value: player.mpg },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between">
            <span className="text-zinc-500 font-display tracking-wider">{label}</span>
            <span className="text-zinc-300 font-bold">{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
