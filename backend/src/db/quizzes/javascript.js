// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "javascript",
  "topic": "100-javascript-introduction",
  "title": "JavaScript Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the JavaScript Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does `const` prevent in JavaScript?",
      "explanation": "A const binding cannot be reassigned, though referenced objects may still be mutable.",
      "options": [
        "Reassigning the binding to a different value",
        "Mutating every object stored in the binding",
        "Calling functions",
        "Reading properties"
      ],
      "correct": 0
    },
    {
      "q": "What does `Promise.all()` do when all supplied promises fulfill?",
      "explanation": "Promise.all fulfills with results in input order when all input promises fulfill.",
      "options": [
        "Fulfill with an array of their results in input order",
        "Return only the slowest promise’s result",
        "Convert all values to strings",
        "Run synchronous code in a new thread"
      ],
      "correct": 0
    },
    {
      "q": "Which method adds one or more items to the end of an array?",
      "explanation": "push() appends items and returns the new array length.",
      "options": [
        "push()",
        "pop()",
        "shift()",
        "slice()"
      ],
      "correct": 0
    }
  ]
};
