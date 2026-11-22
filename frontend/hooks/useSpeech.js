import { useEffect, useState } from 'react';

/**
 * Browser speech helpers for the voice teacher (Web Speech API, no API key, no cost).
 *   - speaking  -> speechSynthesis   (Chrome, Edge, Safari, Firefox)
 *   - listening -> SpeechRecognition (Chrome, Edge, Safari; NOT Firefox)
 * Chrome/Edge send the microphone audio to the browser vendor's server for recognition.
 */

export const LANGUAGES = {
  en: { label: 'English', speak: 'en-IN', listen: 'en-IN', voicePrefix: 'en' },
  hi: { label: 'हिन्दी (Hindi)', speak: 'hi-IN', listen: 'hi-IN', voicePrefix: 'hi' },
  // Hindi written in the English alphabet is read best by an English (India) voice
  hinglish: { label: 'Hinglish', speak: 'en-IN', listen: 'en-IN', voicePrefix: 'en' },
};

export function speechSupport() {
  if (typeof window === 'undefined') return { tts: false, stt: false };
  return {
    tts: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    stt: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
}

export function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

/** Voices load asynchronously in most browsers. */
export function useVoices() {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    if (!speechSupport().tts) return undefined;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);
  return voices;
}

const sameLang = (v, prefix) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix);

/** Voices that can read the given teaching language. */
export function voicesFor(voices, langKey) {
  const { voicePrefix } = LANGUAGES[langKey];
  return voices.filter((v) => sameLang(v, voicePrefix));
}

/** The chosen voice if it still exists, otherwise the nicest-sounding match for the language. */
export function bestVoice(voices, langKey, voiceURI) {
  const list = voicesFor(voices, langKey);
  if (!list.length) return null;
  const chosen = voiceURI && list.find((v) => v.voiceURI === voiceURI);
  if (chosen) return chosen;
  const target = LANGUAGES[langKey].speak.toLowerCase();
  const score = (v) =>
    (v.lang.toLowerCase().replace('_', '-') === target ? 4 : 0) + (/google|natural|neural|online/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  return [...list].sort((a, b) => score(b) - score(a))[0];
}

/** Splits an answer into sentence-sized pieces so it can be spoken (and paused) piece by piece. */
export function splitSentences(text, maxLen = 240) {
  const parts = String(text).match(/[^.!?।\n]+[.!?।]?/g)?.map((s) => s.trim()).filter(Boolean) || [];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur + ' ' + p).length > maxLen) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur} ${p}` : p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Friendly message for a SpeechRecognition error code. */
export function micErrorMessage(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone is blocked. Allow microphone access in your browser (lock icon near the address bar) and try again.';
    case 'no-speech':
      return "I couldn't hear anything. Tap the mic and speak again.";
    case 'audio-capture':
      return 'No microphone was found on this device.';
    case 'network':
      return 'Voice recognition needs an internet connection. You can type your doubt instead.';
    default:
      return "Couldn't catch that. You can try again or type your doubt.";
  }
}
