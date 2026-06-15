"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { RosterEntry, RosterSlot, StarterSlot, BenchSlot, Position, STARTER_SLOTS } from "@/types";
import { overallColor } from "@/lib/overallColor";
import { positionPenaltyMultiplier } from "@/lib/positionPenalty";

const SLOT_LABELS: Record<string, string> = {
  PG: "PG", SG: "SG", SF: "SF", PF: "PF", C: "C",
  BENCH1: "6TH",
};

// ── Penalty badge ─────────────────────────────────────────────────────────────

function PenaltyBadge({ multiplier }: { multiplier: number }) {
  if (multiplier >= 1.0) return null;
  const pct = Math.round((1 - multiplier) * 100);
  return (
    <span className="text-[10px] font-bold text-red-400 shrink-0">−{pct}%</span>
  );
}

// ── Native position badge shown when player is out-of-position ────────────────

function NativePosBadge({ entry }: { entry: RosterEntry }) {
  if (!STARTER_SLOTS.includes(entry.slot as StarterSlot)) return null;
  const natives = entry.playerSeason.positions.map((p) => p.position as Position);
  const assigned = entry.assignedPosition as Position;
  const isOutOfPos = !natives.includes(assigned);
  if (!isOutOfPos) return null;
  const primary = entry.playerSeason.positions.find((p) => p.is_primary)?.position
    ?? natives[0];
  return (
    <span className="text-[10px] font-bold text-amber-400 shrink-0" title={`Natural: ${natives.join("/")}`}>
      ({primary})
    </span>
  );
}

// ── Draggable item ─────────────────────────────────────────────────────────────

function DraggableSlot({
  slot,
  entry,
  waveIndex,
  isDraggingAny,
  isSandbox,
  onRemove,
}: {
  slot: RosterSlot;
  entry: RosterEntry | undefined;
  waveIndex?: number | null;
  isDraggingAny: boolean;
  isSandbox: boolean;
  onRemove?: (nbaPlayerId: string) => void;
}) {
  const label = SLOT_LABELS[slot] ?? slot;
  const isBench = slot.startsWith("BENCH");
  const id = `slot-${slot}`;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id,
    disabled: !entry,
    data: { slot },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({ id, data: { slot } });

  const setRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Flash on new entry
  const [flash, setFlash] = useState(false);
  const prevId = useRef<string | undefined>(entry?.playerSeason.id);
  useEffect(() => {
    const cur = entry?.playerSeason.id;
    if (cur && cur !== prevId.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      prevId.current = cur;
      return () => clearTimeout(t);
    }
    prevId.current = cur;
  }, [entry?.playerSeason.id]);

  const penalty = !isSandbox && entry && STARTER_SLOTS.includes(slot as StarterSlot)
    ? positionPenaltyMultiplier(
        entry.playerSeason.positions.map((p) => p.position as Position),
        entry.assignedPosition as Position
      )
    : 1.0;

  // touch-action: none is required for mobile — without it the browser
  // intercepts touchmove as scroll before dnd-kit can take over.
  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    ...(entry ? { touchAction: "none" } : {}),
  };

  const baseClass = `
    flex items-center gap-2 px-3 py-2 rounded-lg select-none transition-colors
    ${isBench ? "bg-zinc-800/60" : "bg-zinc-800"}
    ${isOver && isDraggingAny ? "ring-2 ring-orange-400" : ""}
    ${isDragging ? "opacity-40" : ""}
    ${flash ? "slot-flash" : ""}
    ${entry ? "cursor-grab active:cursor-grabbing" : ""}
  `;

  const animStyle: React.CSSProperties = waveIndex != null
    ? { ...style, animationDelay: `${waveIndex * 120}ms` }
    : style;

  if (!entry) {
    return (
      <div
        ref={setRef}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-colors
          ${isBench ? "border-zinc-700 opacity-60" : "border-zinc-600"}
          ${isOver && isDraggingAny ? "ring-2 ring-orange-400 border-transparent" : ""}
        `}
        style={animStyle}
      >
        <span className="font-display text-xs font-bold text-zinc-500 w-8 shrink-0">{label}</span>
        <span className="text-xs text-zinc-600">Empty</span>
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      className={baseClass}
      style={animStyle}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle indicator */}
      <span className="text-zinc-600 shrink-0 text-xs leading-none select-none">⠿</span>
      <span className={`font-display text-xs font-bold w-8 shrink-0
        ${penalty < 1.0 ? "text-red-400" : isBench ? "text-zinc-400" : "text-orange-400"}`}>
        {label}
      </span>
      <span className="text-sm text-white font-medium truncate flex-1">
        {entry.playerSeason.name}
      </span>
      {!isSandbox && <NativePosBadge entry={entry} />}
      {!isSandbox && <PenaltyBadge multiplier={penalty} />}
      <span className={`font-display text-xs font-black shrink-0 ${overallColor(entry.playerSeason.overall)}`}>
        {entry.playerSeason.overall}
      </span>
      {isSandbox && onRemove && (
        <button
          // stopPropagation on pointerdown so tapping × never starts a drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(entry.playerSeason.nba_player_id);
          }}
          className="shrink-0 text-zinc-500 hover:text-red-400 text-base leading-none px-1 -mr-1"
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Overlay card shown while dragging ─────────────────────────────────────────

function DragCard({ entry }: { entry: RosterEntry }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 shadow-xl ring-2 ring-orange-400 opacity-95">
      <span className="text-zinc-400 shrink-0 text-xs">⠿</span>
      <span className="font-display text-xs font-bold text-orange-400 w-8 shrink-0">
        {SLOT_LABELS[entry.slot] ?? entry.slot}
      </span>
      <span className="text-sm text-white font-medium truncate">{entry.playerSeason.name}</span>
      <span className={`font-display text-xs font-black shrink-0 ${overallColor(entry.playerSeason.overall)}`}>
        {entry.playerSeason.overall}
      </span>
    </div>
  );
}

// ── Main DraggableRoster ──────────────────────────────────────────────────────

interface DraggableRosterProps {
  slots: RosterSlot[];
  roster: RosterEntry[];
  label: string;
  filledSlots: number;
  totalSlots: number;
  waveOffset?: number;
  isSandbox?: boolean;
  onSwap: (slotA: RosterSlot, slotB: RosterSlot) => void;
  onRemove?: (nbaPlayerId: string) => void;
}

export default function DraggableRoster({
  slots,
  roster,
  label,
  filledSlots,
  totalSlots,
  waveOffset = 0,
  isSandbox = false,
  onSwap,
  onRemove,
}: DraggableRosterProps) {
  const [activeSlot, setActiveSlot] = useState<RosterSlot | null>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const activeEntry = activeSlot
    ? roster.find((e) => e.slot === activeSlot)
    : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    const slot = (event.active.data.current as { slot: RosterSlot }).slot;
    setActiveSlot(slot);
    setIsDraggingAny(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSlot(null);
    setIsDraggingAny(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const slotA = (active.data.current as { slot: RosterSlot }).slot;
    const slotB = (over.data.current as { slot: RosterSlot }).slot;
    onSwap(slotA, slotB);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-1.5">
        <p className="hidden lg:block text-xs text-zinc-600 mb-2">{label}</p>
        {slots.map((slot, i) => (
          <DraggableSlot
            key={slot}
            slot={slot}
            entry={roster.find((e) => e.slot === slot)}
            waveIndex={filledSlots === totalSlots ? waveOffset + i : null}
            isDraggingAny={isDraggingAny}
            isSandbox={isSandbox}
            onRemove={onRemove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeEntry ? <DragCard entry={activeEntry} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
