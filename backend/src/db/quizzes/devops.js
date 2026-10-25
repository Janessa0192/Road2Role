// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "devops",
  "topic": "112-ci-cd",
  "title": "DevOps Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the DevOps Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a key goal of CI/CD?",
      "explanation": "CI/CD automates repeatable checks and release steps to make delivery more reliable.",
      "options": [
        "Automate integration, checks, and delivery or deployment steps",
        "Prevent developers from using version control",
        "Manually copy every build to production",
        "Replace monitoring"
      ],
      "correct": 0
    },
    {
      "q": "Why use infrastructure as code?",
      "explanation": "Infrastructure as code makes infrastructure changes reviewable, repeatable, and automatable.",
      "options": [
        "Define and reproduce infrastructure through versioned configuration",
        "Store production passwords in public repositories",
        "Avoid change review",
        "Make infrastructure impossible to test"
      ],
      "correct": 0
    },
    {
      "q": "What is observability commonly built from?",
      "explanation": "Logs, metrics, and traces reveal different aspects of system behavior.",
      "options": [
        "Logs, metrics, and traces",
        "Only screenshots",
        "Only source-code comments",
        "Only deployment names"
      ],
      "correct": 0
    }
  ]
};
