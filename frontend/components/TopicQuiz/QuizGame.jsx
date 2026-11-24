import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';

// Full-screen quiz game. Questions come from the AI (POST /quizzes/ai/start) WITHOUT the
// correct answers; every answer is checked on the server (POST /quizzes/ai/check), which
// also returns the 1-2 line explanation shown after each question and again at the end.
const unwrap = (res) => res?.data ?? res;
const LETTERS = ['A', 'B', 'C', 'D'];
const BASE_POINTS = 10;

/** Locks page scroll while the game is open and lets Escape close it. */
function useOverlay(onEscape) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onEscape();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape]);
}

/** Shown while the AI is writing the questions (first time on a topic takes a few seconds). */
export function QuizLoading({ onCancel }) {
  useOverlay(onCancel);
  return (
    <div className="qg-overlay" role="dialog" aria-modal="true" aria-label="Preparing your quiz">
      <div className="qg-center">
        <div className="qg-spinner" aria-hidden="true"></div>
        <h2 className="qg-title">Preparing your quiz…</h2>
        <p className="qg-sub" role="status">
          The AI is writing fresh questions for you. The first time on a topic can take a few seconds.
        </p>
        <button type="button" className="qg-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function QuizGame({ questions, sourceLabel, onClose, onPlayAgain }) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState(null); // answer of the current question
  const [error, setError] = useState('');
  const [log, setLog] = useState([]); // one entry per answered question, for the final review
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gain, setGain] = useState(0);
  const [done, setDone] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(Date.now());
  const nextRef = useRef(null);
  const q = questions[index];

  useOverlay(onClose);

  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);

  const answer = useCallback(
    async (option) => {
      if (locked || !q) return;
      setLocked(true);
      setSelectedId(option.id);
      setError('');
      try {
        const res = unwrap(await api.post('/quizzes/ai/check', { questionId: q.id, optionId: option.id }));
        const nextStreak = res.correct ? streak + 1 : 0;
        const earned = res.correct ? BASE_POINTS + Math.min(streak, 5) * 2 : 0; // small streak bonus
        setResult(res);
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setGain(earned);
        if (res.correct) {
          setScore((s) => s + 1);
          setPoints((p) => p + earned);
        }
        setLog((l) => [
          ...l,
          { question: q.question_text, topic: q.topic_label, chosen: option.option_text, correctText: res.correctOptionText, correct: res.correct, explanation: res.explanation },
        ]);
      } catch (e) {
        // let the learner try again instead of getting stuck
        setLocked(false);
        setSelectedId(null);
        setError(showError(e, 'Could not check your answer. Please try again.'));
      }
    },
    [locked, q, streak],
  );

  function next() {
    if (index === total - 1) {
      setSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelectedId(null);
    setLocked(false);
    setResult(null);
    setGain(0);
  }

  // keyboard: 1-4 or A-D picks an option (Enter on the focused "Next" button goes on)
  useEffect(() => {
    if (done) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const pos = key.length === 1 ? '1234abcd'.indexOf(key) : -1; // 1-4 or a-d
      const i = pos < 0 ? -1 : pos % 4;
      if (i >= 0 && i < (q?.options.length || 0)) answer(q.options[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, q, answer]);

  const percent = Math.round((score / total) * 100);
  const confetti = useMemo(
    () => Array.from({ length: 30 }, () => ({ left: Math.random() * 100, delay: Math.random() * 1.5, dur: 2.5 + Math.random() * 2, hue: Math.floor(Math.random() * 360) })),
    [],
  );

  /* ------------------------------------------------------------- results -- */
  if (done) {
    const stars = percent >= 90 ? 3 : percent >= 60 ? 2 : percent >= 30 ? 1 : 0;
    const verdict =
      percent >= 90 ? 'Outstanding! You really know this.' : percent >= 60 ? 'Nice work - a little more practice and you will ace it.' : 'Good start! Read the explanations below and try again.';
    return (
      <div className="qg-overlay" role="dialog" aria-modal="true" aria-label="Quiz results">
        {percent >= 80 && (
          <div className="qg-confetti" aria-hidden="true">
            {confetti.map((c, i) => (
              <span key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: `hsl(${c.hue} 85% 74%)` }}></span>
            ))}
          </div>
        )}
        <div className="qg-shell qg-scroll">
          <div className="qg-end">
            <p className="qg-stars" aria-label={`${stars} out of 3 stars`}>
              {[0, 1, 2].map((s) => (
                <span key={s} className={s < stars ? 'on' : ''} aria-hidden="true">
                  ★
                </span>
              ))}
            </p>
            <h2 className="qg-title">Quiz complete</h2>
            <p className="qg-final">
              {score} <span>/ {total}</span>
            </p>
            <p className="qg-sub">
              {percent}% · {points} points · best streak {bestStreak} · {seconds}s
            </p>
            <p className="qg-verdict">{verdict}</p>
            <div className="qg-actions">
              <button type="button" className="qg-primary" onClick={onPlayAgain}>
                Play again with new questions
              </button>
              <button type="button" className="qg-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>

          <h3 className="qg-review-title">Your answers</h3>
          <ol className="qg-review">
            {log.map((item, i) => (
              <li key={i} className={item.correct ? 'good' : 'bad'}>
                <p className="qg-review-q">
                  <span aria-hidden="true">{item.correct ? '✅' : '❌'}</span> {item.question}
                </p>
                {!item.correct && (
                  <p>
                    Your answer: <strong>{item.chosen}</strong>
                  </p>
                )}
                <p>
                  Correct answer: <strong>{item.correctText}</strong>
                </p>
                {item.explanation && <p className="qg-explain">{item.explanation}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ question -- */
  return (
    <div className="qg-overlay" role="dialog" aria-modal="true" aria-label="Quiz game">
      <div className="qg-shell">
        <header className="qg-top">
          <button type="button" className="qg-close" onClick={onClose} aria-label="End quiz">
            ✕
          </button>
          <div className="qg-progress" aria-hidden="true">
            <div className="qg-progress-fill" style={{ width: `${(index / total) * 100}%` }}></div>
          </div>
          <div className="qg-stats">
            <span>
              {index + 1} / {total}
            </span>
            <span className="qg-points">⭐ {points}</span>
            {streak > 1 && <span className="qg-streak">🔥 {streak}</span>}
          </div>
        </header>

        <main className="qg-main" key={index}>
          {(q.topic_label || sourceLabel) && <p className="qg-chip">{q.topic_label || sourceLabel}</p>}
          <h2 className="qg-question">{q.question_text}</h2>

          <div className="qg-options" role="group" aria-label="Answer options">
            {q.options.map((o, i) => {
              const isCorrect = result && o.id === result.correctOptionId;
              const isWrong = result && !result.correct && o.id === selectedId;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`qg-opt${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}${selectedId === o.id && !result ? ' picked' : ''}`}
                  disabled={locked}
                  onClick={() => answer(o)}
                >
                  <span className="qg-letter" aria-hidden="true">
                    {LETTERS[i]}
                  </span>
                  <span className="qg-opt-text">{o.option_text}</span>
                  <span className="qg-opt-tag">{isCorrect ? 'Correct' : isWrong ? 'Your answer' : ''}</span>
                </button>
              );
            })}
          </div>

          <div className="qg-feedback" role="status" aria-live="polite">
            {locked && !result && !error && <p className="qg-sub">Checking…</p>}
            {error && <p className="qg-bad">{error}</p>}
            {result && (
              <div className={`qg-explain-box ${result.correct ? 'good' : 'bad'}`}>
                <p className="qg-verdict-line">
                  {result.correct ? `✅ Correct! +${gain}` : <>❌ Not quite. Correct answer: <strong>{result.correctOptionText}</strong></>}
                </p>
                {result.explanation && <p className="qg-explain">{result.explanation}</p>}
              </div>
            )}
          </div>
        </main>

        <footer className="qg-foot">
          <span className="qg-hint">Tip: press 1-4 to answer</span>
          <button type="button" className="qg-primary" ref={nextRef} hidden={!result} onClick={next}>
            {index === total - 1 ? 'See results' : 'Next question'}
          </button>
        </footer>
      </div>
    </div>
  );
}
