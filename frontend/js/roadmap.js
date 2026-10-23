
import { api } from './api.js';
import { authStore, loadAuth, showError } from './state.js';
import { escapeHtml, getParams } from './util.js';
import { mountRoadmap } from './roadmap-viewer.js';
import { renderResources } from './roadmap-resources.js';
import './nav.js';

const $ = (sel) => document.querySelector(sel);
const statusEl = $('[data-status]');
const rootEl = $('[data-roadmap-root]');
const progressError = $('[data-progress-error]');

const slug = getParams().slug;
const enc = encodeURIComponent;
const isLinkBox = (key) => String(key).startsWith('json:');

let user = null;
let roadmapQuiz = null;
let quizQuestions = [];
let quizAttemptId = null;
let quizAnswers = new Map();
let quizSubmitting = false;

function fail(message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.add('error');
  statusEl.hidden = false;
}

function renderHeader(r) {
  document.title = `${r.title} - Road2Role`;

  $('[data-title]').textContent = r.title;

  $('[data-badges]').innerHTML = `
    <span class="badge ${escapeHtml(r.category)}">${escapeHtml(r.category)}</span>
    <span class="badge ${escapeHtml(r.difficulty)}">${escapeHtml(r.difficulty)}</span>
    <span class="badge neutral">${escapeHtml(r.tag)}</span>
  `;

  $('[data-description]').textContent = r.description || '';

  if (r.article_html) {
    const article = $('[data-article]');
    article.innerHTML = r.article_html;
    article.hidden = false;
  }

  if (r.image_url) {
    const img = $('[data-image]');
    img.src = r.image_url;
    img.alt = `${r.title} diagram`;

    $('[data-image-link]').href = r.image_url;
    $('[data-visual]').hidden = false;
  }

  $('[data-share]').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(location.href);
      e.target.textContent = 'Copied!';

      setTimeout(() => {
        e.target.textContent = 'Copy link';
      }, 1500);
    } catch {
      /* Clipboard unavailable */
    }
  });
}

/* ---------- PROGRESS BAR ---------- */

function renderProgress(doneCount, total) {
  const percent = total
    ? Math.round((doneCount / total) * 100)
    : 0;

  $('[data-progress-text]').textContent = user
    ? `${doneCount} of ${total} topics (${percent}%)`
    : '';

  $('[data-progress-fill]').style.width = `${percent}%`;

  $('[data-progress-bar]').setAttribute(
    'aria-valuenow',
    String(percent),
  );

  $('[data-progress-hint]').innerHTML = user
    ? 'Hover a topic in the roadmap and press the check to mark it as completed.'
    : '<a href="/login.html">Sign in</a> to track your progress.';
}

/* ---------- ROADMAP FINAL ASSESSMENT ---------- */

function ensureQuizUI(card) {
  let panel = card.querySelector('[data-quiz-panel]');

  if (panel) return panel;

  panel = document.createElement('div');
  panel.dataset.quizPanel = '';
  panel.hidden = true;
  panel.style.marginTop = '1.25rem';

  card.appendChild(panel);
  return panel;
}

async function setupRoadmapQuiz() {
  const card = $('[data-roadmap-quiz]');

  if (!card || !slug) return;

  const startButton = card.querySelector('[data-start-roadmap-quiz]');
  const panel = ensureQuizUI(card);

  try {
    // api.get returns the JSON body directly.
    const response = await api.get(
      `/quizzes?roadmap=${enc(slug)}`,
    );

    const quizzes = Array.isArray(response?.quizzes)
      ? response.quizzes
      : [];

    roadmapQuiz = quizzes.find(
      (quiz) =>
        quiz.quiz_type === 'roadmap' &&
        quiz.roadmap_slug === slug,
    );

    if (!roadmapQuiz) {
      card.hidden = true;
      console.warn('No roadmap assessment found for:', slug);
      return;
    }

    card.hidden = false;
    panel.hidden = true;

    if (startButton) {
      startButton.onclick = startRoadmapQuiz;
    }
  } catch (err) {
    card.hidden = true;
    console.error('Could not load roadmap assessment:', err);
  }
}

async function startRoadmapQuiz() {
  const card = $('[data-roadmap-quiz]');

  if (!card || !roadmapQuiz) return;

  if (!user) {
    const next = encodeURIComponent(
      location.pathname + location.search,
    );

    location.href = `/login.html?next=${next}`;
    return;
  }

  const panel = ensureQuizUI(card);
  const startButton = card.querySelector('[data-start-roadmap-quiz]');

  if (startButton) startButton.disabled = true;

  panel.hidden = false;
  panel.innerHTML = '<p>Loading your final assessment...</p>';

  try {
    // Fetch the selected quiz by its ID.
    const data = await api.get(
      `/quizzes/${roadmapQuiz.id}`,
    );

    const quiz = data?.quiz;
    const questions = data?.questions;

    if (
      !quiz ||
      !Array.isArray(questions) ||
      questions.length !== 50
    ) {
      throw new Error(
        'The final assessment must contain exactly 50 questions.',
      );
    }

    quizQuestions = questions;
    quizAnswers = new Map();
    quizAttemptId = null;
    quizSubmitting = false;

    renderQuiz(panel, quiz);
  } catch (err) {
    panel.innerHTML = `
      <p class="field-error" role="alert">
        ${escapeHtml(showError(err))}
      </p>
    `;
  } finally {
    if (startButton) startButton.disabled = false;
  }
}

function renderQuiz(panel, quiz) {
  panel.innerHTML = `
    <div class="quiz-heading">
      <h3>${escapeHtml(quiz.title)}</h3>
      <p>${escapeHtml(quiz.description || 'Final assessment for this roadmap.')}</p>
      <p><strong>50 questions</strong> · Pass mark: ${Number(quiz.pass_percent)}%</p>
      <p data-quiz-count>Answered: 0 / 50</p>
    </div>

    <form data-final-quiz-form>
      <div data-quiz-questions></div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem">
        <button class="btn" type="submit" data-submit-quiz>
          Submit Assessment
        </button>
        <button class="btn" type="button" data-cancel-quiz>
          Cancel
        </button>
      </div>

      <p data-quiz-error class="field-error" role="alert" hidden></p>
    </form>
  `;

  const questionsRoot = panel.querySelector('[data-quiz-questions]');

  questionsRoot.innerHTML = quizQuestions.map((question, index) => `
    <fieldset
      style="border:1px solid var(--border,#ddd);border-radius:10px;padding:1rem;margin:1rem 0"
      data-question-id="${Number(question.id)}"
    >
      <legend>
        <strong>Q${index + 1}. ${escapeHtml(question.question_text)}</strong>
      </legend>

      ${(question.options || []).map((option) => `
        <label style="display:flex;gap:.6rem;align-items:flex-start;padding:.5rem 0;cursor:pointer">
          <input
            type="radio"
            name="question-${Number(question.id)}"
            value="${Number(option.id)}"
          >
          <span>${escapeHtml(option.option_text)}</span>
        </label>
      `).join('')}
    </fieldset>
  `).join('');

  questionsRoot.addEventListener('change', (event) => {
    const input = event.target;

    if (
      !(input instanceof HTMLInputElement) ||
      input.type !== 'radio'
    ) {
      return;
    }

    const questionId = Number(
      input.closest('[data-question-id]')?.dataset.questionId,
    );

    if (!questionId) return;

    quizAnswers.set(questionId, Number(input.value));

    panel.querySelector('[data-quiz-count]').textContent =
      `Answered: ${quizAnswers.size} / ${quizQuestions.length}`;
  });

  panel.querySelector('[data-final-quiz-form]')
    .addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitRoadmapQuiz(panel, quiz);
    });

  panel.querySelector('[data-cancel-quiz]')
    .addEventListener('click', () => {
      panel.hidden = true;
      panel.innerHTML = '';
    });

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitRoadmapQuiz(panel, quiz) {
  if (quizSubmitting) return;

  const error = panel.querySelector('[data-quiz-error]');
  const submitButton = panel.querySelector('[data-submit-quiz]');

  if (quizAnswers.size !== quizQuestions.length) {
    error.textContent =
      `Please answer all ${quizQuestions.length} questions. You have answered ${quizAnswers.size}.`;
    error.hidden = false;
    return;
  }

  quizSubmitting = true;
  submitButton.disabled = true;
  error.hidden = true;

  try {
    // Create an attempt.
    const attemptResponse = await api.post('/quizzes/attempts', {
      quizId: Number(quiz.id),
    });

    quizAttemptId = attemptResponse?.attempt?.id;

    if (!quizAttemptId) {
      throw new Error('Could not create your quiz attempt.');
    }

    const answers = quizQuestions.map((question) => ({
      questionId: Number(question.id),
      optionId: quizAnswers.get(Number(question.id)) ?? null,
    }));

    // Submit all selected answers.
    const response = await api.post(
      `/quizzes/attempts/${quizAttemptId}/answers`,
      { answers },
    );

    renderQuizResult(panel, response?.result, quiz);
  } catch (err) {
    error.textContent = showError(err);
    error.hidden = false;
    submitButton.disabled = false;
  } finally {
    quizSubmitting = false;
  }
}

function renderQuizResult(panel, result, quiz) {
  if (!result) {
    panel.innerHTML = `
      <p class="field-error">
        Your answers were submitted, but the result could not be loaded.
        Check your quiz history before attempting again.
      </p>
    `;
    return;
  }

  const score = Number(result.score ?? 0);
  const total = Number(result.total_questions ?? 50);
  const percent = Number(result.percent ?? 0);
  const passed = Boolean(result.passed);

  panel.innerHTML = `
    <section aria-live="polite">
      <h3>Assessment Result</h3>
      <p><strong>${passed ? 'Congratulations! You passed.' : 'Keep practising and try again.'}</strong></p>

      <p>Score: <strong>${score} / ${total}</strong></p>
      <p>Percentage: <strong>${percent}%</strong></p>
      <p>Pass mark: <strong>${Number(result.pass_percent ?? quiz.pass_percent)}%</strong></p>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem">
        <button class="btn" type="button" data-review-quiz>
          Review Answers
        </button>
        <button class="btn" type="button" data-retry-quiz>
          Retake Assessment
        </button>
      </div>

      <div data-quiz-review style="margin-top:1rem"></div>
    </section>
  `;

  panel.querySelector('[data-review-quiz]')
    .addEventListener('click', async () => {
      await loadQuizReview(panel);
    });

  panel.querySelector('[data-retry-quiz]')
    .addEventListener('click', () => {
      quizAnswers = new Map();
      quizAttemptId = null;
      startRoadmapQuiz();
    });
}

async function loadQuizReview(panel) {
  if (!quizAttemptId) return;

  const reviewRoot = panel.querySelector('[data-quiz-review]');
  reviewRoot.innerHTML = '<p>Loading answer review...</p>';

  try {
    // Review the submitted attempt, not the quiz definition.
    const data = await api.get(
      `/quizzes/attempts/${quizAttemptId}/review`,
    );

    const questions = Array.isArray(data?.questions)
      ? data.questions
      : [];

    reviewRoot.innerHTML = `
      <h4>Answer Review</h4>
      ${questions.map((question, index) => {
        const selectedId = quizAnswers.get(Number(question.question_id));

        const originalQuestion = quizQuestions.find(
          (item) => Number(item.id) === Number(question.question_id),
        );

        const selectedOption = originalQuestion?.options?.find(
          (option) => Number(option.id) === Number(selectedId),
        );

        return `
          <article style="padding:.75rem 0;border-bottom:1px solid var(--border,#ddd)">
            <p><strong>Q${index + 1}. ${escapeHtml(question.question_text)}</strong></p>
            <p>Your answer: ${escapeHtml(selectedOption?.option_text || 'Not answered')}</p>
            <p>Correct answer: ${escapeHtml(question.correct_option_text || 'Not available')}</p>
            ${question.explanation
              ? `<p>${escapeHtml(question.explanation)}</p>`
              : ''}
          </article>
        `;
      }).join('')}
    `;
  } catch (err) {
    reviewRoot.textContent = showError(err);
  }
}

/* ---------- EXISTING PROGRESS TRACKING ---------- */

async function loadDone(keys) {
  if (!user) return new Set();

  try {
    const data = await api.get(
      `/me/progress/${enc(slug)}`,
    );

    const topics = Array.isArray(data?.topics) ? data.topics : [];

    return new Set(
      topics
        .filter(
          (topic) =>
            topic.status === 'completed' &&
            keys.has(topic.topic_key),
        )
        .map((topic) => topic.topic_key),
    );
  } catch (err) {
    if (progressError) {
      progressError.textContent = showError(err);
    }

    return new Set();
  }
}

function toast(html) {
  document.querySelector('.res-login')?.remove();

  const el = document.createElement('div');
  el.className = 'res-login';
  el.innerHTML = html;

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 4000);
}

async function setupInteractive(layout) {
  document.body.classList.add('has-interactive');

  const holder = $('[data-interactive]');
  if (!holder) return;

  holder.hidden = false;

  holder.style.cssText =
    'background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;';

  const keys = new Set(
    layout.nodes
      .filter(
        (node) =>
          node.type === 'topic' &&
          !isLinkBox(node.key),
      )
      .map((node) => node.key),
  );

  const done = await loadDone(keys);
  const total = keys.size;

  renderProgress(done.size, total);

  const resSection = $('[data-resources-section]');

  const resources = renderResources(
    $('[data-resources]'),
    layout,
    done,
    {
      roadmapSlug: slug,
      user,
    },
  );

  if (resSection) resSection.hidden = false;

  const base = `/me/progress/${enc(slug)}`;

  const diagram = mountRoadmap(holder, layout, {
    doneKeys: [...done],

    onSelect: (key) => {
      resources.open(key);
      history.replaceState(
        null,
        '',
        `#topic=${enc(key)}`,
      );
    },

    onNeedLogin: () => {
      toast(
        '<a href="/login.html?next=' +
          enc(location.pathname + location.search) +
          '">Sign in</a> to mark topics as completed.',
      );
    },

    onToggleDone: user
      ? async (key, next) => {
          if (next) {
            await api.put(
              `${base}/${enc(key)}`,
              { status: 'completed' },
            );
          } else {
            await api.del(`${base}/${enc(key)}`);
          }

          next ? done.add(key) : done.delete(key);

          resources.setDone(key, next);
          renderProgress(done.size, total);

          document.dispatchEvent(
            new CustomEvent('progress-changed', {
              detail: {
                key,
                done: next,
              },
            }),
          );
        }
      : undefined,
  });

  const match = /^#topic=(.+)$/.exec(location.hash);

  if (match) {
    const key = decodeURIComponent(match[1]);

    diagram.select(key);
    setTimeout(() => resources.open(key), 300);
  }
}

/* ---------- FALLBACK ROADMAP ---------- */

async function setupFallback() {
  const section = $('[data-topics-fallback]');
  const list = $('[data-topics]');

  if (!section || !list) return;

  try {
    const topics = await api.get(
      `/roadmaps/${enc(slug)}/topics`,
    );

    if (!Array.isArray(topics) || !topics.length) return;

    section.hidden = false;
    renderProgress(0, 0);

    list.innerHTML = topics
      .map(
        (topic) => `
          <details class="topic" data-key="${escapeHtml(topic.topic_key)}">
            <summary>
              <span class="chev" aria-hidden="true">›</span>
              ${escapeHtml(topic.label)}
            </summary>
            <div class="topic-body">
              <p class="status-line">Loading…</p>
            </div>
          </details>
        `,
      )
      .join('');

    for (const el of list.querySelectorAll('details.topic')) {
      el.addEventListener('toggle', async () => {
        if (!el.open || el.dataset.loaded) return;

        el.dataset.loaded = '1';

        const body = el.querySelector('.topic-body');

        try {
          const data = await api.get(
            `/roadmaps/${enc(slug)}/topics/${enc(el.dataset.key)}`,
          );

          const articles = (data.articles || [])
            .map(
              (article) => `
                <div class="article-resource">
                  <h3>${escapeHtml(article.title)}</h3>
                  ${article.contentHtml || ''}
                </div>
              `,
            )
            .join('');

          body.innerHTML = `
            <div class="content">
              ${data.contentHtml || '<p>No description yet.</p>'}
            </div>
            ${articles}
          `;
        } catch (err) {
          body.innerHTML = `
            <p class="field-error">
              ${escapeHtml(showError(err))}
            </p>
          `;
        }
      });
    }
  } catch (err) {
    if (progressError) {
      progressError.textContent = showError(err);
    }
  }
}

/* ---------- INITIALIZE PAGE ---------- */

async function init() {
  if (!slug) {
    return fail('No roadmap selected. Go back and pick one.');
  }

  try {
    const [roadmap] = await Promise.all([
      api.get(`/roadmaps/${enc(slug)}`),
      loadAuth().then((loadedUser) => {
        user = loadedUser;
      }),
    ]);

    renderHeader(roadmap);

    if (statusEl) statusEl.hidden = true;
    if (rootEl) rootEl.hidden = false;

    // Load the assessment independently of the roadmap layout.
    await setupRoadmapQuiz();

    let layout = null;

    try {
      layout = await api.get(
        `/roadmaps/${enc(slug)}/layout`,
      );
    } catch (err) {
      console.warn(
        'Interactive layout unavailable, using the fallback.',
        err.message,
      );
    }

    if (layout) {
      await setupInteractive(layout);
    } else {
      await setupFallback();
    }
  } catch (err) {
    fail(
      err.status === 404
        ? 'Roadmap not found.'
        : showError(err),
    );
  }
}

authStore.subscribe(() => {});

init();
