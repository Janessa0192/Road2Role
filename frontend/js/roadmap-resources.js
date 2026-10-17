import { escapeHtml } from './util.js';

// Renders the "Topics & resources" cards below the roadmap.
// This section only SHOWS learning material (and a read-only "Completed" badge).
// Progress is changed in the roadmap diagram only.
const isLinkBox = (key) => String(key).startsWith('json:');

/** Diagram order, grouped by top-level topic, parents before their sub-topics. */
function orderTopics(layout) {
  const pos = new Map(); // key -> {x, y}
  for (const n of layout.nodes) {
    if (n.type === 'topic' && !isLinkBox(n.key) && !pos.has(n.key)) pos.set(n.key, { x: n.x, y: n.y });
  }
  const topics = layout.topics.filter((t) => pos.has(t.key));
  const groups = new Map();
  for (const t of topics) {
    const g = t.key.split(':')[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(t);
  }
  const top = (list) => Math.min(...list.map((t) => pos.get(t.key).y));
  return [...groups.values()]
    .sort((a, b) => top(a) - top(b))
    .flatMap((list) =>
      list.sort((a, b) => {
        const da = a.key.split(':').length;
        const db = b.key.split(':').length;
        return (da === 1 ? 0 : 1) - (db === 1 ? 0 : 1) || pos.get(a.key).y - pos.get(b.key).y || pos.get(a.key).x - pos.get(b.key).x;
      }),
    );
}

function bodyHtml(t) {
  const links = (t.resources || [])
    .map((r) => {
      const type = r.generated ? 'search' : r.type;
      return `<li><span class="res-badge ${escapeHtml(type)}">${escapeHtml(r.generated ? 'search' : r.type)}</span>
        <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a></li>`;
    })
    .join('');
  const generatedOnly = (t.resources || []).every((r) => r.generated);
  return `
    <div class="res-desc">${t.descriptionHtml || '<p class="res-note">No written overview for this topic yet - use the resources below.</p>'}</div>
    <h3>Free resources</h3>
    <ul class="res-links">${links}</ul>
    ${generatedOnly ? '<p class="res-note">No curated links for this topic yet, so these open a search for it.</p>' : ''}`;
}

export function renderResources(container, layout, doneSet) {
  const cards = new Map(); // key -> <details>
  const frag = document.createDocumentFragment();

  for (const t of orderTopics(layout)) {
    const depth = Math.min(t.key.split(':').length - 1, 3);
    const card = document.createElement('details');
    card.className = `res-card lvl-${depth}${doneSet.has(t.key) ? ' done' : ''}`;
    card.dataset.key = t.key;
    card.innerHTML = `<summary><span class="chev" aria-hidden="true">›</span>
      <span>${escapeHtml(t.title)}</span><span class="res-state">✓ Completed</span></summary>`;
    // lazy: build the body the first time the card opens (roadmaps can have 300+ topics)
    card.addEventListener('toggle', () => {
      if (card.open && !card.dataset.ready) {
        card.dataset.ready = '1';
        const body = document.createElement('div');
        body.className = 'res-body';
        body.innerHTML = bodyHtml(t);
        card.appendChild(body);
      }
    });
    cards.set(t.key, card);
    frag.appendChild(card);
  }
  container.innerHTML = '';
  container.appendChild(frag);

  return {
    /** open the card of a clicked topic and scroll to it */
    open(key) {
      const card = cards.get(key);
      if (!card) return;
      card.open = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.remove('flash');
      void card.offsetWidth; // restart the highlight animation
      card.classList.add('flash');
    },
    setDone(key, value) {
      cards.get(key)?.classList.toggle('done', value);
    },
  };
}
