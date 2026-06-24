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
    mode: string;
  }) => push({ event: "draft_player", ...params }),

  draftReplace: (params: {
    new_player_name: string;
    old_player_name: string;
    cost_diff: number;
    mode: string;
  }) => push({ event: "draft_replace", ...params }),

  draftRemovePlayer: (params: {
    player_name: string;
    player_overall: number;
    roster_size: number;
    mode: string;
  }) => push({ event: "draft_remove_player", ...params }),

  nextTeam: (teams_seen_count: number) =>
    push({ event: "next_team", teams_seen_count }),

  draftComplete: (params: {
    used_budget: number;
    remaining_budget: number;
    teams_seen_count: number;
    mode: string;
  }) => push({ event: "draft_complete", ...params }),

  viewResult: (params: {
    overall: number;
    tier: string;
    used_budget: number;
    mode: string;
  }) => push({ event: "view_result", ...params }),

  shareTeam: (params: {
    team_name: string;
    overall: number;
    tier: string;
    mode: string;
  }) => push({ event: "share_team", ...params }),

  draftReset: (params: {
    roster_size_at_reset: number;
    used_budget_at_reset: number;
    mode: string;
  }) => push({ event: "draft_reset", ...params }),

  draftAgain: (params: {
    previous_overall: number;
    previous_tier: string;
    mode: string;
  }) => push({ event: "draft_again", ...params }),

  budgetBlock: (params: {
    player_overall: number;
    player_cost: number;
    budget_remaining: number;
    roster_size: number;
  }) => push({ event: "budget_block", ...params }),

  enterRankings: (params: {
    team_name: string;
    overall: number;
    tier: string;
    rank_overall: number;
    has_description?: boolean;
  }) => push({ event: "enter_rankings", ...params }),

  shareRanking: (params: {
    team_name: string;
    overall: number;
    rank_overall: number;
  }) => push({ event: "share_ranking", ...params }),

  dreamDraftStart: () => push({ event: "dream_draft_start" }),

  sandboxStart: (params: {
    team_filter: string;
    season_filter: string;
  }) => push({ event: "sandbox_start", ...params }),

  sandboxFilterChange: (params: {
    filter_type: "team" | "season";
    value: string;
    team_filter: string;
    season_filter: string;
  }) => push({ event: "sandbox_filter_change", ...params }),

  exhibitionStart: (params: {
    team_overall: number;
    tier: string;
    session_match_number: number;
  }) => push({ event: "exhibition_start", ...params }),

  exhibitionResult: (params: {
    result: "win" | "loss";
    score_for: number;
    score_against: number;
    opponent_name: string;
    opponent_overall: number;
    session_wins: number;
    session_losses: number;
  }) => push({ event: "exhibition_result", ...params }),

  cupEnter: (params: {
    team_overall: number;
    tier: string;
    cup_week: string;
  }) => push({ event: "cup_enter", ...params }),

  cupDailyMatch: (params: {
    result: "win" | "loss";
    score_for: number;
    score_against: number;
    opponent_name: string;
    is_legend_opponent: boolean;
    match_number: number;
    cup_week: string;
  }) => push({ event: "cup_daily_match", ...params }),

  cupShare: (params: {
    wins: number;
    losses: number;
    cup_week: string;
    team_overall: number;
  }) => push({ event: "cup_share", ...params }),

  headerLoginClick: (params: {
    page_path: string;
  }) => push({ event: "header_login_click", ...params }),

  mypageView: (params: {
    teams_count: number;
    cup_entries_count: number;
  }) => push({ event: "mypage_view", ...params }),

  sandboxSave: (params: {
    team_name: string;
    overall: number;
    tier: string;
    has_description?: boolean;
  }) => push({ event: "sandbox_save", ...params }),

  remixTeam: (params: {
    team_name: string;
    overall: number;
    tier: string;
  }) => push({ event: "remix_team", ...params }),

  postComment: (params: {
    team_id: string;
    logged_in: boolean;
  }) => push({ event: "post_comment", ...params }),

  likeComment: (params: {
    team_id: string;
  }) => push({ event: "like_comment", ...params }),

  simulateMatch: (params: {
    home_team: string;
    away_team: string;
    mode: "single" | "series";
    winner: string;
  }) => push({ event: "simulate_match", ...params }),

  seriesPlaybackSkip: (params: {
    games_revealed: number;
    games_total: number;
  }) => push({ event: "series_playback_skip", ...params }),

  playoffStart: (params: {
    size: number;
    preset: string;
  }) => push({ event: "playoff_start", ...params }),

  playoffComplete: (params: {
    size: number;
    champion: string;
  }) => push({ event: "playoff_complete", ...params }),

  playoffShare: (params: {
    size: number;
    champion: string;
  }) => push({ event: "playoff_share", ...params }),

  playoffRoundSkip: (params: {
    round: number;
    size: number;
  }) => push({ event: "playoff_round_skip", ...params }),

  teamSearchFilter: (params: {
    filter: "all" | "real" | "built";
  }) => push({ event: "team_search_filter", ...params }),

  teamSearchShowMore: (params: {
    shown: number;
  }) => push({ event: "team_search_show_more", ...params }),

  seasonSimulate: (params: {
    team_overall: number;
  }) => push({ event: "season_simulate", ...params }),

  seasonShare: (params: {
    wins: number;
    losses: number;
    label: string;
  }) => push({ event: "season_share", ...params }),

  triviaHardSearch: (params: {
    query: string;
    results_count: number;
  }) => push({ event: "trivia_hard_search", ...params }),

  triviaHardAnswerSelected: (params: {
    is_correct: boolean;
    player_name: string;
  }) => push({ event: "trivia_hard_answer_selected", ...params }),

  triviaStart: (params: {
    gmode: "daily" | "practice";
    difficulty: "normal" | "hard";
    category: "mix" | "stats" | "career";
    question_count: number;
  }) => push({ event: "trivia_start", ...params }),

  triviaAnswer: (params: {
    gmode: "daily" | "practice";
    difficulty: "normal" | "hard";
    question_type: "stats" | "career";
    question_index: number;
    is_correct: boolean;
  }) => push({ event: "trivia_answer", ...params }),

  triviaComplete: (params: {
    gmode: "daily" | "practice";
    difficulty: "normal" | "hard";
    category: "mix" | "stats" | "career";
    score: number;
    total: number;
  }) => push({ event: "trivia_complete", ...params }),

  triviaShare: (params: {
    gmode: "daily" | "practice";
    difficulty: "normal" | "hard";
    score: number;
    total: number;
    source: "result" | "detail";
  }) => push({ event: "trivia_share", ...params }),

  triviaFeedPost: (params: {
    gmode: "daily" | "practice";
    difficulty: "normal" | "hard";
    score: number;
    total: number;
  }) => push({ event: "trivia_feed_post", ...params }),

  feedTabView: (params: {
    main_tab: "craft" | "simulate" | "trivia";
    sub_tab: "builder" | "dream" | null;
  }) => push({ event: "feed_tab_view", ...params }),

  feedViewAll: (params: {
    source: "simulate" | "trivia";
  }) => push({ event: "feed_view_all", ...params }),

  landingNextCta: (params: {
    page_type: "team" | "sim" | "trivia";
    target: "craft" | "simulate" | "trivia" | "theme";
    placement: "whatsnext" | "sticky" | "related" | "inline";
    experiment?: string;
    variant?: string;
  }) => push({ event: "landing_next_cta", ...params }),

  nudgeShown: (params: {
    page_type: "team" | "sim" | "trivia";
    placement: "sticky" | "inline";
    target: "craft" | "trivia" | "theme";
    experiment?: string;
    variant?: string;
  }) => push({ event: "nudge_shown", ...params }),

  nudgeDismissed: (params: {
    page_type: "team" | "sim" | "trivia";
    placement: "sticky" | "inline";
    target: "craft" | "trivia" | "theme";
    experiment?: string;
    variant?: string;
  }) => push({ event: "nudge_dismissed", ...params }),

  themeFeaturedView: (params: {
    theme_slug: string;
    placement: "home" | "landing";
  }) => push({ event: "theme_featured_view", ...params }),

  themeCtaClick: (params: {
    theme_slug: string;
    placement: "home" | "landing";
  }) => push({ event: "theme_cta_click", ...params }),

  themePost: (params: {
    theme_slug: string;
    mode: "sandbox" | "draft";
  }) => push({ event: "theme_post", ...params }),

  themeFeedView: (params: {
    theme_slug: string;
  }) => push({ event: "theme_feed_view", ...params }),

  followCtaClick: (params: {
    placement: "post_success" | "theme_feed" | "result_published" | "home_theme";
  }) => push({ event: "follow_cta_click", ...params }),

  // Stitch logged-in users across devices (GA4 user_id) — pushed once the auth
  // session is known.
  identify: (params: { user_id: string }) =>
    push({ event: "identify", ...params }),

  // First-party visit/retention context, pushed once per page load. GA4 tracks
  // new-vs-returning on its own, but exposing these as event params lets us
  // segment any event (e.g. theme_post) by returning vs. new in Explorations
  // and read the paid-cohort funnel.
  appOpen: (params: {
    visit_number: number;
    returning: boolean;
    days_since_first_visit: number;
  }) => push({ event: "app_open", ...params }),
};
