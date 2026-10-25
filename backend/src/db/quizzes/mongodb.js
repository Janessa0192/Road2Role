// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "mongodb",
  "topic": "100-mongodb-basics",
  "title": "MongoDB Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the MongoDB Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a MongoDB document?",
      "explanation": "MongoDB stores records as BSON documents with fields and values.",
      "options": [
        "A BSON record made of field-value pairs",
        "A relational join constraint only",
        "A Docker container",
        "A CSS stylesheet"
      ],
      "correct": 0
    },
    {
      "q": "What is a MongoDB collection analogous to in a relational database?",
      "explanation": "A collection groups documents, broadly similar to a table grouping rows.",
      "options": [
        "A table-like grouping of records",
        "A single SQL column only",
        "A network socket",
        "A database trigger"
      ],
      "correct": 0
    },
    {
      "q": "Why create an index in MongoDB?",
      "explanation": "Indexes can accelerate matching and sorting but consume storage and affect writes.",
      "options": [
        "To speed up queries that can use the index",
        "To guarantee every write is faster",
        "To remove all storage overhead",
        "To encrypt documents automatically"
      ],
      "correct": 0
    }
  ]
};
