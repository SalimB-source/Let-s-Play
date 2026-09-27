/**
 * Sons des appels vocaux / vidéo.
 * ------------------------------
 * Comme le « ding » de la messagerie (`notificationSound.js`), tout est
 * synthétisé avec l'API Web Audio : aucun fichier à charger, et le silence
 * reste la règle quand l'audio est indisponible (SSR, API absente, contexte
 * encore verrouillé avant le premier geste du joueur).
 *
 * Trois sons, tous best-effort :
 *
 *   - **sonnerie entrante** (`startRingtone`) : motif de deux notes répété
 *     jusqu'à ce que le joueur réponde, refuse ou que l'appel expire ;
 *   - **tonalité d'appel sortant** (`startRingback`) : bip discret, l'espace
 *     d'une vraie sonnerie, tant que ça sonne chez l'ami ;
 *   - deux accents courts : connexion établie (`playConnectTone`) et appel
 *     terminé (`playEndTone`).
 *
 * Les fonctions en boucle renvoient une fonction `stop()` — toujours appelée,
 * y compris quand la phase d'appel change sous les pieds du son.
 */
import { getAudioContext } from './notificationSound';

/** Période de la sonnerie entrante (deux notes + silence, comme un téléphone). */
const RING_PERIOD_MS = 2000;
/** Période de la tonalité d'appel sortant. */
const RINGBACK_PERIOD_MS = 3000;

/** Petit utilitaire : une note sinus avec attaque et relâchement doux. */
function tone(context, { frequency, at = 0, duration = 0.2, gain = 0.08, type = 'sine' }) {
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const amp = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(amp);
  amp.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** Le contexte audio est-il prêt à jouer ? (sinon : silence poli) */
function playable() {
  if (typeof window === 'undefined') return null;
  const context = getAudioContext();
  if (!context || context.state === 'suspended') return null;
  return context;
}

/**
 * Lance un motif joué en boucle ; renvoie `stop()`. La première itération
 * sonne tout de suite, les suivantes suivent `periodMs`.
 */
function loop(periodMs, pattern) {
  const context = playable();
  if (!context) return () => {};
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const fresh = playable();
    if (fresh) {
      try { pattern(fresh); } catch (e) { /* l'audio est un plus, jamais une erreur */ }
    }
    timer = setTimeout(tick, periodMs);
  };
  let timer = setTimeout(tick, 0);
  return () => { stopped = true; clearTimeout(timer); };
}

/** Sonnerie d'un appel entrant : motif « dring-dring » régulier. */
export function startRingtone() {
  return loop(RING_PERIOD_MS, (context) => {
    tone(context, { frequency: 830, duration: 0.32, gain: 0.1 });
    tone(context, { frequency: 830, at: 0.42, duration: 0.32, gain: 0.1 });
  });
}

/** Tonalité d'un appel sortant : un bip grave et court à chaque période. */
export function startRingback() {
  return loop(RINGBACK_PERIOD_MS, (context) => {
    tone(context, { frequency: 415, duration: 0.5, gain: 0.045, type: 'triangle' });
  });
}

/** Connexion établie : petite montée en deux notes. */
export function playConnectTone() {
  const context = playable();
  if (!context) return false;
  try {
    tone(context, { frequency: 523.25, duration: 0.12, gain: 0.07 });
    tone(context, { frequency: 783.99, at: 0.12, duration: 0.2, gain: 0.07 });
    return true;
  } catch (e) {
    return false;
  }
}

/** Fin d'appel : deux notes descendantes, discrètes. */
export function playEndTone() {
  const context = playable();
  if (!context) return false;
  try {
    tone(context, { frequency: 493.88, duration: 0.14, gain: 0.06 });
    tone(context, { frequency: 329.63, at: 0.14, duration: 0.26, gain: 0.06 });
    return true;
  } catch (e) {
    return false;
  }
}
