// Vanilla ES module. Usage:
//   import { mountRoadmap } from './roadmap-viewer.js';
//   const rm = mountRoadmap(containerEl, layout, {
//     doneKeys,            // keys already completed
//     onSelect(key),       // a topic box was clicked  -> page scrolls to its resources
//     onToggleDone(key, nextDone)   // the hover check was clicked (async). Omit when signed out.
//     onNeedLogin(),       // hover check clicked while signed out
//   });
//   rm.setDone(key, true|false)  // update a box from outside
//   rm.select(key)               // highlight a box (no panel is opened)
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};

const isLinkBox = (key) => String(key).startsWith('json:');

export function mountRoadmap(container, data, opts = {}) {
  const done = new Set(opts.doneKeys || []);
  container.innerHTML = '';
  container.classList.add('rm-wrap');

  // ---- bounds -> viewBox (so the diagram is always centred, no blank side) ----
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const n of data.nodes) {
    grow(n.x - 8, n.y - 6);
    grow(n.x + (n.w || n.label?.length * (n.size || 16) * 0.6 || 0) + 8, n.y + (n.h || (n.size || 16) * 1.4) + 6);
  }
  for (const e of data.edges) { grow(e.x1, e.y1); grow(e.x2, e.y2); }
  const pad = 24;
  const svg = svgEl('svg', {
    viewBox: `${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`,
    class: 'rm-svg',
  });
  container.appendChild(svg);

  for (const e of data.edges)
    svgEl('line', { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, class: 'rm-edge' + (e.dotted ? ' dotted' : '') }, svg);

  // ---- nodes ----
  const nodeEls = {}; // key -> [<g>, ...]  (a key can appear on more than one box)
  const register = (key, g) => (nodeEls[key] ||= []).push(g);

  for (const n of data.nodes) {
    if (n.type === 'section-box') {
      svgEl('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: 4, class: 'rm-section' }, svg);
    } else if (n.type === 'text') {
      const t = svgEl('text', { x: n.x, y: n.y + n.size, class: 'rm-text', 'font-size': n.size }, svg);
      t.textContent = n.label;
    } else if (n.type === 'topic') {
      const g = svgEl('g', { class: 'rm-topic', tabindex: 0, role: 'button', 'data-key': n.key,
        'aria-label': `${n.label} - show resources` }, svg);
      const gap = 5;
      svgEl('rect', { x: n.x, y: n.y + gap, width: n.w, height: n.h - gap * 2, rx: 8, class: 'rm-box' }, g);
      const t = svgEl('text', { x: n.x + 12, y: n.y + n.h / 2, 'dominant-baseline': 'central' }, g);
      t.textContent = n.label;

      // "Mark as completed" - appears on hover/focus, stays visible once done
      if (!isLinkBox(n.key)) {
        const r = Math.min(11, (n.h - gap * 2) / 2 - 3);
        const cx = n.x + n.w - r - 8;
        const cy = n.y + n.h / 2;
        const chk = svgEl('g', { class: 'rm-check', tabindex: 0, role: 'button',
          'aria-label': `Mark ${n.label} as completed` }, g);
        const tip = svgEl('title', {}, chk);
        svgEl('circle', { cx, cy, r }, chk);
        svgEl('path', { d: `M${cx - r * 0.45} ${cy} l${r * 0.3} ${r * 0.32} l${r * 0.6} ${-r * 0.65}`, class: 'rm-tick' }, chk);
        chk._tip = tip;

        const toggle = async (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          if (!opts.onToggleDone) return opts.onNeedLogin?.();
          const next = !done.has(n.key);
          chk.classList.add('busy');
          try {
            await opts.onToggleDone(n.key, next);
            setDone(n.key, next);
          } catch (err) {
            console.error(err);
          } finally {
            chk.classList.remove('busy');
          }
        };
        chk.addEventListener('click', toggle);
        chk.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') toggle(ev); });
      }

      g.addEventListener('click', () => { select(n.key); opts.onSelect?.(n.key); });
      g.addEventListener('keydown', (ev) => {
        if (ev.target !== g) return; // keys on the check button are handled there
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(n.key); opts.onSelect?.(n.key); }
      });
      register(n.key, g);
    }
  }

  function paint(key) {
    const isDone = done.has(key);
    for (const g of nodeEls[key] || []) {
      g.classList.toggle('done', isDone);
      const tip = g.querySelector('.rm-check')?._tip;
      if (tip) tip.textContent = isDone ? 'Completed - click to undo' : 'Mark as completed';
      g.querySelector('.rm-check')?.setAttribute('aria-label',
        isDone ? 'Completed - click to undo' : 'Mark as completed');
    }
  }
  Object.keys(nodeEls).forEach(paint);

  function setDone(key, value) {
    value ? done.add(key) : done.delete(key);
    paint(key);
  }

  function select(key) {
    Object.values(nodeEls).flat().forEach((g) => g.classList.remove('selected'));
    (nodeEls[key] || []).forEach((g) => g.classList.add('selected'));
  }

  return { setDone, select, isDone: (k) => done.has(k) };
}
