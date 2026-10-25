// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "mlops",
  "topic": "100-programming-fundamentals",
  "title": "MLOps Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the MLOps Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "Why track machine-learning experiments?",
      "explanation": "Experiment tracking records what was run and its outcomes for comparison and reproducibility.",
      "options": [
        "To compare parameters, data, metrics, and model artifacts reproducibly",
        "To make every model deterministic regardless of hardware",
        "To eliminate model evaluation",
        "To store only UI colors"
      ],
      "correct": 0
    },
    {
      "q": "What is model drift?",
      "explanation": "Drift can make a model less reliable as production data or relationships change.",
      "options": [
        "A change in data or relationships that can degrade model performance over time",
        "A type of database index",
        "A model’s source-code formatting style",
        "A guaranteed increase in accuracy"
      ],
      "correct": 0
    },
    {
      "q": "Why monitor a model after deployment?",
      "explanation": "Monitoring can reveal data changes, errors, latency, and quality issues in production.",
      "options": [
        "Production behavior can differ from offline evaluation",
        "Testing is impossible before deployment",
        "Monitoring automatically fixes every model",
        "Model outputs never change over time"
      ],
      "correct": 0
    }
  ]
};
