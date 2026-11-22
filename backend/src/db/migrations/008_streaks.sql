-- ============================================================================
-- 008_streaks.sql  (Learning streak)
--
-- One row per user per calendar day on which the user did "learning activity"
-- (marked a topic in progress / completed, or submitted a quiz).
--
--   day = 'YYYY-MM-DD' in the USER'S OWN timezone (the browser sends it in the
--         X-Timezone header), so a streak does not break because of UTC.
--
-- The streak itself is NOT stored - it is computed from these rows
-- (see src/lib/streak.js). That keeps it impossible to get out of sync.
-- ============================================================================

CREATE TABLE user_activity_days (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT    NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, day)
) WITHOUT ROWID;

CREATE INDEX idx_activity_user_day ON user_activity_days(user_id, day DESC);

-- Back-fill: existing learners keep the history they already earned
-- (dates are UTC here because the old rows have no timezone).
INSERT OR IGNORE INTO user_activity_days (user_id, day)
SELECT DISTINCT user_id, substr(updated_at, 1, 10)
  FROM user_progress
 WHERE status IN ('in_progress', 'completed');