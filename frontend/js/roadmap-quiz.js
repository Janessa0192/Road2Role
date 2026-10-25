// Roadmap practice quiz - random questions from the WHOLE roadmap.
//
//   import { mountRoadmapQuiz } from './roadmap-quiz.js';
//   mountRoadmapQuiz(document.querySelector('[data-quiz-section]'), slug);
//
// Flow: intro -> one question at a time -> the learner ticks an answer ->
// the correct answer (and a short explanation) is shown immediately ->
// next question -> final score with the questions that were missed.
//
// Practice mode: works without login and stores nothing. The server never
// sends the correct answers with the questions; it reveals the right answer
// for one question only after that question has been answered (POST /quizzes/check).
import { api } from './api.js';
import { escapeHtml } from './util.js';
import { showError } from './state.js';

const COUNTS = [5, 10, 15];
const DEFAULT_COUNT = 10;
const unwrap = (res) => res?.data ?? res; // tolerate both { data: ... } and plain bodies

export async function mountRoadmapQuiz(root, slug) {
  if (!root || !slug) return;

  let available = 0;
  let count = DEFAULT_COUNT;
  let session = null; // { questions, index, score, missed, locked }

  root.hidden = false;
  root.innerHTML = '<p class="res-note">Checking for quiz questions…</p>';

  /* ---------------------------------------------------------------- data */
  async function fetchQuestions(n) {
    const res = await api.get('/quizzes/random', { query: { roadmap: slug, count: n } });
    return unwrap(res);
  }

  /* ------------------------------------------------------------- screens */
  function shell(inner) {
    root.innerHTML = `<div class="rq-card">${inner}</div>`;
    return root.querySelector('.rq-card');
  }

  function renderIntro(note = '') {
    if (!available) {
      shell(`
        <h2 class="rq-title">Test yourself</h2>
        <p class="res-note">No quiz questions have been added for this roadmap yet. Check back soon!</p>`);
      return;
    }
    // choices: 5 / 10 / 15, capped by how many questions exist
    const unique = [...new Set([...COUNTS.filter((c) => c < available), Math.min(available, Math.max(...COUNTS))])].sort((a, b) => a - b);
    if (!unique.includes(count)) count = unique[unique.length - 1];

    const card = shell(`
      <h2 class="rq-title">Test yourself</h2>
      <p class="rq-sub">Random questions from across this whole roadmap. Tick an answer and the correct one is shown straight away.</p>
      <div class="rq-start">
        <label class="rq-count">Questions
          <select data-count>
            ${unique.map((c) => `<option value="${c}" ${c === count ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <button type="button" class="quiz-button" data-start>Start quiz</button>
      </div>
      <p class="res-note rq-bank">${available} question${available === 1 ? '' : 's'} in the bank</p>
      <p class="field-error" role="alert" data-error>${escapeHtml(note)}</p>`);

    card.querySelector('[data-count]').addEventListener('change', (e) => {
      count = Number(e.target.value);
    });
    card.querySelector('[data-start]').addEventListener('click', start);
  }

  async function start() {
    // can be triggered from the intro screen or from "try again" on the results screen
    const btn = root.querySelector('[data-start], [data-again]');
    const label = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading…';
    }
    try {
      const data = await fetchQuestions(count);
      available = data.available ?? available;
      if (!data.questions?.length) return renderIntro('No questions available right now.');
      session = { questions: data.questions, index: 0, score: 0, missed: [], locked: false };
      renderQuestion();
    } catch (e) {
      if (btn?.isConnected) {
        btn.disabled = false;
        btn.textContent = label;
      }
      const msg = showError(e, 'Could not load the quiz. Please try again.');
      const err = root.querySelector('[data-error]');
      if (err) err.textContent = msg;
      else renderIntro(msg); // came from the results screen
    }
  }

  function renderQuestion() {
    const { questions, index, score } = session;
    const q = questions[index];
    const pct = Math.round((index / questions.length) * 100);
    session.locked = false;

    const card = shell(`
      <div class="rq-meta">
        <span>Question ${index + 1} of ${questions.length}</span>
        <span>Score: ${score}</span>
      </div>
      <div class="rq-bar" aria-hidden="true"><div class="rq-bar-fill" style="width:${pct}%"></div></div>
      ${q.topic_label ? `<p class="rq-topic">Topic: ${escapeHtml(q.topic_label)}</p>` : ''}
      <fieldset class="rq-q">
        <legend>${escapeHtml(q.question_text)}</legend>
        ${q.options
          .map(
            (o) => `
          <label class="rq-opt" data-option="${o.id}">
            <input type="radio" name="rq-answer" value="${o.id}" />
            <span class="rq-text">${escapeHtml(o.option_text)}</span>
            <span class="rq-tag" aria-hidden="true"></span>
          </label>`,
          )
          .join('')}
      </fieldset>
      <div class="rq-feedback" role="status" aria-live="polite"></div>
      <div class="rq-actions">
        <button type="button" class="quiz-button" data-next hidden></button>
        <button type="button" class="rq-link" data-quit>End quiz</button>
      </div>`);

    card.querySelectorAll('input[name="rq-answer"]').forEach((input) =>
      input.addEventListener('change', () => answer(card, q, Number(input.value))),
    );
    card.querySelector('[data-quit]').addEventListener('click', () => renderIntro());
  }

  async function answer(card, q, optionId) {
    if (session.locked) return;
    session.locked = true;
    const inputs = [...card.querySelectorAll('input[name="rq-answer"]')];
    inputs.forEach((i) => (i.disabled = true));
    const feedback = card.querySelector('.rq-feedback');
    feedback.textContent = 'Checking…';

    let result;
    try {
      result = unwrap(await api.post('/quizzes/check', { questionId: q.id, optionId }));
    } catch (e) {
      // let the learner try again instead of getting stuck
      session.locked = false;
      inputs.forEach((i) => (i.disabled = false));
      feedback.innerHTML = `<span class="rq-bad">${escapeHtml(showError(e, 'Could not check your answer.'))}</span>`;
      return;
    }

    // colour the options
    const chosenEl = card.querySelector(`[data-option="${optionId}"]`);
    const correctEl = card.querySelector(`[data-option="${result.correctOptionId}"]`);
    correctEl.classList.add('correct');
    correctEl.querySelector('.rq-tag').textContent = 'Correct answer';
    if (!result.correct) {
      chosenEl.classList.add('wrong');
      chosenEl.querySelector('.rq-tag').textContent = 'Your answer';
    }

    if (result.correct) session.score += 1;
    else session.missed.push({ question: q.question_text, correct: result.correctOptionText, explanation: result.explanation });

    feedback.innerHTML = `
      <p class="${result.correct ? 'rq-good' : 'rq-bad'}">
        ${result.correct ? '✅ Correct!' : `❌ Not quite. The correct answer is: <strong>${escapeHtml(result.correctOptionText)}</strong>`}
      </p>
      ${result.explanation ? `<p class="rq-explain">${escapeHtml(result.explanation)}</p>` : ''}`;

    const next = card.querySelector('[data-next]');
    const last = session.index === session.questions.length - 1;
    next.textContent = last ? 'See results' : 'Next question';
    next.hidden = false;
    next.focus();
    next.addEventListener('click', () => {
      session.index += 1;
      last ? renderResult() : renderQuestion();
    });
  }

  function renderResult() {
    const { questions, score, missed } = session;
    const percent = Math.round((score / questions.length) * 100);
    const verdict =
      percent >= 80 ? 'Excellent work!' : percent >= 60 ? 'Good job - keep practising!' : 'Keep going - review the topics below and try again.';

    const card = shell(`
      <h2 class="rq-title">Quiz complete</h2>
      <p class="rq-final">${score} / ${questions.length} <span>(${percent}%)</span></p>
      <p class="${percent >= 60 ? 'rq-good' : 'rq-bad'}">${verdict}</p>
      ${
        missed.length
          ? `<h3 class="rq-review-title">Review what you missed</h3>
             ${missed
               .map(
                 (m, i) => `
              <div class="rq-review">
                <p class="rq-review-q">${i + 1}. ${escapeHtml(m.question)}</p>
                <p>Correct answer: <strong>${escapeHtml(m.correct)}</strong></p>
                ${m.explanation ? `<p class="rq-explain">${escapeHtml(m.explanation)}</p>` : ''}
              </div>`,
               )
               .join('')}`
          : '<p class="rq-good">Perfect score - you got every question right! 🎉</p>'
      }
      <div class="rq-actions">
        <button type="button" class="quiz-button" data-again>Try new random questions</button>
        <button type="button" class="rq-link" data-close>Close</button>
      </div>`);

    card.querySelector('[data-again]').addEventListener('click', start);
    card.querySelector('[data-close]').addEventListener('click', () => renderIntro());
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------------------------------------------------------------- boot */
  try {
    const data = await fetchQuestions(1);
    available = data.available || 0;
    renderIntro();
  } catch (e) {
    root.innerHTML = `<div class="rq-card"><p class="field-error">${escapeHtml(showError(e, 'Quiz unavailable right now.'))}</p></div>`;
  }
}
