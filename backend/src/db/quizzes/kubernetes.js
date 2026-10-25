// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "kubernetes",
  "topic": "100-kubernetes-introduction",
  "title": "Kubernetes Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Kubernetes Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is a Kubernetes Pod?",
      "explanation": "A Pod groups containers that share network and storage context.",
      "options": [
        "The smallest deployable unit that can contain one or more containers",
        "A cloud billing account",
        "A Dockerfile instruction",
        "A database index"
      ],
      "correct": 0
    },
    {
      "q": "What does a Kubernetes Deployment help manage?",
      "explanation": "A Deployment manages ReplicaSets and supports declarative updates for workloads.",
      "options": [
        "Desired replicas and rolling updates for stateless workloads",
        "DNS registration for every domain on the internet",
        "Only local source files",
        "Manual SSH sessions"
      ],
      "correct": 0
    },
    {
      "q": "What is a Kubernetes Service commonly used for?",
      "explanation": "A Service gives a stable way to reach matching Pods despite changing Pod addresses.",
      "options": [
        "Provide a stable network endpoint for a set of Pods",
        "Build container images from source",
        "Replace container runtimes",
        "Store application source code"
      ],
      "correct": 0
    }
  ]
};
