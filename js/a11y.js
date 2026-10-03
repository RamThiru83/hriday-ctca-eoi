/* Accessibility preferences (text size, contrast, read-aloud). Only these non-personal display settings are remembered. */
const KEY = 'hriday.prefs.v1';
const DEFAULTS = { size: 0, contrast: false, speak: true, review: false };

export const prefs = { ...DEFAULTS };

function safeGet() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function safeSet(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode: ignore */ } }

export function loadPrefs() {
  const s = safeGet();
  if (Number.isInteger(s.size) && s.size >= 0 && s.size <= 2) prefs.size = s.size;
  if (typeof s.contrast === 'boolean') prefs.contrast = s.contrast;
  else if (window.matchMedia && matchMedia('(prefers-contrast: more)').matches) prefs.contrast = true;
  if (typeof s.speak === 'boolean') prefs.speak = s.speak;
  apply();
}

export function setPref(k, v) {
  prefs[k] = v;
  if (k !== 'review') safeSet({ size: prefs.size, contrast: prefs.contrast, speak: prefs.speak });
  apply();
}

export function apply() {
  const r = document.documentElement;
  r.dataset.size = String(prefs.size);
  r.dataset.contrast = prefs.contrast ? 'high' : 'normal';
  r.dataset.speak = prefs.speak ? 'on' : 'off';
}

/* ------------------------------------------------------------------ read aloud */
export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let speaking = false;

export function stopSpeech() {
  if (speechSupported) speechSynthesis.cancel();
  speaking = false;
}

/** Speak `text`; returns a promise that resolves when finished or cancelled. */
export function speak(text, lang = 'en-IN') {
  if (!speechSupported) return Promise.resolve();
  stopSpeech();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.9;
    u.onend = u.onerror = () => { speaking = false; resolve(); };
    speaking = true;
    speechSynthesis.speak(u);
  });
}
export const isSpeaking = () => speaking;
