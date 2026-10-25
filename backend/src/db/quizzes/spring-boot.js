// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "spring-boot",
  "topic": "100-spring-core",
  "title": "Spring Boot Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Spring Boot Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is Spring Boot designed to simplify?",
      "explanation": "Spring Boot reduces setup through auto-configuration and embedded-server support.",
      "options": [
        "Creating stand-alone Spring applications with sensible defaults",
        "Writing CSS animations",
        "Managing only mobile device screens",
        "Replacing Java"
      ],
      "correct": 0
    },
    {
      "q": "What does a Spring bean represent?",
      "explanation": "The Spring container creates and manages beans and their dependencies.",
      "options": [
        "An object managed by the Spring container",
        "A SQL table row only",
        "A Docker image tag",
        "A browser event"
      ],
      "correct": 0
    },
    {
      "q": "Why externalize Spring Boot configuration?",
      "explanation": "Externalized configuration supports environment-specific settings and safer deployment practices.",
      "options": [
        "Allow settings to differ across environments without changing code",
        "Expose all secrets in source control",
        "Disable profile-specific behavior",
        "Remove the need for validation"
      ],
      "correct": 0
    }
  ]
};
