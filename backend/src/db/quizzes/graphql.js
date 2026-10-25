// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "graphql",
  "topic": "100-graphql-introduction",
  "title": "GraphQL Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the GraphQL roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a GraphQL schema used for?",
      "explanation": "A GraphQL schema defines the types and operations clients can request.",
      "options": [
        "Describe available types and operations in an API",
        "Store image files on disk",
        "Define CSS animations",
        "Replace database backups"
      ],
      "correct": 0
    },
    {
      "q": "What is a GraphQL query generally used to do?",
      "explanation": "Queries request data, while mutations are used for changes.",
      "options": [
        "Read requested fields from the API",
        "Modify data in every case",
        "Compile TypeScript",
        "Configure TLS certificates"
      ],
      "correct": 0
    },
    {
      "q": "Why can GraphQL reduce over-fetching?",
      "explanation": "A query can select particular fields, limiting unnecessary response data.",
      "options": [
        "Clients can request the specific fields they need",
        "Every query always returns the entire database",
        "It disables authorization",
        "It guarantees fewer network requests in every design"
      ],
      "correct": 0
    }
  ]
};
