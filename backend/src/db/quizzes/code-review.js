// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "code-review",
  "topic": "101-tests",
  "title": "Code Review Pyramid Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Code Review Pyramid roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is the primary goal of code review?",
      "explanation": "Review helps catch defects and improve clarity, design, and consistency.",
      "options": [
        "Find defects and improve maintainability before or during integration",
        "Prove code has no possible bugs",
        "Replace automated tests in every case",
        "Measure monitor brightness"
      ],
      "correct": 0
    },
    {
      "q": "Which review comment is most actionable?",
      "explanation": "Specific comments identify a concern and suggest a concrete improvement.",
      "options": [
        "“This function repeats the same query; could we extract a helper and add a test?”",
        "“Bad code.”",
        "“I dislike this.”",
        "“Rewrite everything”"
      ],
      "correct": 0
    },
    {
      "q": "Why should code reviews focus on small, understandable changes?",
      "explanation": "Smaller changes reduce review complexity and make problems easier to isolate.",
      "options": [
        "They are easier to reason about and verify",
        "They always need no tests",
        "They guarantee no merge conflicts",
        "They remove the need for documentation"
      ],
      "correct": 0
    }
  ]
};
