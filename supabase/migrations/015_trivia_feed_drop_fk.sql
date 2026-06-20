-- Drop the FK constraint on trivia_feed.share_id so entries can be inserted
-- independently of whether a shares record exists.
ALTER TABLE trivia_feed DROP CONSTRAINT IF EXISTS trivia_feed_share_id_fkey;
