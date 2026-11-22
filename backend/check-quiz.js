
import { query } from './src/db/index.js';

console.log('--- Recent quiz attempts ---');

console.log(query.all(`
  SELECT id, quiz_id, score, total_questions, percent, passed
  FROM quiz_attempts
  ORDER BY id DESC
  LIMIT 5
`));

console.log('--- Recent submitted answers ---');

console.log(query.all(`
  SELECT
    a.attempt_id,
    q.question_text,
    o.option_text AS selected_option,
    o.is_correct AS option_is_correct,
    a.is_correct AS answer_is_correct
  FROM quiz_attempt_answers a
  LEFT JOIN quiz_questions q ON q.id = a.question_id
  LEFT JOIN quiz_options o ON o.id = a.option_id
  ORDER BY a.id DESC
  LIMIT 10
`));
