// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "prompt-engineering",
  "topic": "100-basic-llm",
  "title": "Prompt Engineering Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Prompt Engineering Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "Which prompt is more likely to produce a useful structured response?",
      "explanation": "Clear goals, context, constraints, and output expectations reduce ambiguity.",
      "options": [
        "Specify the task, context, constraints, and desired output format",
        "Say only “do something good”",
        "Hide all relevant context",
        "Ask for incompatible outputs simultaneously"
      ],
      "correct": 0
    },
    {
      "q": "Why should important model outputs be validated?",
      "explanation": "Prompting does not eliminate hallucinations or other mistakes, so consequential outputs need checks.",
      "options": [
        "Models can produce plausible-sounding but incorrect information",
        "A prompt guarantees every answer is factual",
        "Validation makes the task slower in every case",
        "Models cannot follow any constraints"
      ],
      "correct": 0
    },
    {
      "q": "What is a useful way to improve a prompt iteratively?",
      "explanation": "Controlled revisions make it easier to identify which instruction improved the output.",
      "options": [
        "Change one unclear instruction and compare the results against a criterion",
        "Add unrelated details each time",
        "Remove the success criteria",
        "Assume the first output is always best"
      ],
      "correct": 0
    }
  ]
};
