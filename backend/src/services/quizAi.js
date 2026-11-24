import { query } from '../db/index.js';
import { ApiError } from '../middleware/error.js';
import { layoutTopicKeys, isLinkBox } from '../lib/topicContent.js';
import { complete, isAiConfigured, LlmError } from './llm.js';
import { loadTopic } from '../routes/v1/teacher.js';

/**
 * AI-generated MCQs with a database cache.
 *
 *   start  -> pick topics (what the learner studied, else the whole roadmap)
 *          -> topics with too few cached questions get new ones from the AI (once)
 *          -> random questions are returned WITHOUT the correct answer
 *   check  -> reveals the right option + explanation for ONE answered question
 */
export const PER_TOPIC = 5; // questions generated per AI call
const MAX_PER_TOPIC = 30; // cache cap per topic
const MAX_TOPICS_PER_START = 5;
const EXTRA_ROUNDS = 2; // extra AI batches when a quiz would otherwise have too few questions
const OPTION_COUNT = 4;

const SYSTEM = `You write multiple-choice quiz questions for learners on a tech learning-roadmap website.
Reply with ONLY a JSON array. No markdown fences, no commentary before or after it.`;

function userPrompt({ roadmapTitle, title, overview, n, avoid }) {
  return `Roadmap: ${roadmapTitle}
Topic: ${title}
Topic notes (can be short - use your own knowledge of the topic too):
${String(overview || '').slice(0, 3000) || '(none)'}

Write ${n} multiple-choice questions that test a learner's understanding of "${title}".
Rules:
- exactly ${OPTION_COUNT} options per question and only ONE of them is correct
- clear questions about the topic, a mix of concept and practical ones, no trick questions
- every option is short (under 100 characters) and different from the others
- "correct" is the 0-based index of the right option; vary its position between questions
- "explanation" is 1-2 short sentences saying why the correct option is right
${avoid.length ? `- do NOT repeat or rephrase these existing questions:\n${avoid.map((q) => `  * ${q}`).join('\n')}` : ''}

Format: [{"q":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}]`;
}

/* ------------------------------------------------------------- parsing --- */

/** Pulls a JSON array out of the model's reply and keeps only valid questions. */
export function parseQuestions(text) {
  let raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  raw = raw.slice(start, end + 1);

  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const out = [];
  for (const item of list) {
    const q = typeof item?.q === 'string' ? item.q.trim() : '';
    const options = Array.isArray(item?.options) ? item.options.map((o) => String(o ?? '').trim()) : [];
    const correct = Number(item?.correct);
    const explanation = typeof item?.explanation === 'string' ? item.explanation.trim().slice(0, 400) : '';

    if (!q || q.length > 400) continue;
    if (options.length !== OPTION_COUNT || options.some((o) => !o || o.length > 200)) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== OPTION_COUNT) continue;
    if (!Number.isInteger(correct) || correct < 0 || correct >= OPTION_COUNT) continue;
    if (seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    out.push({ q, options, correct, explanation });
  }
  return out;
}

/* ---------------------------------------------------------- generation --- */

function cachedCount(slug, topicKey) {
  return query.get(
    'SELECT COUNT(*) AS n FROM ai_quiz_questions WHERE roadmap_slug = ? AND topic_key = ?',
    slug,
    topicKey,
  ).n;
}

/** Asks the AI for questions on one topic and stores the valid ones. Returns how many were new. */
export async function generateForTopic(slug, topicKey) {
  const topic = loadTopic(slug, topicKey); // 404s for unknown roadmap/topic
  const avoid = query
    .all(
      'SELECT question_text FROM ai_quiz_questions WHERE roadmap_slug = ? AND topic_key = ? ORDER BY id DESC LIMIT 15',
      slug,
      topicKey,
    )
    .map((r) => r.question_text);

  let questions = [];
  for (let attempt = 0; attempt < 2 && !questions.length; attempt += 1) {
    const text = await complete({
      system: SYSTEM,
      messages: [
        { role: 'user', content: userPrompt({ roadmapTitle: topic.roadmapTitle, title: topic.title, overview: topic.overview, n: PER_TOPIC, avoid }) },
      ],
      maxTokens: 1000,
    });
    questions = parseQuestions(text);
  }
  if (!questions.length) throw new LlmError('The AI did not return usable questions', 502);

  let added = 0;
  query.tx(() => {
    for (const q of questions) {
      const res = query.run(
        `INSERT OR IGNORE INTO ai_quiz_questions
           (roadmap_slug, topic_key, topic_label, question_text, options_json, correct_index, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        slug,
        topicKey,
        topic.title,
        q.q,
        JSON.stringify(q.options),
        q.correct,
        q.explanation || null,
      );
      added += res.changes;
    }
  });
  return added;
}

/* ------------------------------------------------------------- topics ---- */

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roadmapTopicKeys(slug) {
  const roadmap = query.get('SELECT layout_json FROM roadmaps WHERE slug = ?', slug);
  if (!roadmap) throw ApiError.notFound('roadmap_not_found', 'Roadmap not found');
  let keys = [];
  if (roadmap.layout_json) {
    try {
      keys = layoutTopicKeys(JSON.parse(roadmap.layout_json));
    } catch {
      /* broken layout json -> fall back to the topics table */
    }
  }
  if (!keys.length) {
    keys = query.all('SELECT topic_key FROM roadmap_topics WHERE roadmap_slug = ?', slug).map((r) => r.topic_key);
  }
  return keys.filter((k) => !isLinkBox(k));
}

/** Topics the signed-in learner has started or completed on this roadmap (newest first). */
function studiedTopicKeys(slug, userId) {
  if (!userId) return [];
  return query
    .all(
      `SELECT topic_key FROM user_progress
        WHERE user_id = ? AND roadmap_slug = ? AND status IN ('completed', 'in_progress')
        ORDER BY last_accessed_at DESC`,
      userId,
      slug,
    )
    .map((r) => r.topic_key)
    .filter((k) => !isLinkBox(k));
}

/* --------------------------------------------------------------- start --- */

/**
 * @returns {{ source: 'topic'|'progress'|'roadmap', generated: number, available: number, questions: object[] }}
 */
export async function startQuiz({ slug, topic, count, userId, fresh = false }) {
  const all = roadmapTopicKeys(slug); // also 404s for an unknown roadmap

  let pool;
  let source;
  if (topic) {
    pool = [topic];
    source = 'topic';
  } else {
    const studied = studiedTopicKeys(slug, userId);
    pool = studied.length ? studied : all;
    source = studied.length ? 'progress' : 'roadmap';
  }
  if (!pool.length) throw ApiError.notFound('no_topics', 'This roadmap has no topics to quiz on yet');

  const chosen = topic
    ? pool
    : shuffle(pool).slice(0, Math.min(pool.length, Math.max(3, Math.min(MAX_TOPICS_PER_START, Math.ceil(count / 3)))));

  // topics that still need questions (or a fresh batch when the learner replays a single topic)
  const needs = chosen.filter((key) => {
    const n = cachedCount(slug, key);
    return fresh && topic ? n < MAX_PER_TOPIC : n < PER_TOPIC;
  });

  let generated = 0;
  let lastError = null;
  if (needs.length && isAiConfigured()) {
    const results = await Promise.allSettled(needs.map((key) => generateForTopic(slug, key)));
    for (const r of results) {
      if (r.status === 'fulfilled') generated += r.value;
      else lastError = r.reason;
    }
  }

  const marks = chosen.map(() => '?').join(',');
  const loadRows = () =>
    query.all(
      `SELECT id, topic_label, question_text, options_json
         FROM ai_quiz_questions
        WHERE roadmap_slug = ? AND topic_key IN (${marks})`,
      slug,
      ...chosen,
    );
  let rows = loadRows();

  // Not enough questions for what was asked (few topics studied, or some AI answers were unusable):
  // ask for up to two more batches on the same topics, then use whatever we have.
  for (let round = 0; round < EXTRA_ROUNDS && rows.length > 0 && rows.length < count && isAiConfigured(); round += 1) {
    const more = chosen.filter((key) => cachedCount(slug, key) < MAX_PER_TOPIC);
    if (!more.length) break;
    const results = await Promise.allSettled(more.map((key) => generateForTopic(slug, key)));
    for (const r of results) {
      if (r.status === 'fulfilled') generated += r.value;
      else lastError = r.reason;
    }
    const before = rows.length;
    rows = loadRows();
    if (rows.length === before) break; // the AI had nothing new to add
  }

  if (!rows.length) {
    if (!isAiConfigured()) {
      throw new ApiError(503, 'ai_not_configured', 'The AI quiz is not switched on yet. Ask the site owner to set GROQ_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY on the server.');
    }
    if (lastError instanceof ApiError) throw lastError;
    throw new ApiError(502, 'ai_unavailable', lastError?.message || 'Could not generate quiz questions right now. Please try again.');
  }

  const questions = shuffle(rows)
    .slice(0, count)
    .map((row) => {
      const options = JSON.parse(row.options_json).map((text, index) => ({ id: index, option_text: text }));
      return { id: row.id, topic_label: row.topic_label, question_text: row.question_text, options: shuffle(options) };
    });

  return { source, generated, available: rows.length, questions };
}

/* --------------------------------------------------------------- check --- */

export function checkAnswer(questionId, optionId) {
  const row = query.get(
    'SELECT options_json, correct_index, explanation FROM ai_quiz_questions WHERE id = ?',
    questionId,
  );
  if (!row) throw ApiError.notFound('question_not_found', 'Question not found');
  const options = JSON.parse(row.options_json);
  if (!Number.isInteger(optionId) || optionId < 0 || optionId >= options.length) {
    throw ApiError.badRequest('invalid_option', 'That option does not belong to this question');
  }
  return {
    correct: optionId === row.correct_index,
    correctOptionId: row.correct_index,
    correctOptionText: options[row.correct_index],
    explanation: row.explanation || '',
  };
}
