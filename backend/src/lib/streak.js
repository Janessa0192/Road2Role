import { query } from '../db/index.js';

/**
 * Learning streak helpers.
 *
 * A "day" is a plain 'YYYY-MM-DD' string in the user's own timezone.
 * Streak rules:
 *   - every day with at least one learning activity counts
 *   - the current streak is the run of consecutive days ending TODAY
 *   - if the user has not learned yet today, yesterday still keeps the streak
 *     alive (they have until midnight) - it only resets after a full missed day
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a valid IANA timezone (e.g. "Asia/Kolkata") or "UTC". */
export function resolveTimeZone(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: raw });
    return raw;
  } catch {
    return 'UTC';
  }
}

/** The calendar date ('YYYY-MM-DD') of `date` as seen in `timeZone`. */
export function localDay(timeZone = 'UTC', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 'YYYY-MM-DD' + n days (n may be negative). Pure date math, no timezone issues. */
export function shiftDay(day, delta) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return t.toISOString().slice(0, 10);
}

/**
 * Pure function: turns a list of active days into streak numbers.
 * Kept free of DB/clock access so it is trivial to unit test.
 */
export function computeStreak(activeDays, today) {
  const set = new Set(activeDays.filter((d) => DAY_RE.test(d)));
  const yesterday = shiftDay(today, -1);
  const activeToday = set.has(today);

  // current streak: walk backwards from today (or yesterday if today is still empty)
  let current = 0;
  let cursor = activeToday ? today : set.has(yesterday) ? yesterday : null;
  while (cursor && set.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  // longest streak ever: scan the sorted days
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const day of sorted) {
    run = prev && shiftDay(prev, 1) === day ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = day;
  }

  // last 7 days (oldest -> today) for the little week view
  const last7 = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = shiftDay(today, -i);
    last7.push({ date, active: set.has(date) });
  }

  return {
    current,
    longest: Math.max(longest, current),
    activeToday,
    totalDays: set.size,
    lastActiveDay: sorted.length ? sorted[sorted.length - 1] : null,
    last7,
  };
}

/** Records "the user learned something today" (idempotent - one row per day). */
export function recordActivity(userId, timeZone = 'UTC') {
  query.run(
    'INSERT OR IGNORE INTO user_activity_days (user_id, day) VALUES (?, ?)',
    userId,
    localDay(timeZone),
  );
}

/** Streak numbers for one user, as seen from `timeZone`. */
export function getStreak(userId, timeZone = 'UTC') {
  const days = query
    .all('SELECT day FROM user_activity_days WHERE user_id = ?', userId)
    .map((r) => r.day);
  return computeStreak(days, localDay(timeZone));
}
