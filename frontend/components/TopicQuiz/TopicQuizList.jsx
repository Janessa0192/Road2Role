import { Link, useLocation } from 'react-router-dom';
import QuizGame, { QuizLoading } from './QuizGame.jsx';
import useAiQuiz from './useAiQuiz.js';

const TOPIC_QUESTIONS = 5;

/** AI practice quiz for ONE topic (shown inside an opened topic card). */
export default function TopicQuizList({ roadmapSlug, topicKey, user }) {
  const quiz = useAiQuiz({ roadmap: roadmapSlug, topic: topicKey });
  const { pathname, search } = useLocation();
  // the first run uses the cached questions; "play again" asks the AI for a fresh batch
  const start = (fresh) => quiz.start({ count: TOPIC_QUESTIONS, fresh });

  if (!user) {
    return (
      <div className="quiz-panel">
        <h3>Practice Quiz</h3>
        <p className="res-note">
          <Link to={`/login?next=${encodeURIComponent(pathname + search)}`}>Sign in</Link> to take an AI-made quiz on this topic.
        </p>
      </div>
    );
  }

  if (quiz.status === 'loading') return <QuizLoading onCancel={quiz.close} />;
  if (quiz.status === 'playing') {
    return (
      <QuizGame questions={quiz.questions} sourceLabel="This topic" onClose={quiz.close} onPlayAgain={() => start(true)} />
    );
  }

  return (
    <div className="quiz-panel">
      <h3>Practice Quiz</h3>
      <p className="res-note">Test your understanding of this topic with {TOPIC_QUESTIONS} AI-made questions.</p>
      <button type="button" className="quiz-button" onClick={() => start(false)}>
        Quiz me on this topic
      </button>
      <p className="field-error" role="alert">
        {quiz.error}
      </p>
    </div>
  );
}
