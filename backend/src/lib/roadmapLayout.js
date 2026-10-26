// Converts a roadmap.sh (Balsamiq) export into { width, height, nodes, edges, topics }.
// Last-resort label when a box has no text: "100-pwa:web-sockets" -> "Web Sockets"
function prettyFromKey(key) {
  const tail = String(key).split(':').pop().replace(/@.*$/, '').replace(/^\d+-/, '');
  return tail.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || String(key);
}

export function convertLayout(raw) {
  const m = raw && raw.mockup;
  if (!m || !m.controls) throw new Error('not a Balsamiq roadmap export (no mockup.controls)');
  const flat = [];

  function walk(list, ox = 0, oy = 0) {
    for (const c of list) {
      const p = c.properties || {};
      const x = +c.x + ox, y = +c.y + oy;
      if (c.typeID === '__group__') {
        const kids = c.children?.controls?.control || [];
        flat.push({ kind: 'group', name: p.controlName || '', x, y, w: +c.w, h: +c.h,
          labels: kids.filter(k => k.typeID === 'Label' || k.typeID === 'TextInput').map(k => k.properties.text).filter(Boolean) });
      } else if (c.typeID === 'Label') {
        flat.push({ kind: 'label', text: p.text, size: +(p.size || 16), x, y, w: +c.measuredW, h: +c.measuredH });
      } else if (c.typeID === 'TextArea') {
        flat.push({ kind: 'box', color: p.color, x, y, w: +c.w, h: +c.h });
      } else if (c.typeID === 'Arrow') {
        const q0 = p.p0 || { x: 0, y: 0 }, q2 = p.p2 || { x: 0, y: 0 };
        flat.push({ kind: 'arrow', dotted: p.stroke === 'dotted',
          x1: x + q0.x, y1: y + q0.y, x2: x + q2.x, y2: y + q2.y });
      }
    }
  }
  walk(m.controls.control);

  const groups = flat.filter(f => f.kind === 'group');
  const checks = new Set(groups.filter(g => g.name.startsWith('check:')).map(g => g.name.slice(6)));
  const topicGroups = groups.filter(g => g.name && !g.name.startsWith('check:') && !g.name.startsWith('ext_link:'));
  const topics = Object.fromEntries(topicGroups.map(g => [g.name, {
    key: g.name, title: String(g.labels[0] || '').replace(/\{color(?::[^}]*)?\}/gi, '').trim() || prettyFromKey(g.name), description: '', resources: [] }]));

  // Attach each resource link to the closest topic above it in the same column
  let orphans = 0;
  for (const r of groups.filter(g => g.name.startsWith('ext_link:'))) {
    const parent = topicGroups
      .filter(t => Math.abs(t.x - r.x) <= 45 && t.y <= r.y)
      .sort((a, b) => b.y - a.y)[0];
    const res = { title: r.labels[0], type: (r.labels[1] || 'link').toLowerCase(),
      url: 'https://' + r.name.slice('ext_link:'.length) };
    if (parent) topics[parent.name].resources.push(res); else orphans++;
  }

  const nodes = [];
  for (const f of flat) {
    if (f.kind === 'group' && topics[f.name])
      nodes.push({ type: 'topic', key: f.name, label: topics[f.name].title, x: f.x, y: f.y, w: f.w, h: f.h, checkable: checks.has(f.name) });
    else if (f.kind === 'label' && f.size >= 17 && !['<','>','v','^'].includes(f.text)) nodes.push({ type: 'text', label: f.text, x: f.x, y: f.y, size: f.size });
    else if (f.kind === 'box' && f.color === '16776960') nodes.push({ type: 'section-box', x: f.x, y: f.y, w: f.w, h: f.h });
  }
  const edges = flat.filter(f => f.kind === 'arrow');


  return { width: +m.mockupW, height: +m.mockupH, nodes, edges, topics: Object.values(topics) };
}
