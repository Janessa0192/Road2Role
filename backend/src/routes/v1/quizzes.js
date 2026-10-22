
import { Router } from 'express';
import Joi from 'joi';
import { query } from '../../db/index.js';
import { ApiError } from '../../middleware/error.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

const idSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const startSchema = Joi.object({
  quizId: Joi.number().integer().positive().required(),
});

const answerSchema = Joi.object({
  questionId: Joi.number().integer().positive().required(),
  optionId: Joi.number().integer().positive().allow(null).required(),
});

const submitSchema = Joi.object({
  answers: Joi.array().items(answerSchema).required(),
});

/* GET /api/v1/quizzes?roadmap=frontend&topic=101-html */
router.get('/', (req, res) => {
  const { roadmap, topic } = req.query;

  let sql = `
    SELECT id, roadmap_slug, topic_key, title, description, pass_percent
    FROM quizzes
    WHERE is_active = 1
  `;
  const params = [];

  if (roadmap) {
    sql += ' AND roadmap_slug = ?';
    params.push(roadmap);
  }

  if (topic) {
    sql += ' AND topic_key = ?';
    params.push(topic);
  }

  sql += ' ORDER BY roadmap_slug, topic_key, id';

  res.json({ quizzes: query.all(sql, ...params) });
});

/* GET /api/v1/quizzes/:id - questions without correct answers */
router.get('/:id', validate({ params: idSchema }), (req, res) => {
  const quizId = Number(req.params.id);

  const quiz = query.get(
    `SELECT id, roadmap_slug, topic_key, title, description, pass_percent
     FROM quizzes WHERE id = ? AND is_active = 1`,
    quizId,
  );

  if (!quiz) {
    throw ApiError.notFound('quiz_not_found', 'Quiz not found');
  }

  const questions = query.all(
    `SELECT id, question_text, explanation, order_index
     FROM quiz_questions WHERE quiz_id = ?
     ORDER BY order_index, id`,
    quizId,
  );

  const result = questions.map((question) => ({
    ...question,
    options: query.all(
      `SELECT id, option_text, order_index
       FROM quiz_options WHERE question_id = ?
       ORDER BY order_index, id`,
      question.id,
    ),
  }));

  res.json({ quiz, questions: result });
});

/* POST /api/v1/quizzes/attempts - start attempt */
router.post('/attempts', requireAuth, validate({ body: startSchema }), (req, res) => {
  const { quizId } = req.body;

  const quiz = query.get(
    'SELECT id FROM quizzes WHERE id = ? AND is_active = 1',
    quizId,
  );

  if (!quiz) {
    throw ApiError.notFound('quiz_not_found', 'Quiz not found');
  }

  const attempt = query.run(
    'INSERT INTO quiz_attempts (user_id, quiz_id) VALUES (?, ?)',
    req.user.id,
    quizId,
  );

  const created = query.get(
    `SELECT id, quiz_id, total_questions, started_at
     FROM quiz_attempts WHERE id = ?`,
    attempt.lastInsertRowid,
  );

  res.status(201).json({ attempt: created });
});

/* POST /api/v1/quizzes/attempts/:id/answers */
router.post(
  '/attempts/:id/answers',
  requireAuth,
  validate({ params: idSchema, body: submitSchema }),
  (req, res) => {
    const attemptId = Number(req.params.id);
    const { answers } = req.body;

    const attempt = query.get(
      'SELECT id, quiz_id, user_id, submitted_at FROM quiz_attempts WHERE id = ?',
      attemptId,
    );

    if (!attempt || attempt.user_id !== req.user.id) {
      throw ApiError.notFound('attempt_not_found', 'Attempt not found');
    }

    if (attempt.submitted_at) {
      throw ApiError.badRequest('attempt_submitted', 'This attempt is already submitted');
    }

    query.tx(() => {
      for (const answer of answers) {
        query.run(
          `INSERT INTO quiz_attempt_answers
             (attempt_id, question_id, option_id)
           VALUES (?, ?, ?)`,
          attemptId,
          answer.questionId,
          answer.optionId,
        );
      }

      query.run(
        `UPDATE quiz_attempts
         SET submitted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        attemptId,
      );
    });

    const result = query.get(
      `SELECT id, quiz_title, score, total_questions, percent,
              pass_percent, passed, started_at, submitted_at, duration_seconds
       FROM quiz_attempts WHERE id = ?`,
      attemptId,
    );

    res.json({ result });
  },
);

/* GET /api/v1/quizzes/attempts/history - signed-in user's history */
router.get('/attempts/history', requireAuth, (req, res) => {
  const history = query.all(
    `SELECT attempt_id, quiz_id, quiz_title, roadmap_slug, topic_key,
            score, total_questions, percent, pass_percent, passed,
            started_at, submitted_at, duration_seconds
     FROM v_quiz_history
     WHERE user_id = ?
     ORDER BY submitted_at DESC`,
    req.user.id,
  );

  res.json({ history });
});

export default router;


/* GET /api/v1/quizzes/attempts/:id/review
   Reveal correct answers only after submission, to the attempt owner. */
router.get(
  '/attempts/:id/review',
  requireAuth,
  validate({ params: idSchema }),
  (req, res) => {
    const attemptId = Number(req.params.id);

    const attempt = query.get(
      `SELECT id, quiz_id, user_id, submitted_at
       FROM quiz_attempts
       WHERE id = ?`,
      attemptId,
    );

    if (!attempt || attempt.user_id !== req.user.id) {
      throw ApiError.notFound('attempt_not_found', 'Attempt not found');
    }

    if (!attempt.submitted_at) {
      throw ApiError.badRequest(
        'attempt_not_submitted',
        'Submit the quiz before viewing the answers',
      );
    }

    const questions = query.all(
      `SELECT
         q.id AS question_id,
         q.question_text,
         q.explanation,
         (
           SELECT o.option_text
           FROM quiz_options o
           WHERE o.question_id = q.id
             AND o.is_correct = 1
           LIMIT 1
         ) AS correct_option_text
       FROM quiz_questions q
       WHERE q.quiz_id = ?
       ORDER BY q.order_index, q.id`,
      attempt.quiz_id,
    );

    res.json({ questions });
  },
);
