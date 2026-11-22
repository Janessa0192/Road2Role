import { useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Interactive roadmap diagram (replaces roadmap-viewer.js). Pure SVG, drawn from the
 * `layout` returned by GET /roadmaps/:slug/layout.
 *
 * Props
 *   layout        { nodes, edges }
 *   doneKeys      Set of completed topic keys
 *   selectedKey   highlighted topic key (or null)
 *   onSelect(key)                 a topic box was clicked
 *   onToggleDone(key, nextDone)   async; omit when signed out
 *   onNeedLogin()                 the check was clicked while signed out
 */
const isLinkBox = (key) => String(key).startsWith('json:');

// Balsamiq colour markup: "{color:purple}Unit{color}" -> coloured word, never shown as raw text.
const COLORS = {
  purple: '#7c3aed', blue: '#2563eb', red: '#dc2626', green: '#16a34a', orange: '#ea580c',
  yellow: '#ca8a04', pink: '#db2777', gray: '#64748b', grey: '#64748b',
};
const stripMarkup = (s) => String(s).replace(/\{color(?::[^}]*)?\}/gi, '');

function markupSegments(line) {
  const out = [];
  let color = null;
  let last = 0;
  for (const m of line.matchAll(/\{color(?::([^}]*))?\}/gi)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), color });
    color = m[1] ? COLORS[m[1].trim().toLowerCase()] || m[1].trim() : null;
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), color });
  return out.filter((x) => x.text);
}

// Keeps a label inside its box: shrink the font a little first, then cut with an ellipsis.
function fitText(t, maxW, base = 17, min = 12) {
  let size = base;
  t.style.fontSize = size + 'px';
  let w;
  try {
    w = t.getComputedTextLength();
  } catch {
    return;
  }
  if (!w || w <= maxW) return;
  size = Math.max(min, Math.floor(base * (maxW / w)));
  t.style.fontSize = size + 'px';
  let text = t.textContent;
  while (text.length > 2 && t.getComputedTextLength() > maxW) {
    text = text.slice(0, -1);
    t.textContent = text.trimEnd() + '\u2026';
  }
}

const GRADIENTS = [
  ['rm-grad', '--rm-box-top', '--rm-box-bot'],
  ['rm-grad-hover', '--rm-box-hover-top', '--rm-box-hover-bot'],
  ['rm-grad-done', '--rm-done-top', '--rm-done-bot'],
];

function TextNode({ n }) {
  const lines = String(n.label).split(/\\n|\n/);
  return (
    <text x={n.x} y={n.y + n.size} className="rm-text" fontSize={n.size}>
      {lines.map((line, i) =>
        markupSegments(line).map((seg, j) => {
          const props = j === 0 ? { x: n.x, dy: i ? n.size * 1.25 : 0 } : {};
          if (seg.color) props.style = { fill: seg.color };
          return (
            <tspan key={`${i}-${j}`} xmlSpace="preserve" {...props}>
              {j === 0 ? seg.text.trimStart() : seg.text}
            </tspan>
          );
        }),
      )}
    </text>
  );
}

export default function RoadmapViewer({ layout, doneKeys, selectedKey, onSelect, onToggleDone, onNeedLogin }) {
  const svgRef = useRef(null);
  const [busyKey, setBusyKey] = useState(null);

  // bounds -> viewBox (so the diagram is always centred, no blank side)
  const viewBox = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    };
    for (const n of layout.nodes) {
      grow(n.x - 8, n.y - 6);
      grow(n.x + (n.w || n.label?.length * (n.size || 16) * 0.6 || 0) + 8, n.y + (n.h || (n.size || 16) * 1.4) + 6);
    }
    for (const e of layout.edges) {
      grow(e.x1, e.y1);
      grow(e.x2, e.y2);
    }
    const pad = 24;
    return `${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`;
  }, [layout]);

  // Fit every box label once the SVG is in the DOM (needs real text measurements).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    for (const t of svg.querySelectorAll('text[data-fit]')) {
      fitText(t, Number(t.dataset.fit));
    }
  }, [layout]);

  async function toggle(event, key) {
    event.stopPropagation();
    event.preventDefault();
    if (!onToggleDone) return onNeedLogin?.();
    const next = !doneKeys.has(key);
    setBusyKey(key);
    try {
      await onToggleDone(key, next);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="roadmap-interactive rm-board rm-wrap" aria-label="Interactive roadmap">
      <svg ref={svgRef} className="rm-svg" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
        {/* Box gradients (colours come from CSS variables so light/dark themes both work) */}
        <defs>
          {GRADIENTS.map(([id, top, bot]) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: `var(${top})` }} />
              <stop offset="100%" style={{ stopColor: `var(${bot})` }} />
            </linearGradient>
          ))}
        </defs>

        {layout.edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className={`rm-edge${e.dotted ? ' dotted' : ''}`} />
        ))}

        {layout.nodes.map((n, i) => {
          if (n.type === 'section-box') {
            return <rect key={i} x={n.x} y={n.y} width={n.w} height={n.h} rx={12} className="rm-section" />;
          }
          if (n.type === 'text') return <TextNode key={i} n={n} />;
          if (n.type !== 'topic') return null;

          const gap = 5;
          const label = stripMarkup(n.label);
          const isDone = doneKeys.has(n.key);
          const link = isLinkBox(n.key);
          const r = Math.min(11, (n.h - gap * 2) / 2 - 3);
          const cx = n.x + n.w - r - 8;
          const cy = n.y + n.h / 2;
          const checkLabel = isDone ? 'Completed - click to undo' : 'Mark as completed';
          const select = () => onSelect?.(n.key);

          return (
            <g
              key={i}
              className={`rm-topic${isDone ? ' done' : ''}${selectedKey === n.key ? ' selected' : ''}`}
              tabIndex={0}
              role="button"
              data-key={n.key}
              aria-label={`${n.label} - show resources`}
              onClick={select}
              onKeyDown={(ev) => {
                if (ev.target !== ev.currentTarget) return; // keys on the check button are handled there
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  select();
                }
              }}
            >
              <rect x={n.x} y={n.y + gap} width={n.w} height={n.h - gap * 2} rx={8} className="rm-box" />
              <text
                x={n.x + 12}
                y={n.y + n.h / 2}
                dominantBaseline="central"
                data-fit={n.w - 24 - (link ? 0 : 26)} /* leave room for the check button */
              >
                {label}
              </text>
              <title>{label}</title>

              {/* "Mark as completed" - appears on hover/focus, stays visible once done */}
              {!link && (
                <g
                  className={`rm-check${busyKey === n.key ? ' busy' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={checkLabel}
                  onClick={(ev) => toggle(ev, n.key)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') toggle(ev, n.key);
                  }}
                >
                  <title>{checkLabel}</title>
                  <circle cx={cx} cy={cy} r={r} />
                  <path d={`M${cx - r * 0.45} ${cy} l${r * 0.3} ${r * 0.32} l${r * 0.6} ${-r * 0.65}`} className="rm-tick" />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </section>
  );
}
