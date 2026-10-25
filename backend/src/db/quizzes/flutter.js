// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "flutter",
  "topic": "100-dart-basics",
  "title": "Flutter Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Flutter Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is Flutter’s primary UI building block?",
      "explanation": "Flutter interfaces are composed from widgets.",
      "options": [
        "Widget",
        "Servlet",
        "SQL trigger",
        "Docker layer"
      ],
      "correct": 0
    },
    {
      "q": "What does `setState` generally signal in a StatefulWidget?",
      "explanation": "Calling setState notifies Flutter that the widget’s state changed and a rebuild may be needed.",
      "options": [
        "That state changed and the framework should rebuild the widget as needed",
        "That the app must close",
        "That a database table should be dropped",
        "That Dart code should be converted to HTML"
      ],
      "correct": 0
    },
    {
      "q": "What is Dart used for in Flutter projects?",
      "explanation": "Flutter applications are primarily written in Dart.",
      "options": [
        "Writing application logic and UI code",
        "Managing AWS IAM policies only",
        "Replacing Android and iOS operating systems",
        "Designing relational indexes only"
      ],
      "correct": 0
    }
  ]
};
