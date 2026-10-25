// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "cpp",
  "topic": "100-introduction",
  "title": "C++ Developer Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the C++ Developer Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What does RAII in C++ connect resource management to?",
      "explanation": "RAII acquires resources during initialization and releases them when the object is destroyed.",
      "options": [
        "Object lifetime and constructors/destructors",
        "HTML rendering",
        "Network routing tables only",
        "Garbage collection in Java"
      ],
      "correct": 0
    },
    {
      "q": "What is the main difference between a pointer and a reference in C++?",
      "explanation": "References behave as aliases, while pointers are objects that store addresses and can be reassigned.",
      "options": [
        "A reference is an alias that must be initialized; a pointer stores an address and can be reseated",
        "A pointer cannot hold an address",
        "References always allocate on the heap",
        "There is no difference in any context"
      ],
      "correct": 0
    },
    {
      "q": "What does `const` on a member function indicate?",
      "explanation": "A const member function cannot modify ordinary data members through `this`.",
      "options": [
        "The function promises not to modify the object’s non-mutable state",
        "The function runs at compile time only",
        "The function is private automatically",
        "The function deletes the object"
      ],
      "correct": 0
    }
  ]
};
