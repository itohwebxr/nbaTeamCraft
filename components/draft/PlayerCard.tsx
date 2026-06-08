"use client";

import { PlayerSeason, Position } from "@/types";

interface PlayerCardProps {
  player: PlayerSeason;
  draftablePositions: Position[];
  isDrafted: boolean;
  isReplaceable: boolean;
  budgetRemaining: number;
  onDraft: (player: PlayerSeason, positions: Position[]) => void;
}

export default function PlayerCard({
  player,
  draftablePositions,
  isDrafted,
  isReplaceable,
  budgetRemaining,
  onDraft,
}: PlayerCardProps) {
  const canAfford = player.cost <= budgetRemaining;
  const canDraft = draftablePositions.length > 0 && !isDrafted && canAfford;
  const positionStr = player.positions.map((p) => p.position).join("/");

  const overallColor =
    player.overall >= 88 ? "text-yellow-400" :
    player.overall >= 76 ? "text-emerald-400" :
    player.overall >= 65 ? "text-blue-400" :
    "text-zinc-400";

  const costDots = Array.from({ length: 5 }, (_, i) => i < player.cost);

  return (
    <div
      className={`relative p-3 rounded-xl border transition-all
        ${isDrafted
          ? "opacity-40 border-zinc-700 bg-zinc-900/50 cursor-not-allowed"
          : !canAfford
          ? "opacity-50 border-zinc-700 bg-zinc-900/50 cursor-not-allowed"
          : draftablePositions.length === 0
          ? "opacity-50 border-zinc-700 bg-zinc-900/50 cursor-not-allowed"
          : "border-zinc-700 bg-zinc-900 hover:border-orange-500/60 hover:bg-zinc-800 cursor-pointer"
        }`}
      onClick={() => canDraft && onDraft(player, draftablePositions)}
    >
      {isDrafted && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 z-10">
          <span className="text-xs font-bold text-zinc-400 tracking-widest">DRAFTED</span>
        </div>
      )}
      {isReplaceable && !isDrafted && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1.5 py-0.5 tracking-widest">
            SWAP
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">{player.name}</p>
          <p className="text-xs text-zinc-400">{positionStr}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold leading-tight ${overallColor}`}>{player.overall}</p>
          <div className="flex gap-0.5 justify-end mt-0.5">
            {costDots.map((filled, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${filled ? "bg-yellow-400" : "bg-zinc-700"}`}
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
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-300 font-medium">{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
