import { query } from './index.js';

/**
 * Topic-wise and roadmap-level MCQ quizzes.
 *
 * quiz_type:
 *   topic   -> individual topic quiz
 *   roadmap -> one combined quiz for the complete roadmap
 *
 * Question format:
 * { q, explanation, options: [...], correct: <index in options> }
 */

export const QUIZZES = [
  {
    roadmap: 'frontend',
    topic: '100-internet',
    type: 'topic',
    title: 'Internet Basics',
    description: 'How the internet, DNS and HTTP work.',
    pass: 60,
    questions: [
      {
        q: 'What does DNS do?',
        explanation: 'DNS translates human-friendly domain names into IP addresses.',
        options: [
          'Encrypts web traffic',
          'Translates domain names into IP addresses',
          'Stores website files',
          'Speeds up the CPU',
        ],
        correct: 1,
      },
      {
        q: 'Which protocol is used for secure web traffic?',
        explanation: 'HTTPS uses TLS to protect data in transit.',
        options: ['FTP', 'HTTP', 'HTTPS', 'SMTP'],
        correct: 2,
      },
      {
        q: 'Which HTTP status code means Not Found?',
        explanation: '404 indicates that the requested resource was not found.',
        options: ['200', '301', '404', '500'],
        correct: 2,
      },
      {
        q: 'What is web hosting?',
        explanation: 'Hosting stores website files on a server accessible over the internet.',
        options: [
          'Buying a domain name',
          'Writing HTML code',
          'Storing website files on an internet-connected server',
          'Installing a browser',
        ],
        correct: 2,
      },
      {
        q: 'What does a browser send to a server to request a web page?',
        explanation: 'The browser sends an HTTP request and receives an HTTP response.',
        options: ['An HTTP request', 'A DNS record', 'A CSS file', 'A cookie banner'],
        correct: 0,
      },
    ],
  },
  {
    roadmap: 'frontend',
    topic: '101-html',
    type: 'topic',
    title: 'HTML Fundamentals',
    description: 'Tags, attributes and semantic HTML.',
    pass: 60,
    questions: [
      {
        q: 'What does HTML stand for?',
        explanation: 'HTML stands for HyperText Markup Language.',
        options: [
          'HighText Machine Language',
          'HyperText Markup Language',
          'Hyperlinks and Text Markup Language',
          'Home Tool Markup Language',
        ],
        correct: 1,
      },
      {
        q: 'Which element represents the highest-level heading?',
        explanation: 'HTML headings range from h1 to h6.',
        options: ['<heading>', '<h6>', '<h1>', '<head>'],
        correct: 2,
      },
      {
        q: 'Which attribute provides alternative text for an image?',
        explanation: 'The alt attribute provides a text alternative for an image.',
        options: ['title', 'alt', 'src', 'name'],
        correct: 1,
      },
      {
        q: 'Which element creates a hyperlink?',
        explanation: 'The anchor element uses href to specify a link destination.',
        options: ['<link>', '<href>', '<a>', '<url>'],
        correct: 2,
      },
      {
        q: 'Which is a semantic HTML element?',
        explanation: 'The article element conveys meaning; div is a generic container.',
        options: ['<div>', '<span>', '<article>', '<b>'],
        correct: 2,
      },
    ],
  },
  {
    roadmap: 'frontend',
    topic: '102-css',
    type: 'topic',
    title: 'CSS Fundamentals',
    description: 'Selectors, the box model and layout basics.',
    pass: 60,
    questions: [
      {
        q: 'What does CSS stand for?',
        explanation: 'CSS stands for Cascading Style Sheets.',
        options: [
          'Creative Style Sheets',
          'Computer Style Sheets',
          'Cascading Style Sheets',
          'Colorful Style Syntax',
        ],
        correct: 2,
      },
      {
        q: 'Which property changes the text colour of an element?',
        explanation: 'The color property sets text colour.',
        options: ['font-color', 'text-color', 'color', 'foreground'],
        correct: 2,
      },
      {
        q: 'Which selector targets elements with class="box"?',
        explanation: 'A class selector starts with a dot.',
        options: ['#box', '.box', 'box', '*box'],
        correct: 1,
      },
      {
        q: 'What is the correct CSS box-model order from inside to outside?',
        explanation: 'The order is content, padding, border and margin.',
        options: [
          'Margin, border, padding, content',
          'Content, margin, padding, border',
          'Content, padding, border, margin',
          'Padding, content, margin, border',
        ],
        correct: 2,
      },
      {
        q: 'What is display: flex mainly used for?',
        explanation: 'Flexbox arranges items along a row or column.',
        options: [
          'Hiding an element',
          'Creating flexible one-dimensional layouts',
          'Adding animations',
          'Loading fonts',
        ],
        correct: 1,
      },
    ],
  },
  {
    roadmap: 'frontend',
    topic: '103-javascript',
    type: 'topic',
    title: 'JavaScript Fundamentals',
    description: 'Variables, types, arrays and JSON.',
    pass: 60,
    questions: [
      {
        q: 'Which keyword declares a block-scoped variable that can be reassigned?',
        explanation: 'let is block-scoped and allows reassignment.',
        options: ['var', 'let', 'const', 'static'],
        correct: 1,
      },
      {
        q: 'What does typeof null return in JavaScript?',
        explanation: 'For historical reasons, typeof null returns "object".',
        options: ['"null"', '"undefined"', '"object"', '"number"'],
        correct: 2,
      },
      {
        q: 'Which array method adds an element to the end of an array?',
        explanation: 'push appends an element to the end of an array.',
        options: ['pop()', 'shift()', 'unshift()', 'push()'],
        correct: 3,
      },
      {
        q: 'What is the difference between === and ==?',
        explanation: 'Strict equality does not perform type coercion.',
        options: [
          'No difference',
          '=== compares without type coercion',
          '== only compares strings',
          '=== only works on numbers',
        ],
        correct: 1,
      },
      {
        q: 'Which method converts a JSON string into a JavaScript value?',
        explanation: 'JSON.parse parses JSON text into a JavaScript value.',
        options: [
          'JSON.stringify()',
          'JSON.parse()',
          'JSON.toObject()',
          'Object.fromJSON()',
        ],
        correct: 1,
      },
    ],
  },
    {
    roadmap: 'frontend',
    topic: '100-internet',
    type: 'roadmap',
    title: 'Frontend Developer - Final Assessment',
    description: 'A 50-question assessment covering Internet, HTML, CSS, JavaScript, accessibility, responsive design, browser APIs, performance, security and testing.',
    pass: 60,
    questions: [
      {
        q: 'What does DNS do?',
        explanation: 'DNS resolves domain names to IP addresses.',
        options: ['Encrypts traffic', 'Resolves domain names to IP addresses', 'Styles pages', 'Stores passwords'],
        correct: 1,
      },
      {
        q: 'Which protocol secures HTTP using TLS?',
        explanation: 'HTTPS protects HTTP communication using TLS.',
        options: ['FTP', 'SMTP', 'HTTPS', 'Telnet'],
        correct: 2,
      },
      
      {
        q: 'What is the main purpose of a web server?',
        explanation: 'A web server processes requests and serves responses or resources.',
        options: ['Serve web resources to clients', 'Compile CSS only', 'Design page layouts', 'Replace JavaScript'],
        correct: 0,
      },
      {
        q: 'Which HTTP method is generally used to retrieve a resource?',
        explanation: 'GET requests a representation of a resource.',
        options: ['POST', 'GET', 'PATCH', 'DELETE'],
        correct: 1,
      },
      {
        q: 'What does HTML stand for?',
        explanation: 'HTML means HyperText Markup Language.',
        options: ['HighText Machine Language', 'Hyper Transfer Main Language', 'HyperText Markup Language', 'Home Tool Markup Language'],
        correct: 2,
      },
      {
        q: 'Which element represents the main heading of a page?',
        explanation: 'The h1 element represents a top-level heading.',
        options: ['<head>', '<heading>', '<h6>', '<h1>'],
        correct: 3,
      },
      {
        q: 'Which attribute provides alternative text for an image?',
        explanation: 'The alt attribute provides a text alternative when an image cannot be seen.',
        options: ['alt', 'href', 'target', 'rel'],
        correct: 0,
      },
      {
        q: 'Which HTML element creates a hyperlink?',
        explanation: 'The anchor element uses href to define a link destination.',
        options: ['<linkto>', '<a>', '<url>', '<navlink>'],
        correct: 1,
      },
      {
        q: 'Which element is semantic HTML?',
        explanation: 'The article element identifies self-contained content.',
        options: ['<span>', '<b>', '<article>', '<div>'],
        correct: 2,
      },
      {
        q: 'Which attribute associates a label with a form control?',
        explanation: 'The label for attribute matches the control id.',
        options: ['name', 'placeholder', 'action', 'for'],
        correct: 3,
      },
      {
        q: 'Which input type is intended for email addresses?',
        explanation: 'type="email" provides email-oriented input semantics and browser validation.',
        options: ['email', 'mailbox', 'text-email', 'address'],
        correct: 0,
      },
      {
        q: 'What is the purpose of the HTML lang attribute?',
        explanation: 'The lang attribute identifies the language of content.',
        options: ['Set page width', 'Identify the content language', 'Load a stylesheet', 'Create navigation'],
        correct: 1,
      },
      {
        q: 'What does CSS stand for?',
        explanation: 'CSS means Cascading Style Sheets.',
        options: ['Computer Style Syntax', 'Creative Sheet System', 'Cascading Style Sheets', 'Colourful Structure Sheets'],
        correct: 2,
      },
      {
        q: 'Which selector targets elements with class="card"?',
        explanation: 'A dot introduces a class selector.',
        options: ['#card', '*card', 'card()', '.card'],
        correct: 3,
      },
      {
        q: 'What is the CSS box-model order from inside to outside?',
        explanation: 'The order is content, padding, border and margin.',
        options: ['Content, padding, border, margin', 'Padding, margin, content, border', 'Border, content, margin, padding', 'Margin, content, border, padding'],
        correct: 0,
      },
      {
        q: 'Which property sets the text colour?',
        explanation: 'The color property controls text foreground colour.',
        options: ['font-color', 'color', 'text-style', 'foreground-color'],
        correct: 1,
      },
      {
        q: 'What is Flexbox mainly designed for?',
        explanation: 'Flexbox is a one-dimensional layout system.',
        options: ['Database queries', 'Image compression', 'One-dimensional layouts', 'HTML validation'],
        correct: 2,
      },
      {
        q: 'Which CSS unit is relative to the root element font size?',
        explanation: 'rem is relative to the root element font size.',
        options: ['px', 'vh', 'em relative to its parent', 'rem'],
        correct: 3,
      },
      {
        q: 'Which CSS feature applies styles based on viewport conditions?',
        explanation: 'Media queries allow styles to respond to viewport and device characteristics.',
        options: ['Media queries', 'CSS comments', 'Pseudo-elements only', 'The title attribute'],
        correct: 0,
      },
      {
        q: 'Which declaration enables CSS Grid on an element?',
        explanation: 'display: grid establishes a grid formatting context.',
        options: ['position: grid', 'display: grid', 'layout: grid', 'grid: enabled'],
        correct: 1,
      },
      {
        q: 'What does box-sizing: border-box do?',
        explanation: 'The declared width and height include padding and border.',
        options: ['Removes padding', 'Hides the border', 'Includes padding and border within declared dimensions', 'Makes every element fixed-positioned'],
        correct: 2,
      },
      {
        q: 'Which pseudo-class applies when a pointer is over an element?',
        explanation: ':hover matches an element in its hover state.',
        options: ['::before', ':visited', ':focus-visible only', ':hover'],
        correct: 3,
      },
      {
        q: 'Which declaration creates space outside an element border?',
        explanation: 'Margin creates space outside an element border.',
        options: ['margin', 'padding', 'outline-offset only', 'line-height'],
        correct: 0,
      },
      {
        q: 'Which keyword declares a block-scoped variable that can be reassigned?',
        explanation: 'let is block-scoped and permits reassignment.',
        options: ['const', 'let', 'final', 'static'],
        correct: 1,
      },
      {
        q: 'What does typeof null return in JavaScript?',
        explanation: 'This is a longstanding JavaScript behaviour: typeof null returns "object".',
        options: ['null', 'undefined', 'object', 'boolean'],
        correct: 2,
      },
      {
        q: 'Which array method adds an item to the end?',
        explanation: 'push appends items to an array.',
        options: ['pop()', 'shift()', 'unshift()', 'push()'],
        correct: 3,
      },
      {
        q: 'What is the key difference between === and ==?',
        explanation: 'Strict equality does not perform type coercion.',
        options: [
  '=== compares without type coercion',
  '== compares without type coercion',
  'Both operators always coerce types',
  'Neither operator compares values',
],
correct: 0,
      },
      {
        q: 'Which method parses JSON text into a JavaScript value?',
        explanation: 'JSON.parse converts valid JSON text into a JavaScript value.',
        options: ['JSON.stringify()', 'JSON.parse()', 'JSON.convert()', 'Object.toJSON()'],
        correct: 1,
      },
      {
        q: 'Which array method creates a new array by transforming each item?',
        explanation: 'map returns a new array containing each callback result.',
        options: ['forEach()', 'find()', 'map()', 'reduceRight() only'],
        correct: 2,
      },
      {
        q: 'What does addEventListener do?',
        explanation: 'It registers a handler for a specified event.',
        options: ['Creates an HTML element automatically', 'Changes CSS permanently', 'Deletes browser history', 'Registers an event handler'],
        correct: 3,
      },
      {
        q: 'What does Promise.all do when one input promise rejects?',
        explanation: 'Promise.all rejects when any input promise rejects.',
        options: ['Rejects the combined promise', 'Always returns all fulfilled values', 'Retries every promise automatically', 'Converts rejection to null'],
        correct: 0,
      },
      {
        q: 'What is a closure in JavaScript?',
        explanation: 'A closure retains access to its lexical environment.',
        options: ['A browser tab', 'A function with access to its lexical scope', 'A CSS selector', 'A JSON file'],
        correct: 1,
      },
      {
        q: 'Which operator provides a fallback only for null or undefined?',
        explanation: 'The nullish coalescing operator ?? falls back for null and undefined.',
        options: ['||=', '&&', '??', '!=='],
        correct: 2,
      },
      {
        q: 'Which keyword pauses an async function until a promise settles?',
        explanation: 'await pauses execution of the surrounding async function until settlement.',
        options: ['defer', 'pause', 'yieldTo', 'await'],
        correct: 3,
      },
      {
        q: 'What is the DOM?',
        explanation: 'The Document Object Model represents document structure as objects.',
        options: ['A programming language', 'A network protocol', 'A CSS preprocessor', 'An object representation of a document'],
        correct: 3,
      },
      {
        q: 'Which method selects the first element matching a CSS selector?',
        explanation: 'querySelector returns the first matching element or null.',
        options: ['document.querySelector()', 'document.selectAll()', 'document.getCSS()', 'document.findFirstCSS()'],
        correct: 0,
      },
      {
        q: 'Which storage normally persists across browser sessions for an origin?',
        explanation: 'localStorage persists data across browser sessions unless cleared.',
        options: ['A local variable', 'localStorage', 'A temporary function argument', 'An event object'],
        correct: 1,
      },
      {
        q: 'What is event bubbling?',
        explanation: 'During bubbling, an event propagates from the target toward ancestor elements.',
        options: ['Events are deleted', 'Events run only on the window', 'Events propagate from target toward ancestors', 'CSS animations restart'],
        correct: 2,
      },
      {
        q: 'Which API can make HTTP requests from browser JavaScript?',
        explanation: 'fetch is the standard browser API for making network requests.',
        options: ['document.paint()', 'style.request()', 'css.fetchOnly()', 'fetch()'],
        correct: 3,
      },
      {
        q: 'What is the purpose of responsive web design?',
        explanation: 'Responsive design adapts layouts to different screen sizes and devices.',
        options: ['Adapt layouts to different viewports', 'Force a desktop-only layout', 'Disable mobile browsers', 'Replace HTML with images'],
        correct: 0,
      },
      {
        q: 'Which HTML attribute helps browsers select responsive image sources?',
        explanation: 'The srcset attribute provides alternative image candidates.',
        options: ['altset', 'srcset', 'imagesize', 'media-src-only'],
        correct: 1,
      },
      {
        q: 'What does the viewport meta tag help control on mobile browsers?',
        explanation: 'The viewport meta tag controls the layout viewport and its scaling.',
        options: ['Database size', 'Server port', 'Viewport dimensions and scaling', 'JavaScript variable scope'],
        correct: 2,
      },
      {
        q: 'What is a key accessibility purpose of semantic HTML?',
        explanation: 'Semantic elements provide meaningful structure to browsers and assistive technologies.',
        options: ['Guarantee every page loads instantly', 'Replace keyboard support', 'Remove the need for labels', 'Expose meaningful document structure'],
        correct: 3,
      },
      {
        q: 'What does WCAG primarily provide?',
        explanation: 'WCAG provides guidelines for making web content more accessible.',
        options: ['Web accessibility guidelines', 'JavaScript package management', 'Database schemas', 'Image file formats'],
        correct: 0,
      },
      {
        q: 'Which practice improves keyboard accessibility?',
        explanation: 'Interactive controls should be reachable and operable using a keyboard.',
        options: ['Removing focus indicators', 'Supporting logical keyboard navigation', 'Using colour as the only signal', 'Making controls mouse-only'],
        correct: 1,
      },
      {
        q: 'What is the purpose of lazy loading images?',
        explanation: 'Lazy loading can defer off-screen image loading until needed.',
        options: ['Increase every image file size', 'Disable caching', 'Delay loading noncritical off-screen images', 'Convert images into HTML'],
        correct: 2,
      },
      {
        q: 'What is minification?',
        explanation: 'Minification removes unnecessary characters from code to reduce file size.',
        options: ['Adding whitespace everywhere', 'Creating duplicate files', 'Disabling compression', 'Removing unnecessary code characters'],
        correct: 3,
      },
      {
        q: 'What does a Content Security Policy help mitigate?',
        explanation: 'A CSP can restrict resource sources and help mitigate some cross-site scripting risks.',
        options: ['Certain injection and cross-site scripting risks', 'All possible security vulnerabilities', 'Slow keyboard typing', 'CSS naming conflicts only'],
        correct: 0,
      },
      {
        q: 'What is the main purpose of a frontend unit test?',
        explanation: 'Unit tests check small units of code in isolation or with controlled dependencies.',
        options: ['Deploy a production server', 'Verify a small unit of code behaves as expected', 'Replace every integration test', 'Generate user passwords'],
        correct: 1,
      },
      {
        q: 'What is the purpose of version control such as Git?',
        explanation: 'Version control records changes and supports collaboration and recovery.',
        options: ['Render CSS in the browser', 'Replace all automated tests', 'Track and manage changes to files', 'Host every website automatically'],
        correct: 2,
      },
    ],
  },


];


export function seedQuizzes(quizzes = QUIZZES) {
  let quizCount = 0;
  let questionCount = 0;

  query.tx(() => {
    for (const quiz of quizzes) {
      const quizType = quiz.type === 'roadmap' ? 'roadmap' : 'topic';

      // Validate the quiz before writing anything to the database.
      if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error(`Quiz "${quiz.title}" must contain questions.`);
      }

      if (quizType === 'roadmap' && quiz.questions.length !== 50) {
        throw new Error(
          `Roadmap quiz "${quiz.title}" must contain exactly 50 questions; found ${quiz.questions.length}.`,
        );
      }

      for (const [index, question] of quiz.questions.entries()) {
        if (
  !question.q ||
  !Array.isArray(question.options) ||
  question.options.length < 2 ||
  !Number.isInteger(question.correct) ||
  question.correct < 0 ||
  question.correct >= question.options.length ||
  question.options.some(
    (option) => typeof option !== 'string' || !option.trim(),
  ) ||
  (quizType === 'roadmap' && question.options.length !== 4)
) {
          throw new Error(
            `Invalid question ${index + 1} in quiz "${quiz.title}". Each question needs four options and a valid correct index.`,
          );
        }
      }

      const topic = query.get(
        `SELECT 1 AS ok
         FROM roadmap_topics
         WHERE roadmap_slug = ? AND topic_key = ?`,
        quiz.roadmap,
        quiz.topic,
      );

      if (!topic) {
        throw new Error(
          `Topic "${quiz.topic}" does not exist for roadmap "${quiz.roadmap}".`,
        );
      }

      const existing = query.get(
        `SELECT id, quiz_type
         FROM quizzes
         WHERE roadmap_slug = ?
           AND topic_key = ?
           AND title = ?`,
        quiz.roadmap,
        quiz.topic,
        quiz.title,
      );

      let quizId;

      if (!existing) {
        const inserted = query.run(
          `INSERT INTO quizzes
            (roadmap_slug, topic_key, title, description, pass_percent, quiz_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          quiz.roadmap,
          quiz.topic,
          quiz.title,
          quiz.description || null,
          quiz.pass ?? 60,
          quizType,
        );

        quizId = inserted.lastInsertRowid;
        quizCount += 1;
      } else {
        quizId = existing.id;

        // Never replace an existing topic quiz.
        if (quizType === 'topic') {
          continue;
        }

        if (existing.quiz_type !== 'roadmap') {
          throw new Error(
            `Quiz "${quiz.title}" already exists as a topic quiz. Check its database record before changing its type.`,
          );
        }

        const attempts = query.get(
          `SELECT COUNT(*) AS total
           FROM quiz_attempts
           WHERE quiz_id = ?`,
          quizId,
        );

        const current = query.get(
          `SELECT COUNT(*) AS total
           FROM quiz_questions
           WHERE quiz_id = ?`,
          quizId,
        );

        // Preserve all existing attempt history.
        if (attempts.total > 0) {
          if (current.total !== quiz.questions.length) {
            throw new Error(
              `Quiz "${quiz.title}" has existing attempts and ${current.total} questions. Its questions were not changed to protect history.`,
            );
          }

          // Existing attempted quiz already has the expected question count.
          continue;
        }

        // No attempts exist, so it is safe to refresh this roadmap quiz.
        query.run(
          `DELETE FROM quiz_options
           WHERE question_id IN (
             SELECT id FROM quiz_questions WHERE quiz_id = ?
           )`,
          quizId,
        );

        query.run(
          `DELETE FROM quiz_questions WHERE quiz_id = ?`,
          quizId,
        );

        query.run(
          `UPDATE quizzes
           SET description = ?, pass_percent = ?, quiz_type = ?
           WHERE id = ?`,
          quiz.description || null,
          quiz.pass ?? 60,
          quizType,
          quizId,
        );
      }

      for (const [questionIndex, question] of quiz.questions.entries()) {
        const insertedQuestion = query.run(
          `INSERT INTO quiz_questions
            (quiz_id, question_text, explanation, order_index)
           VALUES (?, ?, ?, ?)`,
          quizId,
          question.q,
          question.explanation || null,
          questionIndex + 1,
        );

        questionCount += 1;

        for (const [optionIndex, optionText] of question.options.entries()) {
          query.run(
            `INSERT INTO quiz_options
              (question_id, option_text, is_correct, order_index)
             VALUES (?, ?, ?, ?)`,
            insertedQuestion.lastInsertRowid,
            optionText,
            optionIndex === question.correct ? 1 : 0,
            optionIndex + 1,
          );
        }
      }
    }
  });

  return { quizzes: quizCount, questions: questionCount };
}
