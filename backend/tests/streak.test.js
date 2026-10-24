import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestApp, client } from './helpers.js';
import { query } from '../src/db/index.js';
import { computeStreak, localDay, shiftDay, resolveTimeZone } from '../src/lib/streak.js';

/* ------------------------------------------------ pure streak maths ---- */
describe('computeStreak (pure)', () => {
  const today = '2026-10-24';

  it('is 0 with no activity', () => {
    const s = computeStreak([], today);
    expect(s).toMatchObject({ current: 0, longest: 0, activeToday: false, totalDays: 0, lastActiveDay: null });
    expect(s.last7).toHaveLength(7);
  });

  it('counts consecutive days ending today', () => {
    const s = computeStreak(['2026-10-22', '2026-10-23', '2026-10-24'], today);
    expect(s).toMatchObject({ current: 3, longest: 3, activeToday: true });
  });

  it('keeps the streak alive when only yesterday is done (today still open)', () => {
    const s = computeStreak(['2026-10-22', '2026-10-23'], today);
    expect(s).toMatchObject({ current: 2, activeToday: false });
  });

  it('resets after a full missed day but remembers the longest', () => {
    const s = computeStreak(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-22'], today);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(4);
  });

  it('a gap splits streaks; only the run touching today counts as current', () => {
    const s = computeStreak(['2026-10-20', '2026-10-22', '2026-10-23', '2026-10-24'], today);
    expect(s).toMatchObject({ current: 3, longest: 3, totalDays: 4 });
  });

  it('works across month and year boundaries', () => {
    const s = computeStreak(['2025-12-30', '2025-12-31', '2026-01-01'], '2026-01-01');
    expect(s.current).toBe(3);
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29'); // leap year
  });

  it('marks the last 7 days', () => {
    const s = computeStreak(['2026-10-24', '2026-10-22'], today);
    expect(s.last7.map((d) => d.active)).toEqual([false, false, false, false, true, false, true]);
    expect(s.last7[6].date).toBe(today);
  });

  it('ignores malformed days', () => {
    expect(computeStreak(['nope', '2026-10-24'], today).current).toBe(1);
  });
});

describe('timezones', () => {
  it('local day follows the timezone (IST is ahead of UTC)', () => {
    const instant = new Date('2026-10-23T20:00:00Z'); // 01:30 on the 24th in India
    expect(localDay('UTC', instant)).toBe('2026-10-23');
    expect(localDay('Asia/Kolkata', instant)).toBe('2026-10-24');
  });

  it('falls back to UTC for junk input', () => {
    expect(resolveTimeZone('Not/AZone')).toBe('UTC');
    expect(resolveTimeZone(undefined)).toBe('UTC');
    expect(resolveTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
  });
});

/* ------------------------------------------------------------- API ---- */
describe('streak API', () => {
  let app;
  let user;
  let userId;

  beforeAll(async () => {
    app = setupTestApp();
    user = client(app);
    const res = await user
      .post('/api/v1/auth/register')
      .send({ email: 's1@example.com', username: 'streaker', password: 'password123' })
      .expect(201);
    userId = res.body.data.user.id;
  });

  it('requires authentication', async () => {
    await client(app).get('/api/v1/me/streak').expect(401);
  });

  it('starts at zero', async () => {
    const res = await user.get('/api/v1/me/streak').expect(200);
    expect(res.body.data).toMatchObject({ current: 0, longest: 0, activeToday: false });
  });

  it('marking a topic completed starts the streak (and returns it)', async () => {
    const put = await user
      .put('/api/v1/me/progress/frontend/100-internet')
      .send({ status: 'completed' })
      .expect(200);
    expect(put.body.streak).toMatchObject({ current: 1, activeToday: true });

    const res = await user.get('/api/v1/me/streak').expect(200);
    expect(res.body.data).toMatchObject({ current: 1, longest: 1, activeToday: true, totalDays: 1 });
  });

  it('more activity on the same day does not inflate the streak', async () => {
    await user.put('/api/v1/me/progress/frontend/101-html').send({ status: 'in_progress' }).expect(200);
    await user.put('/api/v1/me/progress/frontend/101-html').send({ status: 'completed' }).expect(200);
    const res = await user.get('/api/v1/me/streak').expect(200);
    expect(res.body.data).toMatchObject({ current: 1, totalDays: 1 });
  });

  it('un-marking progress does not remove the day', async () => {
    await user.delete('/api/v1/me/progress/frontend/100-internet').expect(204);
    const res = await user.get('/api/v1/me/streak').expect(200);
    expect(res.body.data.activeToday).toBe(true);
  });

  it('uses X-Timezone to decide "today"', async () => {
    const res = await user.get('/api/v1/me/streak').set('X-Timezone', 'Asia/Kolkata').expect(200);
    const today = localDay('Asia/Kolkata');
    expect(res.body.data.last7[6].date).toBe(today);
  });

  it('previous days build the streak', async () => {
    const today = localDay('UTC');
    for (const back of [1, 2, 3]) {
      query.run('INSERT OR IGNORE INTO user_activity_days (user_id, day) VALUES (?, ?)', userId, shiftDay(today, -back));
    }
    const res = await user.get('/api/v1/me/streak').expect(200);
    expect(res.body.data).toMatchObject({ current: 4, longest: 4, totalDays: 4 });
  });

  it('streaks are private per user', async () => {
    const other = client(app);
    await other
      .post('/api/v1/auth/register')
      .send({ email: 's2@example.com', username: 'streaker2', password: 'password123' })
      .expect(201);
    const res = await other.get('/api/v1/me/streak').expect(200);
    expect(res.body.data.current).toBe(0);
  });

  it('rejects a completely unknown topic without recording activity', async () => {
    const before = query.get('SELECT COUNT(*) AS c FROM user_activity_days WHERE user_id = ?', userId).c;
    await user.put('/api/v1/me/progress/frontend/does-not-exist').send({ status: 'completed' }).expect(404);
    const after = query.get('SELECT COUNT(*) AS c FROM user_activity_days WHERE user_id = ?', userId).c;
    expect(after).toBe(before);
  });
});
