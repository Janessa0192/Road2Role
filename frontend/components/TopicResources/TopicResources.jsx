import { useEffect, useMemo, useRef, useState } from 'react';
import TopicQuizList from '../TopicQuiz/TopicQuizList.jsx';

const isLinkBox = (key) => String(key).startsWith('json:');

/** Topics in reading order: by section (top to bottom), parents first, then by position. */
export function orderTopics(layout) {
  const pos = new Map();
  for (const n of layout.nodes) {
    if (n.type === 'topic' && !isLinkBox(n.key) && !pos.has(n.key)) pos.set(n.key, { x: n.x, y: n.y });
  }

  const topics = layout.topics.filter((t) => pos.has(t.key));
  const groups = new Map();
  for (const t of topics) {
    const group = t.key.split(':')[0];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(t);
  }

  const top = (list) => Math.min(...list.map((t) => pos.get(t.key).y));
  return [...groups.values()]
    .sort((a, b) => top(a) - top(b))
    .flatMap((list) =>
      list.sort((a, b) => {
        const da = a.key.split(':').length;
        const db = b.key.split(':').length;
        return (
          (da === 1 ? 0 : 1) - (db === 1 ? 0 : 1) ||
          pos.get(a.key).y - pos.get(b.key).y ||
          pos.get(a.key).x - pos.get(b.key).x
        );
      }),
    );
}

/** The opened body of a topic card: overview (server-rendered HTML), free resources, quizzes. */
function TopicBody({ topic, roadmapSlug, user }) {
  const resources = topic.resources || [];
  const generatedOnly = resources.length > 0 && resources.every((r) => r.generated);

  return (
    <div className="res-body">
      {topic.descriptionHtml ? (
        // descriptionHtml is rendered by our own backend from the repo's markdown (same as before)
        <div className="res-desc" dangerouslySetInnerHTML={{ __html: topic.descriptionHtml }} />
      ) : (
        <div className="res-desc">
          <p className="res-note">No written overview for this topic yet.</p>
        </div>
      )}
      <h3>Free resources</h3>
      <ul className="res-links">
        {resources.map((r, i) => {
          const type = r.generated ? 'search' : r.type;
          return (
            <li key={i}>
              <span className={`res-badge ${type}`}>{type}</span>{' '}
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
            </li>
          );
        })}
      </ul>
      {generatedOnly && <p className="res-note">These links open a search for this topic.</p>}

      <div className="quiz-area">
        <TopicQuizList roadmapSlug={roadmapSlug} topicKey={topic.key} user={user} />
      </div>
    </div>
  );
}

/**
 * "Topics & resources" list under the diagram (replaces roadmap-resources.js).
 *   openRequest  { key, n } - when it changes, that topic's card opens, scrolls into view and flashes
 */
export default function TopicResources({ layout, doneKeys, roadmapSlug, user, openRequest }) {
  const topics = useMemo(() => orderTopics(layout), [layout]);
  const cardRefs = useRef(new Map());
  const [openKeys, setOpenKeys] = useState(() => new Set());
  const [everOpened, setEverOpened] = useState(() => new Set()); // body is built on first open and then kept

  const add = (set, key) => (set.has(key) ? set : new Set(set).add(key));
  const remove = (set, key) => {
    if (!set.has(key)) return set;
    const next = new Set(set);
    next.delete(key);
    return next;
  };

  useEffect(() => {
    if (!openRequest) return;
    const { key } = openRequest;
    const card = cardRefs.current.get(key);
    if (!card) return;
    setOpenKeys((prev) => add(prev, key));
    setEverOpened((prev) => add(prev, key));
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.classList.remove('flash');
    void card.offsetWidth; // restart the CSS animation
    card.classList.add('flash');
  }, [openRequest]);

  function handleToggle(key, isOpen) {
    setOpenKeys((prev) => (isOpen ? add(prev, key) : remove(prev, key)));
    if (isOpen) setEverOpened((prev) => add(prev, key));
  }

  return (
    <>
      {topics.map((t) => {
        const depth = Math.min(t.key.split(':').length - 1, 3);
        return (
          <details
            key={t.key}
            ref={(el) => {
              if (el) cardRefs.current.set(t.key, el);
              else cardRefs.current.delete(t.key);
            }}
            className={`res-card lvl-${depth}${doneKeys.has(t.key) ? ' done' : ''}`}
            data-key={t.key}
            open={openKeys.has(t.key)}
            onToggle={(e) => handleToggle(t.key, e.currentTarget.open)}
          >
            <summary>
              <span className="chev" aria-hidden="true">
                ›
              </span>
              <span>{t.title}</span>
              <span className="res-state">✓ Completed</span>
            </summary>
            {everOpened.has(t.key) && <TopicBody topic={t} roadmapSlug={roadmapSlug} user={user} />}
          </details>
        );
      })}
    </>
  );
}
