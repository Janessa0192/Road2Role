import { Router } from 'express';
import Joi from 'joi';
import config from '../../config.js';
import { query } from '../../db/index.js';
import { cache } from '../../lib/cache.js';
import { resolveTopic } from '../../lib/topicContent.js';
import { ApiError } from '../../middleware/error.js';
import { validate, common } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { complete, completeStream, isAiConfigured, LlmError } from '../../services/llm.js';

/**
 * Voice teacher API.
 *
 *   GET  /api/v1/teacher/status                      -> { ai: boolean }
 *   GET  /api/v1/teacher/lesson?roadmap=&topic=&lang=-> a lesson split into short spoken segments
 *   POST /api/v1/teacher/ask                         -> answer to a learner's doubt (needs login + AI key)
 *
 * The browser does the actual speaking (Web Speech API); the server only decides WHAT to say.
 *   - with a configured AI provider key -> "ai" mode: the topic is explained like a friendly teacher
 *   - without a key           -> "basic" mode: the topic's own text is read out loud
 */
const router = Router();

if (!config.isTest) {
  router.use(createRateLimiter({ windowMs: 60_000, max: config.teacherRateLimitMax, name: 'teacher' }));
}

const LANGS = ['en', 'hi', 'hinglish'];
const LANG_RULES = {
  en: 'Speak in simple, clear English.',
  hi: 'Speak in simple Hindi written in Devanagari script. Keep technical words (like API, loop, variable) in English.',
  hinglish:
    'Speak in friendly Hinglish: Hindi sentences written in the Roman/English alphabet, mixed naturally with English technical words. Example tone: "Chalo ab samjhte hain ki variable kya hota hai."',
};

const topicKeySchema = Joi.string().trim().max(300).required();

const lessonQuery = Joi.object({
  roadmap: common.slug.required(),
  topic: topicKeySchema,
  lang: Joi.string().valid(...LANGS).default('en'),
  stream: Joi.boolean().default(false),
});

const askBody = Joi.object({
  roadmap: common.slug.required(),
  topic: topicKeySchema,
  question: Joi.string().trim().min(2).max(500).required(),
  lang: Joi.string().valid(...LANGS).default('en'),
  history: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().trim().max(1500).required(),
      }),
    )
    .max(6)
    .default([]),
  stream: Joi.boolean().default(false),
});

/* ------------------------------------------------------------ helpers ---- */

function humanize(key) {
  const last = String(key).split(':').pop().replace(/@.*$/, '').replace(/^\d+-/, '');
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Roadmap + topic label + overview text for one topic, or throws 404. */
export function loadTopic(slug, topicKey) {
  const roadmap = query.get('SELECT title, layout_json FROM roadmaps WHERE slug = ?', slug);
  if (!roadmap) throw ApiError.notFound('roadmap_not_found', 'Roadmap not found');

  let label = null;
  if (roadmap.layout_json) {
    try {
      const layout = JSON.parse(roadmap.layout_json);
      label = (layout.nodes || []).find((n) => n.type === 'topic' && n.key === topicKey)?.label || null;
    } catch {
      /* broken layout json -> fall through */
    }
  }
  const row = query.get('SELECT label, content_md FROM roadmap_topics WHERE roadmap_slug = ? AND topic_key = ?', slug, topicKey);
  if (!label && row) label = row.label;
  if (!label && !roadmap.layout_json) throw ApiError.notFound('topic_not_found', 'Topic not found on this roadmap');

  const title = label || humanize(topicKey);
  const resolved = resolveTopic(slug, roadmap.title, topicKey, title);
  // plain topics (no diagram) keep their overview in the DB
  const overview = resolved.description || row?.content_md || '';
  return { roadmapTitle: roadmap.title, title, overview };
}

/** Markdown -> plain text that sounds natural when read aloud. */
export function toSpeakable(md) {
  return String(md || '')
    .replace(/\r/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_`~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Groups sentences into segments of ~2 sentences / ~260 chars so captions stay short. */
export function toSegments(text, maxSegments = 14) {
  const sentences = String(text).match(/[^.!?।\n]+[.!?।]?/g)?.map((s) => s.trim()).filter(Boolean) || [];
  const segments = [];
  let current = '';
  for (const s of sentences) {
    if (current && (current + ' ' + s).length > 260) {
      segments.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) segments.push(current);
  return segments.slice(0, maxSegments);
}

export function takeStreamSegments(state, chunk, flush = false) {
  state.buffer += chunk;
  const segments = [];
  while (state.buffer) {
    const sentence = /[.!?।](?=\s|$)/.exec(state.buffer);
    const paragraph = /\n{2,}/.exec(state.buffer);
    let end = -1;
    if (sentence && (!paragraph || sentence.index < paragraph.index)) end = sentence.index + 1;
    else if (paragraph) end = paragraph.index;
    else if (state.buffer.length > 260) {
      end = state.buffer.lastIndexOf(' ', 260);
      if (end < 1) end = 260;
    } else if (flush) {
      end = state.buffer.length;
    } else {
      break;
    }

    const segment = toSpeakable(state.buffer.slice(0, end));
    if (segment) segments.push(segment);
    state.buffer = state.buffer.slice(end).trimStart();
  }
  return segments;
}

function writeEvent(res, event) {
  if (!res.destroyed && !res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
}

function startEventStream(res) {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function writeStreamError(res, err) {
  const apiError = wrapLlmError(err);
  if (!(apiError instanceof ApiError)) {
    console.error('[teacher stream]', err);
  }
  writeEvent(res, {
    type: 'error',
    code: apiError.code || 'internal_error',
    message: apiError instanceof ApiError ? apiError.message : 'The teacher could not answer right now.',
  });
  if (!res.destroyed && !res.writableEnded) res.end();
}

const TEACHER_SYSTEM = (lang) => `You are "Road2Role Teacher", a warm, patient voice teacher on a learning-roadmap website.
Your words will be read aloud by a text-to-speech voice, so write ONLY plain spoken sentences:
no markdown, no bullet points, no headings, no emojis, no code blocks, no URLs. If you must mention code, describe it in words.
${LANG_RULES[lang]}
Teach like a good tutor: short sentences, one idea at a time, a relatable real-life analogy, and a tiny example.
Stay strictly on the topic you are given. Never invent facts; if the reference notes are thin, teach only what is generally true and well established.`;

function lessonPrompt({ roadmapTitle, title, overview }) {
  return `Roadmap: ${roadmapTitle}
Topic to teach: ${title}

Reference notes from the roadmap (may be empty):
"""
${toSpeakable(overview).slice(0, 4000)}
"""

Teach this topic as a spoken mini-lesson of 5 or 6 short paragraphs, separated by a blank line:
1. A friendly one-line hello and what we will learn.
2. What it is, in the simplest words.
3. Why it matters for someone following the "${roadmapTitle}" roadmap.
4. A real-life analogy.
5. A small concrete example, explained in words.
6. End with a quick recap and invite the learner to ask a doubt.
Keep the complete lesson under 180 words.`;
}

function aiUnavailable() {
  return new ApiError(
    503,
    'ai_not_configured',
    'The AI teacher is not switched on yet. Ask the site owner to set GROQ_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY on the server.',
  );
}

function wrapLlmError(err) {
  if (err instanceof LlmError) return new ApiError(err.status === 503 ? 503 : 502, 'ai_unavailable', err.message);
  return err;
}

/* ------------------------------------------------------------- routes ---- */

router.get('/status', (_req, res) => {
  res.json({ data: { ai: isAiConfigured() } });
});

router.get('/lesson', validate({ query: lessonQuery }), async (req, res, next) => {
  try {
    const { roadmap, topic, lang, stream } = res.locals.validatedQuery;
    const ai = isAiConfigured();
    const mode = ai ? 'ai' : 'basic';
    const cacheKey = `teacher:lesson:${mode}:${lang}:${roadmap}:${topic}`;

    let lesson = cache.get(cacheKey);
    if (stream) {
      const controller = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) controller.abort();
      });
      const finish = (segments, metadata) => {
        startEventStream(res);
        writeEvent(res, { type: 'meta', lesson: { ...metadata, segments: [] } });
        for (const text of segments) writeEvent(res, { type: 'segment', text });
        writeEvent(res, { type: 'done' });
        res.end();
      };

      if (lesson) {
        finish(lesson.segments, lesson);
        return;
      }

      const t = loadTopic(roadmap, topic);
      const metadata = { topic, title: t.title, roadmap, lang, mode };
      startEventStream(res);
      writeEvent(res, { type: 'meta', lesson: { ...metadata, segments: [] } });

      try {
        const segments = [];
        if (ai) {
          const state = { buffer: '' };
          for await (const chunk of completeStream({
            system: TEACHER_SYSTEM(lang),
            messages: [{ role: 'user', content: lessonPrompt(t) }],
            maxTokens: 320,
            signal: controller.signal,
          })) {
            for (const text of takeStreamSegments(state, chunk)) {
              segments.push(text);
              writeEvent(res, { type: 'segment', text });
            }
          }
          for (const text of takeStreamSegments(state, '', true)) {
            segments.push(text);
            writeEvent(res, { type: 'segment', text });
          }
        } else {
          const body = toSegments(toSpeakable(t.overview));
          segments.push(
            ...(body.length
              ? [`Let us learn about ${t.title}, from the ${t.roadmapTitle} roadmap.`, ...body, 'That is the overview. Open the free resources below this topic to go deeper.']
              : [`This is ${t.title}, from the ${t.roadmapTitle} roadmap. There is no written overview for it yet, so please open the free resources listed below this topic.`]),
          );
          for (const text of segments) writeEvent(res, { type: 'segment', text });
        }

        if (controller.signal.aborted || res.destroyed) return;
        if (!segments.length) throw new LlmError('The AI returned an empty answer', 502);
        lesson = { ...metadata, segments };
        cache.set(cacheKey, lesson, config.teacherLessonTtl);
        writeEvent(res, { type: 'done' });
        res.end();
      } catch (err) {
        if (controller.signal.aborted || res.destroyed) return;
        writeStreamError(res, err);
      }
      return;
    }

    if (!lesson) {
      const t = loadTopic(roadmap, topic);
      let segments;
      if (ai) {
        try {
          const text = await complete({
            system: TEACHER_SYSTEM(lang),
            messages: [{ role: 'user', content: lessonPrompt(t) }],
            maxTokens: 320,
          });
          segments = text
            .split(/\n{2,}/)
            .map((p) => toSpeakable(p))
            .filter(Boolean)
            .slice(0, 12);
        } catch (err) {
          throw wrapLlmError(err);
        }
      } else {
        const body = toSegments(toSpeakable(t.overview));
        segments = body.length
          ? [`Let us learn about ${t.title}, from the ${t.roadmapTitle} roadmap.`, ...body, 'That is the overview. Open the free resources below this topic to go deeper.']
          : [`This is ${t.title}, from the ${t.roadmapTitle} roadmap. There is no written overview for it yet, so please open the free resources listed below this topic.`];
      }
      lesson = { topic, title: t.title, roadmap, lang, mode, segments };
      if (segments.length) cache.set(cacheKey, lesson, config.teacherLessonTtl);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: lesson });
  } catch (err) {
    next(err);
  }
});

router.post('/ask', requireAuth, validate({ body: askBody }), async (req, res, next) => {
  try {
    if (!isAiConfigured()) throw aiUnavailable();
    const { roadmap, topic, question, lang, history, stream } = req.body;
    const t = loadTopic(roadmap, topic);

    const system = `${TEACHER_SYSTEM(lang)}
You are currently teaching "${t.title}" on the "${t.roadmapTitle}" roadmap. A learner is asking a doubt.
Answer in at most 120 words. If the question is unrelated to learning this topic or roadmap, kindly bring them back to it.
Reference notes for the topic:
"""
${toSpeakable(t.overview).slice(0, 3000)}
"""`;

    // the API needs the conversation to start with a user turn and alternate roles
    const turns = [];
    for (const h of history) {
      if (turns.length && turns[turns.length - 1].role === h.role) continue;
      if (!turns.length && h.role !== 'user') continue;
      turns.push({ role: h.role, content: h.content });
    }
    if (turns.length && turns[turns.length - 1].role === 'user') turns.pop();
    turns.push({ role: 'user', content: question });

    if (stream) {
      const controller = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) controller.abort();
      });
      startEventStream(res);
      const state = { buffer: '' };
      const segments = [];
      try {
        for await (const chunk of completeStream({
          system,
          messages: turns,
          maxTokens: 180,
          signal: controller.signal,
        })) {
          for (const text of takeStreamSegments(state, chunk)) {
            segments.push(text);
            writeEvent(res, { type: 'segment', text });
          }
        }
        for (const text of takeStreamSegments(state, '', true)) {
          segments.push(text);
          writeEvent(res, { type: 'segment', text });
        }
        if (controller.signal.aborted || res.destroyed) return;
        if (!segments.length) throw new LlmError('The AI returned an empty answer', 502);
        writeEvent(res, { type: 'done', answer: segments.join(' ') });
        res.end();
      } catch (err) {
        if (controller.signal.aborted || res.destroyed) return;
        writeStreamError(res, err);
      }
      return;
    }

    let answer;
    try {
      answer = await complete({ system, messages: turns, maxTokens: 180 });
    } catch (err) {
      throw wrapLlmError(err);
    }
    res.json({ data: { answer: toSpeakable(answer) } });
  } catch (err) {
    next(err);
  }
});

export default router;
