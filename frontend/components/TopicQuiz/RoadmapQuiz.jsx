import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import QuizGame, { QuizLoading } from './QuizGame.jsx';
import useAiQuiz from './useAiQuiz.js';

// Roadmap practice quiz. The AI writes the questions (cached on the server per topic):
//   - signed in + you have studied topics -> questions come from the topics you studied
//   - otherwise                           -> questions come from the whole roadmap
// It opens as a full-screen game. Practice mode: nothing is stored per learner.
const COUNTS = [10, 20];
const SOURCE_LABELS = {
  progress: 'From the topics you studied',
  roadmap: 'Whole roadmap',
  topic: 'This topic',
};

export default function RoadmapQuiz({ slug, user, loaded = true }) {
  const [count, setCount] = useState(10);
  const quiz = useAiQuiz({ roadmap: slug });
  const { pathname, search } = useLocation();

  if (!loaded) return null; // still finding out whether the learner is signed in
  if (!user) {
    return (
      <div className="rq-card">
        <h2 className="rq-title">Test yourself</h2>
        <p className="rq-sub">
          <Link to={`/login?next=${encodeURIComponent(pathname + search)}`}>Sign in</Link> to take an AI-made quiz based on
          the topics you have studied.
        </p>
      </div>
    );
  }

  if (quiz.status === 'loading') return <QuizLoading onCancel={quiz.close} />;
  if (quiz.status === 'playing') {
    return (
      <QuizGame
        questions={quiz.questions}
        sourceLabel={SOURCE_LABELS[quiz.source]}
        onClose={quiz.close}
        onPlayAgain={() => quiz.start({ count })}
      />
    );
  }

  return (
    <div className="rq-card">
      <h2 className="rq-title">Test yourself</h2>
      <p className="rq-sub">
        A quick AI-made quiz on the topics you have studied (or the whole roadmap if you have not started yet). You get your score and a short explanation for every question at the end.
      </p>
      <div className="rq-start">
        <label className="rq-count">
          Questions
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="quiz-button" onClick={() => quiz.start({ count })}>
          Start quiz
        </button>
      </div>
      <p className="field-error" role="alert">
        {quiz.error}
      </p>
    </div>
  );
}
