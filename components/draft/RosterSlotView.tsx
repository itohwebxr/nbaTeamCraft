"use client";

import { useEffect, useRef, useState } from "react";
import { RosterEntry, StarterSlot, BenchSlot } from "@/types";
import { overallColor } from "@/lib/overallColor";

interface RosterSlotViewProps {
  slot: StarterSlot | BenchSlot;
  entry: RosterEntry | undefined;
  waveIndex?: number | null; // when set, slot pulses in sequence (roster complete)
}

const SLOT_LABELS: Record<string, string> = {
  PG: "PG", SG: "SG", SF: "SF", PF: "PF", C: "C",
  BENCH1: "6TH",
};

export default function RosterSlotView({ slot, entry, waveIndex = null }: RosterSlotViewProps) {
  const label = SLOT_LABELS[slot] ?? slot;
  const isBench = slot.startsWith("BENCH");

  // Flash when this slot receives a new player
  const [flash, setFlash] = useState(false);
  const prevPlayerId = useRef<string | undefined>(entry?.playerSeason.id);
  useEffect(() => {
    const currentId = entry?.playerSeason.id;
    if (currentId && currentId !== prevPlayerId.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      prevPlayerId.current = currentId;
      return () => clearTimeout(t);
    }
    prevPlayerId.current = currentId;
  }, [entry?.playerSeason.id]);

  if (!entry) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed
        ${isBench ? "border-zinc-700 opacity-60" : "border-zinc-600"}`}>
        <span className="font-display text-xs font-bold text-zinc-500 w-8 shrink-0">{label}</span>
        <span className="text-xs text-zinc-600">Empty</span>
      </div>
    );
  }

  const animClass = flash || waveIndex != null ? "slot-flash" : "";
  const animStyle = waveIndex != null ? { animationDelay: `${waveIndex * 120}ms` } : undefined;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${animClass}
        ${isBench ? "bg-zinc-800/60" : "bg-zinc-800"}`}
      style={animStyle}
    >
      <span className="font-display text-xs font-bold text-orange-400 w-16 shrink-0">{label}</span>
      <span className="text-sm text-white font-medium truncate flex-1">{entry.playerSeason.name}</span>
      <span className={`font-display text-xs font-black ${overallColor(entry.playerSeason.overall)}`}>
        {entry.playerSeason.overall}
      </span>
    </div>
  );
}
