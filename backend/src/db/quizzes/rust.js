// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "rust",
  "topic": "100-introduction",
  "title": "Rust Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Rust Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does Rust’s ownership system primarily help enforce?",
      "explanation": "Ownership and borrowing help prevent many memory errors at compile time.",
      "options": [
        "Memory safety rules without a traditional garbage collector",
        "Automatic database replication",
        "CSS isolation",
        "Unlimited mutable aliases"
      ],
      "correct": 0
    },
    {
      "q": "What does `Result<T, E>` represent in Rust?",
      "explanation": "Result models operations that may succeed with T or fail with E.",
      "options": [
        "Either a successful value of type T or an error of type E",
        "A list that can never be empty",
        "A mutable global variable",
        "A network socket only"
      ],
      "correct": 0
    },
    {
      "q": "What does borrowing with `&T` generally provide?",
      "explanation": "A shared reference borrows a value without taking ownership and normally cannot mutate it.",
      "options": [
        "A shared reference without transferring ownership",
        "An unconditional copy of the entire value",
        "A guarantee that the value is mutable",
        "A way to bypass all lifetime rules"
      ],
      "correct": 0
    }
  ]
};
