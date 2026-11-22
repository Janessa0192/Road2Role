import { afterEach, beforeEach, describe, it, expect, beforeAll, vi } from 'vitest';
import { setupTestApp, client, adminCreds } from './helpers.js';
import config from '../src/config.js';
import { cache } from '../src/lib/cache.js';
import { takeStreamSegments, toSpeakable, toSegments } from '../src/routes/v1/teacher.js';
import { isAiConfigured } from '../src/services/llm.js';

// AI responses are mocked when a provider key is configured; tests never call external services.

describe('voice teacher API', () => {
  let app;
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    app = setupTestApp();
  });

  beforeEach(() => {
    cache.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockAiResponse(text, streaming = false) {
    const body = config.aiProvider === 'gemini'
      ? streaming
        ? `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\ndata: [DONE]\n\n`
        : JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })
      : config.aiProvider === 'groq'
        ? streaming
          ? `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`
          : JSON.stringify({ choices: [{ message: { content: text } }] })
        : streaming
          ? `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`
          : JSON.stringify({ content: [{ type: 'text', text }] });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(body, {
        headers: { 'content-type': streaming ? 'text/event-stream' : 'application/json' },
      }),
    );
  }

  it('streams lesson segments as NDJSON', async () => {
    if (isAiConfigured()) mockAiResponse('First sentence. Second one.', true);
    const res = await client(app)
      .get('/api/v1/teacher/lesson?roadmap=frontend&topic=100-internet&stream=true')
      .expect(200);
    const events = res.text.trim().split('\n').map((line) => JSON.parse(line));
    expect(events[0]).toMatchObject({ type: 'meta', lesson: { topic: '100-internet' } });
    expect(events.some((event) => event.type === 'segment')).toBe(true);
    expect(events[events.length - 1].type).toBe('done');
  });

  it('reports whether AI is configured', async () => {
    const res = await client(app).get('/api/v1/teacher/status').expect(200);
    expect(res.body.data.ai).toBe(isAiConfigured());
  });

  it('returns a lesson split into speakable segments', async () => {
    if (isAiConfigured()) {
      mockAiResponse('Internet connects devices. It moves information.\n\nNetworks carry that information.');
    }
    const res = await client(app).get('/api/v1/teacher/lesson?roadmap=frontend&topic=100-internet').expect(200);
    const lesson = res.body.data;
    expect(lesson.mode).toBe(isAiConfigured() ? 'ai' : 'basic');
    expect(lesson.title).toBe('Internet');
    expect(lesson.segments.length).toBeGreaterThan(1);
    expect(lesson.segments[0]).toContain('Internet');
    // nothing the voice would read out as markup
    expect(lesson.segments.join(' ')).not.toMatch(/[#*`]/);
  });

  it('404s for an unknown roadmap or topic', async () => {
    await client(app).get('/api/v1/teacher/lesson?roadmap=nope&topic=x').expect(404);
    await client(app).get('/api/v1/teacher/lesson?roadmap=frontend&topic=999-missing').expect(404);
  });

  it('validates the query', async () => {
    await client(app).get('/api/v1/teacher/lesson?roadmap=frontend').expect(400);
    await client(app).get('/api/v1/teacher/lesson?roadmap=frontend&topic=100-internet&lang=xx').expect(400);
  });

  it('needs a login to ask a doubt, and the AI key to answer it', async () => {
    const body = { roadmap: 'frontend', topic: '100-internet', question: 'What is DNS?' };
    await client(app).post('/api/v1/teacher/ask').send(body).expect(401);

    const admin = client(app);
    await admin.post('/api/v1/auth/login').send(adminCreds).expect(200);
    if (isAiConfigured()) {
      mockAiResponse('DNS translates website names into network addresses.');
      const res = await admin.post('/api/v1/teacher/ask').send(body).expect(200);
      expect(res.body.data.answer).toContain('DNS');

      mockAiResponse('DNS maps website names to network addresses.', true);
      const streamed = await admin.post('/api/v1/teacher/ask').send({ ...body, stream: true }).expect(200);
      const events = streamed.text.trim().split('\n').map((line) => JSON.parse(line));
      expect(events.some((event) => event.type === 'segment')).toBe(true);
      expect(events[events.length - 1]).toMatchObject({
        type: 'done',
        answer: 'DNS maps website names to network addresses.',
      });
    } else {
      const res = await admin.post('/api/v1/teacher/ask').send(body).expect(503);
      expect(res.body.error.code).toBe('ai_not_configured');
      await admin.post('/api/v1/teacher/ask').send({ ...body, stream: true }).expect(503);
    }
  });
});

describe('text helpers', () => {
  it('releases complete streamed sentences immediately and flushes the final fragment', () => {
    const state = { buffer: '' };
    expect(takeStreamSegments(state, 'First sentence. Second one')).toEqual(['First sentence.']);
    expect(takeStreamSegments(state, '', true)).toEqual(['Second one']);
  });

  it('turns markdown into plain speech', () => {
    const md = '# Title\n\nSome **bold** text with a [link](https://x.dev).\n\n- one\n- two\n\n```js\nconst a = 1;\n```';
    const out = toSpeakable(md);
    expect(out).toContain('Some bold text with a link.');
    expect(out).not.toMatch(/[#*`\[\]]|https|const a/);
  });

  it('groups sentences into short segments', () => {
    const text = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i + 1} of the lesson.`).join(' ');
    const segs = toSegments(text);
    expect(segs.length).toBeGreaterThan(1);
    expect(segs.every((s) => s.length <= 300)).toBe(true);
  });
});
