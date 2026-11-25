import { Router } from 'express';
import Joi from 'joi';
import config from '../../config.js';
import { ApiError } from '../../middleware/error.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { isAiConfigured, LlmError } from '../../services/llm.js';
import { askQuestion, reviewInterview } from '../../services/interviewAi.js';

/**
 * Mock interview API (stateless: the browser sends the transcript so far each time).
 *
 *   POST /api/v1/interview/start  { role, level, lang, total }
 *        -> { question, index: 1, total }
 *   POST /api/v1/interview/answer { role, level, lang, total, turns: [{question, answer}], question, answer }
 *        -> { done: false, question, index, total }       next question
 *        -> { done: true, review: { score, verdict, strengths, improvements, tips, questions[] } }
 *
 * Needs a signed-in learner (every call uses the AI). Practice mode: nothing is stored.
 */
const router = Router();

if (!config.isTest) {
  router.use(createRateLimiter({ windowMs: 60_000, max: Number(process.env.INTERVIEW_RATE_LIMIT_MAX || 20), name: 'interview' }));
}

const base = {
  role: Joi.string().trim().min(2).max(80).required(),
  level: Joi.string().valid('fresher', 'junior', 'mid').default('fresher'),
  lang: Joi.string().valid('en', 'hi', 'hinglish').default('en'),
  total: Joi.number().integer().min(3).max(10).default(5),
};

const startSchema = Joi.object(base);

const answerSchema = Joi.object({
  ...base,
  turns: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().trim().min(1).max(600).required(),
        answer: Joi.string().trim().min(1).max(2000).required(),
      }),
    )
    .max(9)
    .default([]),
  question: Joi.string().trim().min(1).max(600).required(),
  answer: Joi.string().trim().min(1).max(2000).required(),
});

function ensureAi() {
  if (!isAiConfigured()) {
    throw new ApiError(503, 'ai_not_configured', 'Interview practice is not switched on yet. Ask the site owner to set GROQ_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY on the server.');
  }
}

const wrap = (err) => (err instanceof LlmError ? new ApiError(err.status === 503 ? 503 : 502, 'ai_unavailable', err.message) : err);

router.post('/start', requireAuth, validate({ body: startSchema }), async (req, res, next) => {
  try {
    ensureAi();
    const { role, level, lang, total } = req.body;
    const question = await askQuestion({ role, level, lang, total, turns: [] });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ question, index: 1, total });
  } catch (err) {
    next(wrap(err));
  }
});

router.post('/answer', requireAuth, validate({ body: answerSchema }), async (req, res, next) => {
  try {
    ensureAi();
    const { role, level, lang, total, question, answer } = req.body;
    if (req.body.turns.length >= total) {
      throw ApiError.badRequest('interview_finished', 'This interview already has all its questions');
    }
    const turns = [...req.body.turns, { question, answer }];
    res.setHeader('Cache-Control', 'no-store');
    if (turns.length >= total) {
      const review = await reviewInterview({ role, level, lang, turns });
      res.json({ done: true, review });
      return;
    }
    const next_ = await askQuestion({ role, level, lang, total, turns });
    res.json({ done: false, question: next_, index: turns.length + 1, total });
  } catch (err) {
    next(wrap(err));
  }
});

export default router;
