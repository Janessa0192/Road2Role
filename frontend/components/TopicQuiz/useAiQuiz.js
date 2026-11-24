import { useCallback, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';

const unwrap = (res) => res?.data ?? res; // tolerate both { data: ... } and plain bodies

/**
 * Starts an AI quiz (POST /quizzes/ai/start) and tracks its state:
 *   idle -> loading -> playing -> (close) -> idle
 * `base` is { roadmap } for the whole roadmap, or { roadmap, topic } for one topic.
 * Closing while the AI is still writing the questions ignores the late answer.
 */
export default function useAiQuiz(base) {
  const [state, setState] = useState({ status: 'idle', questions: [], source: '', error: '' });
  const token = useRef(0);
  const { roadmap, topic } = base;

  const start = useCallback(
    async ({ count = 10, fresh = false } = {}) => {
      const mine = ++token.current;
      setState((s) => ({ ...s, status: 'loading', error: '' }));
      try {
        const data = unwrap(await api.post('/quizzes/ai/start', { roadmap, ...(topic ? { topic } : {}), count, fresh }));
        if (mine !== token.current) return; // the learner closed it meanwhile
        if (!data?.questions?.length) throw new Error('No questions are available right now.');
        setState({ status: 'playing', questions: data.questions, source: data.source || '', error: '' });
      } catch (e) {
        if (mine !== token.current) return;
        setState({ status: 'idle', questions: [], source: '', error: showError(e, 'Could not create the quiz. Please try again.') });
      }
    },
    [roadmap, topic],
  );

  const close = useCallback(() => {
    token.current += 1;
    setState((s) => ({ ...s, status: 'idle', questions: [] }));
  }, []);

  return { ...state, start, close };
}
