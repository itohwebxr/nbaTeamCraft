-- Profiles table: linked to Supabase Auth users via X (Twitter) OAuth.
-- Created on first login; browser_id can be migrated to user_id.

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  x_handle    text,
  display_name text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Add user_id to cup_entries (nullable — anonymous entries keep browser_id only)
alter table cup_entries add column user_id uuid references profiles(id) on delete set null;
alter table public_teams add column user_id uuid references profiles(id) on delete set null;

create index idx_cup_entries_user_id on cup_entries(user_id);
create index idx_public_teams_user_id on public_teams(user_id);

alter table profiles enable row level security;
create policy "public read profiles" on profiles for select using (true);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- Trigger to auto-create a profile row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, x_handle, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
