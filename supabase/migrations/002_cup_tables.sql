-- TeamCraft Cup: weekly tournament tables

-- One entry per team per cup week.
-- A team can only enter once per week.
create table cup_entries (
  id          uuid primary key default gen_random_uuid(),
  cup_week    text not null,                         -- e.g. "2026-W25"
  public_team_id text not null references public_teams(id) on delete cascade,
  browser_id  text not null,
  wins        integer not null default 0,
  losses      integer not null default 0,
  points_for  integer not null default 0,
  points_against integer not null default 0,
  eliminated  boolean not null default false,
  created_at  timestamptz default now(),
  unique (cup_week, public_team_id)
);

-- One match row per (entry, played_on) — at most 1 match per day per entry.
create table cup_matches (
  id              uuid primary key default gen_random_uuid(),
  cup_week        text not null,
  home_entry_id   uuid not null references cup_entries(id) on delete cascade,
  away_entry_id   uuid not null references cup_entries(id) on delete cascade,
  home_score      integer not null,
  away_score      integer not null,
  quarter_scores  jsonb not null default '[]',
  home_box        jsonb not null default '[]',
  away_box        jsonb not null default '[]',
  played_on       date not null,
  created_at      timestamptz default now(),
  -- One match per entry per day (enforced on both home and away sides)
  unique (home_entry_id, played_on),
  unique (away_entry_id, played_on)
);

create index idx_cup_entries_cup_week  on cup_entries(cup_week);
create index idx_cup_entries_browser   on cup_entries(browser_id);
create index idx_cup_matches_cup_week  on cup_matches(cup_week);
create index idx_cup_matches_home      on cup_matches(home_entry_id);
create index idx_cup_matches_away      on cup_matches(away_entry_id);

-- Service role full access; no anon write
alter table cup_entries enable row level security;
alter table cup_matches  enable row level security;

create policy "public read cup_entries" on cup_entries for select using (true);
create policy "public read cup_matches"  on cup_matches  for select using (true);
