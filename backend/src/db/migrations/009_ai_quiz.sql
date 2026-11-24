-- ============================================================================
-- 009_ai_quiz.sql  (AI-generated MCQs, cached)
--
-- * ai_quiz_questions is a CACHE of questions written by the AI for one topic.
--   They are generated the first time a topic is quizzed and then re-used, so
--   the AI is only called when a topic has too few cached questions.
-- * The correct answer lives here (options_json + correct_index) and is never
--   sent to the browser until the learner has answered (POST /quizzes/ai/check).
-- * The old hand-written (hardcoded) quizzes are removed. Learners' past
--   attempts keep their score/title snapshot (quiz_id just becomes NULL).
-- ============================================================================

CREATE TABLE ai_quiz_questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_slug  TEXT    NOT NULL REFERENCES roadmaps(slug) ON DELETE CASCADE,
  topic_key     TEXT    NOT NULL,
  topic_label   TEXT,
  question_text TEXT    NOT NULL CHECK (length(trim(question_text)) > 0),
  options_json  TEXT    NOT NULL,                       -- JSON array of 4 strings
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (roadmap_slug, topic_key, question_text)
);
CREATE INDEX idx_ai_quiz_topic ON ai_quiz_questions(roadmap_slug, topic_key);

-- remove the hardcoded quizzes (questions + options cascade)
DELETE FROM quizzes;
