/**
 * Small API client for the v1 REST API.
 * - same-origin requests (session cookie is sent automatically)
 * - throws a typed ApiError carrying { code, message, details }
 */
import { API_BASE_URL } from '../config/env.js';

const BASE = API_BASE_URL;

/** The user's IANA timezone (e.g. "Asia/Kolkata"). The server uses it to decide what "today" is for streaks. */
const TIME_ZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details || [];
  }

  /** First validation message for a given field (server field names). */
  fieldError(field) {
    const hit = this.details.find((d) => d.field === field || d.field.startsWith(field + '.'));
    return hit ? hit.message : null;
  }
}

async function request(method, path, { body, query, headers } = {}) {
  let url = BASE + path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const init = {
    method,
    credentials: 'same-origin', // send the sid session cookie
    headers: { Accept: 'application/json', 'X-Timezone': TIME_ZONE, ...(headers || {}) },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch {
    // network failure / server down
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.');
  }

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body (e.g. 304/html) */
  }

  if (!res.ok) {
    const err = payload && payload.error;
    throw new ApiError(
      res.status,
      (err && err.code) || `http_${res.status}`,
      (err && err.message) || `Request failed with status ${res.status}`,
      (err && err.details) || [],
    );
  }
  return payload;
}

async function* streamRequest(path, { method = 'GET', body, query, headers, signal } = {}) {
  let url = BASE + path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const init = {
    method,
    credentials: 'same-origin',
    signal,
    headers: {
      Accept: 'application/x-ndjson',
      'X-Timezone': TIME_ZONE,
      ...(headers || {}),
    },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch {
    if (signal?.aborted) return;
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.');
  }

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON error body */
    }
    const err = payload && payload.error;
    throw new ApiError(
      res.status,
      (err && err.code) || `http_${res.status}`,
      (err && err.message) || `Request failed with status ${res.status}`,
      (err && err.details) || [],
    );
  }
  if (!res.body) throw new ApiError(502, 'stream_unavailable', 'The server did not start a response stream.');

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
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'error') {
          throw new ApiError(res.status, event.code, event.message);
        }
        yield event;
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = JSON.parse(buffer);
      if (event.type === 'error') throw new ApiError(res.status, event.code, event.message);
      yield event;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* stream already closed */
    }
    reader.releaseLock();
  }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
  stream: streamRequest,
};