/**
 * Sons des quizz — tick-tack du minuteur et verdicts de réponse.
 * --------------------------------------------------------------
 * Tout est synthétisé avec l'API Web Audio : aucun fichier audio à livrer,
 * rien à télécharger pendant une partie, et le même rendu sur mobile. Cinq
 * sons, cinq intentions :
 *
 *   - le tick-tack du minuteur (`startQuizClock` / `updateQuizClock`) tourne
 *     en fond pendant la question et **accélère par paliers** quand le temps
 *     restant baisse (`tickIntervalMs`, exposé à part pour être testable sans
 *     navigateur) : une pulsation par seconde au début, puis 620 ms, 340 ms
 *     dès que la barre passe au rouge (3 s, même seuil que `.is-low` côté CSS)
 *     et 220 ms dans la dernière ligne droite, un peu plus fort — le rythme
 *     dit ce que la barre montre ;
 *   - `playQuizAnswerSound(true)` : un accord montant do–mi–sol, la bonne
 *     réponse ;
 *   - `playQuizAnswerSound(false)` : une descente en dents de scie filtrée,
 *     la mauvaise ; `{ timeout: true }` ajoute une note grave quand le
 *     minuteur a expiré — ne pas avoir répondu n'est pas se tromper, le son
 *     le dit aussi ;
 *   - `playQuizComboSound(streak)` : un bip carré joué dès la deuxième bonne
 *     réponse consécutive, dont la note monte avec la série — le son chauffe
 *     comme le compteur 🔥 de la partie ;
 *   - `playQuizResultFanfare(tier)` : la fanfare de l'écran de résultat, à la
 *     hauteur du palier (montée de quatre notes pour la légende, petit « oui »
 *     pour le novice).
 *
 * Mêmes contraintes navigateur que `src/messages/notificationSound.js` :
 * l'audio n'est autorisé qu'après un geste utilisateur (`unlockQuizAudio`
 * ouvre le contexte depuis le clic « Commencer ») et tout est best-effort —
 * sans API Web Audio (SSR, jsdom, navigateur ancien), les fonctions ne font
 * rien et retournent `false` plutôt que de casser la partie. Le module garde
 * son propre contexte : le tick-tack est un son continu, il n'a rien à faire
 * dans le throttle du « ding » de la messagerie, et il a son propre bouton
 * 🔊/🔇 (préférence gardée par appareil, `setQuizSoundEnabled`).
 */

/** Préférence « son des quizz » de l'appareil : `'on'` (défaut) ou `'off'`. */
const PREF_KEY = 'letsplay_quiz_sound_v1';

/**
 * Paliers du tick-tack : part du budget restante → intervalle entre deux
 * battements. Les seuils sont descendants (le premier palier atteint gagne),
 * et `0.2` correspond aux 3 dernières secondes d'une question de 15 s — la
 * barre passe au rouge exactement quand le son s'emballe.
 */
export const TICK_STEPS = [
  { ratio: 0.5, intervalMs: 1000 },
  { ratio: 0.2, intervalMs: 620 },
  { ratio: 0.1, intervalMs: 340 },
  { ratio: 0, intervalMs: 220 },
];

/** Fréquences alternées du « tik » et du « tak » (sol et ré aigus). */
const TICK_FREQUENCIES = [1567.98, 1174.66];

/** Part du budget à partir de laquelle les battements sont plus appuyés. */
const URGENT_RATIO = 0.2;

/**
 * Intervalle entre deux battements pour un temps restant donné.
 * @param {number} remainingMs temps restant sur la question
 * @param {number} totalMs budget total de la question (15 000 ms par défaut)
 * @returns {number} intervalle en millisecondes
 */
export function tickIntervalMs(remainingMs, totalMs) {
  const total = Number(totalMs) > 0 ? Number(totalMs) : 0;
  if (!total) return TICK_STEPS[0].intervalMs;
  const ratio = Math.min(1, Math.max(0, Number(remainingMs) / total));
  const step = TICK_STEPS.find((entry) => ratio > entry.ratio);
  return (step || TICK_STEPS[TICK_STEPS.length - 1]).intervalMs;
}

/* --------------------------------------------------------------- préférence */

/**
 * true si les sons des quizz sont autorisés (défaut : oui). Sans stockage
 * lisible, on reste sur le défaut — l'absence de préférence n'est pas un
 * refus.
 */
export function quizSoundEnabled() {
  try {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(PREF_KEY) !== 'off';
  } catch (e) {
    return true;
  }
}

/**
 * Retient la préférence de l'appareil. Couper le son arrête le tick-tack en
 * cours ; le réactiver rouvre le contexte audio (on est dans le clic du
 * bouton, donc dans le geste utilisateur).
 * @returns {boolean} l'état retenu
 */
export function setQuizSoundEnabled(enabled) {
  const on = Boolean(enabled);
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch (e) { /* stockage refusé : la préférence ne survit pas à la session */ }
  if (on) unlockQuizAudio();
  else stopQuizClock();
  return on;
}

/* ----------------------------------------------------------------- contexte */

let audioContext = null;

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

/**
 * Réveille le contexte pendant un geste utilisateur (clic « Commencer »,
 * bouton son, clic sur une réponse) : le premier battement arrive une seconde
 * plus tard, il doit trouver un contexte déjà ouvert (« Commencer » n'est pas
 * dans la même tâche que le battement).
 *
 * Contrairement à `notificationSound`, le module n'écoute pas tous les gestes
 * du site : un visiteur qui ne joue pas de quizz n'ouvre aucun contexte audio.
 * Le lecteur appelle donc `unlockQuizAudio()` depuis ses propres clics.
 * @returns {boolean} true si un contexte audio est disponible
 */
export function unlockQuizAudio() {
  return Boolean(getAudioContext());
}

/* ------------------------------------------------------------------- notes */

/**
 * Pose une note sur le contexte : oscillateur + enveloppe courte, avec un
 * filtre passe-bas optionnel (il adoucit les dents de scie du « raté »).
 * @returns {object|null} l'oscillateur programmé
 */
function scheduleNote(context, { frequency, offset = 0, duration = 0.2, type = 'sine', gain = 0.1, attack = 0.012, filter = 0 }) {
  const at = context.currentTime + offset;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  // Attaque très rapide puis décroissance exponentielle : un « clic » net
  // pour les battements, une note douce pour les verdicts. Le gain part
  // d'une valeur non nulle (exponentialRamp interdit le zéro).
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(envelope);
  let tail = envelope;
  if (filter) {
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(filter, at);
    envelope.connect(lowpass);
    tail = lowpass;
  }
  tail.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.05);
  return oscillator;
}

/** Un battement de l'horloge : alternance « tik » / « tak », appuyé si urgent. */
function playTick(urgent) {
  const context = getAudioContext();
  if (!context || context.state === 'suspended') return false;
  const beat = clock ? clock.beat : 0;
  if (clock) clock.beat += 1;
  try {
    scheduleNote(context, {
      frequency: TICK_FREQUENCIES[beat % TICK_FREQUENCIES.length],
      duration: 0.045,
      attack: 0.004,
      type: 'triangle',
      gain: urgent ? 0.085 : 0.05,
    });
    return true;
  } catch (e) {
    return false; // l'audio est un plus, jamais une raison de casser la partie
  }
}

/**
 * Joue le verdict d'une réponse.
 * @param {boolean} correct bonne réponse (accord montant) ou raté (descente)
 * @param {{ timeout?: boolean }} options `timeout` ajoute la note grave du
 *   temps écoulé — la question n'a pas reçu de réponse.
 * @returns {boolean} true si le son a effectivement été lancé
 */
export function playQuizAnswerSound(correct, { timeout = false } = {}) {
  if (!quizSoundEnabled()) return false;
  const context = getAudioContext();
  if (!context || context.state === 'suspended') return false;
  try {
    if (correct) {
      // Do–mi–sol montant : court, clair, positif.
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        scheduleNote(context, { frequency, offset: index * 0.07, duration: 0.22, type: 'sine', gain: 0.11 });
      });
      return true;
    }
    // Descente en dents de scie, filtrée : franchement négatif, jamais agressif.
    [233.08, 174.61].forEach((frequency, index) => {
      scheduleNote(context, { frequency, offset: index * 0.13, duration: 0.3, type: 'sawtooth', gain: 0.09, filter: 900 });
    });
    if (timeout) {
      scheduleNote(context, { frequency: 116.54, offset: 0.3, duration: 0.5, type: 'sawtooth', gain: 0.08, filter: 700 });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Bip de combo : joué dès la deuxième bonne réponse consécutive, la fréquence
 * monte avec la série — le son « chauffe » comme le compteur 🔥 de la partie.
 * @param {number} streak série de bonnes réponses, celle-ci comprise
 * @returns {boolean} true si le son a effectivement été lancé
 */
export function playQuizComboSound(streak) {
  if (!quizSoundEnabled()) return false;
  const context = getAudioContext();
  if (!context || context.state === 'suspended') return false;
  try {
    const step = Math.max(0, Math.min(Math.floor(streak) - 2, 8));
    scheduleNote(context, {
      frequency: 659.25 + step * 78.4, // mi5 au combo ×2, montant de tierce à tierce
      duration: 0.09,
      attack: 0.005,
      type: 'square',
      gain: 0.05,
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Fanfare de l'écran de résultat : à la hauteur du palier — montée de quatre
 * notes pour `legend`, accord de trois pour `veteran`, petit « oui » en deux
 * notes pour `player` et `rookie`.
 * @param {string} tier palier de la partie (`resultTier`)
 * @returns {boolean} true si le son a effectivement été lancé
 */
export function playQuizResultFanfare(tier) {
  if (!quizSoundEnabled()) return false;
  const context = getAudioContext();
  if (!context || context.state === 'suspended') return false;
  try {
    if (tier === 'legend') {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        scheduleNote(context, { frequency, offset: index * 0.12, duration: 0.32, type: 'sine', gain: 0.12 });
      });
    } else if (tier === 'veteran') {
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        scheduleNote(context, { frequency, offset: index * 0.1, duration: 0.28, type: 'sine', gain: 0.1 });
      });
    } else {
      [392, 523.25].forEach((frequency, index) => {
        scheduleNote(context, { frequency, offset: index * 0.12, duration: 0.26, type: 'triangle', gain: 0.08 });
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ horloge */

/** Horloge en cours : `{ totalMs, remainingMs, beat, dueAt, timer }`. */
let clock = null;

/** Programme le prochain battement (ou reprend le rythme après un silence). */
function scheduleTick(delay = null) {
  if (!clock) return;
  const wait = delay === null ? tickIntervalMs(clock.remainingMs, clock.totalMs) : delay;
  clock.dueAt = Date.now() + wait;
  clock.timer = setTimeout(onTick, wait);
}

/**
 * Onglet réellement passé en arrière-plan ? On teste `visibilityState`
 * plutôt que `document.hidden` : jsdom (harnais de vérification) se déclare en
 * `'prerender'`, donc « caché » au sens de la spécification, alors qu'un
 * onglet de navigateur en arrière-plan est bien `'hidden'`.
 */
function tabHidden() {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'hidden';
}

/** Un battement : le son (sauf onglet caché) puis la reprogrammation. */
function onTick() {
  if (!clock) return;
  clock.timer = null;
  const urgent = clock.remainingMs <= clock.totalMs * URGENT_RATIO;
  // Onglet en arrière-plan : on garde le rythme mais on ne joue rien — un
  // carillon sorti d'un onglet caché serait plus gênant qu'utile.
  if (!tabHidden()) playTick(urgent);
  // Son coupé entre-temps : l'horloge s'arrête, `updateQuizClock` la relance
  // au prochain rafraîchissement (100 ms) si l'utilisateur réactive.
  if (quizSoundEnabled()) scheduleTick();
}

/**
 * Démarre le tick-tack d'une question. Idempotent : une horloge déjà en cours
 * est remplacée (changement de question, remontage de composant).
 * @param {number} totalMs budget de la question (15 000 ms par défaut)
 */
export function startQuizClock(totalMs) {
  stopQuizClock();
  const total = Number(totalMs) > 0 ? Number(totalMs) : 1;
  clock = { totalMs: total, remainingMs: total, beat: 0, dueAt: 0, timer: null };
  if (quizSoundEnabled()) scheduleTick();
  return true;
}

/**
 * Donne le temps restant à l'horloge (appelé à chaque rafraîchissement du
 * minuteur React). Dès qu'un palier plus rapide est franchi, le battement en
 * attente est reprogrammé : l'accélération s'entend à l'instant où la barre
 * franchit le seuil, pas au battement suivant. Et si le son vient d'être
 * rallumé en pleine question, l'horloge repart d'ici, avec le temps restant
 * réel (pas un budget complet).
 * @returns {boolean} true si l'horloge tourne
 */
export function updateQuizClock(remainingMs, totalMs) {
  const left = Math.max(0, Number(remainingMs) || 0);
  const total = Number(totalMs) > 0 ? Number(totalMs) : left;
  const enabled = quizSoundEnabled();
  if (!clock) {
    if (!enabled) return false;
    startQuizClock(total);
  }
  clock.totalMs = total;
  clock.remainingMs = left;
  if (!enabled) return false;
  const interval = tickIntervalMs(left, total);
  if (!clock.timer || clock.dueAt - Date.now() > interval) {
    if (clock.timer) clearTimeout(clock.timer);
    scheduleTick(interval);
  }
  return true;
}

/**
 * Arrête le tick-tack (fin de question, de partie, ou démontage).
 * @returns {boolean} true si une horloge tournait
 */
export function stopQuizClock() {
  if (!clock) return false;
  if (clock.timer) clearTimeout(clock.timer);
  clock = null;
  return true;
}
