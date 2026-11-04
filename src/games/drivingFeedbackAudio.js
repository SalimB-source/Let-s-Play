const SOUND_KEY = 'letsplay_vice_city_rush_sound_v1';

// Compare simulation transitions, not React renders: each event plays only once.
export function drivingFeedbackEvent(previous, next) {
  if (!previous || previous.status !== 'active' || !next) return null;
  if (next.faults.length > previous.faults.length) return 'error';
  if (next.checkpoint > previous.checkpoint) return 'success';
  return null;
}

export function createDrivingFeedbackAudio({
  createContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return AudioContext ? new AudioContext() : null;
  },
  isEnabled = () => {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
  },
} = {}) {
  let context = null;
  function unlock() {
    try {
      context ||= createContext();
      if (context?.state === 'suspended') context.resume()?.catch(() => {});
    } catch { /* Audio is optional: exercises must remain playable. */ }
  }
  function play(event) {
    if (!['success', 'error'].includes(event) || !isEnabled()) return;
    try {
      if (!context || context.state !== 'running') return;
      const now = context.currentTime;
      // Gentle rising chime for validation; short descending low notes for errors.
      const notes = event === 'success' ? [659.25, 880] : [220, 164.81];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = now + index * .12, duration = .18;
        oscillator.type = event === 'success' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.09, start + .015);
        gain.gain.exponentialRampToValueAtTime(.001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start); oscillator.stop(start + duration + .02);
      });
    } catch { /* Unsupported/closed audio must never interrupt telemetry. */ }
  }
  function dispose() {
    try { context?.close()?.catch(() => {}); } catch { /* already closed */ }
    context = null;
  }
  return { unlock, play, dispose };
}
