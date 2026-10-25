# Roadmap quiz seeds

Each `<roadmap-slug>.js` file exports one quiz object for that roadmap. The object follows the schema consumed by `src/db/seed_quizzes.js`:

- `roadmap`: exact roadmap slug from `roadmaps.slug`
- `topic`: exact topic key from `roadmap_topics.topic_key`
- `title`, `description`, and `pass`
- `questions`: each question has `q`, `explanation`, `options` (four strings), and `correct` (zero-based option index)

Register new roadmap quiz files in `index.js`, then run `npm run seed` from the `backend` directory. Seeding is idempotent: existing quizzes are not overwritten. If you change an already-seeded quiz, update the existing database record or reset/reseed your development database intentionally.
