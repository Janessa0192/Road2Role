// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "qa",
  "topic": "100-qa-basics",
  "title": "QA Engineer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the QA Engineer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "What is the purpose of a regression test?",
      "explanation": "Regression tests detect unintended breakage caused by later changes.",
      "options": [
        "Check that previously working behavior still works after changes",
        "Test only a feature that has never existed",
        "Measure monitor color accuracy",
        "Replace all exploratory testing"
      ],
      "correct": 0
    },
    {
      "q": "What makes a good bug report?",
      "explanation": "Clear reproduction details help others confirm and diagnose the issue.",
      "options": [
        "Reproduction steps, expected and actual results, and relevant environment details",
        "Only the word “broken”",
        "A personal opinion without evidence",
        "A screenshot with no description in every case"
      ],
      "correct": 0
    },
    {
      "q": "What is the difference between severity and priority?",
      "explanation": "Severity reflects how serious the defect is; priority guides when it should be addressed.",
      "options": [
        "Severity describes impact; priority describes urgency or order of fixing",
        "They always mean exactly the same thing",
        "Priority measures CPU usage only",
        "Severity is chosen by the compiler"
      ],
      "correct": 0
    }
  ]
};
