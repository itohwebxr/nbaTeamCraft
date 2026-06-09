"use client";

import { PlayerSeason, Position } from "@/types";

interface PositionSelectModalProps {
  player: PlayerSeason;
  positions: Position[];
  onSelect: (position: Position) => void;
  onCancel: () => void;
}

export default function PositionSelectModal({
  player,
  positions,
  onSelect,
  onCancel,
}: PositionSelectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-1">Choose Position</h3>
        <p className="text-zinc-400 text-sm mb-5">
          Where will <span className="text-white font-semibold">{player.name}</span> play?
        </p>

        <div className="flex flex-col gap-2">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => onSelect(pos)}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-orange-500
                text-white font-bold text-sm tracking-widest transition-colors"
            >
              {pos}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
