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

function fail(message) {
  statusEl.textContent = message;
  statusEl.classList.add('error');
}

function renderHeader(r) {
  document.title = `${r.title} - Road2Role`;
  $('[data-title]').textContent = r.title;
  $('[data-badges]').innerHTML = `
    <span class="badge ${escapeHtml(r.category)}">${escapeHtml(r.category)}</span>
    <span class="badge ${escapeHtml(r.difficulty)}">${escapeHtml(r.difficulty)}</span>
    <span class="badge neutral">${escapeHtml(r.tag)}</span>`;
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
      setTimeout(() => (e.target.textContent = 'Copy link'), 1500);
    } catch {
      /* clipboard unavailable */
    }
  });
}

/* The single place that draws the progress bar: done boxes of the roadmap / all boxes. */
function renderProgress(doneCount, total) {
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  $('[data-progress-text]').textContent = user ? `${doneCount} of ${total} topics (${percent}%)` : '';
  $('[data-progress-fill]').style.width = `${percent}%`;
  $('[data-progress-bar]').setAttribute('aria-valuenow', String(percent));
  $('[data-progress-hint]').innerHTML = user
    ? 'Hover a topic in the roadmap and press the check to mark it as completed.'
    : '<a href="/login.html">Sign in</a> to track your progress.';
}

async function loadDone(keys) {
  if (!user) return new Set();
  try {
    const { data } = await api.get(`/me/progress/${enc(slug)}`);
    return new Set(data.topics.filter((t) => t.status === 'completed' && keys.has(t.topic_key)).map((t) => t.topic_key));
  } catch (err) {
    progressError.textContent = showError(err);
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
  document.body.classList.add('has-interactive'); // hides the old PNG
  const holder = $('[data-interactive]');
  holder.hidden = false;
  holder.style.cssText = 'background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;';

  const keys = new Set(layout.nodes.filter((n) => n.type === 'topic' && !isLinkBox(n.key)).map((n) => n.key));
  const done = await loadDone(keys);
  const total = keys.size;
  renderProgress(done.size, total);

  const resSection = $('[data-resources-section]');
  const resources = renderResources($('[data-resources]'), layout, done);
  resSection.hidden = false;

  const base = `/me/progress/${enc(slug)}`;
  const diagram = mountRoadmap(holder, layout, {
    doneKeys: [...done],
    onSelect: (key) => {
      resources.open(key); // click -> jump to this topic's resources below
      history.replaceState(null, '', `#topic=${enc(key)}`);
    },
    onNeedLogin: () => toast('<a href="/login.html?next=' + enc(location.pathname + location.search) + '">Sign in</a> to mark topics as completed.'),
    onToggleDone: user
      ? async (key, next) => {
          if (next) await api.put(`${base}/${enc(key)}`, { status: 'completed' });
          else await api.del(`${base}/${enc(key)}`);
          next ? done.add(key) : done.delete(key);
          resources.setDone(key, next); // read-only badge in the resources list
          renderProgress(done.size, total);
          document.dispatchEvent(new CustomEvent('progress-changed', { detail: { key, done: next } }));
        }
      : undefined,
  });

  // deep link: roadmap.html?slug=x#topic=<key>
  const m = /^#topic=(.+)$/.exec(location.hash);
  if (m) {
    const key = decodeURIComponent(m[1]);
    diagram.select(key);
    setTimeout(() => resources.open(key), 300);
  }
}

/* Roadmaps with no interactive layout: plain read-only topic list (no progress buttons). */
async function setupFallback() {
  const section = $('[data-topics-fallback]');
  const list = $('[data-topics]');
  try {
    const { data: topics } = await api.get(`/roadmaps/${enc(slug)}/topics`);
    if (!topics.length) return;
    section.hidden = false;
    renderProgress(0, 0);
    list.innerHTML = topics
      .map((t) => `<details class="topic" data-key="${escapeHtml(t.topic_key)}">
        <summary><span class="chev" aria-hidden="true">›</span>${escapeHtml(t.label)}</summary>
        <div class="topic-body"><p class="status-line">Loading…</p></div></details>`)
      .join('');
    for (const el of list.querySelectorAll('details.topic')) {
      el.addEventListener('toggle', async () => {
        if (!el.open || el.dataset.loaded) return;
        el.dataset.loaded = '1';
        const body = el.querySelector('.topic-body');
        try {
          const { data } = await api.get(`/roadmaps/${enc(slug)}/topics/${enc(el.dataset.key)}`);
          const articles = (data.articles || [])
            .map((a) => `<div class="article-resource"><h3>${escapeHtml(a.title)}</h3>${a.contentHtml || ''}</div>`)
            .join('');
          body.innerHTML = `<div class="content">${data.contentHtml || '<p>No description yet.</p>'}</div>${articles}`;
        } catch (err) {
          body.innerHTML = `<p class="field-error">${escapeHtml(showError(err))}</p>`;
        }
      });
    }
  } catch (err) {
    progressError.textContent = showError(err);
  }
}

async function init() {
  if (!slug) return fail('No roadmap selected. Go back and pick one.');
  try {
    const [{ data: roadmap }] = await Promise.all([
      api.get(`/roadmaps/${enc(slug)}`),
      loadAuth().then((u) => (user = u)),
    ]);
    renderHeader(roadmap);
    statusEl.hidden = true;
    rootEl.hidden = false;

    let layout = null;
    try {
      layout = await api.get(`/roadmaps/${enc(slug)}/layout`);
    } catch (err) {
      console.warn('Interactive layout unavailable, using the image.', err.message);
    }
    if (layout) await setupInteractive(layout);
    else await setupFallback();
  } catch (err) {
    fail(err.status === 404 ? 'Roadmap not found.' : showError(err));
  }
}

authStore.subscribe(() => {}); // keep nav + page auth state in one store
init();
