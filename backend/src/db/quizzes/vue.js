// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "vue",
  "topic": "100-fundamental-topics",
  "title": "Vue Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Vue Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a Vue component?",
      "explanation": "Vue components package reusable interface structure and behavior.",
      "options": [
        "A reusable UI unit with its own template and behavior",
        "A SQL query plan",
        "A container runtime",
        "A Java bytecode file"
      ],
      "correct": 0
    },
    {
      "q": "What does Vue’s reactivity system do?",
      "explanation": "Vue tracks reactive dependencies so affected parts of the UI can update when state changes.",
      "options": [
        "Track relevant state changes and update dependent UI",
        "Encrypt every variable automatically",
        "Replace the browser DOM",
        "Guarantee API responses are valid"
      ],
      "correct": 0
    },
    {
      "q": "What is a Vue directive such as `v-if` used for?",
      "explanation": "`v-if` conditionally renders template content based on an expression.",
      "options": [
        "Apply reactive behavior to template elements",
        "Create a database transaction",
        "Set HTTP response headers on the server",
        "Compile a Docker image"
      ],
      "correct": 0
    }
  ]
};
