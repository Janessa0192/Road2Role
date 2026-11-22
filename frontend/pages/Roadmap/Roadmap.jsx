import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../AuthContext/AuthContext.jsx';
import { showError } from '../../utils/errors.js';
import usePageStyles from '../../hooks/usePageStyles.js';
import RoadmapViewer from '../../components/RoadmapViewer/RoadmapViewer.jsx';
import TopicResources, { orderTopics } from '../../components/TopicResources/TopicResources.jsx';
import VoiceTeacher from '../../components/VoiceTeacher/VoiceTeacher.jsx';
import RoadmapQuiz from '../../components/TopicQuiz/RoadmapQuiz.jsx';
import viewerCss from "../../../components/roadmap-viewer.css?inline";
import teacherCss from "../../../components/voice-teacher.css?inline";

const STYLES = [viewerCss, teacherCss];
const enc = encodeURIComponent;
const isLinkBox = (key) => String(key).startsWith('json:');

const Footer = () => (
  <footer className="site-footer">
    <div className="container">
      <span>
        <span className="brand-line">Road2Role</span> · Learn, build, get hired.
      </span>
    </div>
  </footer>
);

/** /roadmap?slug=backend (old links) and /roadmap/backend both work. */
export default function Roadmap() {
  usePageStyles(STYLES);
  const params = useParams();
  const [search] = useSearchParams();
  const slug = params.slug || search.get('slug');

  return (
    <>
      <main id="main" className="container">
        <p className="breadcrumbs">
          <Link to="/">← All roadmaps</Link>
        </p>
        {slug ? (
          <RoadmapContent key={slug} slug={slug} />
        ) : (
          <p className="status-line error" role="status" aria-live="polite">
            No roadmap selected. Go back and pick one.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}

function RoadmapContent({ slug }) {
  const { user, loaded } = useAuth();
  const userId = user ? user.id : null;
  const { pathname, search } = useLocation();

  const [roadmap, setRoadmap] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [layout, setLayout] = useState(null); // null = no interactive diagram (or not loaded yet)
  const [layoutChecked, setLayoutChecked] = useState(false);

  const [doneKeys, setDoneKeys] = useState(() => new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [progressError, setProgressError] = useState('');

  const [selectedKey, setSelectedKey] = useState(null);
  const [openRequest, setOpenRequest] = useState(null); // { key, n }
  const openCounter = useRef(0);

  const [copied, setCopied] = useState(false);
  const [loginToast, setLoginToast] = useState(false);
  const [fallbackTopics, setFallbackTopics] = useState([]);

  /* ---- 1. the roadmap itself, then its interactive layout ----------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/roadmaps/${enc(slug)}`);
        if (cancelled) return;
        setRoadmap(data);
        try {
          const l = await api.get(`/roadmaps/${enc(slug)}/layout`);
          if (!cancelled) setLayout(l);
        } catch (err) {
          console.warn('Interactive layout unavailable, using the image.', err.message);
        }
        if (!cancelled) setLayoutChecked(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.status === 404 ? 'Roadmap not found.' : showError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!roadmap) return undefined;
    const previous = document.title;
    document.title = `${roadmap.title} - Road2Role`;
    return () => {
      document.title = previous;
    };
  }, [roadmap]);

  // the old CSS hides the static PNG while the interactive diagram is shown
  useEffect(() => {
    if (!layout) return undefined;
    document.body.classList.add('has-interactive');
    return () => document.body.classList.remove('has-interactive');
  }, [layout]);

  /* ---- 2. which topics did this user complete? ---------------------------------------- */
  const topicKeys = useMemo(
    () => new Set(layout ? layout.nodes.filter((n) => n.type === 'topic' && !isLinkBox(n.key)).map((n) => n.key) : []),
    [layout],
  );

  useEffect(() => {
    if (!layoutChecked || !loaded) return undefined;
    if (!layout || !userId) {
      setDoneKeys(new Set());
      setProgressLoaded(true);
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/me/progress/${enc(slug)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setDoneKeys(new Set(data.topics.filter((t) => t.status === 'completed' && topicKeys.has(t.topic_key)).map((t) => t.topic_key)));
      })
      .catch((err) => {
        if (cancelled) return;
        setProgressError(showError(err));
        setDoneKeys(new Set());
      })
      .finally(() => !cancelled && setProgressLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [layoutChecked, layout, loaded, userId, slug, topicKeys]);

  /* ---- 3. roadmaps without a diagram: plain read-only topic list ---------------------- */
  useEffect(() => {
    if (!layoutChecked || layout) return undefined;
    let cancelled = false;
    api
      .get(`/roadmaps/${enc(slug)}/topics`)
      .then(({ data }) => !cancelled && setFallbackTopics(data))
      .catch((err) => !cancelled && setProgressError(showError(err)));
    return () => {
      cancelled = true;
    };
  }, [layoutChecked, layout, slug]);

  /* ---- voice teacher topics: same reading order as "Topics & resources" ----------------- */
  const teacherTopics = useMemo(() => {
    if (layout) return orderTopics(layout).map((t) => ({ key: t.key, title: t.title }));
    return fallbackTopics.map((t) => ({ key: t.topic_key, title: t.label }));
  }, [layout, fallbackTopics]);

  /* ---- 4. deep link: /roadmap?slug=x#topic=<key> -------------------------------------- */
  const deepLinked = useRef(false);
  useEffect(() => {
    if (!layout || !progressLoaded || deepLinked.current) return undefined;
    deepLinked.current = true;
    const m = /^#topic=(.+)$/.exec(window.location.hash);
    if (!m) return undefined;
    const key = decodeURIComponent(m[1]);
    setSelectedKey(key);
    const timer = setTimeout(() => setOpenRequest({ key, n: ++openCounter.current }), 300);
    return () => clearTimeout(timer);
  }, [layout, progressLoaded]);

  /* ---- handlers ----------------------------------------------------------------------- */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleSelect(key) {
    setSelectedKey(key);
    setOpenRequest({ key, n: ++openCounter.current }); // click -> jump to this topic's resources below
    window.history.replaceState(null, '', `#topic=${enc(key)}`);
  }

  function handleNeedLogin() {
    setLoginToast(true);
    setTimeout(() => setLoginToast(false), 4000);
  }

  const base = `/me/progress/${enc(slug)}`;
  async function handleToggleDone(key, next) {
    if (next) await api.put(`${base}/${enc(key)}`, { status: 'completed' });
    else await api.del(`${base}/${enc(key)}`);
    setDoneKeys((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
    document.dispatchEvent(new CustomEvent('progress-changed', { detail: { key, done: next } }));
  }

  /* ---- render ------------------------------------------------------------------------- */
  if (loadError) {
    return (
      <p className="status-line error" role="status" aria-live="polite">
        {loadError}
      </p>
    );
  }
  if (!roadmap || !loaded) {
    return (
      <p className="status-line" role="status" aria-live="polite">
        Loading roadmap…
      </p>
    );
  }

  const total = topicKeys.size;
  const doneCount = layout ? doneKeys.size : 0;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const progressReady = layoutChecked && (!layout || progressLoaded);

  return (
    <div>
      <header className="roadmap-header">
        <div>
          <h1>{roadmap.title}</h1>
          <div className="badges">
            <span className={`badge ${roadmap.category}`}>{roadmap.category}</span>
            <span className={`badge ${roadmap.difficulty}`}>{roadmap.difficulty}</span>
            <span className="badge neutral">{roadmap.tag}</span>
          </div>
        </div>
        <button className="btn btn-sm" type="button" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </header>

      <p style={{ color: 'var(--muted)', marginTop: '-0.4rem' }}>{roadmap.description || ''}</p>

      <section className="progress-panel" aria-labelledby="progress-title">
        <div className="row">
          <strong id="progress-title">Your progress</strong>
          <span className="page-info">{progressReady && user ? `${doneCount} of ${total} topics (${percent}%)` : ''}</span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressReady ? percent : 0}>
          <div className="progress-fill" style={{ width: `${progressReady ? percent : 0}%` }}></div>
        </div>
        <p className="hint" style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
          {progressReady &&
            (user ? (
              'Hover a topic in the roadmap and press the check to mark it as completed.'
            ) : (
              <>
                <Link to="/login">Sign in</Link> to track your progress.
              </>
            ))}
        </p>
      </section>

      {/* Practice quiz: random questions from the whole roadmap */}
      <section className="rq-section" aria-label="Roadmap quiz">
        <RoadmapQuiz slug={slug} />
      </section>

      {roadmap.article_html && (
        // article_html is rendered by our own backend from the repo's markdown (same as before)
        <section className="article" aria-label="What is this roadmap about" dangerouslySetInnerHTML={{ __html: roadmap.article_html }} />
      )}

      {layout && progressLoaded && (
        <RoadmapViewer
          layout={layout}
          doneKeys={doneKeys}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          onToggleDone={userId ? handleToggleDone : undefined}
          onNeedLogin={handleNeedLogin}
        />
      )}

      {roadmap.image_url && (
        <section className="roadmap-visual" aria-label="Roadmap diagram">
          <div className="scroll">
            <img src={roadmap.image_url} alt={`${roadmap.title} diagram`} />
          </div>
          <p className="caption">
            Full size diagram - open in a new tab for details:{' '}
            <a href={roadmap.image_url} target="_blank" rel="noopener noreferrer">
              open image
            </a>
          </p>
        </section>
      )}

      {/* Voice teacher: explains the topics of this roadmap out loud and answers doubts */}
      {progressReady && teacherTopics.length > 0 && (
        <section className="vt-section" aria-label="Voice teacher">
          <VoiceTeacher
            slug={slug}
            topics={teacherTopics}
            openRequest={openRequest}
            doneKeys={doneKeys}
            onMarkDone={userId && layout ? (key) => handleToggleDone(key, true) : undefined}
          />
        </section>
      )}

      {/* Resources for the topic you click in the roadmap. Progress is NOT tracked here. */}
      {layout && progressLoaded && (
        <section className="res-section" aria-labelledby="res-title">
          <h2 id="res-title">Topics &amp; resources</h2>
          <p className="res-hint">
            Click any box in the roadmap above to jump to its resources here. Hover a box and press the check to mark it as
            completed.
          </p>
          <div className="res-list">
            <TopicResources layout={layout} doneKeys={doneKeys} roadmapSlug={slug} user={user} openRequest={openRequest} />
          </div>
        </section>
      )}

      {/* Fallback for roadmaps without an interactive diagram */}
      {layoutChecked && !layout && fallbackTopics.length > 0 && (
        <section aria-labelledby="topics-title">
          <h2 id="topics-title" style={{ fontSize: '1.2rem' }}>
            Topics
          </h2>
          <div className="topic-list">
            {fallbackTopics.map((t) => (
              <FallbackTopic key={t.topic_key} slug={slug} topic={t} />
            ))}
          </div>
        </section>
      )}

      <p className="field-error" aria-live="assertive">
        {progressError}
      </p>

      {loginToast && (
        <div className="res-login">
          <Link to={`/login?next=${enc(pathname + search)}`}>Sign in</Link> to mark topics as completed.
        </div>
      )}
    </div>
  );
}

/** One collapsible topic of a roadmap without a diagram; its text loads on first open. */
function FallbackTopic({ slug, topic }) {
  const [state, setState] = useState({ status: 'idle', html: '', error: '' });

  async function handleToggle(event) {
    if (!event.currentTarget.open || state.status !== 'idle') return;
    setState({ status: 'loading', html: '', error: '' });
    try {
      const { data } = await api.get(`/roadmaps/${enc(slug)}/topics/${enc(topic.topic_key)}`);
      const articles = (data.articles || [])
        .map((a) => `<div class="article-resource"><h3>${escapeHtml(a.title)}</h3>${a.contentHtml || ''}</div>`)
        .join('');
      setState({ status: 'ready', html: `<div class="content">${data.contentHtml || '<p>No description yet.</p>'}</div>${articles}`, error: '' });
    } catch (err) {
      setState({ status: 'error', html: '', error: showError(err) });
    }
  }

  return (
    <details className="topic" data-key={topic.topic_key} onToggle={handleToggle}>
      <summary>
        <span className="chev" aria-hidden="true">
          ›
        </span>
        {topic.label}
      </summary>
      <div className="topic-body">
        {state.status === 'ready' ? (
          <div dangerouslySetInnerHTML={{ __html: state.html }} />
        ) : state.status === 'error' ? (
          <p className="field-error">{state.error}</p>
        ) : (
          <p className="status-line">Loading…</p>
        )}
      </div>
    </details>
  );
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
