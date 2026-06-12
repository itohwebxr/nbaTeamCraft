-- Legend opponents have no cup entry, so legend matches are stored
-- self-referencing (home_entry_id = away_entry_id = user's entry).
-- This column records which legend team was actually faced.
alter table cup_matches add column legend_team_id text references public_teams(id);
