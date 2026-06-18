create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('like', 'comment')),
  team_id text references public_teams(id) on delete cascade,
  team_name text,
  actor_browser_id text,
  actor_display_name text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on notifications(user_id, is_read, created_at desc);

alter table notifications enable row level security;
grant all on notifications to service_role;
