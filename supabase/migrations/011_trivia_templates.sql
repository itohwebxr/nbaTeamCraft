alter table trivia_questions
  add column if not exists template text not null default 'freetext',
  add column if not exists params jsonb not null default '{}';

create index idx_trivia_questions_template on trivia_questions(template);
