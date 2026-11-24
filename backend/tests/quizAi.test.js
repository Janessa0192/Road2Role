import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupTestApp, client } from './helpers.js';
import config from '../src/config.js';
import { query } from '../src/db/index.js';
import { parseQuestions } from '../src/services/quizAi.js';

// AI replies are mocked - tests never call an external service.

const sample = [
  { q: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High Text Machine Language', 'Home Tool Markup Language', 'Hyper Tool Multi Language'], correct: 0, explanation: 'HTML is the HyperText Markup Language.' },
  { q: 'Which tag makes a link?', options: ['<div>', '<a>', '<p>', '<img>'], correct: 1, explanation: 'The anchor tag <a> creates links.' },
  { q: 'Which protocol secures web traffic?', options: ['FTP', 'SSH', 'HTTPS', 'SMTP'], correct: 2, explanation: 'HTTPS encrypts HTTP traffic.' },
];

describe('parseQuestions', () => {
  it('accepts a clean array and strips code fences', () => {
    expect(parseQuestions(JSON.stringify(sample))).toHaveLength(3);
    expect(parseQuestions('```json\n' + JSON.stringify(sample) + '\n```')).toHaveLength(3);
    expect(parseQuestions('Here you go: ' + JSON.stringify(sample))).toHaveLength(3);
  });

  it('drops invalid questions', () => {
    const bad = [
      { q: 'Only 3 options', options: ['a', 'b', 'c'], correct: 0 },
      { q: 'Correct index out of range', options: ['a', 'b', 'c', 'd'], correct: 4 },
      { q: 'Duplicate options', options: ['a', 'a', 'c', 'd'], correct: 0 },
      { q: '', options: ['a', 'b', 'c', 'd'], correct: 0 },
      sample[0],
    ];
    expect(parseQuestions(JSON.stringify(bad))).toHaveLength(1);
    expect(parseQuestions('not json at all')).toEqual([]);
    expect(parseQuestions('')).toEqual([]);
  });
});

describe('AI quiz API', () => {
  let app;
  let user; // signed-in learner (cookie agent)
  const originalFetch = globalThis.fetch;
  const originalKeys = { ...config };

  beforeAll(async () => {
    app = setupTestApp();
    user = client(app);
    await user
      .post('/api/v1/auth/register')
      .send({ email: 'quiz-ai@example.com', username: 'quizai', password: 'password123' })
      .expect(201);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    config.groqApiKey = originalKeys.groqApiKey;
    config.geminiApiKey = originalKeys.geminiApiKey;
    config.anthropicApiKey = originalKeys.anthropicApiKey;
    config.aiProvider = originalKeys.aiProvider;
    query.run('DELETE FROM ai_quiz_questions');
  });

  function useMockedAi(questions = sample) {
    config.aiProvider = 'groq';
    config.groqApiKey = 'test-key';
    globalThis.fetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(questions) } }] }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  }

  it('requires a signed-in user', async () => {
    useMockedAi();
    await client(app).post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 3 }).expect(401);
    await client(app).post('/api/v1/quizzes/ai/check').send({ questionId: 1, optionId: 0 }).expect(401);
    expect(globalThis.fetch).not.toHaveBeenCalled(); // no AI call for anonymous visitors
  });

  it('generates questions, hides the answers and caches them', async () => {
    useMockedAi();
    const res = await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 3 }).expect(200);

    expect(res.body.source).toBe('topic');
    expect(res.body.questions).toHaveLength(3);
    expect(JSON.stringify(res.body)).not.toMatch(/correct|explanation/i);
    for (const q of res.body.questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.id).sort()).toEqual([0, 1, 2, 3]);
    }
    const calls = globalThis.fetch.mock.calls.length;
    expect(calls).toBeGreaterThan(0);

    // second start for the same topic must come from the cache (no new AI call)
    // PER_TOPIC is 5 but the mock only gives 3, so top the cache up to avoid a refill
    query.run(
      `INSERT INTO ai_quiz_questions (roadmap_slug, topic_key, topic_label, question_text, options_json, correct_index)
       VALUES ('frontend', '100-internet', 'Internet', 'Extra 1', '["a","b","c","d"]', 0),
              ('frontend', '100-internet', 'Internet', 'Extra 2', '["a","b","c","d"]', 1)`,
    );
    await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 3 }).expect(200);
    expect(globalThis.fetch.mock.calls.length).toBe(calls);
  });

  it('reveals the right answer and explanation only through /ai/check', async () => {
    useMockedAi();
    const start = await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 3 }).expect(200);
    const q = start.body.questions.find((x) => x.question_text === sample[1].q);
    const right = q.options.find((o) => o.option_text === '<a>');
    const wrong = q.options.find((o) => o.option_text === '<div>');

    const ok = await user.post('/api/v1/quizzes/ai/check').send({ questionId: q.id, optionId: right.id }).expect(200);
    expect(ok.body).toMatchObject({ correct: true, correctOptionText: '<a>', explanation: sample[1].explanation });

    const bad = await user.post('/api/v1/quizzes/ai/check').send({ questionId: q.id, optionId: wrong.id }).expect(200);
    expect(bad.body).toMatchObject({ correct: false, correctOptionId: right.id });

    await user.post('/api/v1/quizzes/ai/check').send({ questionId: 999999, optionId: 0 }).expect(404);
  });

  it('asks for more batches when a quiz needs more questions than one batch has', async () => {
    config.aiProvider = 'groq';
    config.groqApiKey = 'test-key';
    let call = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      call += 1; // every call returns 5 NEW questions
      const batch = Array.from({ length: 5 }, (_, i) => ({
        q: `Batch ${call} question ${i + 1}?`,
        options: ['one', 'two', 'three', 'four'],
        correct: i % 4,
        explanation: 'Because.',
      }));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(batch) } }] }), {
        headers: { 'content-type': 'application/json' },
      });
    });
    const res = await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 12 }).expect(200);
    expect(res.body.questions).toHaveLength(12);
    expect(globalThis.fetch.mock.calls.length).toBe(3); // 1 batch + 2 extra rounds = 15 cached
  });

  it('works across the whole roadmap when no topic is given', async () => {
    useMockedAi();
    const res = await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', count: 5 }).expect(200);
    expect(['roadmap', 'progress']).toContain(res.body.source);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });

  it('answers 503 when the cache is empty and no AI key is configured', async () => {
    config.groqApiKey = '';
    config.geminiApiKey = '';
    config.anthropicApiKey = '';
    const res = await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 3 }).expect(503);
    expect(res.body.error?.code ?? res.body.code).toBe('ai_not_configured');
  });

  it('answers 502 when the AI only returns unusable text', async () => {
    useMockedAi([]);
    globalThis.fetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'sorry, no questions' } }] }), { headers: { 'content-type': 'application/json' } }),
    );
    await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'frontend', topic: '100-internet', count: 3 }).expect(502);
  });

  it('404s for an unknown roadmap and validates input', async () => {
    useMockedAi();
    await user.post('/api/v1/quizzes/ai/start').send({ roadmap: 'nope', count: 3 }).expect(404);
    await user.post('/api/v1/quizzes/ai/start').send({ count: 3 }).expect(400);
    await user.post('/api/v1/quizzes/ai/check').send({ questionId: 1, optionId: 9 }).expect(400);
  });
});
