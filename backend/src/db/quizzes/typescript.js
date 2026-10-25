// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "typescript",
  "topic": "100-typescript",
  "title": "TypeScript Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the TypeScript roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does TypeScript add to JavaScript?",
      "explanation": "TypeScript checks types before runtime and compiles to JavaScript.",
      "options": [
        "A static type system and compile-time checking",
        "A replacement browser engine",
        "A relational database",
        "A guarantee of no runtime errors"
      ],
      "correct": 0
    },
    {
      "q": "What is the purpose of an interface or type alias in TypeScript?",
      "explanation": "Types describe expected structures during type checking, but do not automatically validate runtime data.",
      "options": [
        "Describe the expected shape of values",
        "Encrypt an object at runtime",
        "Create a new browser process",
        "Automatically validate all incoming JSON at runtime"
      ],
      "correct": 0
    },
    {
      "q": "What does a union type such as `string | number` mean?",
      "explanation": "A union allows a value to belong to any one of the listed types.",
      "options": [
        "A value may be a string or a number",
        "A value must be both types simultaneously",
        "A value is always null",
        "A value cannot be used in a function"
      ],
      "correct": 0
    }
  ]
};
