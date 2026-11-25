// Single place for frontend runtime config.
// Default '/api/v1' = same-origin (proxied to the backend in dev), exactly like the old pages.
const raw = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const API_BASE_URL = raw.replace(/\/+$/, '');

