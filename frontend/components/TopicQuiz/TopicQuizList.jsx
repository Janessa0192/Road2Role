import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

// The API answers either { data: ... } or a plain body - accept both.
const unwrap = (res) => res?.data ?? res;

/** Practice quizzes attached to ONE topic (shown inside an opened topic card). */
export default function TopicQuizList({ roadmapSlug, topicKey, user }) {
  const [quizzes, setQuizzes] = useState(null); // null = still checking

  useEffect(() => {
    let cancelled = false;
    api
      .get('/quizzes', { query: { roadmap: roadmapSlug, topic: topicKey } })
      .then((res) => !cancelled && setQuizzes(unwrap(res)?.quizzes ?? []))
      .catch((error) => {
        console.error('Could not load quizzes:', error);
        if (!cancelled) setQuizzes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [roadmapSlug, topicKey]);

  if (quizzes === null) return <p className="res-note">Checking for practice quizzes...</p>;
  if (!quizzes.length) return null;

  return (
    <div className="quiz-panel">
      <h3>Practice Quiz</h3>
      <p className="res-note">Test your understanding of this topic.</p>
      <div className="quiz-list">
        {quizzes.map((quiz) => (
          <QuizItem key={quiz.id} quiz={quiz} user={user} />
        ))}
      </div>
    </div>
  );
}

function QuizItem({ quiz, user }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });

  async function start() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname + search)}`);
      return;
    }
    setState({ status: 'loading', data: null, error: '' });
    try {
      const response = await api.get(`/quizzes/${quiz.id}`);
      const quizData = unwrap(response);
      if (!quizData?.quiz || !Array.isArray(quizData.questions)) {
        console.error('Unexpected quiz API response:', response);
        throw new Error('Quiz data format is unexpected. Check the browser console.');
      }
      setState({ status: 'ready', data: quizData, error: '' });
    } catch (error) {
      console.error('Could not start quiz:', error);
      setState({ status: 'error', data: null, error: error.message || 'Could not load the quiz. Please try again.' });
    }
  }

  const { status, data, error } = state;
  return (
    <div className="quiz-item">
      <h4>{quiz.title}</h4>
      <p className="res-note">{quiz.description || 'Test your knowledge.'}</p>
      <button
        type="button"
        className="quiz-button"
        hidden={status === 'ready'}
        disabled={status === 'loading'}
        onClick={start}
      >
        {status === 'loading' ? 'Loading...' : status === 'error' ? 'Try Again' : 'Start Quiz'}
      </button>
      <div className="quiz-content">
        {status === 'error' && error}
        {status === 'ready' && <QuizForm quiz={data.quiz} questions={data.questions} />}
      </div>
    </div>
  );
}

/** Questions -> submit -> score + answer review (same API calls as before). */
function QuizForm({ quiz, questions }) {
  const [selected, setSelected] = useState({}); // questionId -> optionId
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(false);
  const [result, setResult] = useState(null);
  const [review, setReview] = useState({ status: 'loading', questions: [] });

  if (questions.length === 0) return <>No questions are available for this quiz yet.</>;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage('');

    try {
      // start a server-side attempt
      const attemptResponse = await api.post('/quizzes/attempts', { quizId: quiz.id });
      const attemptId = unwrap(attemptResponse)?.attempt?.id;
      if (!attemptId) {
        console.error('Unexpected attempt response:', attemptResponse);
        throw new Error('Could not create a quiz attempt.');
      }

      // send all questions, including unanswered ones
      const answers = questions.map((q) => ({
        questionId: q.id,
        optionId: selected[q.id] != null ? Number(selected[q.id]) : null,
      }));
      const resultResponse = await api.post(`/quizzes/attempts/${attemptId}/answers`, { answers });
      const attemptResult = unwrap(resultResponse)?.result;
      if (!attemptResult) {
        console.error('Unexpected result response:', resultResponse);
        throw new Error('Quiz submitted, but the result could not be read.');
      }

      // a submitted quiz counts as learning today -> refresh the 🔥 counter
      document.dispatchEvent(new CustomEvent('streak-refresh'));
      setResult(attemptResult);

      // reveal correct answers only after submission, for the attempt owner
      try {
        const reviewData = unwrap(await api.get(`/quizzes/attempts/${attemptId}/review`));
        setReview(
          Array.isArray(reviewData?.questions)
            ? { status: 'ready', questions: reviewData.questions }
            : { status: 'unavailable', questions: [] },
        );
      } catch (error) {
        console.error('Could not load answer review:', error);
        setReview({ status: 'failed', questions: [] });
      }
    } catch (error) {
      console.error('Could not submit quiz:', error);
      setMessage(error.message || 'Could not submit the quiz. Please try again.');
      setRetry(true);
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <form className="quiz-form">
        <div className="quiz-result">
          <h3>Quiz Result</h3>
          <p className="quiz-score">
            Score: {Number(result.score)} / {Number(result.total_questions)}
          </p>
          <p>Percentage: {Number(result.percent)}%</p>
          <p className={result.passed ? 'quiz-pass' : 'quiz-fail'}>
            {result.passed ? 'Passed! Great work!' : 'Not passed yet. Keep practising!'}
          </p>
          <p className="res-note">Required to pass: {Number(result.pass_percent)}%</p>
          <div className="quiz-review">
            {review.status === 'ready' &&
              review.questions.map((q, index) => (
                <div className="quiz-review-question" key={index}>
                  <h4>
                    {index + 1}. {q.question_text || ''}
                  </h4>
                  <p>
                    Correct answer: <strong>{q.correct_option_text || 'Not available'}</strong>
                  </p>
                  {q.explanation && <p>{q.explanation}</p>}
                </div>
              ))}
            {review.status === 'unavailable' && (
              <p className="res-note">Your score is saved, but answer review is unavailable.</p>
            )}
            {review.status === 'failed' && (
              <p className="res-note">Your score is saved. Correct-answer review is currently unavailable.</p>
            )}
          </div>
        </div>
      </form>
    );
  }

  return (
    <form className="quiz-form" onSubmit={handleSubmit}>
      <p className="res-note">{questions.length} questions. Select one option for each question.</p>
      {questions.map((question, index) => (
        <fieldset className="quiz-question" key={question.id}>
          <legend>
            {index + 1}. {question.question_text}
          </legend>
          {(question.options || []).map((option) => (
            <label className="quiz-option" key={option.id}>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                checked={selected[question.id] === option.id}
                onChange={() => setSelected((prev) => ({ ...prev, [question.id]: option.id }))}
              />
              <span>{option.option_text}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <button type="submit" className="quiz-button" disabled={submitting}>
        {submitting ? 'Submitting...' : retry ? 'Try Again' : 'Submit Quiz'}
      </button>
      <p className="quiz-message" role="status">
        {message}
      </p>
    </form>
  );
}
