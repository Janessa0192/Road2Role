import { useEffect, useMemo, useRef } from 'react';

/** Plain-text short summary (first ~220 chars) from the topic's server-rendered description HTML. */
export function shortDescription(html, max = 220) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('pre, code, ul, ol, table, h1, h2, h3, h4').forEach((el) => el.remove());
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[.,;:\-\s]+$/, '') + '\u2026';
}

/**
 * Small side box shown when a topic is clicked in the roadmap diagram.
 *   topic             { key, title, descriptionHtml } or null (panel hidden)
 *   onClose()         close button / Esc
 *   onGoToResources() jump to this topic's card in "Topics & resources"
 */
export default function TopicSidePanel({ topic, onClose, onGoToResources }) {
  const closeRef = useRef(null);
  const summary = useMemo(() => shortDescription(topic?.descriptionHtml), [topic]);

  useEffect(() => {
    if (!topic) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('has-topic-panel');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-topic-panel');
    };
  }, [topic, onClose]);

  if (!topic) return null;

  return (
    <aside className="topic-panel" role="complementary" aria-label={`${topic.title} summary`}>
      <div className="tp-head">
        <h3 className="tp-title">{topic.title}</h3>
        <button ref={closeRef} type="button" className="tp-close" onClick={onClose} aria-label="Close topic panel">
          ×
        </button>
      </div>
      <p className="tp-desc">{summary || 'No written overview for this topic yet.'}</p>
      <button type="button" className="btn btn-sm tp-go" onClick={onGoToResources}>
        Go to resources ↓
      </button>
    </aside>
  );
}
