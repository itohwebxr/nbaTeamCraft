import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  DraftMode,
  SandboxConfig,
} from "@/types";

interface DraftStore {
  // Game state
  appearedTeamIds: string[];
  draftedPlayerIds: string[];
  currentTeam: Team | null;
  currentPlayers: PlayerSeason[];
  roster: RosterEntry[];
  totalBudget: number;
  usedBudget: number;
  // Mode state
  mode: DraftMode;
  sandboxConfig: SandboxConfig;
  // Actions
  setCurrentTeam: (team: Team, players: PlayerSeason[]) => void;
  markTeamAppeared: (teamId: string) => void;
  clearCurrentTeam: () => void;
  draftPlayer: (playerSeason: PlayerSeason, slot: RosterSlot, assignedPosition: Position) => void;
  reset: () => void;
  setMode: (mode: DraftMode) => void;
  setSandboxConfig: (config: Partial<SandboxConfig>) => void;
  getVacantStarterSlots: () => StarterSlot[];
  getVacantBenchSlots: () => BenchSlot[];
  getDraftablePositions: (player: PlayerSeason) => Position[];
  isPlayerDrafted: (nbaPlayerId: string) => boolean;
  isRosterComplete: () => boolean;
}

const initialGameState = {
  appearedTeamIds: [] as string[],
  draftedPlayerIds: [] as string[],
  currentTeam: null as Team | null,
  currentPlayers: [] as PlayerSeason[],
  roster: [] as RosterEntry[],
  totalBudget: TOTAL_BUDGET,
  usedBudget: 0,
};

const initialModeState = {
  mode: "draft" as DraftMode,
  sandboxConfig: { teamFilter: "Random", seasonFilter: "Random" } as SandboxConfig,
};

const initialState = { ...initialGameState, ...initialModeState };

// For each position, ensure the highest-overall player holds the starter slot.
// Bench players are re-assigned BENCH1 in order.
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

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
  ...initialState,

  setCurrentTeam: (team, players) => {
    set((state) => ({
      currentTeam: team,
      currentPlayers: players,
      appearedTeamIds: [...state.appearedTeamIds, team.id],
    }));
  },

  markTeamAppeared: (teamId) => {
    set((state) => ({
      appearedTeamIds: state.appearedTeamIds.includes(teamId)
        ? state.appearedTeamIds
        : [...state.appearedTeamIds, teamId],
    }));
  },

  clearCurrentTeam: () => {
    set((state) => {
      // Remove any roster entries drafted from the current candidate team
      const currentTeamId = state.currentTeam?.id;
      const evicted = currentTeamId
        ? state.roster.filter((e) => e.playerSeason.team_id === currentTeamId)
        : [];
      const newRoster = currentTeamId
        ? state.roster.filter((e) => e.playerSeason.team_id !== currentTeamId)
        : state.roster;
      const evictedIds = evicted.map((e) => e.playerSeason.nba_player_id);
      const evictedCost = evicted.reduce((sum, e) => sum + e.playerSeason.cost, 0);

      return {
        currentTeam: null,
        currentPlayers: [],
        appearedTeamIds: [],
        roster: newRoster,
        draftedPlayerIds: state.draftedPlayerIds.filter((id) => !evictedIds.includes(id)),
        usedBudget: state.usedBudget - evictedCost,
      };
    });
  },


  draftPlayer: (playerSeason, slot, assignedPosition) => {
    set((state) => {
      // In sandbox mode allow multiple players from the same team — no displacement.
      const displaced =
        state.mode === "sandbox"
          ? undefined
          : state.roster.find((e) => e.playerSeason.team_id === playerSeason.team_id);
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

  // Resets game state but preserves mode and sandbox config (so Draft Again stays in same mode)
  reset: () => set((state) => ({
    ...initialGameState,
    mode: state.mode,
    sandboxConfig: state.sandboxConfig,
  })),

  setMode: (mode) => set({ mode }),

  setSandboxConfig: (config) => set((state) => ({
    sandboxConfig: { ...state.sandboxConfig, ...config },
  })),

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
    const { roster, mode } = get();
    // In sandbox mode, multiple players from the same team are allowed — no displacement.
    const displaced =
      mode === "sandbox"
        ? undefined
        : roster.find((e) => e.playerSeason.team_id === player.team_id);

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

    const matchingVacantStarters = playerPositions.filter((pos) =>
      effectiveVacantStarters.includes(pos)
    );
    if (matchingVacantStarters.length > 0) return matchingVacantStarters;

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
    }),
    {
      name: "nba-tc-draft-mode",
      partialize: (state) => ({
        mode: state.mode,
        sandboxConfig: state.sandboxConfig,
      }),
    }
  )
);
