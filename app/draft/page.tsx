"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlayerSeason, Position, Team, STARTER_SLOTS, BENCH_SLOTS, RosterSlot } from "@/types";
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
    // Determine slot: starter if position matches a starter slot, otherwise bench
    const vacantStarters = store.getVacantStarterSlots();
    const isStarterPos = vacantStarters.includes(position);

    let slot: RosterSlot;
    if (isStarterPos) {
      slot = position;
    } else {
      const benchSlots = store.getVacantBenchSlots();
      slot = benchSlots[0];
    }

    store.draftPlayer(player, slot, position);
    setPendingDraft(null);

    if (store.roster.length + 1 === 8) {
      router.push("/result");
    }
  };

  const { currentTeam, currentPlayers, roster, usedBudget } = store;
  const budgetRemaining = 25 - usedBudget;
  const totalSlots = 8;
  const filledSlots = roster.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <h1 className="text-lg font-black text-orange-400 tracking-tight">NBA TeamCraft</h1>
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
        <div className="flex-1 min-w-0">
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
                <button
                  onClick={fetchNextTeam}
                  className="text-xs text-zinc-500 hover:text-orange-400 transition-colors"
                >
                  Skip →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentPlayers.map((player) => {
                  const draftablePositions = store.getDraftablePositions(player);
                  const isDrafted = store.isPlayerDrafted(player.nba_player_id);
                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      draftablePositions={draftablePositions}
                      isDrafted={isDrafted}
                      budgetRemaining={budgetRemaining}
                      onDraft={handleDraftAttempt}
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Right: My Roster */}
        <div className="lg:w-64 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            My Team
          </h3>
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-600 mb-2">STARTERS</p>
            {STARTER_SLOTS.map((slot) => (
              <RosterSlotView
                key={slot}
                slot={slot}
                entry={roster.find((e) => e.slot === slot)}
              />
            ))}
            <p className="text-xs text-zinc-600 mt-3 mb-2">BENCH</p>
            {BENCH_SLOTS.map((slot) => (
              <RosterSlotView
                key={slot}
                slot={slot}
                entry={roster.find((e) => e.slot === slot)}
              />
            ))}
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
    </div>
  );
}
