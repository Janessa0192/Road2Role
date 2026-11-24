import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(__dirname, '..');
export const repoRoot = path.resolve(backendRoot, '..');

// Load backend/.env if present (native Node env loader, no dotenv dependency).
try {
  process.loadEnvFile(path.join(backendRoot, '.env'));
} catch {
  // no .env file -> fall back to defaults below
}
try {
  process.loadEnvFile(path.join(repoRoot, '.env'));
} catch {
  // ignore
}

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const aiProvider = process.env.AI_PROVIDER || (
  process.env.GROQ_API_KEY ? 'groq' : process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic'
);
const aiModel = process.env.AI_MODEL || ({
  groq: 'openai/gpt-oss-20b',
  gemini: 'gemini-flash-latest',
  anthropic: 'claude-sonnet-5-5',
}[aiProvider] || 'gemini-flash-latest');

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isTest,
  port: Number(process.env.PORT || 3000),
  apiVersion: 'v1',

  // SQLite database file (":memory:" works too and is used by tests)
  dbPath: process.env.DB_PATH || path.join(backendRoot, 'data', 'roadmap.db'),

  // Secrets. The default is only for local development - production MUST set these.
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m', // access token lifetime
  jwtRefreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS || 7 * 24 * 3600),
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 7 * 24 * 3600 * 1000),

  // Cookie names
  sessionCookieName: 'sid',
  refreshCookieName: 'rt',

  // Rate limits (kept small so the limits are easy to observe/demo)
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
  loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60_000),
  registerRateLimitMax: Number(process.env.REGISTER_RATE_LIMIT_MAX || 10),
  oauthRateLimitMax: Number(process.env.OAUTH_RATE_LIMIT_MAX || 30),

  // Cache TTLs (seconds)
  cacheListTtl: Number(process.env.CACHE_LIST_TTL || 60),
  cacheDetailTtl: Number(process.env.CACHE_DETAIL_TTL || 300),

  // AI (voice teacher now, quiz chatbot next). Without a key the teacher still works in
  // "basic" mode (reads the topic text aloud); with a key it explains in simple words.
  // Provider order: explicit AI_PROVIDER, otherwise Groq, Gemini, then Anthropic.
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  aiProvider,
  aiModel,
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 30_000),
  teacherRateLimitMax: Number(process.env.TEACHER_RATE_LIMIT_MAX || 20), // per minute per IP
  quizAiRateLimitMax: Number(process.env.QUIZ_AI_RATE_LIMIT_MAX || 10), // AI quiz starts per minute per IP
  teacherLessonTtl: Number(process.env.TEACHER_LESSON_TTL || 24 * 3600), // seconds a generated lesson is cached

  // Bootstrap admin (created only when the users table is empty)
  adminEmail: process.env.ADMIN_EMAIL || 'admin@roadmap.local',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',

  // Paths
  frontendDir: path.join(repoRoot, 'frontend'),
  publicDir: path.join(repoRoot, 'public'),
  roadmapsDataDir: path.join(repoRoot, 'src', 'data', 'roadmaps'),
};

export default config;
