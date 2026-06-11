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
  // Sandbox: tracks the player drafted in the current screen visit (overwritable)
  currentVisitDraftedId: string | null;
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
  swapRosterSlots: (slotA: RosterSlot, slotB: RosterSlot) => void;
}

const initialGameState = {
  appearedTeamIds: [] as string[],
  draftedPlayerIds: [] as string[],
  currentVisitDraftedId: null as string | null,
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
      // New screen visit — reset the overwritable pick slot
      currentVisitDraftedId: null,
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
      // Evict only the current-visit pick (if any); confirmed picks from previous visits stay.
      const evictId = state.currentVisitDraftedId;
      const evicted = evictId
        ? state.roster.filter((e) => e.playerSeason.nba_player_id === evictId)
        : [];
      const newRoster = evictId
        ? state.roster.filter((e) => e.playerSeason.nba_player_id !== evictId)
        : state.roster;
      const evictedCost = evicted.reduce((sum, e) => sum + e.playerSeason.cost, 0);

      return {
        currentTeam: null,
        currentPlayers: [],
        appearedTeamIds: [],
        currentVisitDraftedId: null,
        roster: newRoster,
        draftedPlayerIds: evictId
          ? state.draftedPlayerIds.filter((id) => id !== evictId)
          : state.draftedPlayerIds,
        usedBudget: state.usedBudget - evictedCost,
      };
    });
  },

  draftPlayer: (playerSeason, slot, assignedPosition) => {
    set((state) => {
      let displaced: RosterEntry | undefined;
      if (state.mode === "sandbox") {
        // In sandbox: only displace the current-visit pick (overwrite within same screen).
        // Confirmed picks from previous visits are never displaced.
        displaced = state.currentVisitDraftedId
          ? state.roster.find(
              (e) => e.playerSeason.nba_player_id === state.currentVisitDraftedId
            )
          : undefined;
      } else {
        // Draft mode: one player per team rule.
        displaced = state.roster.find(
          (e) => e.playerSeason.team_id === playerSeason.team_id
        );
      }

      const baseRoster = displaced
        ? state.roster.filter(
            (e) => e.playerSeason.nba_player_id !== displaced!.playerSeason.nba_player_id
          )
        : state.roster;
      const baseDraftedIds = displaced
        ? state.draftedPlayerIds.filter((id) => id !== displaced!.playerSeason.nba_player_id)
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
        // Track the current-visit pick (sandbox only)
        currentVisitDraftedId:
          state.mode === "sandbox" ? playerSeason.nba_player_id : state.currentVisitDraftedId,
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
    const { roster, mode, currentVisitDraftedId } = get();

    let displaced: RosterEntry | undefined;
    if (mode === "sandbox") {
      // Only the current-visit pick counts as displaceable
      displaced = currentVisitDraftedId
        ? roster.find((e) => e.playerSeason.nba_player_id === currentVisitDraftedId)
        : undefined;
    } else {
      displaced = roster.find((e) => e.playerSeason.team_id === player.team_id);
    }

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

  swapRosterSlots: (slotA, slotB) => {
    set((state) => {
      const entryA = state.roster.find((e) => e.slot === slotA);
      const entryB = state.roster.find((e) => e.slot === slotB);
      if (!entryA && !entryB) return {};

      const newRoster = state.roster.map((e) => {
        if (e.slot === slotA && entryB) {
          // entryB moves into slotA; assignedPosition follows the slot for starters
          const newAssigned = STARTER_SLOTS.includes(slotA as StarterSlot)
            ? (slotA as Position)
            : e.assignedPosition;
          return { ...entryB, slot: slotA, assignedPosition: newAssigned };
        }
        if (e.slot === slotB && entryA) {
          const newAssigned = STARTER_SLOTS.includes(slotB as StarterSlot)
            ? (slotB as Position)
            : e.assignedPosition;
          return { ...entryA, slot: slotB, assignedPosition: newAssigned };
        }
        return e;
      });

      // If one slot was empty, move the existing entry to the empty slot
      if (entryA && !entryB) {
        const moved = newRoster.map((e) => {
          if (e.slot === slotA && e.playerSeason.nba_player_id === entryA.playerSeason.nba_player_id) {
            const newAssigned = STARTER_SLOTS.includes(slotB as StarterSlot)
              ? (slotB as Position)
              : e.assignedPosition;
            return { ...e, slot: slotB, assignedPosition: newAssigned };
          }
          return e;
        });
        return { roster: moved };
      }

      return { roster: newRoster };
    });
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
