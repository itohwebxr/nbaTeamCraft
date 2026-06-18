create table team_simulations (
  id uuid primary key default gen_random_uuid(),
  team_id text references public_teams(id) on delete cascade not null,
  type text not null check (type in ('match', 'playoff', 'season')),
  result_data jsonb not null default '{}',
  created_at timestamptz default now()
);

create index idx_team_simulations_team on team_simulations(team_id, created_at desc);

alter table team_simulations enable row level security;
grant all on team_simulations to service_role;
grant select on team_simulations to anon, authenticated;
