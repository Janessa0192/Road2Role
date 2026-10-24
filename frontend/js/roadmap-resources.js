
import { escapeHtml } from './util.js';
import { api } from './api.js';

const isLinkBox = (key) => String(key).startsWith('json:');

function orderTopics(layout) {
  const pos = new Map();

  for (const n of layout.nodes) {
    if (n.type === 'topic' && !isLinkBox(n.key) && !pos.has(n.key)) {
      pos.set(n.key, { x: n.x, y: n.y });
    }
  }

  const topics = layout.topics.filter((t) => pos.has(t.key));
  const groups = new Map();

  for (const t of topics) {
    const group = t.key.split(':')[0];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(t);
  }

  const top = (list) => Math.min(...list.map((t) => pos.get(t.key).y));

  return [...groups.values()]
    .sort((a, b) => top(a) - top(b))
    .flatMap((list) =>
      list.sort((a, b) => {
        const da = a.key.split(':').length;
        const db = b.key.split(':').length;

        return (
          (da === 1 ? 0 : 1) - (db === 1 ? 0 : 1) ||
          pos.get(a.key).y - pos.get(b.key).y ||
          pos.get(a.key).x - pos.get(b.key).x
        );
      }),
    );
}

function bodyHtml(t) {
  const links = (t.resources || [])
    .map((r) => {
      const type = r.generated ? 'search' : r.type;

      return `
        <li>
          <span class="res-badge ${escapeHtml(type)}">
            ${escapeHtml(r.generated ? 'search' : r.type)}
          </span>
          <a href="${escapeHtml(r.url)}" target="_blank"
             rel="noopener noreferrer">
            ${escapeHtml(r.title)}
          </a>
        </li>`;
    })
    .join('');

  const generatedOnly =
    (t.resources || []).length > 0 &&
    t.resources.every((r) => r.generated);

  return `
    <div class="res-desc">
      ${
        t.descriptionHtml ||
        '<p class="res-note">No written overview for this topic yet.</p>'
      }
    </div>
    <h3>Free resources</h3>
    <ul class="res-links">${links}</ul>
    ${
      generatedOnly
        ? '<p class="res-note">These links open a search for this topic.</p>'
        : ''
    }
  `;
}

/* Normalize API responses returned in either supported shape. */
function responseBody(response) {
  return response?.data ?? response;
}

/* Load quizzes matching this roadmap and topic. */
async function loadTopicQuizzes(roadmapSlug, topicKey) {
  try {
    const response = await api.get(
      `/quizzes?roadmap=${encodeURIComponent(roadmapSlug)}&topic=${encodeURIComponent(topicKey)}`,
    );

    const body = responseBody(response);
    return body?.quizzes ?? [];
  } catch (error) {
    console.error('Could not load quizzes:', error);
    return [];
  }
}

/* Add the quiz interface to a topic card. */
async function renderQuizArea(area, roadmapSlug, topicKey, user) {
  area.innerHTML =
    '<p class="res-note">Checking for practice quizzes...</p>';

  const quizzes = await loadTopicQuizzes(roadmapSlug, topicKey);

  if (!quizzes.length) {
    area.innerHTML = '';
    return;
  }

  area.innerHTML = `
    <div class="quiz-panel">
      <h3>Practice Quiz</h3>
      <p class="res-note">Test your understanding of this topic.</p>
      <div class="quiz-list"></div>
    </div>
  `;

  const list = area.querySelector('.quiz-list');

  for (const quiz of quizzes) {
    const item = document.createElement('div');
    item.className = 'quiz-item';

    const title = document.createElement('h4');
    title.textContent = quiz.title;

    const description = document.createElement('p');
    description.className = 'res-note';
    description.textContent = quiz.description || 'Test your knowledge.';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-button';
    button.textContent = 'Start Quiz';

    const content = document.createElement('div');
    content.className = 'quiz-content';

    button.addEventListener('click', async () => {
      if (!user) {
        window.location.href =
          '/login.html?next=' +
          encodeURIComponent(
            window.location.pathname + window.location.search,
          );
        return;
      }

      button.disabled = true;
      button.textContent = 'Loading...';
      content.textContent = '';

      try {
        const response = await api.get(`/quizzes/${quiz.id}`);
        const quizData = responseBody(response);

        if (!quizData?.quiz || !Array.isArray(quizData.questions)) {
          console.error('Unexpected quiz API response:', response);
          throw new Error(
            'Quiz data format is unexpected. Check the browser console.',
          );
        }

        /* IMPORTANT: use the actual content element, not an undefined container. */
        showQuiz(content, quizData.quiz, quizData.questions);
        button.hidden = true;
      } catch (error) {
        console.error('Could not start quiz:', error);
        content.textContent =
          error.message || 'Could not load the quiz. Please try again.';
        button.disabled = false;
        button.textContent = 'Try Again';
      }
    });

    item.append(title, description, button, content);
    list.appendChild(item);
  }
}

/* Display questions and submit selected answers. */
function showQuiz(container, quiz, questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    container.textContent = 'No questions are available for this quiz yet.';
    return;
  }

  const questionHtml = questions
    .map(
      (question, index) => `
        <fieldset class="quiz-question" data-question-id="${question.id}">
          <legend>
            ${index + 1}. ${escapeHtml(question.question_text)}
          </legend>
          ${(question.options || [])
            .map(
              (option) => `
                <label class="quiz-option">
                  <input
                    type="radio"
                    name="question-${question.id}"
                    value="${option.id}"
                  />
                  <span>${escapeHtml(option.option_text)}</span>
                </label>
              `,
            )
            .join('')}
        </fieldset>
      `,
    )
    .join('');

  container.innerHTML = `
    <form class="quiz-form">
      <p class="res-note">
        ${questions.length} questions. Select one option for each question.
      </p>
      ${questionHtml}
      <button type="submit" class="quiz-button">Submit Quiz</button>
      <p class="quiz-message" role="status"></p>
    </form>
  `;

  const form = container.querySelector('.quiz-form');
  const message = container.querySelector('.quiz-message');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (submitButton.disabled) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    message.textContent = '';

    try {
      /* Start a server-side attempt. */
      const attemptResponse = await api.post('/quizzes/attempts', {
        quizId: quiz.id,
      });

      const attemptData = responseBody(attemptResponse);
      const attemptId = attemptData?.attempt?.id;

      if (!attemptId) {
        console.error('Unexpected attempt response:', attemptResponse);
        throw new Error('Could not create a quiz attempt.');
      }

      /* Send all questions, including unanswered ones. */
      const answers = questions.map((question) => {
        const selected = form.querySelector(
          `input[name="question-${question.id}"]:checked`,
        );

        return {
          questionId: question.id,
          optionId: selected ? Number(selected.value) : null,
        };
      });

      const resultResponse = await api.post(
        `/quizzes/attempts/${attemptId}/answers`,
        { answers },
      );

      const resultData = responseBody(resultResponse);
      const result = resultData?.result;

      if (!result) {
        console.error('Unexpected result response:', resultResponse);
        throw new Error('Quiz submitted, but the result could not be read.');
      }

      // a submitted quiz counts as learning today -> refresh the 🔥 counter
      document.dispatchEvent(new CustomEvent('streak-refresh'));

      form.innerHTML = `
        <div class="quiz-result">
          <h3>Quiz Result</h3>
          <p class="quiz-score">
            Score: ${Number(result.score)} / ${Number(result.total_questions)}
          </p>
          <p>Percentage: ${Number(result.percent)}%</p>
          <p class="${result.passed ? 'quiz-pass' : 'quiz-fail'}">
            ${result.passed ? 'Passed! Great work!' : 'Not passed yet. Keep practising!'}
          </p>
          <p class="res-note">
            Required to pass: ${Number(result.pass_percent)}%
          </p>
          <div class="quiz-review"></div>
        </div>
      `;

      /* Reveal correct answers only after submission, for the attempt owner. */
      const review = form.querySelector('.quiz-review');

      try {
        const reviewResponse = await api.get(
          `/quizzes/attempts/${attemptId}/review`,
        );

        const reviewData = responseBody(reviewResponse);

        if (Array.isArray(reviewData?.questions)) {
          review.innerHTML = reviewData.questions
            .map(
              (question, index) => `
                <div class="quiz-review-question">
                  <h4>
                    ${index + 1}. ${escapeHtml(
                      question.question_text || '',
                    )}
                  </h4>
                  <p>
                    Correct answer:
                    <strong>${escapeHtml(
                      question.correct_option_text || 'Not available',
                    )}</strong>
                  </p>
                  ${
                    question.explanation
                      ? `<p>${escapeHtml(question.explanation)}</p>`
                      : ''
                  }
                </div>
              `,
            )
            .join('');
        } else {
          review.innerHTML =
            '<p class="res-note">Your score is saved, but answer review is unavailable.</p>';
        }
      } catch (error) {
        console.error('Could not load answer review:', error);
        review.innerHTML =
          '<p class="res-note">Your score is saved. Correct-answer review is currently unavailable.</p>';
      }
    } catch (error) {
      console.error('Could not submit quiz:', error);
      message.textContent =
        error.message || 'Could not submit the quiz. Please try again.';
      submitButton.disabled = false;
      submitButton.textContent = 'Try Again';
    }
  });
}

export function renderResources(
  container,
  layout,
  doneSet,
  { roadmapSlug = '', user = null } = {},
) {
  const cards = new Map();
  const frag = document.createDocumentFragment();

  for (const t of orderTopics(layout)) {
    const depth = Math.min(t.key.split(':').length - 1, 3);

    const card = document.createElement('details');
    card.className =
      `res-card lvl-${depth}${doneSet.has(t.key) ? ' done' : ''}`;
    card.dataset.key = t.key;

    card.innerHTML = `
      <summary>
        <span class="chev" aria-hidden="true">›</span>
        <span>${escapeHtml(t.title)}</span>
        <span class="res-state">✓ Completed</span>
      </summary>
    `;

    card.addEventListener('toggle', async () => {
      if (!card.open || card.dataset.ready) return;

      card.dataset.ready = '1';

      const body = document.createElement('div');
      body.className = 'res-body';
      body.innerHTML = bodyHtml(t);

      const quizArea = document.createElement('div');
      quizArea.className = 'quiz-area';

      body.appendChild(quizArea);
      card.appendChild(body);

      await renderQuizArea(quizArea, roadmapSlug, t.key, user);
    });

    cards.set(t.key, card);
    frag.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(frag);

  return {
    open(key) {
      const card = cards.get(key);
      if (!card) return;

      card.open = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
    },

    setDone(key, value) {
      cards.get(key)?.classList.toggle('done', value);
    },
  };
}