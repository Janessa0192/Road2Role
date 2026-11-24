import { query } from './index.js';

/**
 * Generic helper that inserts hand-written topic quizzes.
 *
 * There are NO hardcoded quizzes any more - practice questions are written by the AI
 * and cached in ai_quiz_questions (see services/quizAi.js). This helper stays for
 * tests/tools that want to insert a specific quiz; with no argument it inserts nothing.
 *
 * Question format: { q, explanation, options: [...], correct: <index in options> }
 */
export function seedQuizzes(quizzes = []) {
  let quizCount = 0;
  let questionCount = 0;

  query.tx(() => {
    for (const quiz of quizzes) {
      const topic = query.get(
        'SELECT 1 AS ok FROM roadmap_topics WHERE roadmap_slug = ? AND topic_key = ?',
        quiz.roadmap,
        quiz.topic,
      );
      if (!topic) continue; // roadmap/topic not seeded -> skip

      const res = query.run(
        `INSERT OR IGNORE INTO quizzes (roadmap_slug, topic_key, title, description, pass_percent)
         VALUES (?, ?, ?, ?, ?)`,
        quiz.roadmap,
        quiz.topic,
        quiz.title,
        quiz.description || null,
        quiz.pass ?? 60,
      );
      if (res.changes === 0) continue; // already exists
      quizCount += 1;

      quiz.questions.forEach((question, qi) => {
        const q = query.run(
          `INSERT INTO quiz_questions (quiz_id, question_text, explanation, order_index)
           VALUES (?, ?, ?, ?)`,
          res.lastInsertRowid,
          question.q,
          question.explanation || null,
          qi + 1,
        );
        questionCount += 1;
        question.options.forEach((text, oi) => {
          query.run(
            `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
             VALUES (?, ?, ?, ?)`,
            q.lastInsertRowid,
            text,
            oi === question.correct ? 1 : 0,
            oi + 1,
          );
        });
      });
    }
  });

  return { quizzes: quizCount, questions: questionCount };
}