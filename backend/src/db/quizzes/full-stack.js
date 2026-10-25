// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "full-stack",
  "topic": "117-restful-apis",
  "title": "Full Stack Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Full Stack Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does full-stack development usually involve?",
      "explanation": "Full-stack work spans frontend interfaces and backend services, often including data storage.",
      "options": [
        "Building both client-side and server-side parts of an application",
        "Only designing logos",
        "Only configuring office hardware",
        "Only writing database backups"
      ],
      "correct": 0
    },
    {
      "q": "Why should a frontend call a backend API instead of connecting directly to a private database?",
      "explanation": "A backend controls access, validates requests, and keeps privileged credentials away from clients.",
      "options": [
        "The backend can enforce authorization and business rules",
        "Browsers can safely store database admin credentials",
        "APIs remove the need for input validation",
        "Direct database access is always faster and safer"
      ],
      "correct": 0
    },
    {
      "q": "What is an integration test useful for?",
      "explanation": "Integration tests exercise interactions between components such as an API and a database.",
      "options": [
        "Checking that multiple components work together",
        "Checking only a single isolated function",
        "Replacing all monitoring",
        "Generating product requirements automatically"
      ],
      "correct": 0
    }
  ]
};
