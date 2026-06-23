-- themes: curated team-build prompts / hashtags ("お題")
CREATE TABLE IF NOT EXISTS themes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,           -- "all-time-defense"
  title       text NOT NULL,                  -- "All-Time Best Defensive Team"
  hashtag     text NOT NULL,                  -- "AllTimeDefense" (stored without #)
  emoji       text,                           -- "🛡️"
  description text,                            -- one-line prompt
  category    text,                            -- "alltime" | "trade" | "team" | "constraint" | "fun"
  is_featured boolean NOT NULL DEFAULT true,   -- eligible for the daily featured rotation
  is_active   boolean NOT NULL DEFAULT true,
  post_count  integer NOT NULL DEFAULT 0,      -- display counter (best-effort)
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS themes_active_featured_idx ON themes (is_active, is_featured);

-- team_themes: which posted teams are tagged with which themes (M:N)
CREATE TABLE IF NOT EXISTS team_themes (
  team_id    text NOT NULL REFERENCES public_teams(id) ON DELETE CASCADE,
  theme_id   uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, theme_id)
);
CREATE INDEX IF NOT EXISTS team_themes_theme_idx ON team_themes (theme_id, created_at DESC);

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "themes_select" ON themes FOR SELECT USING (true);
CREATE POLICY "team_themes_select" ON team_themes FOR SELECT USING (true);
CREATE POLICY "team_themes_insert" ON team_themes FOR INSERT WITH CHECK (true);

-- Grants (themes are seeded by service_role; free user-created themes come later)
GRANT SELECT ON public.themes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.themes TO service_role;
GRANT SELECT ON public.team_themes TO anon, authenticated, service_role;
GRANT INSERT ON public.team_themes TO anon, authenticated, service_role;
GRANT DELETE ON public.team_themes TO authenticated, service_role;
