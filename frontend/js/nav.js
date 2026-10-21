import { api } from './api.js';
import { authStore, loadAuth, showError } from './state.js';
import { escapeHtml } from './util.js';

function currentPage() {
  const path = location.pathname.split('/').pop() || 'index.html';
  return path === '' ? 'index.html' : path;
}

function renderNav(state) {
  const mount = document.querySelector('[data-auth-area]');
  if (!mount) return;

  if (!state.loaded) {
    mount.innerHTML = '<span class="nav-link" aria-hidden="true">…</span>';
    return;
  }

  if (state.user) {
    const initial = escapeHtml((state.user.username || '?').charAt(0).toUpperCase());
    const adminLink = state.user.role === 'admin' ? '<a class="nav-link" href="/admin.html">Admin</a>' : '';
    mount.innerHTML = `
      ${adminLink}
      <a class="nav-link" href="/account.html">Hello, ${escapeHtml(state.user.username)}</a>
      <a class="nav-link" href="/account.html" aria-label="Your account, avatar ${initial}">${initial}</a>
      <button class="btn btn-sm" type="button" data-logout>Log out</button>
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
      authStore.set({ user: null });
      const page = currentPage();
      if (page === 'account.html') location.href = '/index.html';
      else renderNav(authStore.get());
    });
  } else {
    mount.innerHTML = `
      <a class="nav-link" href="/login.html">Sign in</a>
      <a class="btn btn-sm btn-primary" href="/register.html">Sign up</a>
    `;
  }

  // mark the active page for screen readers + visuals
  const page = currentPage();
  for (const link of document.querySelectorAll('.nav-link, .brand')) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const target = href.split('/').pop();
    if (target === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

authStore.subscribe(renderNav);

/** Mobile menu: injects a hamburger button in front of the nav (CSS shows it only on small screens). */
function setupMenuToggle() {
  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('.site-nav');
  if (!header || !nav || header.querySelector('.nav-toggle')) return;
  if (!nav.id) nav.id = 'site-nav';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-controls', nav.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Toggle menu');
  btn.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
  nav.before(btn);

  const setOpen = (open) => {
    header.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
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