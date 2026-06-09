type GtmEvent = Record<string, unknown> & { event: string };

function push(data: GtmEvent) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  (window as unknown as { dataLayer: GtmEvent[] }).dataLayer =
    (window as unknown as { dataLayer: GtmEvent[] }).dataLayer ?? [];
  (window as unknown as { dataLayer: GtmEvent[] }).dataLayer.push(data);
}

export const gtm = {
  draftPlayer: (params: {
    player_name: string;
    player_overall: number;
    player_cost: number;
    position: string;
    slot: string;
    roster_size: number;
  }) => push({ event: "draft_player", ...params }),

  draftReplace: (params: {
    new_player_name: string;
    old_player_name: string;
    cost_diff: number;
  }) => push({ event: "draft_replace", ...params }),

  nextTeam: (teams_seen_count: number) =>
    push({ event: "next_team", teams_seen_count }),

  draftComplete: (params: {
    used_budget: number;
    remaining_budget: number;
    teams_seen_count: number;
  }) => push({ event: "draft_complete", ...params }),

  viewResult: (params: {
    overall: number;
    tier: string;
    used_budget: number;
  }) => push({ event: "view_result", ...params }),

  shareTeam: (params: {
    team_name: string;
    overall: number;
    tier: string;
  }) => push({ event: "share_team", ...params }),

  draftReset: (params: {
    roster_size_at_reset: number;
    used_budget_at_reset: number;
  }) => push({ event: "draft_reset", ...params }),

  draftAgain: (params: {
    previous_overall: number;
    previous_tier: string;
  }) => push({ event: "draft_again", ...params }),

  budgetBlock: (params: {
    player_overall: number;
    player_cost: number;
    budget_remaining: number;
    roster_size: number;
  }) => push({ event: "budget_block", ...params }),
};
