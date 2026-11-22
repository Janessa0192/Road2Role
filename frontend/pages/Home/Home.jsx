import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';
import usePageStyles from '../../hooks/usePageStyles.js';
import homeCss from './home-redesign.css?inline';

const STYLES = [homeCss];
const PAGE_LIMIT = 12;

const CATEGORIES = [
  ['', 'All paths'],
  ['role', 'Roles'],
  ['language', 'Languages'],
  ['framework', 'Frameworks'],
  ['tool', 'Tools'],
  ['database', 'Databases'],
  ['concept', 'Concepts'],
];

const FEATURES = [
  { tone: 'lilac', icon: '⌘', title: 'Structured Roadmaps', text: 'Follow step-by-step learning paths for your dream role.' },
  { tone: 'mint', icon: '↗', title: 'Track Your Progress', text: 'Mark topics as done, stay consistent and see your growth.' },
  { tone: 'sand', icon: '▤', title: 'Curated Resources', text: 'Articles and videos for every topic, right where you need them.' },
];

export default function Home() {
  usePageStyles(STYLES);

  const [searchParams, setSearchParams] = useSearchParams();
  const gridRef = useRef(null);

  /** The URL query string is the single source of truth for the filters (same as before). */
  const filters = {
    search: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    difficulty: searchParams.get('difficulty') || '',
    sort: searchParams.get('sort') || 'order',
    page: Math.max(1, parseInt(searchParams.get('page'), 10) || 1),
  };

  /** Update a few query params; any filter change resets the page (replaceState, like the old setParams). */
  function update(patch) {
    const merged = { ...patch, page: patch.page || undefined };
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(merged)) {
          if (value === undefined || value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  }

  /* ---------------------------------------------------------- search box (debounced 300ms) --- */
  const [searchText, setSearchText] = useState(filters.search);

  // URL changed from outside (back/forward) -> reflect it in the input
  useEffect(() => {
    if (filters.search !== searchText.trim()) setSearchText(filters.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === filters.search) return undefined;
    const timer = setTimeout(() => update({ q: trimmed }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  /* ------------------------------------------------------------------------ data loading --- */
  const [view, setView] = useState({ status: 'loading', items: [], meta: null, links: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0); // bumped by the Retry button

  useEffect(() => {
    let cancelled = false;
    setView((v) => ({ ...v, status: 'loading', error: '' }));

    api
      .get('/roadmaps', {
        query: {
          page: filters.page,
          limit: PAGE_LIMIT,
          search: filters.search,
          category: filters.category,
          difficulty: filters.difficulty,
          sort: filters.sort,
          order: 'asc',
        },
      })
      .then((payload) => {
        if (cancelled) return;
        if (!payload.data.length) {
          setView({ status: 'empty', items: [], meta: null, links: null, error: '' });
        } else {
          setView({ status: 'ready', items: payload.data, meta: payload.meta, links: payload.links, error: '' });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setView((v) => ({ ...v, status: 'error', error: showError(error) }));
      });

    return () => {
      cancelled = true;
    };
  }, [filters.page, filters.search, filters.category, filters.difficulty, filters.sort, reloadKey]);

  const { status, items, meta, links, error } = view;
  const gridHidden = status === 'empty' || status === 'error';
  const showPager = Boolean(meta) && meta.total !== 0;

  let statusText;
  if (status === 'loading') statusText = 'Loading roadmaps…';
  else if (status === 'empty') statusText = 'No roadmaps match your filters.';
  else if (status === 'ready') statusText = `Showing ${items.length} of ${meta.total} roadmaps.`;

  function goToPage(page) {
    update({ page: String(page) });
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <main id="main" className="container page-shell">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot"></span>Navigate Your Career with Confidence
            </span>
            <h1 id="hero-title">Your<br /> <span className="accent">Road2Role</span></h1>
            <p>Explore career roadmaps, learn in a structured way and track your progress step by step — all in one place.</p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-lg" href="#roadmaps">
                Explore Roadmaps <span aria-hidden="true">↗</span>
              </a>
              <Link className="btn btn-lg btn-outline" to="/register">
                Create free account
              </Link>
            </div>
            <div className="hero-proof">
              <span className="proof-avatars" aria-hidden="true">
                <i>✦</i>
                <i>↗</i>
                <i>✓</i>
              </span>
              <span>Small steps today. Big opportunities tomorrow.</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <span className="float-icon book-icon">▤</span>
            <span className="float-icon compass-icon">✥</span>
            <span className="float-icon spark-icon">✳</span>
            <div className="mock-card">
              <div className="mock-head">
                <span className="mock-brand">Your journey</span>
                <span className="mock-tag">ON TRACK</span>
              </div>
              <p className="mock-subtitle">A little progress every day adds up.</p>
              <ul className="mock-steps">
                <li className="done"><span className="step-check">✓</span><span>Choose a Roadmap</span><b>01</b></li>
                <li className="done"><span className="step-check">✓</span><span>Learn Step by Step</span><b>02</b></li>
                <li className="done"><span className="step-check">✓</span><span>Track Your Progress</span><b>03</b></li>
                <li className="done"><span className="step-check">✓</span><span>Test Yourself</span><b>04</b></li>
                <li><span className="step-check">5</span><span>Get Job Ready</span><b>05</b></li>
              </ul>
              <div className="mock-progress">
                <div className="progress-meta" style={{ color: 'black' }}>
                  <span>YOUR MOMENTUM</span>
                  <strong>80%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: '80%' }}></div>
                </div>
                <small style={{ color: 'black' }}>Keep going — you're doing great!</small>
              </div>
            </div>
            <div className="sticky s1">PLAN<br />LEARN<br />PRACTICE<br />GROW</div>
            <div className="sticky s2">Small steps,<br />big opportunities <span>♡</span></div>
            <div className="sticky s3">YOU<br />GOT<br />THIS <span>✦</span></div>
            <div className="route-line"></div>
          </div>
        </section>

        <section className="feature-strip" aria-label="Why Road2Role">
          {FEATURES.map((f) => (
            <article key={f.title} className={`feature feature-${f.tone}`}>
              <span className="f-icon" aria-hidden="true">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </section>

        <section id="roadmaps" className="roadmaps-section" aria-labelledby="browse-title" style={{ scrollMarginTop: '100px' }}>
          <div className="section-head">
            <div>
              <span className="section-kicker">FIND YOUR DIRECTION</span>
              <h2 id="browse-title">Browse <span>Roadmaps</span></h2>
              <p>Pick a path, learn step by step and get job-ready.</p>
            </div>
            <div className="section-note"><span>✦</span> Your next chapter starts here</div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <label className="visually-hidden" htmlFor="search">Search roadmaps</label>
              <input
                id="search"
                type="search"
                placeholder="Search roadmaps… (e.g. react, devops)"
                autoComplete="off"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <label className="visually-hidden" htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" value={filters.difficulty} onChange={(e) => update({ difficulty: e.target.value })}>
              <option value="">Any difficulty</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <label className="visually-hidden" htmlFor="sort">Sort by</label>
            <select id="sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="order">Most popular</option>
              <option value="title">Title A → Z</option>
              <option value="category">Category</option>
              <option value="difficulty">Difficulty</option>
              <option value="created_at">Newest</option>
            </select>
          </div>

          <div className="chip-row" role="group" aria-label="Filter by category" data-chips>
            {CATEGORIES.map(([value, text]) => (
              <button
                key={value || 'all'}
                className="chip"
                type="button"
                aria-pressed={filters.category === value}
                onClick={() => update({ category: value })}
              >
                {text}
              </button>
            ))}
          </div>

          <p className={`status-line${status === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
            {status === 'error' ? (
              <>
                {error}{' '}
                <button className="btn btn-sm" type="button" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </button>
              </>
            ) : (
              statusText
            )}
          </p>

          <div className="grid" ref={gridRef} hidden={gridHidden}>
            {status === 'loading'
              ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" aria-hidden="true"></div>)
              : items.map((r) => (
                  <Link key={r.slug} className="card" to={`/roadmap?slug=${encodeURIComponent(r.slug)}`}>
                    <div className="card-meta">
                      <span className={`badge ${r.category}`}>{r.category}</span>
                      <span className={`badge ${r.difficulty}`}>{r.difficulty}</span>
                    </div>
                    <h2>{r.title}</h2>
                    <p>{r.description || 'No description yet.'}</p>
                    <span className="badge neutral">{r.tag}</span>
                  </Link>
                ))}
          </div>

          <nav className="pager" aria-label="Pagination" hidden={!showPager}>
            <button className="btn btn-sm" type="button" disabled={!links || !links.prev} onClick={() => goToPage(Math.max(1, filters.page - 1))}>
              ← Previous
            </button>
            <span className="page-info">
              {meta ? `Page ${meta.page} of ${meta.totalPages} · ${meta.total} roadmaps` : ''}
            </span>
            <button className="btn btn-sm" type="button" disabled={!links || !links.next} onClick={() => goToPage(filters.page + 1)}>
              Next →
            </button>
          </nav>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span className="footer-brand">Road2Role</span>
          <span>Learn with direction. Grow with confidence.</span>
          <a href="#main">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
