import { api } from './api.js';
import { authStore, loadAuth, showError } from './state.js';
import { escapeHtml, debounce } from './util.js';
import './nav.js';

const $ = (sel) => document.querySelector(sel);
const PAGE_LIMIT = 15;

const gate = $('[data-gate]');
const adminEl = $('[data-admin]');
const rowsEl = $('[data-rows]');
const tableStatus = $('[data-table-status]');
const pager = $('[data-pager]');
const pageInfo = $('[data-page-info]');
const pageError = $('[data-page-error]');
const pageOk = $('[data-page-ok]');
const searchInput = $('#a-search');

const formDialog = $('[data-form-dialog]');
const form = $('[data-form]');
const formError = $('[data-form-error]');
const formTitle = $('[data-form-title]');
const saveBtn = $('[data-save]');
const deleteDialog = $('[data-delete-dialog]');

let state = { page: 1, search: '', totalPages: 1 };
let editingSlug = null; // null = creating a new roadmap
let deletingSlug = null;

/* ------------------------------------------------------------ helpers --- */
function flash(el, message) {
  pageError.hidden = true;
  pageOk.hidden = true;
  el.textContent = message;
  el.hidden = false;
  if (el === pageOk) setTimeout(() => (el.hidden = true), 3500);
}

function clearFieldErrors() {
  formError.hidden = true;
  for (const el of form.querySelectorAll('[data-error-for]')) el.textContent = '';
}

/* --------------------------------------------------------------- list --- */
async function loadRows() {
  tableStatus.textContent = 'Loading…';
  tableStatus.hidden = false;
  try {
    const payload = await api.get('/roadmaps', {
      query: { page: state.page, limit: PAGE_LIMIT, search: state.search, sort: 'order', order: 'asc' },
      headers: { 'Cache-Control': 'no-cache' }, // always show fresh data after an edit
    });
    state.totalPages = payload.meta.totalPages;

    if (!payload.data.length) {
      rowsEl.innerHTML = '';
      tableStatus.textContent = 'No roadmaps found.';
      pager.hidden = true;
      return;
    }

    rowsEl.innerHTML = payload.data
      .map(
        (r) => `
        <tr>
          <td data-label="Title"><strong>${escapeHtml(r.title)}</strong></td>
          <td class="slug" data-label="Slug">${escapeHtml(r.slug)}</td>
          <td data-label="Category"><span class="badge ${escapeHtml(r.category)}">${escapeHtml(r.category)}</span></td>
          <td data-label="Difficulty"><span class="badge ${escapeHtml(r.difficulty)}">${escapeHtml(r.difficulty)}</span></td>
          <td data-label="Order">${escapeHtml(r.order)}</td>
          <td class="cell-actions">
            <div class="row-actions">
              <a class="btn btn-sm" href="/roadmap.html?slug=${encodeURIComponent(r.slug)}" target="_blank" rel="noopener">View</a>
              <button class="btn btn-sm" type="button" data-edit="${escapeHtml(r.slug)}">Edit</button>
              <button class="btn btn-sm btn-danger" type="button" data-del="${escapeHtml(r.slug)}" data-title="${escapeHtml(r.title)}">Delete</button>
            </div>
          </td>
        </tr>`,
      )
      .join('');
    tableStatus.hidden = true;
    pager.hidden = false;
    pageInfo.textContent = `Page ${payload.meta.page} of ${payload.meta.totalPages} · ${payload.meta.total} roadmaps`;
    $('[data-prev]').disabled = state.page <= 1;
    $('[data-next]').disabled = state.page >= state.totalPages;
  } catch (err) {
    rowsEl.innerHTML = '';
    tableStatus.textContent = showError(err);
    tableStatus.classList.add('error');
  }
}

/* ------------------------------------------------------- add / edit ----- */
function fillForm(data) {
  const set = (name, value) => (form.elements[name].value = value ?? '');
  set('title', data.title);
  set('slug', data.slug);
  set('briefTitle', data.brief_title === data.title ? '' : data.brief_title);
  set('description', data.description);
  set('category', data.category || 'other');
  set('difficulty', data.difficulty || 'beginner');
  set('tag', data.tag || 'general');
  set('order', data.order_index ?? data.order ?? 0);
  set('imageUrl', data.image_url);
  set('articleMd', data.article_md);
  form.elements.isForkable.checked = data.is_forkable !== 0 && data.is_forkable !== false;
  form.elements.hasTopics.checked = data.has_topics !== 0 && data.has_topics !== false;
}

function openCreate() {
  editingSlug = null;
  form.reset();
  clearFieldErrors();
  form.elements.slug.readOnly = false;
  formTitle.textContent = 'Add roadmap';
  formDialog.showModal();
}

async function openEdit(slug) {
  try {
    const { data } = await api.get(`/roadmaps/${encodeURIComponent(slug)}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    editingSlug = slug;
    form.reset();
    clearFieldErrors();
    fillForm(data);
    form.elements.slug.readOnly = true; // changing the slug would break existing links/progress
    formTitle.textContent = `Edit: ${data.title}`;
    formDialog.showModal();
  } catch (err) {
    flash(pageError, showError(err));
  }
}

function readForm() {
  const f = form.elements;
  return {
    slug: f.slug.value.trim(),
    title: f.title.value.trim(),
    briefTitle: f.briefTitle.value.trim(),
    description: f.description.value.trim(),
    category: f.category.value,
    difficulty: f.difficulty.value,
    tag: f.tag.value.trim() || 'general',
    order: Number(f.order.value) || 0,
    imageUrl: f.imageUrl.value.trim(),
    articleMd: f.articleMd.value,
    isForkable: f.isForkable.checked,
    hasTopics: f.hasTopics.checked,
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFieldErrors();
  const body = readForm();
  if (!body.title || !body.slug) {
    formError.textContent = 'Title and slug are required.';
    formError.hidden = false;
    return;
  }

  saveBtn.disabled = true;
  try {
    if (editingSlug) {
      const { slug, ...changes } = body; // slug stays the same
      await api.patch(`/roadmaps/${encodeURIComponent(editingSlug)}`, changes);
      flash(pageOk, 'Roadmap updated.');
    } else {
      await api.post('/roadmaps', body);
      flash(pageOk, 'Roadmap created.');
    }
    formDialog.close();
    await loadRows();
  } catch (err) {
    let shown = false;
    for (const el of form.querySelectorAll('[data-error-for]')) {
      const msg = err.fieldError?.(el.dataset.errorFor);
      if (msg) {
        el.textContent = msg;
        shown = true;
      }
    }
    if (!shown) {
      formError.textContent = showError(err);
      formError.hidden = false;
    }
  } finally {
    saveBtn.disabled = false;
  }
});

$('[data-cancel]').addEventListener('click', () => formDialog.close());
$('[data-new]').addEventListener('click', openCreate);

/* ------------------------------------------------------------- delete --- */
$('[data-delete-cancel]').addEventListener('click', () => deleteDialog.close());
$('[data-delete-confirm]').addEventListener('click', async (event) => {
  const btn = event.currentTarget;
  btn.disabled = true;
  try {
    await api.del(`/roadmaps/${encodeURIComponent(deletingSlug)}`);
    deleteDialog.close();
    flash(pageOk, 'Roadmap deleted.');
    if (rowsEl.children.length === 1 && state.page > 1) state.page -= 1; // last row on this page
    await loadRows();
  } catch (err) {
    deleteDialog.close();
    flash(pageError, showError(err));
  } finally {
    btn.disabled = false;
  }
});

/* --------------------------------------------------------- table events -- */
rowsEl.addEventListener('click', (event) => {
  const editBtn = event.target.closest('[data-edit]');
  const delBtn = event.target.closest('[data-del]');
  if (editBtn) openEdit(editBtn.dataset.edit);
  if (delBtn) {
    deletingSlug = delBtn.dataset.del;
    $('[data-delete-name]').textContent = delBtn.dataset.title;
    deleteDialog.showModal();
  }
});

searchInput.addEventListener(
  'input',
  debounce(() => {
    state = { ...state, search: searchInput.value.trim(), page: 1 };
    loadRows();
  }, 300),
);
$('[data-prev]').addEventListener('click', () => {
  state.page = Math.max(1, state.page - 1);
  loadRows();
});
$('[data-next]').addEventListener('click', () => {
  state.page = Math.min(state.totalPages, state.page + 1);
  loadRows();
});

/* --------------------------------------------------------- access gate --- */
async function start() {
  const user = authStore.get().user || (await loadAuth());
  if (!user) {
    gate.innerHTML = 'Please <a href="/login.html">sign in</a> as an admin to open this page.';
    return;
  }
  if (user.role !== 'admin') {
    gate.textContent = 'Access denied: this page is only for admins.';
    gate.classList.add('error');
    return;
  }
  gate.hidden = true;
  adminEl.hidden = false;
  loadRows();
}

start();