-- Add questions_preview to trivia_feed so feed cards can show question teasers
-- Format: [{"q": "question text", "c": true/false}, ...]
ALTER TABLE trivia_feed ADD COLUMN IF NOT EXISTS questions_preview jsonb;
