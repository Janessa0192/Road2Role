// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "nodejs",
  "topic": "100-nodejs-introduction",
  "title": "Node.js Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Node.js Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is Node.js?",
      "explanation": "Node.js runs JavaScript outside the browser and provides APIs for server-side work.",
      "options": [
        "A JavaScript runtime built on the V8 engine",
        "A Java database driver only",
        "A CSS framework",
        "A cloud object storage service"
      ],
      "correct": 0
    },
    {
      "q": "What is the event loop used for in Node.js?",
      "explanation": "The event loop coordinates asynchronous callbacks and I/O completion.",
      "options": [
        "Coordinate callbacks and asynchronous work without blocking on every I/O operation",
        "Compile HTML into CSS",
        "Guarantee all JavaScript runs in parallel on every core",
        "Store database rows"
      ],
      "correct": 0
    },
    {
      "q": "Why use environment variables for deployment configuration?",
      "explanation": "Environment variables let configuration vary by environment without editing application code.",
      "options": [
        "Keep environment-specific settings out of hard-coded source values",
        "Make secrets safe to commit publicly",
        "Replace all input validation",
        "Guarantee the application cannot crash"
      ],
      "correct": 0
    }
  ]
};
