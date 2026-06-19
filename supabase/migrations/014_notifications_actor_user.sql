-- Add actor_user_id to notifications so logged-in likers/commenters can be identified and linked
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_actor_user ON notifications(actor_user_id);
