// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "golang",
  "topic": "100-go-basics",
  "title": "Go Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Go Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a goroutine in Go?",
      "explanation": "Goroutines provide lightweight concurrency managed by the Go runtime.",
      "options": [
        "A lightweight concurrent function managed by the Go runtime",
        "A SQL table",
        "A browser CSS rule",
        "A type of container image"
      ],
      "correct": 0
    },
    {
      "q": "What does a Go channel help with?",
      "explanation": "Channels provide typed communication and synchronization between goroutines.",
      "options": [
        "Communicating values between goroutines",
        "Styling HTML elements",
        "Creating database indexes",
        "Compiling only C++ code"
      ],
      "correct": 0
    },
    {
      "q": "How does Go commonly report errors?",
      "explanation": "Go functions often return an explicit error value for the caller to inspect.",
      "options": [
        "By returning an error value that callers check",
        "By throwing every error as a checked exception",
        "By ignoring all failures",
        "By using CSS classes"
      ],
      "correct": 0
    }
  ]
};
