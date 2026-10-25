// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "postgresql-dba",
  "topic": "101-introduction",
  "title": "PostgreSQL DBA Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the PostgreSQL DBA roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a PostgreSQL transaction expected to provide?",
      "explanation": "Transactions support ACID behavior, including atomicity and consistency under defined conditions.",
      "options": [
        "Atomicity and other ACID properties when used correctly",
        "Automatic deletion of duplicate business records",
        "A guarantee that all queries are fast",
        "A replacement for backups"
      ],
      "correct": 0
    },
    {
      "q": "What does `EXPLAIN ANALYZE` help a DBA inspect?",
      "explanation": "EXPLAIN ANALYZE executes the query and reports actual timing and plan statistics.",
      "options": [
        "The query plan and measured execution behavior",
        "The color theme of the SQL editor",
        "Only table names without execution",
        "A user’s password"
      ],
      "correct": 0
    },
    {
      "q": "Why schedule and test database backups?",
      "explanation": "Backups provide a recovery path and should be tested to verify they can be restored.",
      "options": [
        "To recover data after loss or corruption",
        "To eliminate the need for access control",
        "To guarantee zero downtime for every failure",
        "To make queries use no disk space"
      ],
      "correct": 0
    }
  ]
};
