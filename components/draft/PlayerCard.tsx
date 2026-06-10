"use client";

import { PlayerSeason, Position } from "@/types";
import { overallColor } from "@/lib/overallColor";

interface PlayerCardProps {
  player: PlayerSeason;
  draftablePositions: Position[];
  isDrafted: boolean;
  isReplaceable: boolean;
  budgetOk: boolean;
  onDraft: (player: PlayerSeason, positions: Position[]) => void;
  onBudgetBlock?: (player: PlayerSeason) => void;
}

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
  const positionStr = player.positions.map((p) => p.position).join("/");

  return (
    <div
      className={`relative p-3 rounded-xl border transition-all duration-200
        ${isDrafted
          ? "opacity-40 border-zinc-700 bg-zinc-900/50 cursor-not-allowed"
          : !canDraft
          ? "opacity-50 border-zinc-700 bg-zinc-900/50 cursor-not-allowed"
          : "border-zinc-700/60 bg-zinc-900 cursor-pointer card-draftable hover:bg-zinc-800/80"
        }`}
      onClick={() => {
        if (canDraft) {
          onDraft(player, draftablePositions);
        } else if (!isDrafted && draftablePositions.length > 0 && !budgetOk) {
          onBudgetBlock?.(player);
        }
      }}
    >
      {/* Drafted stamp */}
      {isDrafted && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 z-10">
          <span className="font-display text-xs font-black text-zinc-400 tracking-[0.3em] border border-zinc-600 px-2 py-0.5 rounded">
            DRAFTED
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-bold text-white truncate leading-tight tracking-wide">
            {player.name}
          </p>
          <p className="font-display text-xs text-zinc-400 tracking-widest mt-0.5">{positionStr}</p>
        </div>

        {/* Overall — big */}
        <div className="text-right shrink-0">
          <p className={`font-display text-4xl font-black leading-none ${overallColor(player.overall)}`}>
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
