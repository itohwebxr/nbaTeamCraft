-- Manual override for the home "Today's Theme" featured slot.
-- When any active theme has featured_priority set, the highest-priority one
-- becomes the main featured theme (and the next ones fill the sub slots),
-- overriding the deterministic daily rotation. NULL = not pinned (rotation).
ALTER TABLE themes ADD COLUMN IF NOT EXISTS featured_priority smallint;

-- Index the pinned rows so the lookup is cheap (most rows are NULL).
CREATE INDEX IF NOT EXISTS themes_featured_priority_idx
  ON themes (featured_priority DESC)
  WHERE featured_priority IS NOT NULL;
