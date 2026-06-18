-- NBA Trivia Challenge

create table trivia_questions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('stats', 'career')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  question text not null,
  options jsonb not null,
  answer_index int not null,
  explanation text,
  season text,
  team_id text,
  player_name text,
  created_at timestamptz default now()
);

create table trivia_daily (
  date date primary key,
  question_ids uuid[] not null
);

create table trivia_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  mode text not null check (mode in ('daily', 'practice')),
  question_id uuid references trivia_questions(id) on delete cascade not null,
  is_correct boolean not null,
  answered_at timestamptz default now()
);

create index idx_trivia_results_user on trivia_results(user_id, date desc);
create index idx_trivia_results_question on trivia_results(question_id);

alter table trivia_questions enable row level security;
alter table trivia_daily enable row level security;
alter table trivia_results enable row level security;

grant select on trivia_questions to anon, authenticated;
grant select on trivia_daily to anon, authenticated;
grant all on trivia_questions to service_role;
grant all on trivia_daily to service_role;
grant all on trivia_results to service_role;
grant select, insert on trivia_results to anon, authenticated;
