-- sim_feed: public feed entries for simulation results shared to X
CREATE TABLE IF NOT EXISTS sim_feed (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind         text NOT NULL CHECK (kind IN ('matchup', 'playoff', 'season')),
  share_id     text,               -- references shares(id) for playoff/season
  result_url   text,               -- full result URL for matchup (query-param based)
  -- display summary
  title        text NOT NULL,      -- e.g. "Lakers def. Celtics 4-2"
  subtitle     text,               -- e.g. "Playoff · 8-Team" or "Season · ELITE"
  display_name text,
  avatar_url   text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sim_feed_created_at_idx ON sim_feed (created_at DESC);

ALTER TABLE sim_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_feed_select" ON sim_feed FOR SELECT USING (true);
CREATE POLICY "sim_feed_insert" ON sim_feed FOR INSERT WITH CHECK (true);
CREATE POLICY "sim_feed_delete_own" ON sim_feed
  FOR DELETE USING (auth.uid() = user_id);
