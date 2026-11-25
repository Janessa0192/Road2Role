import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import usePageStyles from '../../hooks/usePageStyles.js';
import robotCss from '../../../components/robot-classroom.css?inline';
import RobotAvatar from './RobotAvatar.jsx';

// Full-screen "classroom": a robot teacher with live subtitles.
// It owns NO teaching logic. VoiceTeacher.jsx does the lesson, the doubts and the speech, and
// passes its state and handlers in; this file only shows them.
const STYLES = [robotCss];

const STATUS_LABELS = {
  idle: 'Ready',
  loading: 'Preparing…',
  speaking: 'Speaking…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  paused: 'Paused',
  done: 'Lesson finished',
};

/** Maps the teacher's status to one of the robot's four animations. */
export function robotStateFor(status) {
  if (status === 'speaking') return 'speaking';
  if (status === 'listening') return 'listening';
  if (status === 'thinking' || status === 'loading') return 'thinking';
  return 'idle';
}

/** Decides which text the subtitle bar shows (and whose words they are). */
export function subtitleFor({ status, nowSpeaking, caption, heard, lastQuestion, topicTitle }) {
  if (status === 'listening') return { who: 'You', text: heard || 'Go ahead, I am listening…' };
  if (status === 'thinking') return { who: lastQuestion ? 'You asked' : '', text: lastQuestion || 'Thinking…' };
  if (status === 'loading') return { who: '', text: 'Getting the lesson ready…' };
  if (status === 'speaking') return { who: 'Teacher', text: nowSpeaking || caption };
  if (caption) return { who: 'Teacher', text: caption };
  return { who: '', text: `Press “Start lesson” and I will teach “${topicTitle || 'this topic'}” step by step.` };
}

export function ClassroomView({
  status,
  topicTitle,
  nowSpeaking,
  caption,
  heard,
  lastQuestion,
  progress,
  support,
  busy,
  primary,
  hasNext,
  lessonMode,
  error,
  needLogin,
  onClose,
  onStop,
  onListen,
  onStopListening,
  onAsk,
  onNext,
  segments = [],
  idx = 0,
  streaming = false,
  chat = [],
  canPrevPart = false,
  canNextPart = false,
  canPrevTopic = false,
  canNextTopic = false,
  onPrevPart,
  onNextPart,
  onPrevTopic,
  onNextTopic,
  onPlayFrom,
  isDone = false,
  canMarkDone = false,
  markState = 'idle',
  onMarkDone,
}) {
  usePageStyles(STYLES);
  const { pathname } = useLocation();
  const [typed, setTyped] = useState('');
  const [showSubs, setShowSubs] = useState(true);
  const primaryRef = useRef(null);

  // lock page scroll while open, Esc closes, focus lands on the main button
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    primaryRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const listening = status === 'listening';
  const inputLocked = busy || listening;
  const sub = subtitleFor({ status, nowSpeaking, caption, heard, lastQuestion, topicTitle });

  function submit(e) {
    e.preventDefault();
    const q = typed.trim();
    if (q.length < 2 || inputLocked) return;
    setTyped('');
    onAsk(q);
  }

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true" aria-label="Robot classroom">
      <div className="rc-shell">
        <header className="rc-top">
          <button type="button" className="rc-icon" onClick={onClose} aria-label="Close classroom">
            ✕
          </button>
          <h2 className="rc-title">{topicTitle}</h2>
          <button type="button" className={`rc-icon rc-cc${showSubs ? ' on' : ''}`} onClick={() => setShowSubs((s) => !s)} aria-pressed={showSubs} aria-label="Subtitles" title="Subtitles on/off">
            CC
          </button>
        </header>

        <main className="rc-stage">
          <div className="rc-robot">
            <RobotAvatar state={robotStateFor(status)} />
          </div>
          <p className={`rc-status${status === 'speaking' || listening ? ' live' : ''}`} role="status">
            {STATUS_LABELS[status] || 'Ready'}
          </p>

          {showSubs && (
            <div className="rc-sub">
              {sub.who && <p className="rc-who">{sub.who}</p>}
              <p className="rc-line" key={sub.text}>
                {sub.text}
              </p>
            </div>
          )}

          {progress != null && (
            <div className="rc-progress" aria-hidden="true">
              <div className="rc-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </main>

        <footer className="rc-foot">
          <div className="rc-controls">
            <button type="button" className="rc-btn rc-sq" onClick={onPrevTopic} disabled={busy || !canPrevTopic} aria-label="Previous topic" title="Previous topic">
              ⏮
            </button>
            <button type="button" className="rc-btn rc-sq" onClick={onPrevPart} disabled={!canPrevPart} aria-label="Previous part" title="Previous part">
              ◀
            </button>
            <button type="button" className="rc-primary" ref={primaryRef} onClick={primary.onClick} disabled={primary.disabled}>
              {primary.label}
            </button>
            <button type="button" className="rc-btn rc-sq" onClick={onNextPart} disabled={!canNextPart} aria-label="Next part" title="Next part">
              ▶
            </button>
            <button type="button" className="rc-btn rc-sq" onClick={onNextTopic} disabled={busy || !canNextTopic} aria-label="Next topic" title="Next topic">
              ⏭
            </button>
            <button type="button" className="rc-btn rc-sq" onClick={onStop} disabled={status === 'idle'} aria-label="Stop" title="Stop">
              ⏹
            </button>
          </div>

          {status === 'done' && (
            <div className="rc-done">
              <p>
                That was “{topicTitle}”. Any doubts? Ask below, or move on.
              </p>
              <div className="rc-controls">
                {canMarkDone && (
                  <button type="button" className="rc-btn" onClick={onMarkDone} disabled={markState === 'saving'}>
                    {markState === 'saving' ? 'Saving…' : '✓ Mark topic completed'}
                  </button>
                )}
                {isDone && <span className="rc-ok">✓ Completed</span>}
                {hasNext && (
                  <button type="button" className="rc-btn" onClick={onNext}>
                    Teach next topic →
                  </button>
                )}
              </div>
              {markState === 'error' && (
                <p className="rc-note bad" role="alert">
                  Could not save your progress. Please try again.
                </p>
              )}
            </div>
          )}

          <form className="rc-ask" onSubmit={submit}>
            {support.stt && (
              <button type="button" className={`rc-btn rc-mic${listening ? ' on' : ''}`} onClick={listening ? onStopListening : onListen} disabled={busy} aria-pressed={listening}>
                {listening ? '■ Tap when you are done' : '🎤 Ask a doubt'}
              </button>
            )}
            <input
              type="text"
              value={typed}
              maxLength={500}
              placeholder={support.stt ? 'or type your doubt here…' : 'Type your doubt here…'}
              onChange={(e) => setTyped(e.target.value)}
              disabled={inputLocked}
              aria-label="Type your doubt"
            />
            <button type="submit" className="rc-btn" disabled={inputLocked || typed.trim().length < 2}>
              Ask
            </button>
          </form>

          {segments.length > 0 && (
            <details className="rc-text">
              <summary>📄 Lesson text{chat.length > 0 ? ' and your doubts' : ''}</summary>
              <ol>
                {segments.map((seg, i) => (
                  <li key={i} className={i === idx ? 'now' : ''}>
                    <button type="button" onClick={() => onPlayFrom(i)} disabled={streaming}>
                      {seg}
                    </button>
                  </li>
                ))}
              </ol>
              {chat.length > 0 && (
                <ul className="rc-chat" aria-label="Your doubts and the teacher's answers">
                  {chat.slice(-8).map((m, i) => (
                    <li key={i} className={m.role}>
                      <strong>{m.role === 'user' ? 'You' : 'Teacher'}:</strong> {m.content}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}

          {!support.stt && <p className="rc-note">Voice questions need Chrome, Edge or Safari. You can type your doubt instead.</p>}
          {!support.tts && <p className="rc-note bad">This browser cannot speak out loud. Use the latest Chrome, Edge or Safari. The subtitles still show the lesson.</p>}
          {lessonMode === 'basic' && <p className="rc-note">Basic mode: the teacher reads this topic&apos;s notes aloud. Smart explanations and doubt-solving need an AI key on the server.</p>}
          {needLogin && (
            <p className="rc-note bad" role="alert">
              Please <Link to={`/login?next=${encodeURIComponent(pathname)}`}>sign in</Link> to ask the teacher your doubts.
            </p>
          )}
          {error && (
            <p className="rc-note bad" role="alert">
              {error}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

export default function RobotClassroom({ open, ...props }) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<ClassroomView {...props} />, document.body);
}
