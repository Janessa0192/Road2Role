import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';
import usePageStyles from '../../hooks/usePageStyles.js';
import { LANGUAGES, speechSupport, createRecognition, useVoices, bestVoice, micErrorMessage } from '../../hooks/useSpeech.js';
import robotCss from '../../../components/robot-classroom.css?inline';
import interviewCss from '../../../components/interview-mode.css?inline';
import RobotAvatar from './RobotAvatar.jsx';

// Mock interview with the robot as the interviewer.
//   setup -> question (read aloud + shown) -> you answer by voice or typing -> next question
//   ... -> review (score, strengths, what to improve, tips, feedback for every question)
// The server writes the questions and the review (/interview/*); it is stateless, so the
// transcript so far is sent with every answer. Practice mode: nothing is stored.
const STYLES = [robotCss, interviewCss];
const unwrap = (res) => res?.data ?? res;
const SKIPPED = '(skipped)';

const LEVELS = [
  { id: 'fresher', label: 'Fresher' },
  { id: 'junior', label: '1-3 years' },
  { id: 'mid', label: '3-5 years' },
];
const TOTALS = [5, 8];
const OTHER = '__other__'; // the "Other (type your own)" choice in the role dropdown

/** "Data Analyst Roadmap" -> "Data Analyst" (a few role roadmaps carry the word in their title). */
const roleName = (title) => String(title || '').replace(/\s+roadmap$/i, '').trim();

/** The site's own role roadmaps (Frontend, Backend, DevOps ...) for the role dropdown: [{ slug, name }]. */
function useRoleOptions() {
  const [roles, setRoles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    api
      .get('/roadmaps', { query: { category: 'role', limit: 100 } })
      .then((res) => {
        if (!alive) return;
        const list = (res?.data ?? []).map((r) => ({ slug: r.slug, name: roleName(r.title) })).filter((r) => r.name);
        setRoles(list.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {}) // no list -> the dropdown falls back to typing the role
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);
  return { roles, loaded };
}

/** "frontend" -> "Frontend", "full-stack" -> "Full Stack": a starting point for the role box. */
export function roleFromSlug(slug) {
  return String(slug || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** Which of the robot's four animations matches what is happening. */
export function interviewRobotState({ waiting, listening, speaking }) {
  if (waiting) return 'thinking';
  if (listening) return 'listening';
  if (speaking) return 'speaking';
  return 'idle';
}

const scoreClass = (n) => (n >= 7 ? 'good' : n >= 4 ? 'ok' : 'low');

/* ------------------------------------------------------------------ views -- */

export function SetupView({ cfg, setCfg, roles = [], rolesLoaded = true, canSpeak, onStart, error, needLogin, pathname }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const selectValue = cfg.other ? OTHER : roles.some((r) => r.name === cfg.role) ? cfg.role : '';
  return (
    <div className="iv-card iv-setup">
      <div className="iv-robot iv-robot-lg">
        <RobotAvatar state="idle" />
      </div>
      <h2 className="iv-h">Interview practice</h2>
      <p className="iv-sub">I will ask you a few questions for the role you pick, like a real interviewer. At the end you get a score and feedback.</p>

      <label className="iv-field">
        Role you are preparing for
        <select
          value={selectValue}
          disabled={!rolesLoaded}
          onChange={(e) => (e.target.value === OTHER ? set({ other: true, role: '' }) : set({ other: false, role: e.target.value }))}
        >
          <option value="" disabled>
            {rolesLoaded ? 'Choose a role…' : 'Loading roles…'}
          </option>
          {roles.map((r) => (
            <option key={r.slug} value={r.name}>
              {r.name}
            </option>
          ))}
          <option value={OTHER}>Other (type your own)…</option>
        </select>
      </label>
      {cfg.other && (
        <label className="iv-field">
          Your role
          <input type="text" value={cfg.role} maxLength={80} autoFocus onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Python Developer" />
        </label>
      )}

      <div className="iv-row">
        <label className="iv-field">
          Experience
          <select value={cfg.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="iv-field">
          Questions
          <select value={cfg.total} onChange={(e) => set({ total: Number(e.target.value) })}>
            {TOTALS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="iv-field">
          Language
          <select value={cfg.lang} onChange={(e) => set({ lang: e.target.value })}>
            {Object.entries(LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {canSpeak && (
        <label className="iv-check">
          <input type="checkbox" checked={cfg.speak} onChange={(e) => set({ speak: e.target.checked })} /> Read the questions aloud
        </label>
      )}

      <button type="button" className="iv-primary" onClick={onStart} disabled={cfg.role.trim().length < 2}>
        Start interview
      </button>
      <Messages error={error} needLogin={needLogin} pathname={pathname} />
    </div>
  );
}

function Messages({ error, needLogin, pathname }) {
  return (
    <>
      {needLogin && (
        <p className="iv-note bad" role="alert">
          Please <Link to={`/login?next=${encodeURIComponent(pathname)}`}>sign in</Link> to practise interviews.
        </p>
      )}
      {error && (
        <p className="iv-note bad" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function QuestionView({
  cfg,
  index,
  total,
  question,
  draft,
  setDraft,
  waiting,
  listening,
  speaking,
  support,
  onMic,
  onRepeat,
  onSkip,
  onSubmit,
  error,
  needLogin,
  pathname,
}) {
  const state = interviewRobotState({ waiting, listening, speaking });
  const label = waiting ? 'Thinking…' : listening ? 'Listening…' : speaking ? 'Asking…' : 'Your turn';
  return (
    <div className="iv-card iv-ask">
      <div className="iv-progress" aria-label={`Question ${index} of ${total}`}>
        <span>
          Question {index} of {total}
        </span>
        <div className="iv-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i < index - 1 ? 'done' : i === index - 1 ? 'now' : ''}></i>
          ))}
        </div>
      </div>

      <div className="iv-robot">
        <RobotAvatar state={state} />
      </div>
      <p className={`iv-status${listening || speaking ? ' live' : ''}`} role="status">
        {label}
      </p>

      <div className="iv-bubble">
        <p className="iv-who">Interviewer</p>
        <p className="iv-q">{question}</p>
      </div>

      <label className="iv-field iv-answer">
        Your answer
        <textarea
          value={draft}
          rows={4}
          maxLength={2000}
          disabled={waiting}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSubmit();
          }}
          placeholder={support.stt ? 'Tap the mic and speak, or type your answer here…' : 'Type your answer here…'}
        />
      </label>

      <div className="iv-actions">
        {support.stt && (
          <button type="button" className={`iv-btn iv-mic${listening ? ' on' : ''}`} onClick={onMic} disabled={waiting} aria-pressed={listening}>
            {listening ? '■ Stop recording' : '🎤 Answer by voice'}
          </button>
        )}
        {support.tts && (
          <button type="button" className="iv-btn" onClick={onRepeat} disabled={waiting}>
            🔁 Repeat question
          </button>
        )}
        <button type="button" className="iv-btn" onClick={onSkip} disabled={waiting}>
          Skip
        </button>
        <button type="button" className="iv-primary" onClick={onSubmit} disabled={waiting || draft.trim().length < 2}>
          {index === total ? 'Finish & get review' : 'Submit answer'}
        </button>
      </div>
      {cfg && !support.stt && <p className="iv-note">Voice answers need Chrome, Edge or Safari. You can type your answers instead.</p>}
      <Messages error={error} needLogin={needLogin} pathname={pathname} />
    </div>
  );
}

export function ReviewView({ review, turns, onAgain, onClose }) {
  return (
    <div className="iv-card iv-review">
      <div className={`iv-score ${scoreClass(review.score)}`} aria-label={`Score ${review.score} out of 10`}>
        <strong>{review.score}</strong>
        <span>/ 10</span>
      </div>
      <h2 className="iv-h">Interview review</h2>
      <p className="iv-verdict">{review.verdict}</p>

      <div className="iv-lists">
        {review.strengths.length > 0 && <ReviewList title="👍 What went well" items={review.strengths} tone="good" />}
        {review.improvements.length > 0 && <ReviewList title="🌱 What to improve" items={review.improvements} tone="low" />}
        {review.tips.length > 0 && <ReviewList title="💡 Tips for next time" items={review.tips} tone="tip" />}
      </div>

      <h3 className="iv-h3">Question by question</h3>
      <ol className="iv-qs">
        {turns.map((t, i) => {
          const r = review.questions[i] || { score: 0, feedback: '', better_answer: '' };
          return (
            <li key={i} className={scoreClass(r.score)}>
              <p className="iv-qs-head">
                <span className="iv-qs-q">{t.question}</span>
                <span className={`iv-badge ${scoreClass(r.score)}`}>{r.score}/10</span>
              </p>
              <p className="iv-qs-a">
                <em>Your answer:</em> {t.answer === SKIPPED ? 'You skipped this question.' : t.answer}
              </p>
              {r.feedback && <p>{r.feedback}</p>}
              {r.better_answer && (
                <p className="iv-better">
                  <strong>A strong answer:</strong> {r.better_answer}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="iv-actions">
        <button type="button" className="iv-primary" onClick={onAgain}>
          Practise again
        </button>
        <button type="button" className="iv-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function ReviewList({ title, items, tone }) {
  return (
    <section className={`iv-list ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ the screen -- */

function InterviewScreen({ slug, onClose }) {
  usePageStyles(STYLES);
  const { pathname } = useLocation();
  const support = useMemo(() => speechSupport(), []);
  const voices = useVoices();

  const [phase, setPhase] = useState('setup'); // setup | asking | review
  const { roles, loaded: rolesLoaded } = useRoleOptions();
  const [cfg, setCfg] = useState({ role: '', other: false, level: 'fresher', total: 5, lang: 'en', speak: support.tts });
  const [turns, setTurns] = useState([]); // answered: [{ question, answer }]
  const [question, setQuestion] = useState('');
  const [draft, setDraft] = useState('');
  const [review, setReview] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [needLogin, setNeedLogin] = useState(false);

  // once the roles are in: preselect this roadmap's role; if there is no list at all, let the user type
  useEffect(() => {
    if (!rolesLoaded) return;
    const match = roles.find((r) => r.slug === slug);
    setCfg((c) => {
      if (c.role || c.other) return c; // the user already chose
      if (match) return { ...c, role: match.name };
      return roles.length ? c : { ...c, other: true, role: roleFromSlug(slug) };
    });
  }, [rolesLoaded, roles, slug]);

  const runRef = useRef(0);
  const recRef = useRef(null);
  const synth = support.tts ? window.speechSynthesis : null;

  function stopAudio() {
    runRef.current += 1;
    synth?.cancel();
    setSpeaking(false);
    if (recRef.current) {
      const rec = recRef.current;
      recRef.current = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    setListening(false);
  }

  // lock page scroll, Esc closes, and everything goes quiet when the screen closes
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      runRef.current += 1;
      synth?.cancel();
      try {
        recRef.current?.abort();
      } catch {
        /* already stopped */
      }
    };
  }, [onClose, synth]);

  function speakQuestion(text, lang = cfg.lang) {
    if (!synth) return;
    const run = ++runRef.current;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGUAGES[lang].speak;
    const v = bestVoice(voices, lang, '');
    if (v) u.voice = v;
    u.onstart = () => run === runRef.current && setSpeaking(true);
    u.onend = () => run === runRef.current && setSpeaking(false);
    u.onerror = () => run === runRef.current && setSpeaking(false);
    setTimeout(() => run === runRef.current && synth.speak(u), 30); // short delay after cancel() avoids dropped speech in Chrome
  }

  function fail(e, fallback) {
    if (e?.status === 401) setNeedLogin(true);
    else setError(showError(e, fallback));
  }

  async function start() {
    stopAudio();
    setError('');
    setNeedLogin(false);
    setWaiting(true);
    setPhase('asking');
    setQuestion('');
    setTurns([]);
    setDraft('');
    try {
      const res = unwrap(await api.post('/interview/start', { role: cfg.role.trim(), level: cfg.level, lang: cfg.lang, total: cfg.total }));
      setQuestion(res.question);
      if (cfg.speak) speakQuestion(res.question);
    } catch (e) {
      setPhase('setup');
      fail(e, 'Could not start the interview. Please try again.');
    } finally {
      setWaiting(false);
    }
  }

  async function submit(text = draft) {
    const answer = text.trim() || SKIPPED;
    if (waiting || !question) return;
    stopAudio();
    setError('');
    setWaiting(true);
    try {
      const res = unwrap(
        await api.post('/interview/answer', { role: cfg.role.trim(), level: cfg.level, lang: cfg.lang, total: cfg.total, turns, question, answer }),
      );
      const done = [...turns, { question, answer }];
      setTurns(done);
      setDraft('');
      if (res.done) {
        setReview(res.review);
        setPhase('review');
      } else {
        setQuestion(res.question);
        if (cfg.speak) speakQuestion(res.question);
      }
    } catch (e) {
      fail(e, 'Could not send your answer. Please try again.'); // the draft stays, so you can retry
    } finally {
      setWaiting(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop(); // onend finishes up
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    stopAudio();
    setError('');
    const base = draft.trim();
    rec.lang = LANGUAGES[cfg.lang].listen;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let heard = '';
      for (let i = 0; i < e.results.length; i += 1) heard += e.results[i][0].transcript;
      setDraft(base ? `${base} ${heard.trim()}` : heard.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(micErrorMessage(e.error));
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
    }
  }

  function again() {
    stopAudio();
    setReview(null);
    setTurns([]);
    setQuestion('');
    setDraft('');
    setError('');
    setPhase('setup');
  }

  return (
    <div className="iv-overlay" role="dialog" aria-modal="true" aria-label="Interview practice">
      <div className="iv-shell">
        <header className="iv-top">
          <button type="button" className="iv-icon" onClick={onClose} aria-label="Close interview practice">
            ✕
          </button>
          <h2 className="iv-title">{phase === 'setup' ? 'Interview practice' : `Interview: ${cfg.role}`}</h2>
        </header>

        {phase === 'setup' && (
          <SetupView cfg={cfg} setCfg={setCfg} roles={roles} rolesLoaded={rolesLoaded} canSpeak={support.tts} onStart={start} error={error} needLogin={needLogin} pathname={pathname} />
        )}
        {phase === 'asking' && (
          <QuestionView
            cfg={cfg}
            index={turns.length + 1}
            total={cfg.total}
            question={question || 'Getting your first question ready…'}
            draft={draft}
            setDraft={setDraft}
            waiting={waiting}
            listening={listening}
            speaking={speaking}
            support={support}
            onMic={toggleMic}
            onRepeat={() => speakQuestion(question)}
            onSkip={() => submit(SKIPPED)}
            onSubmit={() => submit()}
            error={error}
            needLogin={needLogin}
            pathname={pathname}
          />
        )}
        {phase === 'review' && review && <ReviewView review={review} turns={turns} onAgain={again} onClose={onClose} />}
      </div>
    </div>
  );
}

export default function InterviewMode({ open, slug, onClose }) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<InterviewScreen slug={slug} onClose={onClose} />, document.body);
}
