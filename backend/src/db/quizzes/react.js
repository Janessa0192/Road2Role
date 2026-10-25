// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "react",
  "topic": "102-components",
  "title": "React Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the React Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a React component?",
      "explanation": "React components compose user interfaces from reusable pieces.",
      "options": [
        "A reusable unit of UI, commonly a function returning elements",
        "A database stored procedure",
        "A CSS file that cannot contain logic",
        "A network protocol"
      ],
      "correct": 0
    },
    {
      "q": "Why should React state be updated through its setter?",
      "explanation": "State setters notify React and allow it to update the rendered UI.",
      "options": [
        "It informs React of the update so rendering can be scheduled correctly",
        "It encrypts the state value",
        "It writes state to a database automatically",
        "It prevents components from rendering"
      ],
      "correct": 0
    },
    {
      "q": "What is the purpose of a `key` when rendering a list?",
      "explanation": "Keys help React identify items when a list changes.",
      "options": [
        "Help React match list items between renders",
        "Set the item’s CSS color",
        "Make an item automatically accessible to every user",
        "Prevent all state updates"
      ],
      "correct": 0
    }
  ]
};
