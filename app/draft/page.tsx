"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlayerSeason, Position, Team, STARTER_SLOTS, BENCH_SLOTS, RosterSlot, BenchSlot, TOTAL_BUDGET, TOTAL_ROSTER_SIZE } from "@/types";
import { gtm } from "@/lib/gtm";
import { useDraftStore } from "@/stores/draftStore";
import TeamCard from "@/components/draft/TeamCard";
import PlayerCard from "@/components/draft/PlayerCard";
import RosterSlotView from "@/components/draft/RosterSlotView";
import BudgetBar from "@/components/draft/BudgetBar";
import PositionSelectModal from "@/components/draft/PositionSelectModal";
import TeamLoadingScreen from "@/components/draft/TeamLoadingScreen";

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
      gtm.nextTeam(store.appearedTeamIds.length + 1);
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

    if (displaced) {
      gtm.draftReplace({
        new_player_name: player.name,
        old_player_name: displaced.playerSeason.name,
        cost_diff: player.cost - displaced.playerSeason.cost,
      });
    }

    gtm.draftPlayer({
      player_name: player.name,
      player_overall: player.overall,
      player_cost: player.cost,
      position,
      slot: isStarterPos ? "starter" : "bench",
      roster_size: nextSize,
    });

    store.draftPlayer(player, slot, position);
    setPendingDraft(null);
  };

  const { currentTeam, currentPlayers, roster, usedBudget } = store;
  const budgetRemaining = TOTAL_BUDGET - usedBudget;
  const totalSlots = TOTAL_ROSTER_SIZE;
  const filledSlots = roster.length;
  const draftedFromCurrentTeam = currentPlayers.some((p) => store.isPlayerDrafted(p.nba_player_id));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Image src="/logo.png" alt="NBA TeamCraft" height={32} width={60} className="object-contain w-10 md:w-[60px]" />
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
          {loading && <TeamLoadingScreen />}
          {currentTeam ? (
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
                    ? (TOTAL_ROSTER_SIZE - filledSlots)
                    : Math.max(0, TOTAL_ROSTER_SIZE - filledSlots - 1);
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
                      onBudgetBlock={(p) => gtm.budgetBlock({
                        player_overall: p.overall,
                        player_cost: p.cost,
                        budget_remaining: budgetRemaining,
                        roster_size: filledSlots,
                      })}
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
              <p className="hidden lg:block text-xs text-zinc-600 mb-2">6TH MAN</p>
              {BENCH_SLOTS.map((slot) => (
                <RosterSlotView
                  key={slot}
                  slot={slot}
                  entry={roster.find((e) => e.slot === slot)}
                />
              ))}
            </div>
          </div>

          {filledSlots < TOTAL_ROSTER_SIZE && (
            <button
              onClick={fetchNextTeam}
              disabled={!draftedFromCurrentTeam}
              className="w-full mt-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-400
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-bold text-sm transition-colors"
            >
              Next Team →
            </button>
          )}
          {filledSlots === TOTAL_ROSTER_SIZE && (
            <button
              onClick={() => {
                gtm.draftComplete({
                  used_budget: usedBudget,
                  remaining_budget: TOTAL_BUDGET - usedBudget,
                  teams_seen_count: store.appearedTeamIds.length,
                });
                router.push("/result");
              }}
              className="pulse-glow w-full mt-4 py-3.5 rounded-xl font-display font-black text-lg tracking-widest uppercase
                bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              🏆 View Results
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
                  gtm.draftReset({
                    roster_size_at_reset: store.roster.length,
                    used_budget_at_reset: store.usedBudget,
                  });
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
