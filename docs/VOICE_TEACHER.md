# Voice teacher

Every roadmap page has a **Voice teacher** panel under the diagram. The learner picks a topic (or clicks a box in the
diagram), presses *Start lesson*, and the teacher explains the topic out loud. They can pause, skip, change speed or
language, and ask doubts by voice or by typing.

## How it works

| Part | Where | Job |
|------|-------|-----|
| Speaking + listening | browser (Web Speech API) | free, no key. `speechSynthesis` speaks, `SpeechRecognition` listens |
| `GET /api/v1/teacher/lesson?stream=true` | `backend/src/routes/v1/teacher.js` | streams short lesson segments as soon as they are generated |
| `POST /api/v1/teacher/ask` | same file | streams an answer to a doubt (login + AI key required) |
| AI API client | `backend/src/services/llm.js` | Groq/Gemini/Anthropic fetch wrapper with streaming and provider failover |
| UI | `frontend/components/VoiceTeacher/VoiceTeacher.jsx`, `frontend/hooks/useSpeech.js`, `components/voice-teacher.css` | |

### Two modes

* **basic** (no AI provider key): the teacher reads the topic's own notes aloud. Works out of the box, costs nothing.
* **ai** (`GROQ_API_KEY`, `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY` set in `backend/.env`): the topic is taught like a tutor (analogy, example, common mistakes, recap) in
  English, Hindi (Devanagari) or Hinglish, and doubts are answered.

Groq is selected by default when its key is configured; Gemini and Anthropic keys can be kept as backups. During rate limits, provider outages, or temporary network failures, requests automatically try the next configured provider. No provider can guarantee uninterrupted availability, and fallback requires another valid provider key.
Create a Groq key at <https://console.groq.com/keys> and set `GROQ_API_KEY` in `backend/.env`. Keep API keys server-side; never add them to frontend code or commit `.env`.

Generated lessons are cached in memory (`TEACHER_LESSON_TTL`), so one topic costs one AI call per language, not one per learner. AI lessons and doubt answers stream sentence-sized chunks to the browser, and speech starts before the full response is generated. The teacher requests shorter responses to reduce generation time and stops upstream generation when a learner stops or leaves the page.

## Run it

```
cd backend && npm install && cp .env.example .env     # add GROQ_API_KEY (and Gemini backup key) for AI mode
npm start
cd ../frontend && npm install && npm run dev         # http://localhost:5173
```

## Browser notes

* Speaking works in Chrome, Edge, Safari and Firefox. Listening (mic) works in Chrome, Edge and Safari, not Firefox; the typed box is the fallback.
* Chrome/Edge send microphone audio to Google/Microsoft for recognition, so it needs internet.
* Hindi speech needs a Hindi voice installed on the device (most Android and Windows 11 machines have one). Hinglish uses the English (India) voice.
* The mic only works on `https://` or `http://localhost`. In production the server must send `Permissions-Policy: microphone=(self)` (already set in `backend/src/app.js`).

## Next step: quiz chatbot

`services/llm.js` and the `/teacher` route pattern are meant to be reused: the chatbot will be another router
(`/api/v1/chatbot`) that checks the user's completed topics (`/me/progress/:slug`), asks the model to write questions from
those topics, and stores/grades them through the existing quiz tables.
