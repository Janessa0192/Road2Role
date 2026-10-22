
-- Add quiz scope without changing existing quizzes.
ALTER TABLE quizzes
ADD COLUMN quiz_type TEXT NOT NULL DEFAULT 'topic'
CHECK (quiz_type IN ('topic', 'roadmap'));
