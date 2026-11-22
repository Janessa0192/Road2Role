import config from '../config.js';

/**
 * Tiny LLM client (plain fetch, no extra dependency) used by the voice teacher and, later, the quiz chatbot.
 * Providers fail over in order from the configured primary to any other configured provider.
 */

const providerKeys = {
  groq: 'groqApiKey',
  gemini: 'geminiApiKey',
  anthropic: 'anthropicApiKey',
};
const defaultModels = {
  groq: 'openai/gpt-oss-20b',
  gemini: 'gemini-flash-latest',
  anthropic: 'claude-sonnet-5-5',
};

function configuredProviders() {
  return [config.aiProvider, ...Object.keys(providerKeys).filter((provider) => provider !== config.aiProvider)]
    .filter((provider) => providerKeys[provider] && config[providerKeys[provider]]);
}

export function isAiConfigured() {
  return configuredProviders().length > 0;
}

export class LlmError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
  }
}

const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

function buildRequest({ system, messages, maxTokens, stream = false, provider, model }) {
  model ||= provider === config.aiProvider ? config.aiModel : defaultModels[provider];
  if (provider === 'gemini') {
    return {
      provider,
      model,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        // Gemini thinking models spend part of this budget on reasoning.
        generationConfig: { maxOutputTokens: maxTokens * 4 },
      },
      read: (data) =>
        (data.candidates?.[0]?.content?.parts || [])
          .map((p) => p.text || '')
          .join('')
          .trim(),
    };
  }
  if (provider === 'groq') {
    return {
      provider,
      model,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.groqApiKey}` },
      body: {
        model,
        max_completion_tokens: maxTokens * 4,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        messages: [{ role: 'system', content: system }, ...messages],
        ...(stream ? { stream: true } : {}),
      },
      read: (data) => data.choices?.[0]?.message?.content?.trim() || '',
    };
  }
  return {
    provider,
    model,
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01' },
    body: { model, max_tokens: maxTokens, system, messages, ...(stream ? { stream: true } : {}) },
    read: (data) =>
      (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim(),
  };
}

async function providerErrorDetail(res) {
  try {
    return (await res.json())?.error?.message || '';
  } catch {
    return '';
  }
}

function providerError(status) {
  if (status === 429) {
    return new LlmError('The AI provider is busy or rate limited. Please try again shortly.', 502);
  }
  if (status === 503) {
    return new LlmError('The AI is temporarily busy. Please try again shortly.', 503);
  }
  return new LlmError('The AI service returned an error', 502);
}

function shouldFailOver(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function requestCompletion(options, signal, excludedProviders = []) {
  const providers = configuredProviders().filter((provider) => !excludedProviders.includes(provider));
  if (!providers.length) throw new LlmError('The AI returned an empty answer', 502);
  const attemptedProviders = [];
  let lastError;
  for (const [index, provider] of providers.entries()) {
    attemptedProviders.push(provider);
    let req = buildRequest({ ...options, provider });
    let retriedGeminiFallback = false;
    try {
      let res = await fetch(req.url, {
        method: 'POST',
        signal,
        headers: req.headers,
        body: JSON.stringify(req.body),
      });

      if (res.status === 503 && provider === 'gemini' && req.model !== GEMINI_FALLBACK_MODEL) {
        retriedGeminiFallback = true;
        await providerErrorDetail(res);
        console.warn(`[llm] ${req.model} is overloaded; retrying with ${GEMINI_FALLBACK_MODEL}`);
        req = buildRequest({ ...options, provider, model: GEMINI_FALLBACK_MODEL });
        res = await fetch(req.url, {
          method: 'POST',
          signal,
          headers: req.headers,
          body: JSON.stringify(req.body),
        });
      }

      if (!res.ok) {
        const detail = await providerErrorDetail(res);
        console.error('[llm]', provider, req.model, res.status, detail);
        lastError = providerError(res.status);
        if (index < providers.length - 1 && (shouldFailOver(res.status) || retriedGeminiFallback)) {
          console.warn(`[llm] ${provider} unavailable; trying configured backup provider`);
          continue;
        }
        throw lastError;
      }
      return { req, res, attemptedProviders };
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof LlmError) throw err;
      lastError = err;
      if (index < providers.length - 1) {
        console.warn(`[llm] ${provider} request failed; trying configured backup provider`);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new LlmError('AI is not configured', 503);
}

function providerText(provider, data) {
  if (provider === 'gemini') {
    return (data.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('');
  }
  if (provider === 'groq') {
    return data.choices?.[0]?.delta?.content || '';
  }
  return data.type === 'content_block_delta' && data.delta?.type === 'text_delta'
    ? data.delta.text || ''
    : '';
}

async function* readEventStream(res, signal, provider) {
  if (!res.body) throw new LlmError('The AI service returned an empty stream', 502);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let data;
        try {
          data = JSON.parse(payload);
        } catch {
          continue;
        }
        const text = providerText(provider, data);
        if (text) yield text;
      }
      if (done) break;
    }
    if (buffer.startsWith('data:')) {
      const payload = buffer.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const text = providerText(provider, JSON.parse(payload));
          if (text) yield text;
        } catch {
          // Ignore an incomplete final event.
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    throw new LlmError('The AI stream ended unexpectedly', 502);
  } finally {
    reader.releaseLock();
  }
}

/**
 * @param {object} opts
 * @param {string} opts.system    system prompt
 * @param {{role:'user'|'assistant', content:string}[]} opts.messages
 * @param {number} [opts.maxTokens]
 * @returns {Promise<string>} the assistant's text
 */
export async function complete({ system, messages, maxTokens = 1200 }) {
  if (!isAiConfigured()) throw new LlmError('AI is not configured', 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
  try {
    const attemptedProviders = new Set();
    while (true) {
      const { req, res, attemptedProviders: tried } = await requestCompletion(
        { system, messages, maxTokens },
        controller.signal,
        [...attemptedProviders],
      );
      tried.forEach((provider) => attemptedProviders.add(provider));
      const text = req.read(await res.json());
      if (text) return text;
      if (attemptedProviders.size >= configuredProviders().length) {
        throw new LlmError('The AI returned an empty answer', 502);
      }
      console.warn(`[llm] ${req.provider} returned an empty answer; trying configured backup provider`);
    }
  } catch (err) {
    if (err instanceof LlmError) throw err;
    throw new LlmError(err.name === 'AbortError' ? 'AI request timed out' : 'Could not reach the AI service', 502);
  } finally {
    clearTimeout(timer);
  }
}

export async function* completeStream({ system, messages, maxTokens = 600, signal }) {
  if (!isAiConfigured()) throw new LlmError('AI is not configured', 503);

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
  try {
    const attemptedProviders = new Set();
    while (true) {
      const { req, res, attemptedProviders: tried } = await requestCompletion(
        { system, messages, maxTokens, stream: true },
        controller.signal,
        [...attemptedProviders],
      );
      tried.forEach((provider) => attemptedProviders.add(provider));
      let hasAnswer = false;
      for await (const chunk of readEventStream(res, controller.signal, req.provider)) {
        if (chunk.trim()) hasAnswer = true;
        yield chunk;
      }
      if (controller.signal.aborted) {
        if (signal?.aborted) return;
        throw new LlmError('AI request timed out', 502);
      }
      if (hasAnswer) return;
      if (attemptedProviders.size >= configuredProviders().length) {
        throw new LlmError('The AI returned an empty answer', 502);
      }
      console.warn(`[llm] ${req.provider} returned an empty answer; trying configured backup provider`);
    }
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (signal?.aborted) return;
    throw new LlmError(err.name === 'AbortError' ? 'AI request timed out' : 'Could not reach the AI service', 502);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
