"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlayerSeason, Position, Team, STARTER_SLOTS, BENCH_SLOTS, RosterSlot, TOTAL_BUDGET } from "@/types";
import { useDraftStore } from "@/stores/draftStore";
import TeamCard from "@/components/draft/TeamCard";
import PlayerCard from "@/components/draft/PlayerCard";
import RosterSlotView from "@/components/draft/RosterSlotView";
import BudgetBar from "@/components/draft/BudgetBar";
import PositionSelectModal from "@/components/draft/PositionSelectModal";

export default function DraftPage() {
  const router = useRouter();
  const store = useDraftStore();

  const [loading, setLoading] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    player: PlayerSeason;
    positions: Position[];
  } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchNextTeam = useCallback(async () => {
    setLoading(true);
    try {
      const excludeParam = store.appearedTeamIds.join(",");
      const res = await fetch(`/api/teams?exclude=${excludeParam}`);
      if (!res.ok) throw new Error("No teams available");
      const team: Team = await res.json();

      const playersRes = await fetch(`/api/players?teamId=${team.id}`);
      if (!playersRes.ok) throw new Error("Failed to load players");
      const players: PlayerSeason[] = await playersRes.json();

      store.setCurrentTeam(team, players);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [store]);

  // Load first team on mount
  useEffect(() => {
    if (!store.currentTeam) {
      fetchNextTeam();
    }
  }, []);

  const handleDraftAttempt = (player: PlayerSeason, positions: Position[]) => {
    if (positions.length === 1) {
      commitDraft(player, positions[0]);
    } else {
      setPendingDraft({ player, positions });
    }
  };

  const commitDraft = (player: PlayerSeason, position: Position) => {
    // If a player from the same team is already drafted, their slot becomes available
    const displaced = store.roster.find(
      (e) => e.playerSeason.team_id === player.team_id
    );

    const vacantStarters = store.getVacantStarterSlots();
    const effectiveVacantStarters =
      displaced && STARTER_SLOTS.includes(displaced.slot as Position)
        ? [...vacantStarters, displaced.slot as Position]
        : vacantStarters;
    const isStarterPos = effectiveVacantStarters.includes(position);

    let slot: RosterSlot;
    if (isStarterPos) {
      slot = position;
    } else {
      const benchSlots = store.getVacantBenchSlots();
      const effectiveBench =
        displaced && BENCH_SLOTS.includes(displaced.slot as BenchSlot)
          ? [...benchSlots, displaced.slot as BenchSlot]
          : benchSlots;
      slot = effectiveBench[0];
    }

    // Replacing keeps roster size same; new player raises it by 1
    const nextSize = displaced ? store.roster.length : store.roster.length + 1;

    store.draftPlayer(player, slot, position);
    setPendingDraft(null);

    if (nextSize === 8) {
      router.push("/result");
    }
  };

  const { currentTeam, currentPlayers, roster, usedBudget } = store;
  const budgetRemaining = TOTAL_BUDGET - usedBudget;
  const totalSlots = 8;
  const filledSlots = roster.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          <div className="flex-1">
            <BudgetBar used={usedBudget} />
          </div>
          <span className="text-xs text-zinc-400 shrink-0">
            {filledSlots}/{totalSlots}
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4">
        {/* Left: Team + Players */}
        <div className="flex-1 min-w-0 order-2 lg:order-1">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500">
              Loading team...
            </div>
          ) : currentTeam ? (
            <>
              <div className="mb-4">
                <TeamCard team={currentTeam} playerCount={currentPlayers.length} />
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Roster</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentPlayers.map((player) => {
                  const draftablePositions = store.getDraftablePositions(player);
                  const isDrafted = store.isPlayerDrafted(player.nba_player_id);
                  const displaced = !isDrafted
                    ? store.roster.find((e) => e.playerSeason.team_id === player.team_id)
                    : undefined;
                  const isReplaceable = displaced != null;
                  const refund = displaced?.playerSeason.cost ?? 0;
                  const budgetAfter = budgetRemaining - player.cost + refund;
                  // After drafting, remaining slots still needing to be filled
                  const slotsAfter = isReplaceable
                    ? (8 - filledSlots)       // replacing: count doesn't change
                    : Math.max(0, 8 - filledSlots - 1);
                  const budgetOk = budgetAfter >= 0 && budgetAfter >= slotsAfter;
                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      draftablePositions={draftablePositions}
                      isDrafted={isDrafted}
                      isReplaceable={isReplaceable}
                      budgetOk={budgetOk}
                      onDraft={handleDraftAttempt}
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Right: My Roster */}
        <div className="lg:w-64 shrink-0 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">My Team</h3>
            <button
              onClick={() => setShowResetModal(true)}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              Reset Draft
            </button>
          </div>
          <div className="space-y-1.5">
            <p className="hidden lg:block text-xs text-zinc-600 mb-2">STARTERS</p>
            {STARTER_SLOTS.map((slot) => (
              <RosterSlotView
                key={slot}
                slot={slot}
                entry={roster.find((e) => e.slot === slot)}
              />
            ))}
            <div className="mt-3">
              <p className="hidden lg:block text-xs text-zinc-600 mb-2">BENCH</p>
              {BENCH_SLOTS.map((slot) => (
                <RosterSlotView
                  key={slot}
                  slot={slot}
                  entry={roster.find((e) => e.slot === slot)}
                />
              ))}
            </div>
          </div>

          {filledSlots > 0 && filledSlots < 8 && (
            <button
              onClick={fetchNextTeam}
              className="w-full mt-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-400
                text-white font-bold text-sm transition-colors"
            >
              Next Team →
            </button>
          )}
        </div>
      </div>

      {/* Position select modal */}
      {pendingDraft && (
        <PositionSelectModal
          player={pendingDraft.player}
          positions={pendingDraft.positions}
          onSelect={(pos) => commitDraft(pendingDraft.player, pos)}
          onCancel={() => setPendingDraft(null)}
        />
      )}

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-black text-white mb-2">Start Over?</h2>
            <p className="text-sm text-zinc-400 mb-6">
              All selected players will be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  store.reset();
                  setShowResetModal(false);
                  fetchNextTeam();
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
