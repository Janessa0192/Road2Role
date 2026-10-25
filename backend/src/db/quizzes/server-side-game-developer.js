// Roadmap-specific quiz seed. Keep the topic key aligned with roadmap_topics.
export default {
  "roadmap": "server-side-game-developer",
  "topic": "101-tcp",
  "title": "Server Side Game Developer Fundamentals Quiz",
  "description": "Check your understanding of core concepts in the Server Side Game Developer roadmap.",
  "pass": 60,
  "questions": [
    {
      "q": "Why is server-authoritative game logic important?",
      "explanation": "Authoritative servers reduce cheating by validating state and actions centrally.",
      "options": [
        "The server validates important game state rather than trusting client claims",
        "It guarantees zero network latency",
        "It makes client input unnecessary",
        "It removes the need to handle disconnects"
      ],
      "correct": 0
    },
    {
      "q": "What does TCP provide to an application?",
      "explanation": "TCP provides a reliable ordered byte stream, but not application message boundaries or encryption by itself.",
      "options": [
        "Reliable, ordered byte-stream delivery",
        "Guaranteed low latency with no congestion",
        "Individual message boundaries by default",
        "Encryption automatically in every connection"
      ],
      "correct": 0
    },
    {
      "q": "Why interpolate remote entity positions in a multiplayer game?",
      "explanation": "Interpolation can smooth visual movement between discrete state updates.",
      "options": [
        "To smooth motion between network updates",
        "To remove the need for server simulation",
        "To guarantee identical frames on all clients",
        "To hide all network traffic"
      ],
      "correct": 0
    }
  ]
};
