import { create } from "zustand";
import {
  Team,
  PlayerSeason,
  RosterEntry,
  RosterSlot,
  Position,
  StarterSlot,
  BenchSlot,
  STARTER_SLOTS,
  BENCH_SLOTS,
  TOTAL_BUDGET,
  TOTAL_ROSTER_SIZE,
} from "@/types";

interface DraftStore {
  appearedTeamIds: string[];
  draftedPlayerIds: string[];  // nba_player_id list
  currentTeam: Team | null;
  currentPlayers: PlayerSeason[];
  roster: RosterEntry[];
  totalBudget: number;
  usedBudget: number;
  setCurrentTeam: (team: Team, players: PlayerSeason[]) => void;
  draftPlayer: (playerSeason: PlayerSeason, slot: RosterSlot, assignedPosition: Position) => void;
  reset: () => void;
  getVacantStarterSlots: () => StarterSlot[];
  getVacantBenchSlots: () => BenchSlot[];
  getDraftablePositions: (player: PlayerSeason) => Position[];
  isPlayerDrafted: (nbaPlayerId: string) => boolean;
  isRosterComplete: () => boolean;
}

const initialState = {
  appearedTeamIds: [] as string[],
  draftedPlayerIds: [] as string[],
  currentTeam: null,
  currentPlayers: [] as PlayerSeason[],
  roster: [] as RosterEntry[],
  totalBudget: TOTAL_BUDGET,
  usedBudget: 0,
};

// For each position, ensure the highest-overall player holds the starter slot.
// Bench players are re-assigned BENCH1/BENCH2/BENCH3 in order.
function rebalanceSlots(roster: RosterEntry[]): RosterEntry[] {
  const starters: RosterEntry[] = [];
  const benchCandidates: RosterEntry[] = [];

  for (const pos of STARTER_SLOTS) {
    const group = roster
      .filter((e) => e.assignedPosition === pos)
      .sort((a, b) => b.playerSeason.overall - a.playerSeason.overall);
    if (group.length === 0) continue;
    starters.push({ ...group[0], slot: pos });
    for (let i = 1; i < group.length; i++) benchCandidates.push(group[i]);
  }

  const result = [...starters];
  BENCH_SLOTS.forEach((benchSlot, i) => {
    if (benchCandidates[i]) result.push({ ...benchCandidates[i], slot: benchSlot });
  });
  return result;
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  setCurrentTeam: (team, players) => {
    set((state) => ({
      currentTeam: team,
      currentPlayers: players,
      appearedTeamIds: [...state.appearedTeamIds, team.id],
    }));
  },

  draftPlayer: (playerSeason, slot, assignedPosition) => {
    set((state) => {
      // Remove existing player from the same team if any (1 player per team rule)
      const displaced = state.roster.find(
        (e) => e.playerSeason.team_id === playerSeason.team_id
      );
      const baseRoster = displaced
        ? state.roster.filter((e) => e.playerSeason.team_id !== playerSeason.team_id)
        : state.roster;
      const baseDraftedIds = displaced
        ? state.draftedPlayerIds.filter((id) => id !== displaced.playerSeason.nba_player_id)
        : state.draftedPlayerIds;
      const budgetRefund = displaced ? displaced.playerSeason.cost : 0;

      const newRoster = rebalanceSlots([
        ...baseRoster,
        { playerSeason, slot, assignedPosition },
      ]);
      return {
        roster: newRoster,
        draftedPlayerIds: [...baseDraftedIds, playerSeason.nba_player_id],
        usedBudget: state.usedBudget - budgetRefund + playerSeason.cost,
      };
    });
  },

  reset: () => set(initialState),

  getVacantStarterSlots: () => {
    const { roster } = get();
    const filledSlots = roster.map((e) => e.slot);
    return STARTER_SLOTS.filter((s) => !filledSlots.includes(s));
  },

  getVacantBenchSlots: () => {
    const { roster } = get();
    const filledSlots = roster.map((e) => e.slot);
    return BENCH_SLOTS.filter((s) => !filledSlots.includes(s));
  },

  getDraftablePositions: (player) => {
    const { roster } = get();
    const displaced = roster.find((e) => e.playerSeason.team_id === player.team_id);

    const vacantStarters = get().getVacantStarterSlots();
    const effectiveVacantStarters =
      displaced && STARTER_SLOTS.includes(displaced.slot as StarterSlot)
        ? [...vacantStarters, displaced.slot as StarterSlot]
        : vacantStarters;

    const vacantBench = get().getVacantBenchSlots();
    const hasBenchVacancy =
      vacantBench.length > 0 ||
      (displaced != null && BENCH_SLOTS.includes(displaced.slot as BenchSlot));

    const playerPositions = player.positions.map((p) => p.position);

    // Positions with a vacant starter slot
    const matchingVacantStarters = playerPositions.filter((pos) =>
      effectiveVacantStarters.includes(pos)
    );
    if (matchingVacantStarters.length > 0) return matchingVacantStarters;

    // Starter slot occupied but same position exists — still draftable to bench,
    // rebalance will auto-promote if this player has higher overall.
    const matchingOccupiedStarters = playerPositions.filter((pos) =>
      STARTER_SLOTS.includes(pos) && !effectiveVacantStarters.includes(pos)
    );
    if (matchingOccupiedStarters.length > 0 && hasBenchVacancy) {
      return matchingOccupiedStarters;
    }

    if (hasBenchVacancy) return playerPositions.slice(0, 1);

    return [];
  },

  isPlayerDrafted: (nbaPlayerId) => {
    return get().draftedPlayerIds.includes(nbaPlayerId);
  },

  isRosterComplete: () => {
    return get().roster.length === TOTAL_ROSTER_SIZE;
  },
}));
