import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../AuthContext/AuthContext.jsx';
import { showError } from '../../utils/errors.js';
import { formatDate } from '../../utils/formatDate.js';
import usePageStyles from '../../hooks/usePageStyles.js';
import accountCss from './account.css?inline';

const STYLES = [accountCss];

/** Account page: profile, 🔥 streak and roadmap progress (replaces account.html + account.js). */
export default function Account() {
  usePageStyles(STYLES);
  const { user, loaded, setUser } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false); // logout in progress -> don't bounce to the login page

  async function handleLogout() {
    setLeaving(true);
    try {
      await api.post('/auth/logout', {});
    } finally {
      setUser(null);
      navigate('/');
    }
  }

  let content;
  if (loaded && !user && !leaving) {
    // not signed in -> login page, which sends you back here afterwards
    content = <Navigate to="/login?next=%2Faccount" replace />;
  } else if (!user) {
    content = (
      <p className="status-line" role="status" aria-live="polite">
        Loading your account…
      </p>
    );
  } else {
    content = <AccountContent user={user} leaving={leaving} onLogout={handleLogout} />;
  }

  return (
    <>
      <main id="main" className="container">
        {content}
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>
            <span className="brand-line">Road2Role</span> · Learn, build, get hired.
          </span>
          <span>
            <a href="/api/docs">API reference</a>
          </span>
        </div>
      </footer>
    </>
  );
}

function AccountContent({ user, leaving, onLogout }) {
  const { hash } = useLocation();
  const [streak, setStreak] = useState({ status: 'loading', data: null, error: '' });
  const [progress, setProgress] = useState({ status: 'loading', items: [], error: '' });

  /* ---- 🔥 streak ---- */
  useEffect(() => {
    let cancelled = false;
    api
      .get('/me/streak')
      .then((payload) => !cancelled && setStreak({ status: 'ready', data: payload.data, error: '' }))
      .catch((error) => !cancelled && setStreak({ status: 'error', data: null, error: showError(error) }));
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  /* ---- roadmap progress: list the roadmaps you touched, then one summary each ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listPayload = await api.get('/me/progress');
        const rows = listPayload.data;
        const slugs = [...new Set(rows.map((row) => row.roadmapSlug))];
        if (cancelled) return;
        if (!slugs.length) {
          setProgress({ status: 'empty', items: [], error: '' });
          return;
        }

        const summaries = await Promise.all(slugs.map((slug) => api.get(`/me/progress/${encodeURIComponent(slug)}`)));
        if (cancelled) return;

        const items = summaries.map((payload) => {
          const summary = payload.data;
          // most recent activity of this roadmap
          const dates = [
            ...rows.filter((r) => r.roadmapSlug === summary.roadmapSlug).map((r) => r.updatedAt || ''),
            ...summary.topics.map((t) => t.updated_at || t.updatedAt || ''),
          ].filter(Boolean);
          return { ...summary, updatedAt: dates.sort().pop() || '' };
        });
        setProgress({ status: 'ready', items, error: '' });
      } catch (error) {
        if (!cancelled) setProgress({ status: 'error', items: [], error: showError(error) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // navbar's 🔥 pill links to /account#streak
  useEffect(() => {
    if (hash === '#streak') document.getElementById('streak')?.scrollIntoView();
  }, [hash]);

  const initial = (user.username || '?').charAt(0).toUpperCase();
  const s = streak.data;

  let streakMessage = 'Loading your streak…';
  if (streak.status === 'error') streakMessage = streak.error;
  else if (s) {
    if (s.activeToday) streakMessage = "You've learned today - come back tomorrow to keep it going!";
    else if (s.current > 0) streakMessage = `Learn something today to keep your ${s.current}-day streak alive.`;
    else streakMessage = 'Complete a topic or take a quiz to start your streak.';
  }

  return (
    <div className="account-grid">
      <aside className="profile-card" aria-label="Profile">
        <div className="avatar" aria-hidden="true">
          {initial}
        </div>
        <h2>{user.username}</h2>
        <p className="role">{user.email}</p>
        <p>
          <span className="badge neutral">{user.role}</span>
        </p>
        {user.role === 'admin' && (
          <p style={{ fontSize: '0.85rem' }}>
            <Link to="/admin">You are an admin → open the admin panel</Link>
          </p>
        )}
        <button
          className="btn btn-danger btn-block"
          type="button"
          style={{ marginTop: '0.8rem' }}
          disabled={leaving}
          onClick={onLogout}
        >
          Log out
        </button>
      </aside>

      <section aria-labelledby="progress-heading">
        <div className={`streak-card${s && s.activeToday ? ' is-lit' : ''}`} id="streak" aria-labelledby="streak-heading">
          <div className="streak-main">
            <span className="streak-big-flame" aria-hidden="true">
              🔥
            </span>
            <div>
              <h2 id="streak-heading">
                <span>{s ? s.current : 0}</span>-day streak
              </h2>
              <p>{streakMessage}</p>
            </div>
          </div>
          <ol className="streak-week" aria-label="Your last 7 days">
            {s &&
              s.last7.map((day, index) => {
                const [y, m, d] = day.date.split('-').map(Number);
                const weekday = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
                return (
                  <li
                    key={day.date}
                    className={`streak-day${day.active ? ' is-active' : ''}${index === 6 ? ' is-today' : ''}`}
                    aria-label={`${weekday}: ${day.active ? 'learned' : 'no activity'}${index === 6 ? ' (today)' : ''}`}
                  >
                    <span className="dot" aria-hidden="true">
                      {day.active ? '🔥' : ''}
                    </span>
                    <span className="lbl">{weekday}</span>
                  </li>
                );
              })}
          </ol>
          <dl className="streak-stats">
            <div>
              <dt>Longest streak</dt>
              <dd>
                <span>{s ? s.longest : 0}</span> days
              </dd>
            </div>
            <div>
              <dt>Total active days</dt>
              <dd>{s ? s.totalDays : 0}</dd>
            </div>
          </dl>
        </div>

        <h1 id="progress-heading" style={{ fontSize: '1.3rem', marginTop: 0 }}>
          Your roadmap progress
        </h1>
        {progress.status !== 'ready' && (
          <p className={`status-line${progress.status === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
            {progress.status === 'loading' && 'Loading progress…'}
            {progress.status === 'empty' && 'No progress yet - open a roadmap and start checking off topics.'}
            {progress.status === 'error' && progress.error}
          </p>
        )}
        <div className="progress-list">
          {progress.items.map((item) => (
            <article className="progress-item" key={item.roadmapSlug}>
              <div className="head">
                <h3>
                  <Link to={`/roadmap?slug=${encodeURIComponent(item.roadmapSlug)}`}>{item.roadmapTitle}</Link>
                </h3>
                <strong>{item.percent}%</strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.percent}
                aria-label={`${item.roadmapTitle} progress`}
              >
                <div className="progress-fill" style={{ width: `${item.percent}%` }}></div>
              </div>
              <p className="topics-done">
                {item.done} of {item.totalTopics} topics completed
                {item.learning ? ` · ${item.learning} in progress` : ''}
                {item.updatedAt ? ` · updated ${formatDate(item.updatedAt)}` : ''}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
