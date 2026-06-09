"use client";

import { RosterEntry, StarterSlot, BenchSlot } from "@/types";

interface RosterSlotViewProps {
  slot: StarterSlot | BenchSlot;
  entry: RosterEntry | undefined;
}

const SLOT_LABELS: Record<string, string> = {
  PG: "PG", SG: "SG", SF: "SF", PF: "PF", C: "C",
  BENCH1: "6TH",
};

export default function RosterSlotView({ slot, entry }: RosterSlotViewProps) {
  const label = SLOT_LABELS[slot] ?? slot;
  const isBench = slot.startsWith("BENCH");

  if (!entry) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed
        ${isBench ? "border-zinc-700 opacity-60" : "border-zinc-600"}`}>
        <span className="text-xs font-bold text-zinc-500 w-8 shrink-0">{label}</span>
        <span className="text-xs text-zinc-600">Empty</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg
      ${isBench ? "bg-zinc-800/60" : "bg-zinc-800"}`}>
      <span className="text-xs font-bold text-orange-400 w-16 shrink-0">{label}</span>
      <span className="text-sm text-white font-medium truncate flex-1">{entry.playerSeason.name}</span>
      <span className="text-xs text-zinc-400">{entry.playerSeason.overall}</span>
      <span className="text-xs font-bold text-yellow-400">C{entry.playerSeason.cost}</span>
    </div>
  );
}
