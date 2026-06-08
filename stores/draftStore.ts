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
} from "@/types";

interface DraftStore {
  // Session state
  appearedTeamIds: string[];
  draftedBbrefIds: string[];

  // Current team display
  currentTeam: Team | null;
  currentPlayers: PlayerSeason[];

  // Roster
  roster: RosterEntry[];

  // Budget
  totalBudget: number;
  usedBudget: number;

  // Actions
  setCurrentTeam: (team: Team, players: PlayerSeason[]) => void;
  draftPlayer: (playerSeason: PlayerSeason, slot: RosterSlot, assignedPosition: Position) => void;
  reset: () => void;

  // Derived helpers
  getVacantStarterSlots: () => StarterSlot[];
  getVacantBenchSlots: () => BenchSlot[];
  getDraftablePositions: (player: PlayerSeason) => Position[];
  isPlayerDrafted: (bbrefId: string) => boolean;
  isRosterComplete: () => boolean;
}

const initialState = {
  appearedTeamIds: [] as string[],
  draftedBbrefIds: [] as string[],
  currentTeam: null,
  currentPlayers: [] as PlayerSeason[],
  roster: [] as RosterEntry[],
  totalBudget: TOTAL_BUDGET,
  usedBudget: 0,
};

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
    set((state) => ({
      roster: [...state.roster, { playerSeason, slot, assignedPosition }],
      draftedBbrefIds: [...state.draftedBbrefIds, playerSeason.bbref_player_id],
      usedBudget: state.usedBudget + playerSeason.cost,
    }));
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
    const vacantStarters = get().getVacantStarterSlots();
    const hasBenchVacancy = get().getVacantBenchSlots().length > 0;
    const playerPositions = player.positions.map((p) => p.position);

    // Positions that match vacant starter slots
    const matchingStarters = playerPositions.filter((pos) =>
      vacantStarters.includes(pos)
    );

    // Bench is position-free: any position works if bench slot is open
    // We represent bench-eligible as returning the player's primary position
    if (matchingStarters.length === 0 && hasBenchVacancy) {
      // Only bench available — return primary position to assign to bench
      return playerPositions.slice(0, 1);
    }

    return matchingStarters;
  },

  isPlayerDrafted: (bbrefId) => {
    return get().draftedBbrefIds.includes(bbrefId);
  },

  isRosterComplete: () => {
    const { roster } = get();
    return roster.length === 8;
  },
}));
