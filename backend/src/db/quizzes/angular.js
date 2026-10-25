// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "angular",
  "topic": "102-angular-basics",
  "title": "Angular Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Angular Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is an Angular component primarily responsible for?",
      "explanation": "Angular components define UI pieces using a class, template, and component metadata.",
      "options": [
        "Combining a template, class, and metadata for a UI part",
        "Managing a relational database server",
        "Compiling a Linux kernel",
        "Replacing HTTP"
      ],
      "correct": 0
    },
    {
      "q": "What does dependency injection help Angular do?",
      "explanation": "Dependency injection supplies dependencies instead of requiring classes to construct them directly.",
      "options": [
        "Provide required services to classes",
        "Turn HTML into SQL",
        "Disable change detection permanently",
        "Store passwords in source code"
      ],
      "correct": 0
    },
    {
      "q": "Which syntax commonly binds a component property to an element property in Angular templates?",
      "explanation": "Angular property binding uses square brackets around the target property.",
      "options": [
        "[property]",
        "{property}",
        "@property() only",
        "SELECT property"
      ],
      "correct": 0
    }
  ]
};
