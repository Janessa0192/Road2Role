import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../src/config.js';
import { completeStream, isAiConfigured } from '../src/services/llm.js';

const originalFetch = globalThis.fetch;
const originalAiConfig = {
  aiProvider: config.aiProvider,
  aiModel: config.aiModel,
  groqApiKey: config.groqApiKey,
  geminiApiKey: config.geminiApiKey,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(config, originalAiConfig);
});

describe('LLM streaming', () => {
  it.skipIf(!isAiConfigured())('reads provider text events without making a network request', async () => {
    const body = config.aiProvider === 'gemini'
      ? [
          'data: {"candidates":[{"content":{"parts":[{"text":"First sentence. "}]}}]}',
          'data: {"candidates":[{"content":{"parts":[{"text":"Second sentence."}]}}]}',
          'data: [DONE]',
          '',
        ].join('\n')
      : config.aiProvider === 'groq'
        ? [
            'data: {"choices":[{"delta":{"content":"First sentence. "}}]}',
            'data: {"choices":[{"delta":{"content":"Second sentence."}}]}',
            'data: [DONE]',
            '',
          ].join('\n')
      : [
          'event: content_block_delta',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"First sentence. "}}',
          '',
          'event: content_block_delta',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Second sentence."}}',
          '',
        ].join('\n');

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(body, { headers: { 'content-type': 'text/event-stream' } }),
    );

    const chunks = [];
    for await (const chunk of completeStream({
      system: 'system',
      messages: [{ role: 'user', content: 'hello' }],
      maxTokens: 100,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('First sentence. Second sentence.');
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect(globalThis.fetch.mock.calls[0][0]).toContain(
      config.aiProvider === 'gemini'
        ? ':streamGenerateContent?alt=sse'
        : config.aiProvider === 'groq'
          ? '/openai/v1/chat/completions'
          : '/v1/messages',
    );
  });

  it.skipIf(!isAiConfigured() || config.aiProvider !== 'gemini')(
    'retries an overloaded Gemini model with Flash-Lite',
    async () => {
      const streamBody = 'data: {"candidates":[{"content":{"parts":[{"text":"Fallback is ready."}]}}]}\n\ndata: [DONE]\n\n';
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 }),
        )
        .mockResolvedValueOnce(
          new Response(streamBody, { headers: { 'content-type': 'text/event-stream' } }),
        );

      const chunks = [];
      for await (const chunk of completeStream({
        system: 'system',
        messages: [{ role: 'user', content: 'hello' }],
        maxTokens: 100,
      })) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toBe('Fallback is ready.');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch.mock.calls[1][0]).toContain('/models/gemini-3.5-flash-lite:');
    },
  );

  it('uses Groq streaming and fails over to it when Gemini is overloaded', async () => {
    config.aiProvider = 'gemini';
    config.aiModel = 'gemini-flash-latest';
    config.geminiApiKey = 'test-gemini-key';
    config.groqApiKey = 'test-groq-key';
    const groqStream = 'data: {"choices":[{"delta":{"content":"Backup response."}}]}\n\ndata: [DONE]\n\n';
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'still overloaded' } }), { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(groqStream, { headers: { 'content-type': 'text/event-stream' } }),
      );

    const chunks = [];
    for await (const chunk of completeStream({
      system: 'system',
      messages: [{ role: 'user', content: 'hello' }],
      maxTokens: 100,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Backup response.');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(globalThis.fetch.mock.calls[2][0]).toBe(
      'https://api.groq.com/openai/v1/chat/completions',
    );
    expect(globalThis.fetch.mock.calls[2][1].headers.authorization).toBe('Bearer test-groq-key');
    expect(JSON.parse(globalThis.fetch.mock.calls[2][1].body)).toMatchObject({
      max_completion_tokens: 400,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
    });
  });

  it('uses Gemini as backup after a Groq network failure', async () => {
    config.aiProvider = 'groq';
    config.aiModel = 'openai/gpt-oss-20b';
    config.groqApiKey = 'test-groq-key';
    config.geminiApiKey = 'test-gemini-key';
    const geminiStream = 'data: {"candidates":[{"content":{"parts":[{"text":"Backup response."}]}}]}\n\ndata: [DONE]\n\n';
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(
        new Response(geminiStream, { headers: { 'content-type': 'text/event-stream' } }),
      );

    const chunks = [];
    for await (const chunk of completeStream({
      system: 'system',
      messages: [{ role: 'user', content: 'hello' }],
      maxTokens: 100,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Backup response.');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      'https://api.groq.com/openai/v1/chat/completions',
    );
    expect(globalThis.fetch.mock.calls[1][0]).toContain('/models/gemini-flash-latest:');
  });

  it('uses a backup provider when Groq returns a stream without answer text', async () => {
    config.aiProvider = 'groq';
    config.aiModel = 'openai/gpt-oss-20b';
    config.groqApiKey = 'test-groq-key';
    config.geminiApiKey = 'test-gemini-key';
    const geminiStream = 'data: {"candidates":[{"content":{"parts":[{"text":"Lesson answer."}]}}]}\n\ndata: [DONE]\n\n';
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(
        new Response('data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } }),
      )
      .mockResolvedValueOnce(
        new Response(geminiStream, { headers: { 'content-type': 'text/event-stream' } }),
      );

    const chunks = [];
    for await (const chunk of completeStream({
      system: 'system',
      messages: [{ role: 'user', content: 'teach me' }],
      maxTokens: 100,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Lesson answer.');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
