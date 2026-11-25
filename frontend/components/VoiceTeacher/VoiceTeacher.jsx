import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';
import RobotClassroom from './RobotClassroom.jsx';
import InterviewMode from './InterviewMode.jsx';
import { LANGUAGES, speechSupport, createRecognition, useVoices, voicesFor, bestVoice, micErrorMessage } from '../../hooks/useSpeech.js';

// Voice teacher shown under every roadmap. The card is only a launcher:
//   - pick topic / language / speed / voice here, then open the robot classroom or interview practice
//   - this component owns the lesson, the doubts and the speech; RobotClassroom.jsx (the full-screen
//     robot with subtitles, player buttons and doubts) and InterviewMode.jsx only show its state
//   - in the classroom: pause / skip parts / ask a doubt by voice or typing, then continue the lesson
// Speaking and listening use the browser's Web Speech API; the server only writes what to say (/teacher/*).

const RATES = [0.8, 1, 1.2, 1.5];
const PREF_KEY = 'r2r.teacher';

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return {
      lang: LANGUAGES[p.lang] ? p.lang : 'en',
      rate: RATES.includes(p.rate) ? p.rate : 1,
      voiceURI: typeof p.voiceURI === 'string' ? p.voiceURI : '',
    };
  } catch {
    return { lang: 'en', rate: 1, voiceURI: '' };
  }
}

export default function VoiceTeacher({ slug, topics, openRequest, doneKeys, onMarkDone }) {
  const support = useMemo(() => speechSupport(), []);
  const voices = useVoices();
  const prefs = useMemo(loadPrefs, []);

  const [topicKey, setTopicKey] = useState(() => topics[0]?.key || '');
  const [lang, setLang] = useState(prefs.lang);
  const [rate, setRate] = useState(prefs.rate);
  const [voiceURI, setVoiceURI] = useState(prefs.voiceURI);

  // lesson: { title, mode, segments } ; status: idle | loading | speaking | paused | done | listening | thinking
  const [lesson, setLesson] = useState(null);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('idle');
  const [lessonStreaming, setLessonStreaming] = useState(false);
  const [error, setError] = useState('');
  const [needLogin, setNeedLogin] = useState(false);

  const [heard, setHeard] = useState('');
  const [chat, setChat] = useState([]); // [{ role: 'user' | 'assistant', content }]
  const [answerText, setAnswerText] = useState('');
  const [markState, setMarkState] = useState('idle'); // idle | saving | error
  const [classroomOpen, setClassroomOpen] = useState(false); // full-screen robot classroom
  const [interviewOpen, setInterviewOpen] = useState(false); // full-screen mock interview
  const [nowSpeaking, setNowSpeaking] = useState(''); // the piece being spoken right now (for subtitles)

  // refs let the speaking loop see the latest settings without restarting
  const runRef = useRef(0); // bumped on every play/stop so stale utterance callbacks are ignored
  const rateRef = useRef(rate);
  const voiceRef = useRef(null);
  const langRef = useRef(lang);
  const lessonCache = useRef(new Map());
  const recRef = useRef(null);
  const streamControllerRef = useRef(null);
  const streamQueueRef = useRef([]);
  const streamCurrentRef = useRef(null);
  const streamModeRef = useRef(false);
  const streamPausedRef = useRef(false);
  const streamSpeakingRef = useRef(false);
  const streamDoneRef = useRef(false);
  const streamFinishRef = useRef(null);
  const resumeAtRef = useRef(0); // segment to continue from after a doubt
  const topicRef = useRef(topicKey);

  const synth = support.tts ? window.speechSynthesis : null;
  const voiceList = useMemo(() => voicesFor(voices, lang), [voices, lang]);
  const voice = useMemo(() => bestVoice(voices, lang, voiceURI), [voices, lang, voiceURI]);

  useEffect(() => {
    rateRef.current = rate;
    voiceRef.current = voice;
    langRef.current = lang;
    topicRef.current = topicKey;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ lang, rate, voiceURI }));
    } catch {
      /* storage unavailable */
    }
  }, [rate, voice, lang, voiceURI, topicKey]);

  const stopAll = useCallback(() => {
    runRef.current += 1;
    streamControllerRef.current?.abort();
    streamControllerRef.current = null;
    streamQueueRef.current = [];
    streamCurrentRef.current = null;
    streamModeRef.current = false;
    streamPausedRef.current = false;
    streamSpeakingRef.current = false;
    streamDoneRef.current = false;
    streamFinishRef.current = null;
    synth?.cancel();
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* already stopped */
      }
      recRef.current = null;
    }
  }, [synth]);

  // leaving the page must silence the teacher
  useEffect(() => stopAll, [stopAll]);

  // clicking a box in the roadmap diagram selects that topic for the teacher
  // (openRequest is { key, n } and changes on every click, even on the same box)
  useEffect(() => {
    const key = openRequest?.key;
    if (key && key !== topicRef.current && topics.some((t) => t.key === key)) changeTopic(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  /* ---- speaking loop ------------------------------------------------------------------ */
  // Speaks segments[start..] one after another, calling onFinish at the end.
  // `track` = true for the lesson (updates the highlighted segment), false for a doubt's answer.
  const speak = useCallback(
    (segments, start, { track, onFinish }) => {
      if (!synth) return;
      const run = ++runRef.current;
      synth.cancel();

      const step = (i) => {
        if (run !== runRef.current) return;
        if (i >= segments.length) {
          onFinish?.();
          return;
        }
        if (track) setIdx(i);
        setNowSpeaking(segments[i]);
        setStatus('speaking');

        const u = new SpeechSynthesisUtterance(segments[i]);
        u.lang = LANGUAGES[langRef.current].speak;
        if (voiceRef.current) u.voice = voiceRef.current;
        u.rate = rateRef.current;
        u.onend = () => step(i + 1);
        u.onerror = (e) => {
          if (run !== runRef.current) return;
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          step(i + 1); // skip a piece the voice could not read instead of getting stuck
        };
        // a short delay after cancel() avoids dropped utterances in Chrome
        setTimeout(() => run === runRef.current && synth.speak(u), 30);
      };
      step(start);
    },
    [synth],
  );

  const drainStreamQueue = useCallback(
    (run = runRef.current) => {
      if (!synth || run !== runRef.current || streamPausedRef.current || streamSpeakingRef.current) return;
      const next = streamQueueRef.current.shift();
      if (!next) {
        if (streamDoneRef.current) {
          streamModeRef.current = false;
          const finish = streamFinishRef.current;
          streamFinishRef.current = null;
          finish?.();
        }
        return;
      }

      streamCurrentRef.current = next;
      streamSpeakingRef.current = true;
      if (next.track) setIdx(next.index);
      setNowSpeaking(next.text);
      setStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(next.text);
      utterance.lang = LANGUAGES[langRef.current].speak;
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = rateRef.current;
      utterance.onend = () => {
        if (run !== runRef.current) return;
        streamCurrentRef.current = null;
        streamSpeakingRef.current = false;
        drainStreamQueue(run);
      };
      utterance.onerror = (event) => {
        if (run !== runRef.current) return;
        streamCurrentRef.current = null;
        streamSpeakingRef.current = false;
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        drainStreamQueue(run);
      };
      synth.speak(utterance);
    },
    [synth],
  );

  function beginStreamSpeech(onFinish) {
    streamQueueRef.current = [];
    streamCurrentRef.current = null;
    streamModeRef.current = true;
    streamPausedRef.current = false;
    streamSpeakingRef.current = false;
    streamDoneRef.current = false;
    streamFinishRef.current = onFinish;
  }

  function queueStreamSegment(text, track, index) {
    if (!support.tts) return;
    streamQueueRef.current.push({ text, track, index });
    drainStreamQueue();
  }

  function finishStreamSpeech() {
    streamDoneRef.current = true;
    if (!support.tts) {
      streamModeRef.current = false;
      const finish = streamFinishRef.current;
      streamFinishRef.current = null;
      finish?.();
      return;
    }
    drainStreamQueue();
  }

  const speakLesson = useCallback(
    (l, start) => {
      setAnswerText(''); // back to the lesson, so the caption follows it again
      speak(l.segments, start, { track: true, onFinish: () => setStatus('done') });
    },
    [speak],
  );

  /* ---- lesson loading ----------------------------------------------------------------- */
  async function play(key = topicKey, language = lang) {
    stopAll();
    const run = runRef.current;
    setError('');
    setNeedLogin(false);
    setAnswerText('');
    setHeard('');
    setMarkState('idle');
    setStatus('loading');
    const cacheKey = `${key}|${language}`;
    const cached = lessonCache.current.get(cacheKey);
    if (cached) {
      setLesson(cached);
      setIdx(0);
      if (synth) speakLesson(cached, 0);
      else setStatus('idle');
      return;
    }

    const controller = new AbortController();
    streamControllerRef.current = controller;
    setLessonStreaming(true);
    const segments = [];
    let metadata = null;
    let completed = false;
    beginStreamSpeech(() => setStatus(support.tts ? 'done' : 'idle'));
    try {
      for await (const event of api.stream('/teacher/lesson', {
        query: { roadmap: slug, topic: key, lang: language, stream: true },
        signal: controller.signal,
      })) {
        if (run !== runRef.current) return;
        if (event.type === 'meta') {
          metadata = event.lesson;
          setLesson(metadata);
          setIdx(0);
        } else if (event.type === 'segment') {
          const index = segments.push(event.text) - 1;
          setLesson((current) => current && ({ ...current, segments: [...current.segments, event.text] }));
          queueStreamSegment(event.text, true, index);
        } else if (event.type === 'done') {
          completed = true;
          setLessonStreaming(false);
          if (!metadata) throw new Error('The teacher stream did not include lesson details.');
          const completeLesson = { ...metadata, segments };
          lessonCache.current.set(cacheKey, completeLesson);
          finishStreamSpeech();
        }
      }
      if (!completed && run === runRef.current) throw new Error('The teacher stream ended before the lesson was complete.');
    } catch (e) {
      if (run === runRef.current) {
        stopAll();
        setStatus('idle');
        setError(showError(e, 'Could not load the lesson.'));
      }
    } finally {
      setLessonStreaming(false);
      if (streamControllerRef.current === controller) streamControllerRef.current = null;
    }
  }

  function changeTopic(key) {
    stopAll();
    topicRef.current = key;
    setTopicKey(key);
    setLessonStreaming(false);
    setLesson(null);
    setIdx(0);
    setStatus('idle');
    setError('');
    setAnswerText('');
    setChat([]);
    setMarkState('idle');
  }

  function changeLang(next) {
    const wasActive = status === 'speaking' || status === 'paused';
    stopAll();
    setLang(next);
    setVoiceURI('');
    langRef.current = next;
    setLesson(null);
    setIdx(0);
    setStatus('idle');
    if (wasActive) play(topicKey, next);
  }

  /* ---- transport controls ------------------------------------------------------------- */
  function pause() {
    if (streamModeRef.current) {
      streamPausedRef.current = true;
      if (streamCurrentRef.current) {
        streamQueueRef.current.unshift(streamCurrentRef.current);
        streamCurrentRef.current = null;
      }
      streamSpeakingRef.current = false;
      synth?.cancel();
      setStatus('paused');
      return;
    }
    // cancel + remember the place; works the same in every browser (native pause() is flaky on Android)
    runRef.current += 1;
    synth?.cancel();
    setStatus('paused');
  }
  function resume() {
    if (streamModeRef.current) {
      streamPausedRef.current = false;
      if (streamQueueRef.current.length) drainStreamQueue();
      else if (!streamDoneRef.current) setStatus('loading');
      else drainStreamQueue();
      return;
    }
    if (lesson) speakLesson(lesson, idx);
  }
  function jump(to) {
    if (!lesson || streamModeRef.current) return;
    const i = Math.max(0, Math.min(lesson.segments.length - 1, to));
    setIdx(i);
    if (status === 'speaking') speakLesson(lesson, i);
  }
  function stop() {
    stopAll();
    setLessonStreaming(false);
    setStatus('idle');
    setIdx(0);
  }

  const order = topics.findIndex((t) => t.key === topicKey);
  const goTopic = (delta, autoplay) => {
    const next = topics[order + delta];
    if (!next) return;
    changeTopic(next.key);
    if (autoplay) setTimeout(() => play(next.key, langRef.current), 0);
  };

  /* ---- doubts (voice or typed) -------------------------------------------------------- */
  async function ask(question) {
    const q = question.trim();
    if (!q || lessonStreaming) return;
    resumeAtRef.current = lesson ? idx : 0;
    stopAll();
    const run = runRef.current;
    setError('');
    setNeedLogin(false);
    setHeard('');
    setAnswerText('');
    setStatus('thinking');
    const history = chat.slice(-6);
    setChat((c) => [...c, { role: 'user', content: q }]);
    const controller = new AbortController();
    streamControllerRef.current = controller;
    const segments = [];
    let completed = false;
    beginStreamSpeech(() => setStatus(lesson ? 'paused' : 'idle'));
    try {
      for await (const event of api.stream('/teacher/ask', {
        method: 'POST',
        body: { roadmap: slug, topic: topicKey, question: q, lang, history, stream: true },
        signal: controller.signal,
      })) {
        if (run !== runRef.current) return;
        if (event.type === 'segment') {
          segments.push(event.text);
          setAnswerText((current) => current ? `${current} ${event.text}` : event.text);
          queueStreamSegment(event.text, false, segments.length - 1);
        } else if (event.type === 'done') {
          completed = true;
          const answer = event.answer || segments.join(' ');
          setChat((current) => [...current, { role: 'assistant', content: answer }]);
          setAnswerText(answer);
          finishStreamSpeech();
        }
      }
      if (!completed && run === runRef.current) throw new Error('The teacher stream ended before the answer was complete.');
    } catch (e) {
      if (run === runRef.current) {
        stopAll();
        setStatus(lesson ? 'paused' : 'idle');
        if (e.status === 401) setNeedLogin(true);
        else setError(showError(e, 'The teacher could not answer right now.'));
      }
    } finally {
      if (streamControllerRef.current === controller) streamControllerRef.current = null;
    }
  }

  function listen() {
    const rec = createRecognition();
    if (!rec) return;
    stopAll();
    setError('');
    setHeard('');
    setStatus('listening');
    resumeAtRef.current = lesson ? idx : 0;

    let finalText = '';
    rec.lang = LANGUAGES[lang].listen;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
      setHeard(text);
      if (e.results[e.results.length - 1].isFinal) finalText = text;
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      setError(micErrorMessage(e.error));
    };
    rec.onend = () => {
      if (recRef.current !== rec) return; // aborted on purpose
      recRef.current = null;
      if (finalText) ask(finalText);
      else setStatus(lesson ? 'paused' : 'idle');
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setStatus(lesson ? 'paused' : 'idle');
    }
  }

  function stopListening() {
    const rec = recRef.current;
    if (rec) rec.stop(); // fires onend -> sends whatever was heard
  }

  function continueLesson() {
    if (streamModeRef.current) {
      resume();
      return;
    }
    if (!lesson) return play();
    setAnswerText('');
    speakLesson(lesson, resumeAtRef.current);
  }

  async function markDone() {
    setMarkState('saving');
    try {
      await onMarkDone(topicKey);
      setMarkState('idle');
    } catch {
      setMarkState('error');
    }
  }

  /* ---- render ------------------------------------------------------------------------- */
  const topic = topics.find((t) => t.key === topicKey);
  const busy = status === 'loading' || status === 'thinking';
  const speaking = status === 'speaking';
  const streaming = streamModeRef.current;
  const segments = lesson?.segments || [];
  const caption = answerText || segments[idx] || '';

  function playFrom(i) {
    if (streaming) return;
    setIdx(i);
    if (speaking || status === 'paused') speakLesson(lesson, i);
  }
  const isDone = doneKeys?.has(topicKey);

  function openClassroom() {
    setClassroomOpen(true);
    if (status === 'idle') play(); // the click counts as the gesture the browser needs to start speaking
  }

  // same main button as the normal controls, so the classroom behaves exactly like the card
  const classroomPrimary = speaking
    ? { label: '⏸ Pause', onClick: pause }
    : status === 'paused'
      ? { label: '▶ Continue', onClick: answerText ? continueLesson : resume }
      : {
          label: status === 'loading' ? 'Preparing…' : !support.tts ? 'Show lesson' : status === 'done' ? '↻ Replay lesson' : '▶ Start lesson',
          onClick: () => play(),
          disabled: busy || lessonStreaming || status === 'listening',
        };
  const lastQuestion = [...chat].reverse().find((m) => m.role === 'user')?.content || '';

  return (
    <div className="vt-card" aria-labelledby="vt-title">
      <div className="vt-head">
        <div>
          <h2 id="vt-title" className="vt-title">
            Voice teacher
          </h2>
          <p className="vt-sub">Don't feel like reading? Pick a topic and let the robot teacher explain it to you, then ask your doubts out loud.</p>
        </div>
        <span className={`vt-pill${speaking ? ' live' : ''}`} aria-live="polite">
          {status === 'speaking' && (lessonStreaming ? 'Preparing next part…' : 'Speaking…')}
          {status === 'listening' && 'Listening…'}
          {status === 'thinking' && 'Thinking…'}
          {status === 'loading' && 'Preparing…'}
          {status === 'paused' && 'Paused'}
          {status === 'done' && 'Lesson finished'}
          {status === 'idle' && 'Ready'}
        </span>
      </div>

      {!support.tts && (
        <p className="field-error" role="alert">
          This browser cannot speak out loud. Please use the latest Chrome, Edge or Safari. You can still read the lesson text in the classroom.
        </p>
      )}

      <div className="vt-row">
        <label className="vt-field vt-grow">
          Topic
          <select value={topicKey} onChange={(e) => changeTopic(e.target.value)}>
            {topics.map((t) => (
              <option key={t.key} value={t.key}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="vt-field">
          Language
          <select value={lang} onChange={(e) => changeLang(e.target.value)}>
            {Object.entries(LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="vt-field">
          Speed
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
        </label>
        {voiceList.length > 1 && (
          <label className="vt-field">
            Voice
            <select value={voice?.voiceURI || ''} onChange={(e) => setVoiceURI(e.target.value)}>
              {voiceList.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {support.tts && voices.length > 0 && !voiceList.length && (
        <p className="res-note">
          No {LANGUAGES[lang].label} voice is installed on this device, so the browser's default voice will be used. Try Hinglish or English, or install a Hindi voice in your system settings.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.4rem' }}>
        <button type="button" className="quiz-button" onClick={openClassroom}>
          🤖 {status === 'idle' || status === 'done' ? 'Start with the robot teacher' : 'Back to the robot teacher'}
        </button>
        <button
          type="button"
          className="vt-btn wide"
          onClick={() => {
            stop(); // the teacher goes quiet while you practise
            setInterviewOpen(true);
          }}
        >
          🎙️ Interview practice
        </button>
      </div>
      <p className="res-note">The robot teaches the lesson with subtitles and answers your doubts. Interview practice asks you questions for a role and gives you feedback.</p>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <RobotClassroom
        open={classroomOpen}
        status={status}
        topicTitle={lesson?.title || topic?.title}
        nowSpeaking={nowSpeaking}
        caption={caption}
        heard={heard}
        lastQuestion={lastQuestion}
        progress={segments.length > 0 ? Math.round(((idx + (status === 'done' ? 1 : 0)) / segments.length) * 100) : null}
        support={support}
        busy={busy || lessonStreaming}
        primary={classroomPrimary}
        hasNext={order >= 0 && order < topics.length - 1}
        lessonMode={lesson?.mode}
        error={error}
        needLogin={needLogin}
        onClose={() => setClassroomOpen(false)}
        onStop={stop}
        onListen={listen}
        onStopListening={stopListening}
        onAsk={ask}
        onNext={() => goTopic(1, true)}
        segments={segments}
        idx={idx}
        streaming={streaming}
        chat={chat}
        canPrevPart={!!lesson && !busy && !streaming && idx > 0}
        canNextPart={!!lesson && !busy && !streaming && idx < segments.length - 1}
        canPrevTopic={order > 0}
        canNextTopic={order >= 0 && order < topics.length - 1}
        onPrevPart={() => jump(idx - 1)}
        onNextPart={() => jump(idx + 1)}
        onPrevTopic={() => goTopic(-1)}
        onNextTopic={() => goTopic(1)}
        onPlayFrom={playFrom}
        isDone={!!isDone}
        canMarkDone={!!onMarkDone && !isDone}
        markState={markState}
        onMarkDone={markDone}
      />

      <InterviewMode open={interviewOpen} slug={slug} onClose={() => setInterviewOpen(false)} />
    </div>
  );
}
