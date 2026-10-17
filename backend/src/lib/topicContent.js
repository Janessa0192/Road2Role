import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import config from '../config.js';

/**
 * Connects EVERY clickable box of an interactive roadmap to its learning content.
 *
 * Why this exists: layout keys look like "103-app-components:activity:activity-lifecycle"
 * while the content lives on disk as
 *   content/103-app-components/100-activity/100-activity-lifecycle.md
 * (and the DB only stores two folder levels). So we index the content folder once per
 * roadmap and match by NORMALISED path segments (numeric prefixes / @ids are ignored).
 *
 * Every topic ends up with: a description, and a resource list. If a topic has no
 * curated links, a few search links are generated so no topic is ever empty.
 */

const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;
const LINK_LINE_RE = /^\s*[-*+]\s+.*\[[^\]\n]+\]\(https?:\/\/[^)\s]+\).*$/;
const INTRO_LINE_RE = /^\s*visit the following resources.*$/i;
const VIDEO_HOST_RE = /^(?:www\.|m\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;

const norm = (k) =>
  String(k)
    .replace(/\.md$/i, '')
    .replace(/@.*$/, '')
    .replace(/^\d+-/, '')
    .toLowerCase();
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const indexCache = new Map(); // roadmap slug -> index

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function buildIndex(slug) {
  if (indexCache.has(slug)) return indexCache.get(slug);
  const base = path.join(config.roadmapsDataDir, slug, 'content');
  const files = [];

  (function walk(dir, segs) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(path.join(dir, e.name), [...segs, norm(e.name)]);
      } else if (e.name.endsWith('.md')) {
        const isIndex = e.name === 'index.md';
        const s = isIndex ? segs : [...segs, norm(e.name)];
        if (s.length) files.push({ segs: s, file: path.join(dir, e.name), isIndex });
      }
    }
  })(base, []);

  const byPath = new Map();
  const byLeaf = new Map();
  const byTitle = new Map();
  const push = (map, k, v) => (map.get(k) || map.set(k, []).get(k)).push(v);
  for (const f of files) {
    f.md = readFile(f.file) || '';
    // when both "x.md" and "x/index.md" exist, prefer the folder index only if no plain file
    const key = f.segs.join('/');
    if (!byPath.has(key) || !f.isIndex) byPath.set(key, f);
    push(byLeaf, f.segs[f.segs.length - 1], f);
    const h = /^#\s+(.+)$/m.exec(f.md);
    if (h) push(byTitle, slugify(h[1]), f);
  }
  const index = { files, byPath, byLeaf, byTitle };
  indexCache.set(slug, index);
  return index;
}

function findFile(index, key, label) {
  const segs = key.split(':').map(norm);
  const exact = index.byPath.get(segs.join('/'));
  if (exact) return exact;

  // path suffix ("a:b:c" -> "b/c" -> ...)
  for (let i = 1; i < segs.length; i += 1) {
    const sfx = segs.slice(i).join('/');
    const hits = index.files.filter((f) => {
      const p = f.segs.join('/');
      return p === sfx || p.endsWith(`/${sfx}`);
    });
    if (hits.length === 1) return hits[0];
  }
  // same leaf name, prefer same depth
  const leafHits = index.byLeaf.get(segs[segs.length - 1]);
  if (leafHits?.length) return leafHits.find((f) => f.segs.length === segs.length) || leafHits[0];
  // heading text equals the box label
  const titleHits = label ? index.byTitle.get(slugify(label)) : null;
  return titleHits?.[0] || null;
}

export function classifyUrl(url) {
  try {
    return VIDEO_HOST_RE.test(new URL(url).hostname) ? 'video' : 'article';
  } catch {
    return null;
  }
}

function extractResources(md) {
  const seen = new Set();
  const out = [];
  for (const m of md.matchAll(LINK_RE)) {
    const url = m[2].replace(/[.,;]+$/, '');
    const type = classifyUrl(url);
    const title = m[1].replace(/^@\w+@/, '').replace(/\s+/g, ' ').trim();
    if (!type || !title || seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url, type });
  }
  return out;
}

/** Description = the markdown without the title, the "Visit the following…" line and link bullets. */
function descriptionMd(md) {
  return md
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => !LINK_LINE_RE.test(l) && !INTRO_LINE_RE.test(l) && !/^\s*<[^>]+>\s*$/.test(l))
    .join('\n')
    .replace(/^#\s+.*\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Search links used when a topic has no curated resource, so every topic has something to open. */
function fallbackResources(title, roadmapTitle) {
  const q = encodeURIComponent(`${title} ${roadmapTitle || ''}`.trim());
  const qt = encodeURIComponent(`${title} tutorial`);
  return [
    { title: `Video tutorials: ${title}`, url: `https://www.youtube.com/results?search_query=${qt}`, type: 'video', generated: true },
    { title: `Guides and articles: ${title}`, url: `https://www.google.com/search?q=${qt}`, type: 'article', generated: true },
    { title: `Official docs and references: ${title}`, url: `https://www.google.com/search?q=${q}+documentation`, type: 'article', generated: true },
  ];
}

/** Resolves one topic -> { descriptionHtml, resources, hasCuratedResources } */
export function resolveTopic(slug, roadmapTitle, key, label) {
  const index = buildIndex(slug);
  const file = findFile(index, key, label);
  const md = file?.md || '';
  const desc = descriptionMd(md);
  const curated = extractResources(md);
  return {
    description: desc,
    descriptionHtml: desc ? marked.parse(desc) : '',
    resources: curated.length ? curated : fallbackResources(label || key, roadmapTitle),
    hasCuratedResources: curated.length > 0,
  };
}

/** Unique topic keys of a stored layout (the real denominator for progress). */
export const isLinkBox = (key) => String(key).startsWith('json:'); // e.g. "Visit the Beginner Version" boxes

export function layoutTopicKeys(layout) {
  return [
    ...new Set(
      (layout?.nodes || []).filter((n) => n.type === 'topic' && !isLinkBox(n.key)).map((n) => n.key),
    ),
  ];
}

/** Fills description / resources on every layout topic (mutates + returns layout). */
export function enrichLayout(slug, roadmapTitle, layout) {
  const byKey = new Map();
  for (const t of layout.topics || []) byKey.set(t.key, t);
  for (const n of layout.nodes || []) {
    if (n.type === 'topic' && !byKey.has(n.key)) byKey.set(n.key, { key: n.key, title: n.label });
  }
  layout.topics = [...byKey.values()].filter((t) => !isLinkBox(t.key)).map((t) => ({
    key: t.key,
    title: t.title,
    ...resolveTopic(slug, roadmapTitle, t.key, t.title),
  }));
  return layout;
}
