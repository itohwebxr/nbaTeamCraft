-- Phase 2 of the "discussion" features: comments + comment likes on teams.
-- Lightweight, experimental moderation: length cap, soft-hide flag for admins,
-- and browser_id / user_id / ip captured for accountability.

create table if not exists team_comments (
  id          uuid primary key default gen_random_uuid(),
  team_id     text not null references public_teams(id) on delete cascade,
  browser_id  text,
  user_id     uuid references profiles(id) on delete set null,
  body        text not null,
  like_count  integer not null default 0,
  is_hidden   boolean not null default false,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_team_comments_team on team_comments(team_id, created_at desc);
create index if not exists idx_team_comments_browser on team_comments(browser_id);

create table if not exists comment_likes (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references team_comments(id) on delete cascade,
  browser_id  text not null,
  created_at  timestamptz not null default now(),
  unique (comment_id, browser_id)
);

-- Denormalized comment count on public_teams for cheap display in galleries
-- (TOP page Latest Builds, etc).
alter table public_teams add column if not exists comment_count integer not null default 0;

-- Maintain team_comments.like_count
create or replace function increment_comment_like(c_id uuid)
returns integer language plpgsql as $$
declare new_count integer;
begin
  update team_comments set like_count = like_count + 1 where id = c_id returning like_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

create or replace function decrement_comment_like(c_id uuid)
returns integer language plpgsql as $$
declare new_count integer;
begin
  update team_comments set like_count = greatest(like_count - 1, 0) where id = c_id returning like_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

-- Maintain public_teams.comment_count
create or replace function increment_team_comment_count(t_id text)
returns integer language plpgsql as $$
declare new_count integer;
begin
  update public_teams set comment_count = comment_count + 1 where id = t_id returning comment_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

create or replace function decrement_team_comment_count(t_id text)
returns integer language plpgsql as $$
declare new_count integer;
begin
  update public_teams set comment_count = greatest(comment_count - 1, 0) where id = t_id returning comment_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

-- Server routes use the service-role key, so lock down direct client access.
alter table team_comments enable row level security;
alter table comment_likes enable row level security;
