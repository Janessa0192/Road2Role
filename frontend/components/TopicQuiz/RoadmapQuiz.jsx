import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';

// Roadmap practice quiz - random questions from the WHOLE roadmap (replaces roadmap-quiz.js).
// Practice mode: works without login and stores nothing. The server never sends the correct
// answers with the questions; it reveals the right answer for one question only after that
// question was answered (POST /quizzes/check).
const COUNTS = [5, 10, 15];
const DEFAULT_COUNT = 10;
const unwrap = (res) => res?.data ?? res; // tolerate both { data: ... } and plain bodies

export default function RoadmapQuiz({ slug }) {
  const [phase, setPhase] = useState('checking'); // checking | bootError | intro | question | result
  const [bootError, setBootError] = useState('');
  const [available, setAvailable] = useState(0);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [starting, setStarting] = useState(false);
  const [introNote, setIntroNote] = useState('');
  const [session, setSession] = useState(null); // { questions, index, score, missed }

  const fetchQuestions = async (n) => unwrap(await api.get('/quizzes/random', { query: { roadmap: slug, count: n } }));

  // boot: how many questions exist for this roadmap?
  useEffect(() => {
    let cancelled = false;
    fetchQuestions(1)
      .then((data) => {
        if (cancelled) return;
        setAvailable(data.available || 0);
        setPhase('intro');
      })
      .catch((e) => {
        if (cancelled) return;
        setBootError(showError(e, 'Quiz unavailable right now.'));
        setPhase('bootError');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // choices: 5 / 10 / 15, capped by how many questions exist
  const choices = [...new Set([...COUNTS.filter((c) => c < available), Math.min(available, Math.max(...COUNTS))])].sort((a, b) => a - b);
  const effectiveCount = choices.includes(count) ? count : choices[choices.length - 1];

  // can be triggered from the intro screen or from "try new questions" on the results screen
  async function start() {
    setStarting(true);
    setIntroNote('');
    try {
      const data = await fetchQuestions(effectiveCount);
      setAvailable(data.available ?? available);
      if (!data.questions?.length) {
        setIntroNote('No questions available right now.');
        setPhase('intro');
      } else {
        setSession({ questions: data.questions, index: 0, score: 0, missed: [] });
        setPhase('question');
      }
    } catch (e) {
      setIntroNote(showError(e, 'Could not load the quiz. Please try again.'));
      setPhase('intro');
    } finally {
      setStarting(false);
    }
  }

  function handleAnswered(result, q) {
    setSession((s) => ({
      ...s,
      score: s.score + (result.correct ? 1 : 0),
      missed: result.correct
        ? s.missed
        : [...s.missed, { question: q.question_text, correct: result.correctOptionText, explanation: result.explanation }],
    }));
  }

  function handleNext() {
    const last = session.index === session.questions.length - 1;
    setSession((s) => ({ ...s, index: s.index + 1 }));
    setPhase(last ? 'result' : 'question');
  }

  if (phase === 'checking') return <p className="res-note">Checking for quiz questions…</p>;

  if (phase === 'bootError') {
    return (
      <div className="rq-card">
        <p className="field-error">{bootError}</p>
      </div>
    );
  }

  if (phase === 'intro') {
    if (!available) {
      return (
        <div className="rq-card">
          <h2 className="rq-title">Test yourself</h2>
          <p className="res-note">No quiz questions have been added for this roadmap yet. Check back soon!</p>
        </div>
      );
    }
    return (
      <div className="rq-card">
        <h2 className="rq-title">Test yourself</h2>
        <p className="rq-sub">
          Random questions from across this whole roadmap. Tick an answer and the correct one is shown straight away.
        </p>
        <div className="rq-start">
          <label className="rq-count">
            Questions
            <select value={effectiveCount} onChange={(e) => setCount(Number(e.target.value))}>
              {choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="quiz-button" disabled={starting} onClick={start}>
            {starting ? 'Loading…' : 'Start quiz'}
          </button>
        </div>
        <p className="res-note rq-bank">
          {available} question{available === 1 ? '' : 's'} in the bank
        </p>
        <p className="field-error" role="alert">
          {introNote}
        </p>
      </div>
    );
  }

  if (phase === 'question') {
    return (
      <QuestionCard
        key={session.index}
        q={session.questions[session.index]}
        index={session.index}
        total={session.questions.length}
        score={session.score}
        onAnswered={handleAnswered}
        onNext={handleNext}
        onQuit={() => setPhase('intro')}
      />
    );
  }

  // result
  return <ResultCard session={session} starting={starting} onAgain={start} onClose={() => setPhase('intro')} />;
}

/** One question: tick an answer -> the server reveals the correct one right away. */
function QuestionCard({ q, index, total, score, onAnswered, onNext, onQuit }) {
  const [selectedId, setSelectedId] = useState(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'checking' | 'error' | 'answer', ... }
  const [result, setResult] = useState(null);
  const nextRef = useRef(null);

  const last = index === total - 1;
  const pct = Math.round((index / total) * 100);
  // the score shown stays as it was when the question appeared (the new point counts on the next question)
  const shownScore = score - (result?.correct ? 1 : 0);

  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);

  async function answer(optionId) {
    if (locked) return;
    setLocked(true);
    setSelectedId(optionId);
    setFeedback({ kind: 'checking' });

    let res;
    try {
      res = unwrap(await api.post('/quizzes/check', { questionId: q.id, optionId }));
    } catch (e) {
      // let the learner try again instead of getting stuck
      setLocked(false);
      setSelectedId(null);
      setFeedback({ kind: 'error', message: showError(e, 'Could not check your answer.') });
      return;
    }
    setResult(res);
    setFeedback({ kind: 'answer' });
    onAnswered(res, q);
  }

  return (
    <div className="rq-card">
      <div className="rq-meta">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>Score: {shownScore}</span>
      </div>
      <div className="rq-bar" aria-hidden="true">
        <div className="rq-bar-fill" style={{ width: `${pct}%` }}></div>
      </div>
      {q.topic_label && <p className="rq-topic">Topic: {q.topic_label}</p>}

      <fieldset className="rq-q">
        <legend>{q.question_text}</legend>
        {q.options.map((o) => {
          const isCorrect = result && o.id === result.correctOptionId;
          const isWrong = result && !result.correct && o.id === selectedId;
          return (
            <label
              key={o.id}
              className={`rq-opt${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`}
              data-option={o.id}
            >
              <input
                type="radio"
                name="rq-answer"
                value={o.id}
                checked={selectedId === o.id}
                disabled={locked}
                onChange={() => answer(o.id)}
              />
              <span className="rq-text">{o.option_text}</span>
              <span className="rq-tag" aria-hidden="true">
                {isCorrect ? 'Correct answer' : isWrong ? 'Your answer' : ''}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="rq-feedback" role="status" aria-live="polite">
        {feedback?.kind === 'checking' && 'Checking…'}
        {feedback?.kind === 'error' && <span className="rq-bad">{feedback.message}</span>}
        {feedback?.kind === 'answer' && (
          <>
            <p className={result.correct ? 'rq-good' : 'rq-bad'}>
              {result.correct ? (
                '✅ Correct!'
              ) : (
                <>
                  ❌ Not quite. The correct answer is: <strong>{result.correctOptionText}</strong>
                </>
              )}
            </p>
            {result.explanation && <p className="rq-explain">{result.explanation}</p>}
          </>
        )}
      </div>

      <div className="rq-actions">
        <button type="button" className="quiz-button" ref={nextRef} hidden={!result} onClick={onNext}>
          {last ? 'See results' : 'Next question'}
        </button>
        <button type="button" className="rq-link" onClick={onQuit}>
          End quiz
        </button>
      </div>
    </div>
  );
}

function ResultCard({ session, starting, onAgain, onClose }) {
  const { questions, score, missed } = session;
  const percent = Math.round((score / questions.length) * 100);
  const verdict =
    percent >= 80 ? 'Excellent work!' : percent >= 60 ? 'Good job - keep practising!' : 'Keep going - review the topics below and try again.';
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  return (
    <div className="rq-card" ref={ref}>
      <h2 className="rq-title">Quiz complete</h2>
      <p className="rq-final">
        {score} / {questions.length} <span>({percent}%)</span>
      </p>
      <p className={percent >= 60 ? 'rq-good' : 'rq-bad'}>{verdict}</p>
      {missed.length ? (
        <>
          <h3 className="rq-review-title">Review what you missed</h3>
          {missed.map((m, i) => (
            <div className="rq-review" key={i}>
              <p className="rq-review-q">
                {i + 1}. {m.question}
              </p>
              <p>
                Correct answer: <strong>{m.correct}</strong>
              </p>
              {m.explanation && <p className="rq-explain">{m.explanation}</p>}
            </div>
          ))}
        </>
      ) : (
        <p className="rq-good">Perfect score - you got every question right! 🎉</p>
      )}
      <div className="rq-actions">
        <button type="button" className="quiz-button" disabled={starting} onClick={onAgain}>
          {starting ? 'Loading…' : 'Try new random questions'}
        </button>
        <button type="button" className="rq-link" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
