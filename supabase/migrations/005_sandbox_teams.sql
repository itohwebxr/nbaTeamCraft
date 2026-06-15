-- Add is_sandbox flag to public_teams so sandbox-mode builds can be saved
-- privately without appearing in public rankings or the Cup.
alter table public_teams add column if not exists is_sandbox boolean not null default false;

create index if not exists idx_public_teams_is_sandbox on public_teams(is_sandbox) where is_sandbox = false;
