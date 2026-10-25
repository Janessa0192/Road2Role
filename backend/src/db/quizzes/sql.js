// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "sql",
  "topic": "100-introduction",
  "title": "SQL Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the SQL Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does a SQL `JOIN` do?",
      "explanation": "JOIN relates rows from tables using a join condition.",
      "options": [
        "Combines rows from tables based on a related condition",
        "Deletes every duplicate automatically",
        "Creates a backup of the database",
        "Encrypts query results"
      ],
      "correct": 0
    },
    {
      "q": "What is a primary key used for?",
      "explanation": "A primary key uniquely identifies each row.",
      "options": [
        "Uniquely identify a row in a table",
        "Allow unlimited duplicate identifiers",
        "Store only long text",
        "Connect to a server without credentials"
      ],
      "correct": 0
    },
    {
      "q": "What does `GROUP BY` commonly enable?",
      "explanation": "GROUP BY forms groups so aggregate functions can calculate per-group results.",
      "options": [
        "Aggregate rows into groups for calculations such as COUNT or SUM",
        "Sort rows alphabetically in every case",
        "Remove all NULL values automatically",
        "Create a new database user"
      ],
      "correct": 0
    }
  ]
};
