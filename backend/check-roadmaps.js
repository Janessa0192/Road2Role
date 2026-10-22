
import { query } from './src/db/index.js';

const columns = query.all(`PRAGMA table_info(quizzes)`);

console.table(
  columns.filter((column) =>
    ['id', 'roadmap_slug', 'topic_key', 'title', 'quiz_type'].includes(column.name)
  )
);

console.log(
  'quiz_type exists:',
  columns.some((column) => column.name === 'quiz_type')
);
