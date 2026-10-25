// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "ai-data-scientist",
  "topic": "stats-clt",
  "title": "AI and Data Scientist Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the AI and Data Scientist Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "Which task is a typical example of supervised learning?",
      "explanation": "Supervised learning learns from examples that include target labels or values.",
      "options": [
        "Grouping customers without labels",
        "Predicting house prices from labeled examples",
        "Compressing a file",
        "Sorting a list"
      ],
      "correct": 1
    },
    {
      "q": "Why is a train/test split used when evaluating a model?",
      "explanation": "A held-out test set estimates how well the model generalizes to unseen data.",
      "options": [
        "To make the training dataset larger",
        "To measure performance on data not used for fitting",
        "To remove every outlier automatically",
        "To guarantee perfect accuracy"
      ],
      "correct": 1
    },
    {
      "q": "What does a confusion matrix summarize in classification?",
      "explanation": "A confusion matrix compares predicted labels with actual labels across classes.",
      "options": [
        "Only model training time",
        "Counts of predicted versus actual classes",
        "The number of columns in a dataset",
        "The learning rate schedule"
      ],
      "correct": 1
    }
  ]
};
