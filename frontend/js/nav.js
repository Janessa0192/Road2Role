import { api } from './api.js';
import { authStore, loadAuth, showError } from './state.js';
import { escapeHtml } from './util.js';

/* ---- the one shared navbar: every page just has <header class="r2r-header" data-site-header></header> ---- */
const HEADER_HTML = `
  <div class="r2r-header__inner">
    <a class="r2r-brand" href="/index.html" aria-label="Road2Role home">
      <img class="r2r-brand-logo" src="/assets/Logo.png" alt="Road2Role — Pathways to Career Success" />
    </a>
    <button class="r2r-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Toggle menu">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    <nav class="r2r-nav" id="site-nav" aria-label="Main">
      <a class="r2r-link" href="/index.html">Home</a>
      <a class="r2r-link" href="/index.html#roadmaps">Roadmaps</a>
      <span data-auth-area></span>
    </nav>
  </div>`;

function mountHeader() {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;
  header.classList.add('r2r-header');
  header.innerHTML = HEADER_HTML;
}

function currentPage() {
  const path = location.pathname.split('/').pop() || 'index.html';
  return path === '' ? 'index.html' : path;
}

/* ---- learning streak (the 🔥 pill) ---- */
let streak = null; // { current, longest, activeToday, ... } from GET /me/streak
let streakUserId = null;

function streakPillHtml() {
  const current = streak ? streak.current : 0;
  const lit = Boolean(streak && streak.activeToday);
  let label;
  if (lit) label = `${current}-day streak - you've learned today. Great job!`;
  else if (current > 0) label = `${current}-day streak - learn something today to keep it going!`;
  else label = 'Start your streak - complete a topic or take a quiz today!';
  return `<a class="streak-pill${lit ? ' is-lit' : ''}" href="/account.html#streak"
             title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
            <span class="streak-flame" aria-hidden="true">🔥</span>
            <span class="streak-count">${current}</span>
          </a>`;
}

async function refreshStreak() {
  if (!authStore.get().user) return;
  try {
    const payload = await api.get('/me/streak');
    streak = payload.data;
    renderNav(authStore.get());
  } catch (error) {
    console.warn('Could not load streak:', showError(error)); // the nav still works without it
  }
}

function renderNav(state) {
  const mount = document.querySelector('[data-auth-area]');
  if (!mount) return;

  if (!state.loaded) {
    mount.innerHTML = '<span class="r2r-link" aria-hidden="true">…</span>';
    return;
  }

  if (state.user) {
    const initial = escapeHtml((state.user.username || '?').charAt(0).toUpperCase());
    const adminLink = state.user.role === 'admin' ? '<a class="r2r-link" href="/admin.html">Admin</a>' : '';
    mount.innerHTML = `
      ${adminLink}
      ${streakPillHtml()}
      <a class="r2r-link" href="/account.html">Hello, ${escapeHtml(state.user.username)}</a>
      <a class="r2r-link" href="/account.html" aria-label="Your account, avatar ${initial}">${initial}</a>
      <button class="r2r-btn" type="button" data-logout>Log out</button>
    `;
    const logoutBtn = mount.querySelector('[data-logout]');
    logoutBtn?.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        await api.post('/auth/logout', {});
      } catch (error) {
        // even if the API call fails, clear local auth state
        console.warn(showError(error));
      }
      streak = null;
      authStore.set({ user: null });
      const page = currentPage();
      if (page === 'account.html') location.href = '/index.html';
      else renderNav(authStore.get());
    });
  } else {
    mount.innerHTML = `
      <a class="r2r-link" href="/login.html">Sign in</a>
      <a class="r2r-btn r2r-btn--primary" href="/register.html">Sign up</a>
    `;
  }

  // mark the active page for screen readers + visuals
  const page = currentPage();
  for (const link of document.querySelectorAll('.r2r-link, .r2r-brand')) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const target = href.split('/').pop();
    if (target === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

mountHeader(); // must run before the first renderNav()

authStore.subscribe((state) => {
  renderNav(state);
  // load the streak once per signed-in user
  if (state.user && streakUserId !== state.user.id) {
    streakUserId = state.user.id;
    refreshStreak();
  } else if (!state.user) {
    streakUserId = null;
    streak = null;
  }
});

// topics ticked on a roadmap / quizzes submitted -> refresh the counter
document.addEventListener('progress-changed', refreshStreak);
document.addEventListener('streak-refresh', refreshStreak);

/** Mobile menu: wires up the hamburger button that is part of the shared header (CSS shows it only on small screens). */
function setupMenuToggle() {
  const header = document.querySelector('.r2r-header');
  const btn = header?.querySelector('.r2r-toggle');
  const nav = header?.querySelector('.r2r-nav');
  if (!header || !btn || !nav || btn.dataset.bound) return;
  btn.dataset.bound = '1';

  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

export function initNav() {
  setupMenuToggle();
  renderNav(authStore.get());
  loadAuth(); // async; renderNav re-runs through the subscription
}

initNav();