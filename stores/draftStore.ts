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
      draftedPlayerIds: [...state.draftedPlayerIds, playerSeason.nba_player_id],
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

    const matchingStarters = playerPositions.filter((pos) =>
      vacantStarters.includes(pos)
    );

    if (matchingStarters.length === 0 && hasBenchVacancy) {
      return playerPositions.slice(0, 1);
    }

    return matchingStarters;
  },

  isPlayerDrafted: (nbaPlayerId) => {
    return get().draftedPlayerIds.includes(nbaPlayerId);
  },

  isRosterComplete: () => {
    return get().roster.length === 8;
  },
}));
