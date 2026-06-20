-- Add like/comment counts to existing feed tables
ALTER TABLE sim_feed ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;
ALTER TABLE sim_feed ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;
ALTER TABLE trivia_feed ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;
ALTER TABLE trivia_feed ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- Unified likes table for sim_feed and trivia_feed entries
CREATE TABLE IF NOT EXISTS feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type text NOT NULL CHECK (feed_type IN ('sim', 'trivia')),
  feed_id uuid NOT NULL,
  browser_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (feed_type, feed_id, browser_id)
);

-- Unified comments table
CREATE TABLE IF NOT EXISTS feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type text NOT NULL CHECK (feed_type IN ('sim', 'trivia')),
  feed_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  display_name text,
  avatar_url text,
  body text NOT NULL CHECK (length(body) <= 280),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_likes_target ON feed_likes (feed_type, feed_id);
CREATE INDEX IF NOT EXISTS feed_comments_target ON feed_comments (feed_type, feed_id, created_at DESC);

ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_likes_select" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "feed_likes_insert" ON feed_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "feed_likes_delete" ON feed_likes FOR DELETE USING (true);

CREATE POLICY "feed_comments_select" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "feed_comments_insert" ON feed_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "feed_comments_delete" ON feed_comments FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.feed_likes TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.feed_comments TO anon, authenticated, service_role;
GRANT DELETE ON public.feed_comments TO authenticated, service_role;
GRANT UPDATE ON public.sim_feed TO anon, authenticated, service_role;
GRANT UPDATE ON public.trivia_feed TO anon, authenticated, service_role;
