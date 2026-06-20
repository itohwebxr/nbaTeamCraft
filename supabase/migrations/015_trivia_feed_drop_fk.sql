-- Drop the FK constraint on trivia_feed.share_id so entries can be inserted
-- independently of whether a shares record exists.
ALTER TABLE trivia_feed DROP CONSTRAINT IF EXISTS trivia_feed_share_id_fkey;

-- Grant explicit permissions to all roles for trivia_feed and sim_feed.
-- service_role bypasses RLS but still needs table-level GRANT.
GRANT SELECT, INSERT ON public.trivia_feed TO anon, authenticated, service_role;
GRANT DELETE ON public.trivia_feed TO authenticated, service_role;

GRANT SELECT, INSERT ON public.sim_feed TO anon, authenticated, service_role;
GRANT DELETE ON public.sim_feed TO authenticated, service_role;
