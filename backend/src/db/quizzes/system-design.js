// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "system-design",
  "topic": "100-introduction",
  "title": "System Design Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the System Design roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "Why use a load balancer?",
      "explanation": "Load balancers distribute traffic and can improve availability and capacity.",
      "options": [
        "Distribute incoming requests across multiple backend instances",
        "Store source code instead of a repository",
        "Guarantee that servers never fail",
        "Replace monitoring and alerts"
      ],
      "correct": 0
    },
    {
      "q": "What is caching intended to improve?",
      "explanation": "Caches can reduce latency and backend load, but freshness and invalidation must be managed.",
      "options": [
        "Reduce repeated work or latency by reusing stored results",
        "Guarantee every result is always fresh",
        "Eliminate the need for capacity planning",
        "Make every write strongly consistent automatically"
      ],
      "correct": 0
    },
    {
      "q": "What does horizontal scaling mean?",
      "explanation": "Horizontal scaling increases capacity by adding more instances.",
      "options": [
        "Adding more instances or machines to share workload",
        "Increasing only one machine’s CPU or RAM",
        "Removing replicas",
        "Compressing the database schema"
      ],
      "correct": 0
    }
  ]
};
