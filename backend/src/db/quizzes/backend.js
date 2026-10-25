// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "backend",
  "topic": "109-apis",
  "title": "Backend Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Backend Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is the main responsibility of a backend service?",
      "explanation": "Backend services implement server-side logic and commonly interact with databases.",
      "options": [
        "Handle application logic, data access, and server-side requests",
        "Style buttons in the browser",
        "Render only static icons",
        "Replace the client network connection"
      ],
      "correct": 0
    },
    {
      "q": "Why should an API validate incoming input?",
      "explanation": "Validation checks that incoming data meets expected rules before use.",
      "options": [
        "To reject malformed or unsafe data before processing",
        "To guarantee that the client never has bugs",
        "To remove the need for authentication",
        "To make every request public"
      ],
      "correct": 0
    },
    {
      "q": "What does a database index generally improve?",
      "explanation": "Indexes can speed up lookups, though they add storage and write overhead.",
      "options": [
        "Lookup performance for suitable queries",
        "The correctness of every SQL statement automatically",
        "The size of every table by reducing it to zero",
        "Network encryption"
      ],
      "correct": 0
    }
  ]
};
