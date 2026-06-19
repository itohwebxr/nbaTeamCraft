-- trivia_feed: public feed entries created when a user shares their trivia result
CREATE TABLE IF NOT EXISTS trivia_feed (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  share_id    text REFERENCES shares(id) ON DELETE CASCADE,
  score       integer NOT NULL,
  total       integer NOT NULL,
  gmode       text NOT NULL CHECK (gmode IN ('daily', 'practice')),
  difficulty  text NOT NULL CHECK (difficulty IN ('normal', 'hard')),
  display_name text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trivia_feed_created_at_idx ON trivia_feed (created_at DESC);

-- Public read, authenticated insert
ALTER TABLE trivia_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trivia_feed_select" ON trivia_feed
  FOR SELECT USING (true);

CREATE POLICY "trivia_feed_insert" ON trivia_feed
  FOR INSERT WITH CHECK (true);

CREATE POLICY "trivia_feed_delete_own" ON trivia_feed
  FOR DELETE USING (auth.uid() = user_id);
