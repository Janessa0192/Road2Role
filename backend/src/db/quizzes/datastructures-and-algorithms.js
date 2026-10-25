// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "datastructures-and-algorithms",
  "topic": "103-basic-data-structures",
  "title": "Data Structures & Algorithms Roadmap Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Data Structures & Algorithms Roadmap roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is the average time complexity of binary search on a sorted array?",
      "explanation": "Binary search halves the remaining search interval at each step.",
      "options": [
        "O(log n)",
        "O(n²)",
        "O(1) for every input",
        "O(2ⁿ)"
      ],
      "correct": 0
    },
    {
      "q": "Which data structure is commonly used for breadth-first search?",
      "explanation": "BFS processes vertices in discovery order using a queue.",
      "options": [
        "Queue",
        "Stack only",
        "Heap only",
        "Hash function"
      ],
      "correct": 0
    },
    {
      "q": "Why is a hash table useful?",
      "explanation": "Hash tables commonly provide average O(1) lookup, though worst-case performance can be worse.",
      "options": [
        "It supports average-case fast key lookup",
        "It keeps all keys sorted automatically",
        "It guarantees constant time in every worst case",
        "It can only store integers"
      ],
      "correct": 0
    }
  ]
};
