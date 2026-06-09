-- NBA TeamCraft initial schema

create table players (
  id uuid primary key default gen_random_uuid(),
  nba_player_id text not null unique,  -- dim_player.personId from Kaggle
  name text not null,
  created_at timestamptz default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- e.g. "2000-01 Los Angeles Lakers"
  abbreviation text not null,   -- e.g. "LAL"
  season text not null,         -- e.g. "2000-01"
  created_at timestamptz default now(),
  unique (abbreviation, season)
);

create table player_seasons (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  team_id uuid not null references teams(id),
  season text not null,
  ppg numeric(5,2) not null default 0,
  rpg numeric(5,2) not null default 0,
  apg numeric(5,2) not null default 0,
  spg numeric(5,2) not null default 0,
  bpg numeric(5,2) not null default 0,
  mpg numeric(5,2) not null default 0,
  overall integer not null default 60,
  cost integer not null default 1 check (cost between 1 and 5),
  unique (player_id, team_id, season)
);

create table player_season_positions (
  id uuid primary key default gen_random_uuid(),
  player_season_id uuid not null references player_seasons(id) on delete cascade,
  position text not null check (position in ('PG','SG','SF','PF','C')),
  is_primary boolean not null default true
);

-- Indexes
create index idx_player_seasons_team_id on player_seasons(team_id);
create index idx_player_seasons_player_id on player_seasons(player_id);
create index idx_player_season_positions_season_id on player_season_positions(player_season_id);

-- RLS: public read-only
alter table players enable row level security;
alter table teams enable row level security;
alter table player_seasons enable row level security;
alter table player_season_positions enable row level security;

create policy "public read players" on players for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public read player_seasons" on player_seasons for select using (true);
create policy "public read player_season_positions" on player_season_positions for select using (true);
