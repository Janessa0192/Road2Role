import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { showError } from '../../utils/errors.js';
import { LANGUAGES, speechSupport, createRecognition, useVoices, voicesFor, bestVoice, micErrorMessage } from '../../hooks/useSpeech.js';

// Voice teacher shown under every roadmap.
//   1. pick a topic (or click a box in the diagram) and press Play - the teacher explains it aloud
//   2. pause / skip / change speed / change language at any time
//   3. ask a doubt by voice (mic) or by typing - the teacher answers aloud, then you continue the lesson
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
  const [typed, setTyped] = useState('');
  const [chat, setChat] = useState([]); // [{ role: 'user' | 'assistant', content }]
  const [answerText, setAnswerText] = useState('');
  const [markState, setMarkState] = useState('idle'); // idle | saving | error

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
    setTyped('');
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

  return (
    <div className="vt-card" aria-labelledby="vt-title">
      <div className="vt-head">
        <div>
          <h2 id="vt-title" className="vt-title">
             Voice teacher
          </h2>
          <p className="vt-sub">Don't feel like reading? Pick a topic and let your teacher explain it to you, then ask your doubts out loud.</p>
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
          This browser cannot speak out loud. Please use the latest Chrome, Edge or Safari. You can still read the lesson text below.
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

      <div className="vt-stage" aria-live="polite">
        <p className="vt-topic">{lesson?.title || topic?.title}</p>
        <p className={`vt-caption${caption ? '' : ' empty'}`}>
          {caption || (busy ? '…' : 'Press “Start lesson” and I will teach this topic step by step.')}
        </p>
        {segments.length > 0 && (
          <div className="vt-bar" aria-hidden="true">
            <div className="vt-bar-fill" style={{ width: `${Math.round(((idx + (status === 'done' ? 1 : 0)) / segments.length) * 100)}%` }}></div>
          </div>
        )}
      </div>

      <div className="vt-controls">
        <button type="button" className="vt-btn" onClick={() => goTopic(-1)} disabled={busy || order <= 0} aria-label="Previous topic" title="Previous topic">
          ⏮
        </button>
        <button type="button" className="vt-btn" onClick={() => jump(idx - 1)} disabled={!lesson || busy || streaming} aria-label="Previous part" title="Previous part">
          ◀
        </button>

        {speaking ? (
          <button type="button" className="quiz-button" onClick={pause}>
            ⏸ Pause
          </button>
        ) : status === 'paused' ? (
          <button type="button" className="quiz-button" onClick={answerText ? continueLesson : resume}>
            ▶ Continue
          </button>
        ) : (
          <button
            type="button"
            className="quiz-button"
            disabled={busy || lessonStreaming || status === 'listening'}
            onClick={() => play()}
          >
            {status === 'loading'
              ? 'Preparing…'
              : !support.tts
                ? ' Show lesson'
                : status === 'done'
                  ? '↻ Replay lesson'
                  : '▶ Start lesson'}
          </button>
        )}

        <button type="button" className="vt-btn" onClick={() => jump(idx + 1)} disabled={!lesson || busy || streaming || idx >= segments.length - 1} aria-label="Next part" title="Next part">
          ▶
        </button>
        <button type="button" className="vt-btn" onClick={() => goTopic(1)} disabled={busy || order < 0 || order >= topics.length - 1} aria-label="Next topic" title="Next topic">
          ⏭
        </button>
        <button type="button" className="vt-btn" onClick={stop} disabled={status === 'idle'} aria-label="Stop" title="Stop">
          ⏹
        </button>
      </div>

      {status === 'done' && (
        <div className="vt-done">
          <span> That was “{lesson?.title}”. Any doubts? Ask below, or move on.</span>
          <div className="vt-done-actions">
            {onMarkDone && !isDone && (
              <button type="button" className="vt-btn wide" onClick={markDone} disabled={markState === 'saving'}>
                {markState === 'saving' ? 'Saving…' : '✓ Mark topic completed'}
              </button>
            )}
            {isDone && <span className="vt-ok">✓ Completed</span>}
            {order >= 0 && order < topics.length - 1 && (
              <button type="button" className="vt-btn wide" onClick={() => goTopic(1, true)}>
                Teach next topic →
              </button>
            )}
          </div>
          {markState === 'error' && <p className="field-error">Could not save your progress. Please try again.</p>}
        </div>
      )}

      <div className="vt-ask">
        <div className="vt-ask-row">
          {support.stt && (
            <button
              type="button"
              className={`vt-mic${status === 'listening' ? ' on' : ''}`}
              onClick={status === 'listening' ? stopListening : listen}
              disabled={busy || lessonStreaming}
              aria-pressed={status === 'listening'}
            >
              🎤 {status === 'listening' ? 'Tap when you are done' : 'Ask a doubt'}
            </button>
          )}
          <form
            className="vt-type"
            onSubmit={(e) => {
              e.preventDefault();
              ask(typed);
            }}
          >
            <input
              type="text"
              value={typed}
              maxLength={500}
              placeholder={support.stt ? 'or type your doubt here…' : 'Type your doubt here…'}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy || lessonStreaming || status === 'listening'}
              aria-label="Type your doubt"
            />
            <button type="submit" className="vt-btn wide" disabled={busy || lessonStreaming || status === 'listening' || typed.trim().length < 2}>
              Ask
            </button>
          </form>
        </div>
        {!support.stt && <p className="res-note">Voice questions need Chrome, Edge or Safari. You can type your doubt instead.</p>}
        {heard && status === 'listening' && <p className="vt-heard">“{heard}”</p>}

        {chat.length > 0 && (
          <ul className="vt-chat" aria-label="Your doubts and the teacher's answers">
            {chat.slice(-6).map((m, i) => (
              <li key={i} className={m.role}>
                <strong>{m.role === 'user' ? 'You' : 'Teacher'}:</strong> {m.content}
              </li>
            ))}
          </ul>
        )}

        {needLogin && (
          <p className="field-error" role="alert">
            Please <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`}>sign in</Link> to ask the teacher your doubts.
          </p>
        )}
      </div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      {lesson?.mode === 'basic' && (
        <p className="res-note">Basic mode: the teacher is reading this topic's notes aloud. Smart explanations and doubt-solving switch on when the site owner adds an AI key.</p>
      )}

      {segments.length > 0 && (
        <details className="vt-transcript">
          <summary>Show lesson text</summary>
          <ol>
            {segments.map((s, i) => (
              <li key={i} className={i === idx ? 'now' : ''}>
                <button type="button" onClick={() => playFrom(i)} disabled={streaming}>
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
