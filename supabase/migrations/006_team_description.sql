-- Phase 1 of the "discussion" features: let creators attach an optional
-- description to a saved team so it can spark debate on the detail page.
alter table public_teams add column if not exists description text;
