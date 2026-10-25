// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "docker",
  "topic": "100-introduction",
  "title": "Docker Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Docker Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a Docker image?",
      "explanation": "An image packages filesystem layers and metadata used to create containers.",
      "options": [
        "A template used to create containers",
        "A running process by definition",
        "A physical server",
        "A database query"
      ],
      "correct": 0
    },
    {
      "q": "What is the purpose of a Dockerfile?",
      "explanation": "A Dockerfile specifies instructions used by the image build process.",
      "options": [
        "Describe steps to build an image",
        "List browser bookmarks",
        "Define SQL table relationships only",
        "Store a container’s runtime logs permanently"
      ],
      "correct": 0
    },
    {
      "q": "Why use a non-root user in a container when practical?",
      "explanation": "Running with fewer privileges limits potential damage if an application is compromised.",
      "options": [
        "To reduce the impact of a process compromise",
        "To make the image run without an operating system",
        "To disable all networking automatically",
        "To guarantee zero vulnerabilities"
      ],
      "correct": 0
    }
  ]
};
