/**
 * Son de notification de la messagerie.
 * -------------------------------------
 * Un court « ding » à deux notes, synthétisé avec l'API Web Audio : aucun
 * fichier audio à charger, et ça reste discret même sur un smartphone.
 *
 * Deux contraintes des navigateurs imposent la forme de ce module :
 *
 *   - l'audio n'est autorisé qu'après un geste utilisateur : le contexte est
 *     donc créé puis « déverrouillé » au premier clic ou à la première touche
 *     (avant ça, `playMessageSound()` ne fait rien, sans bloquer l'affichage
 *     du message) ;
 *   - une rafale de messages ne doit pas se transformer en carillon : les
 *     sons sont espacés de `THROTTLE_MS`.
 *
 * Tout est best-effort : si l'audio est indisponible (SSR, API absente,
 * contexte verrouillé), `playMessageSound()` retourne simplement `false` —
 * le message reste affiché normalement.
 */

/** Espacement minimal entre deux sons (une rafale de messages = un seul « ding »). */
const THROTTLE_MS = 1200;

let audioContext = null;
let lastPlayedAt = 0;

/** Crée (si besoin) et réveille le contexte audio ; null si l'API est absente. */
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch (e) {
      return null;
    }
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => { /* le prochain geste réessayera */ });
  }
  return audioContext;
}

// Déverrouillage au premier geste utilisateur (les navigateurs ignorent tout
// audio déclenché avant un clic ou une touche).
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { getAudioContext(); }, { passive: true });
  window.addEventListener('keydown', () => { getAudioContext(); });
}

/**
 * Joue le « ding » de message reçu.
 * @returns {boolean} true si le son a effectivement été lancé.
 */
export function playMessageSound() {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return false;
  const context = getAudioContext();
  if (!context || context.state === 'suspended') return false;
  lastPlayedAt = now;

  try {
    const startedAt = context.currentTime;
    // Petit « ding-dong » : E5 puis B5, en sinusoïde, gain doux et décroissant.
    const notes = [
      { frequency: 659.25, offset: 0, duration: 0.18 },
      { frequency: 987.77, offset: 0.13, duration: 0.3 },
    ];
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.0001, startedAt + note.offset);
      gain.gain.exponentialRampToValueAtTime(0.12, startedAt + note.offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + note.offset + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startedAt + note.offset);
      oscillator.stop(startedAt + note.offset + note.duration + 0.05);
    }
    return true;
  } catch (e) {
    return false; // l'audio est un plus, jamais une raison de casser la messagerie
  }
}
