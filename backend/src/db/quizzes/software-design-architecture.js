// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "software-design-architecture",
  "topic": "100-clean-code-principles",
  "title": "Software Design and Architecture Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Software Design and Architecture roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does the Single Responsibility Principle encourage?",
      "explanation": "The principle encourages each module to have one focused responsibility.",
      "options": [
        "A module should have one coherent reason to change",
        "Every class should contain only one line",
        "All functionality should be placed in one class",
        "Classes must never call other classes"
      ],
      "correct": 0
    },
    {
      "q": "Why favor composition over inheritance when appropriate?",
      "explanation": "Composition can make behavior easier to combine and change without deep inheritance chains.",
      "options": [
        "It can combine behavior with fewer rigid class hierarchies",
        "It prevents code reuse",
        "It guarantees no dependencies",
        "It eliminates interfaces"
      ],
      "correct": 0
    },
    {
      "q": "What is the purpose of an architectural pattern?",
      "explanation": "Patterns describe recurring structures and trade-offs, not universal solutions.",
      "options": [
        "Provide a reusable high-level structure for recurring design problems",
        "Replace all detailed design and testing",
        "Guarantee the same solution fits every system",
        "Specify only variable naming"
      ],
      "correct": 0
    }
  ]
};
