/**
 * Signature sonore — « Le Sablier ».
 *
 * Les sons restent synthétisés en WebAudio (aucun asset, aucun téléchargement),
 * mais la palette quitte les bips rétro : transitoires feutrés, glissés de
 * hauteur, cloches à partiels et une réverbération courte donnent aux cartes,
 * au métal et au sable une présence plus cinématique.
 *
 * Deux couches :
 *  - `hz()` et `rpgSfx()` décrivent des événements purs, faciles à tester ;
 *  - `RpgAudioPlayer` ne s'éveille qu'après un geste joueur, ménage les pics
 *    de volume et se tait si WebAudio manque ou si le joueur coupe le son.
 */

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MASTER_VOLUME = 0.22;
const REVERB_SECONDS = 0.68;
const REVERB_RETURN = 0.16;
const MIN_GAIN = 0.0001;
const CARD_PLACE_SAMPLE_URL = new URL('./assets/card-place.wav', import.meta.url);
const CARD_DRAW_SAMPLE_URL = new URL('./assets/card-draw.wav', import.meta.url);
const ATTACKERS_CONFIRM_SAMPLE_URL = new URL('./assets/attackers-confirm.mp3', import.meta.url);
const PLAYER_ATTACK_HIT_SAMPLE_URL = new URL('./assets/player-attack-hit.wav', import.meta.url);
const FLAME_GUST_SAMPLE_URL = new URL('./assets/flame-gust.wav', import.meta.url);
const WATER_WAVE_SAMPLE_URL = new URL('./assets/water-wave.wav', import.meta.url);
const CARD_COUNTERED_SAMPLE_URL = new URL('./assets/card-countered.wav', import.meta.url);
const BLOCK_IMPACT_SAMPLE_URL = new URL('./assets/block-impact.mp3', import.meta.url);
const DESTRUCTION_HIT_SAMPLE_URL = new URL('./assets/destruction-hit.mp3', import.meta.url);
const PAGE_TURN_SAMPLE_URL = new URL('./assets/page-turn.mp3', import.meta.url);
const CARD_PLACE_VOLUME = 0.62;
const CARD_DRAW_VOLUME = 0.52;
const ATTACKERS_CONFIRM_VOLUME = 0.58;
const PLAYER_ATTACK_HIT_VOLUME = 0.64;
const FLAME_GUST_VOLUME = 0.56;
const WATER_WAVE_VOLUME = 0.58;
const CARD_COUNTERED_VOLUME = 0.6;
const BLOCK_IMPACT_VOLUME = 0.58;
const DESTRUCTION_HIT_VOLUME = 0.6;
const PAGE_TURN_VOLUME = 0.5;

/** « A4 » → 440 Hz ; accepte # et b. */
export function hz(note) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!match) return 0;
  const base = SEMITONES[match[1]];
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const midi = 12 * (Number(match[3]) + 1) + base + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
}

const tone = (wave, note, at, dur, g = 0.5, options = {}) => ({
  kind: 'tone', w: wave, n: note, wave, note, at, dur, g, ...options,
});
const thud = (at, dur, g = 0.7, options = {}) => ({ kind: 'thud', at, dur, g, ...options });
const noise = (at, dur, g = 0.4, options = {}) => ({ kind: 'noise', at, dur, g, ...options });
const bell = (note, at, dur, g = 0.5, options = {}) => ({ kind: 'bell', n: note, note, at, dur, g, ...options });

/** Toutes les séquences nommées sont jouables par le lecteur et couvertes par les tests. */
export const RPG_SFX_NAMES = Object.freeze([
  'apparition', 'victoire', 'defaite', 'whoosh', 'hit', 'heal', 'zone', 'bell', 'blip', 'explore', 'souffle',
  'tour', 'phase', 'annonce', 'pass', 'terrain_pose', 'terrain_tap', 'mana',
  'creature', 'magie', 'pioche', 'destruction', 'burn', 'soin_long', 'bouclier',
  'attaque_declaree', 'attaque_confirmee', 'blocage', 'choc_lames', 'combat', 'degats', 'degats_sorcier', 'coup_rapide', 'impact',
  'contresort', 'card_place', 'card_draw', 'attackers_confirm', 'player_attack_hit', 'flame_gust', 'water_wave', 'card_countered', 'block_impact', 'destruction_hit', 'page_turn', 'menu', 'select', 'erreur', 'pile', 'annuler', 'hover',
]);

/**
 * Séquences des actions du duel. Les options sont des nuances de synthèse :
 * `slideTo` fait glisser la note, `filter` façonne sa matière, `pan` ouvre la
 * stéréo et `send` dose la réverbération. Aucun son n'est un bip carré brut.
 */
export function rpgSfx(name) {
  switch (name) {
    // Arpège d'arrivée, souffle aspiré et éclat d'Astrolabe.
    case 'apparition':
      return [
        noise(0, 0.42, 0.13, { filterType: 'bandpass', filter: 1500, filterTo: 360, q: 0.8, attack: 0.035, send: 0.34, pan: -0.22 }),
        tone('sine', 'D3', 0, 0.55, 0.2, { slideTo: 'D4', filter: 1100, filterTo: 1800, attack: 0.045, send: 0.24 }),
        tone('triangle', 'A4', 0.14, 0.46, 0.13, { filter: 2600, filterTo: 3800, attack: 0.035, pan: 0.12 }),
        bell('D5', 0.26, 0.95, 0.22, { send: 0.42, pan: 0.18 }),
      ];
    case 'victoire':
      return [
        tone('triangle', 'C4', 0, 0.42, 0.19, { attack: 0.025, filter: 1900, send: 0.18, pan: -0.12 }),
        tone('sine', 'E4', 0.045, 0.44, 0.15, { attack: 0.03, send: 0.2 }),
        tone('triangle', 'G4', 0.12, 0.5, 0.16, { attack: 0.03, filter: 2500, send: 0.23, pan: 0.12 }),
        tone('sine', 'C5', 0.2, 0.66, 0.16, { attack: 0.035, send: 0.27 }),
        bell('G5', 0.28, 1.15, 0.22, { send: 0.44, pan: 0.12 }),
      ];
    case 'defaite':
      return [
        tone('sine', 'A4', 0, 0.48, 0.22, { slideTo: 'G4', filter: 1500, attack: 0.09, send: 0.2 }),
        tone('triangle', 'F4', 0.28, 0.55, 0.19, { slideTo: 'E4', filter: 1050, attack: 0.1, send: 0.18 }),
        tone('sine', 'D4', 0.58, 0.8, 0.2, { slideTo: 'C4', filter: 850, attack: 0.12, send: 0.24 }),
      ];
    case 'whoosh':
      return [
        noise(0, 0.27, 0.23, { filterType: 'bandpass', filter: 6200, filterTo: 720, q: 0.65, attack: 0.01, send: 0.16, pan: -0.18 }),
        tone('sine', 'A4', 0, 0.24, 0.1, { slideTo: 'D3', filter: 1250, filterTo: 480, attack: 0.02, send: 0.12, pan: 0.15 }),
      ];
    case 'hit':
      return [
        thud(0, 0.23, 0.72, { from: 150, to: 42, filter: 460, send: 0.09 }),
        noise(0, 0.11, 0.2, { filterType: 'lowpass', filter: 3400, filterTo: 850, attack: 0.002, send: 0.08 }),
      ];
    case 'heal':
      return [
        tone('sine', 'C5', 0, 0.34, 0.16, { slideTo: 'E5', attack: 0.035, send: 0.26, pan: -0.12 }),
        bell('E5', 0.12, 0.78, 0.16, { send: 0.38, pan: 0.08 }),
        tone('triangle', 'G5', 0.25, 0.46, 0.12, { filter: 3000, attack: 0.045, send: 0.27, pan: 0.14 }),
      ];
    case 'zone':
      return [
        thud(0, 0.38, 0.66, { from: 125, to: 34, filter: 360, send: 0.13 }),
        tone('sawtooth', 'A2', 0.015, 0.42, 0.12, { slideTo: 'E2', filter: 520, filterTo: 220, attack: 0.04, send: 0.17 }),
        noise(0.015, 0.31, 0.17, { filterType: 'lowpass', filter: 2200, filterTo: 420, attack: 0.012, send: 0.18, pan: 0.08 }),
        bell('E5', 0.1, 0.72, 0.08, { send: 0.42, pan: -0.12 }),
      ];
    case 'bell':
      return [bell('A5', 0, 1.1, 0.36, { send: 0.46 }), bell('E5', 0.025, 0.9, 0.17, { send: 0.4, pan: 0.08 })];
    case 'blip':
      return [tone('sine', 'B4', 0, 0.085, 0.13, { attack: 0.003, filter: 2100, send: 0.05 })];
    case 'explore':
      return [
        tone('triangle', 'G4', 0, 0.22, 0.16, { filter: 1800, attack: 0.025, send: 0.18, pan: -0.1 }),
        tone('sine', 'A4', 0.15, 0.24, 0.15, { attack: 0.03, send: 0.2 }),
        bell('D5', 0.3, 0.62, 0.15, { send: 0.34, pan: 0.12 }),
      ];
    case 'souffle':
      return [noise(0, 0.38, 0.24, { filterType: 'bandpass', filter: 2800, filterTo: 620, q: 0.7, attack: 0.08, send: 0.25, pan: -0.12 })];

    // ── Plateau & tours ──────────────────────────────────────────────
    case 'tour':
      return [
        bell('C6', 0, 0.92, 0.22, { send: 0.4, pan: 0.08 }),
        tone('triangle', 'G4', 0.025, 0.4, 0.14, { filter: 1700, attack: 0.045, send: 0.18, pan: -0.08 }),
      ];
    case 'phase':
      return [
        tone('sine', 'G4', 0, 0.12, 0.15, { attack: 0.004, filter: 1500, send: 0.08 }),
        tone('triangle', 'D5', 0.075, 0.17, 0.13, { attack: 0.008, filter: 2100, send: 0.1, pan: 0.08 }),
      ];
    case 'annonce':
      return [
        tone('triangle', 'D4', 0, 0.16, 0.15, { filter: 1700, send: 0.12, pan: -0.12 }),
        tone('triangle', 'A4', 0.075, 0.19, 0.14, { filter: 2200, send: 0.14 }),
        tone('sine', 'D5', 0.16, 0.32, 0.13, { send: 0.18, pan: 0.12 }),
        bell('A5', 0.2, 0.66, 0.13, { send: 0.36 }),
      ];
    case 'pass':
      return [
        noise(0, 0.2, 0.14, { filterType: 'lowpass', filter: 1800, filterTo: 320, attack: 0.015, send: 0.12 }),
        tone('sine', 'A3', 0, 0.32, 0.14, { slideTo: 'E3', filter: 600, attack: 0.06, send: 0.16 }),
      ];

    // ── Mana & terrains ──────────────────────────────────────────────
    case 'terrain_pose':
      return [
        thud(0, 0.24, 0.56, { from: 108, to: 43, filter: 390, send: 0.1 }),
        tone('sine', 'C3', 0.02, 0.38, 0.19, { slideTo: 'G3', attack: 0.045, filter: 620, send: 0.2, pan: -0.08 }),
        noise(0.01, 0.16, 0.11, { filterType: 'lowpass', filter: 1500, filterTo: 500, attack: 0.004, send: 0.1, pan: 0.08 }),
      ];
    case 'terrain_tap':
      return [
        tone('sine', 'B4', 0, 0.1, 0.12, { attack: 0.003, filter: 2100, send: 0.08 }),
        tone('triangle', 'E3', 0, 0.2, 0.17, { filter: 740, attack: 0.015, send: 0.12, pan: -0.08 }),
      ];
    case 'mana':
      return [
        tone('sine', 'A3', 0, 0.2, 0.16, { slideTo: 'E4', attack: 0.025, filter: 1100, send: 0.16 }),
        bell('A5', 0.075, 0.48, 0.1, { send: 0.32, pan: 0.1 }),
      ];

    // ── Cartes ───────────────────────────────────────────────────────
    case 'creature':
      return [
        noise(0, 0.16, 0.16, { filterType: 'lowpass', filter: 2100, filterTo: 760, attack: 0.008, send: 0.12, pan: -0.12 }),
        thud(0.025, 0.28, 0.44, { from: 118, to: 39, filter: 410, send: 0.1 }),
        tone('triangle', 'C4', 0.07, 0.2, 0.15, { filter: 1400, send: 0.12 }),
        tone('sine', 'G4', 0.2, 0.42, 0.13, { filter: 2100, attack: 0.03, send: 0.2, pan: 0.12 }),
      ];
    case 'magie':
      return [
        noise(0, 0.24, 0.1, { filterType: 'bandpass', filter: 3600, filterTo: 900, q: 0.8, attack: 0.03, send: 0.2, pan: -0.16 }),
        bell('D5', 0.025, 0.86, 0.2, { send: 0.4 }),
        tone('sine', 'A4', 0.11, 0.37, 0.15, { slideTo: 'D5', attack: 0.04, send: 0.22, pan: 0.14 }),
        tone('triangle', 'F#5', 0.2, 0.4, 0.11, { filter: 2600, attack: 0.045, send: 0.3 }),
      ];
    case 'pioche':
      return [
        noise(0, 0.11, 0.12, { filterType: 'bandpass', filter: 3000, filterTo: 1200, q: 1.1, attack: 0.003, send: 0.08, pan: -0.1 }),
        tone('triangle', 'G5', 0, 0.1, 0.12, { attack: 0.004, filter: 2800, send: 0.08 }),
        tone('sine', 'D6', 0.06, 0.18, 0.1, { attack: 0.006, send: 0.14, pan: 0.1 }),
      ];
    case 'destruction':
      return [
        noise(0, 0.39, 0.25, { filterType: 'lowpass', filter: 2600, filterTo: 360, attack: 0.008, send: 0.2 }),
        thud(0.045, 0.3, 0.54, { from: 122, to: 34, filter: 380, send: 0.14 }),
        tone('sawtooth', 'G2', 0.02, 0.34, 0.12, { slideTo: 'D2', filter: 390, filterTo: 180, attack: 0.02, send: 0.16, pan: 0.1 }),
      ];
    case 'burn':
      return [
        thud(0, 0.27, 0.48, { from: 125, to: 38, filter: 410, send: 0.12 }),
        tone('sawtooth', 'A2', 0.015, 0.42, 0.12, { slideTo: 'E2', filter: 660, filterTo: 230, attack: 0.025, send: 0.16 }),
        noise(0.025, 0.42, 0.2, { filterType: 'bandpass', filter: 1450, filterTo: 420, q: 0.7, attack: 0.02, send: 0.2, pan: 0.14 }),
        tone('triangle', 'E3', 0.09, 0.25, 0.08, { slideTo: 'C3', filter: 650, attack: 0.03, send: 0.12, pan: -0.12 }),
      ];
    case 'soin_long':
      return [
        tone('sine', 'C5', 0, 0.3, 0.15, { attack: 0.03, send: 0.18, pan: -0.12 }),
        tone('triangle', 'E5', 0.13, 0.34, 0.13, { filter: 2700, attack: 0.04, send: 0.22 }),
        bell('G5', 0.27, 0.82, 0.15, { send: 0.38, pan: 0.12 }),
      ];
    case 'bouclier':
      return [
        tone('sine', 'C4', 0, 0.44, 0.16, { filter: 900, attack: 0.035, send: 0.2 }),
        bell('E5', 0.03, 1.02, 0.2, { send: 0.42, pan: 0.1 }),
        tone('triangle', 'G5', 0.12, 0.36, 0.09, { filter: 3100, attack: 0.04, send: 0.3, pan: -0.12 }),
      ];

    // ── Combat ───────────────────────────────────────────────────────
    case 'attaque_declaree':
      return [
        noise(0, 0.16, 0.13, { filterType: 'bandpass', filter: 3100, filterTo: 900, attack: 0.01, send: 0.1, pan: -0.14 }),
        tone('triangle', 'C4', 0.02, 0.17, 0.16, { slideTo: 'E4', filter: 1500, attack: 0.02, send: 0.14 }),
        tone('sine', 'G4', 0.105, 0.2, 0.13, { attack: 0.02, send: 0.16, pan: 0.12 }),
      ];
    case 'attaque_confirmee':
      return [
        thud(0, 0.23, 0.66, { from: 160, to: 43, filter: 480, send: 0.1 }),
        noise(0.012, 0.19, 0.19, { filterType: 'lowpass', filter: 3100, filterTo: 680, attack: 0.002, send: 0.1 }),
        tone('triangle', 'C5', 0.035, 0.19, 0.16, { slideTo: 'G4', filter: 2100, attack: 0.005, send: 0.14 }),
      ];
    case 'blocage':
      return [
        thud(0, 0.17, 0.53, { from: 180, to: 78, filter: 650, send: 0.08 }),
        noise(0.004, 0.11, 0.1, { filterType: 'bandpass', filter: 2100, filterTo: 950, q: 1.5, attack: 0.003, send: 0.12 }),
        bell('E5', 0.035, 0.38, 0.11, { send: 0.27, pan: 0.08 }),
      ];
    case 'choc_lames':
      return [
        thud(0, 0.14, 0.31, { from: 220, to: 96, filter: 920, send: 0.05 }),
        noise(0, 0.12, 0.22, { filterType: 'bandpass', filter: 5200, filterTo: 1450, q: 1.25, attack: 0.001, send: 0.16, pan: -0.12 }),
        tone('sawtooth', 'D5', 0.002, 0.16, 0.1, { filter: 3100, filterTo: 1250, attack: 0.002, send: 0.12, pan: -0.12 }),
        bell('A5', 0.006, 0.42, 0.16, { send: 0.31, pan: 0.11 }),
        bell('D6', 0.024, 0.34, 0.09, { send: 0.26, pan: -0.08 }),
      ];
    case 'combat':
      return [
        thud(0, 0.32, 0.75, { from: 178, to: 37, filter: 430, send: 0.13 }),
        tone('sawtooth', 'A2', 0.02, 0.3, 0.14, { slideTo: 'E2', filter: 520, filterTo: 210, attack: 0.012, send: 0.15 }),
        noise(0.015, 0.27, 0.22, { filterType: 'lowpass', filter: 3100, filterTo: 420, attack: 0.005, send: 0.15 }),
        tone('triangle', 'E4', 0.09, 0.2, 0.12, { slideTo: 'C4', filter: 1800, send: 0.12, pan: 0.12 }),
      ];
    case 'degats':
      return [
        thud(0, 0.2, 0.65, { from: 145, to: 45, filter: 440, send: 0.08 }),
        noise(0, 0.12, 0.13, { filterType: 'lowpass', filter: 2700, filterTo: 500, attack: 0.002, send: 0.08 }),
        tone('sine', 'C3', 0, 0.22, 0.14, { slideTo: 'G2', filter: 560, attack: 0.004, send: 0.11 }),
      ];
    case 'degats_sorcier':
      return [
        thud(0, 0.19, 0.59, { from: 148, to: 48, filter: 500, send: 0.08 }),
        tone('triangle', 'G4', 0.045, 0.18, 0.13, { slideTo: 'D4', filter: 1600, attack: 0.008, send: 0.14 }),
        noise(0, 0.12, 0.12, { filterType: 'bandpass', filter: 2250, filterTo: 620, q: 0.8, attack: 0.003, send: 0.1 }),
      ];
    case 'coup_rapide':
      return [
        noise(0, 0.14, 0.14, { filterType: 'highpass', filter: 2800, filterTo: 800, attack: 0.003, send: 0.08, pan: -0.18 }),
        tone('triangle', 'E5', 0, 0.1, 0.14, { filter: 2800, attack: 0.003, send: 0.08 }),
        tone('sine', 'G5', 0.055, 0.11, 0.12, { attack: 0.004, send: 0.1, pan: 0.08 }),
        bell('B5', 0.1, 0.34, 0.1, { send: 0.22, pan: 0.18 }),
      ];
    case 'impact':
      return [
        thud(0, 0.39, 0.78, { from: 190, to: 32, filter: 370, send: 0.15 }),
        tone('sawtooth', 'G1', 0.02, 0.4, 0.14, { slideTo: 'D1', filter: 320, filterTo: 150, attack: 0.012, send: 0.17 }),
        noise(0.018, 0.34, 0.24, { filterType: 'lowpass', filter: 3700, filterTo: 350, attack: 0.003, send: 0.18, pan: -0.08 }),
        bell('C4', 0.045, 0.65, 0.12, { send: 0.33, pan: 0.12 }),
      ];

    // ── Magie & contre ───────────────────────────────────────────────
    case 'contresort':
      return [
        bell('D6', 0, 0.76, 0.22, { send: 0.44, pan: 0.08 }),
        noise(0.045, 0.2, 0.12, { filterType: 'bandpass', filter: 4800, filterTo: 850, q: 0.8, attack: 0.015, send: 0.2, pan: -0.18 }),
        tone('sine', 'A4', 0.1, 0.19, 0.13, { slideTo: 'E4', attack: 0.018, filter: 1600, send: 0.16 }),
        tone('triangle', 'D4', 0.22, 0.24, 0.12, { slideTo: 'A3', filter: 1050, attack: 0.025, send: 0.18, pan: 0.12 }),
      ];
    case 'card_place':
      // L’échantillon réel est lu par RpgAudioPlayer, cette entrée documente
      // néanmoins l’action dans le catalogue commun des bruitages.
      return [{ kind: 'sample', at: 0, dur: 0.608, g: 1 }];
    case 'card_draw':
      return [{ kind: 'sample', at: 0, dur: 0.7, g: 1 }];
    case 'attackers_confirm':
      return [{ kind: 'sample', at: 0, dur: 0.7, g: 1 }];
    case 'player_attack_hit':
      return [{ kind: 'sample', at: 0, dur: 0.666, g: 1 }];
    case 'flame_gust':
      return [{ kind: 'sample', at: 0, dur: 2.287, g: 1 }];
    case 'water_wave':
      return [{ kind: 'sample', at: 0, dur: 2.691, g: 1 }];
    case 'card_countered':
      return [{ kind: 'sample', at: 0, dur: 1.602, g: 1 }];
    case 'block_impact':
      return [{ kind: 'sample', at: 0, dur: 0.967, g: 1 }];
    case 'destruction_hit':
      return [{ kind: 'sample', at: 0, dur: 1.698, g: 1 }];
    case 'page_turn':
      return [{ kind: 'sample', at: 0, dur: 1.097, g: 1 }];

    // ── Interface : retours courts, feutrés et distincts ─────────────
    case 'menu':
      return [
        tone('sine', 'D5', 0, 0.1, 0.1, { attack: 0.004, filter: 2100, send: 0.07, pan: -0.08 }),
        tone('triangle', 'A5', 0.045, 0.13, 0.08, { attack: 0.006, filter: 2800, send: 0.1, pan: 0.08 }),
      ];
    case 'select':
      return [
        tone('triangle', 'D4', 0, 0.16, 0.13, { filter: 1600, attack: 0.012, send: 0.1, pan: -0.08 }),
        tone('sine', 'A4', 0.07, 0.18, 0.11, { attack: 0.015, send: 0.12 }),
        bell('D5', 0.14, 0.36, 0.1, { send: 0.23, pan: 0.08 }),
      ];
    case 'erreur':
      return [
        tone('triangle', 'D3', 0, 0.19, 0.19, { slideTo: 'C#3', filter: 700, attack: 0.008, send: 0.08 }),
        tone('sine', 'A2', 0.12, 0.26, 0.14, { slideTo: 'G2', filter: 500, attack: 0.012, send: 0.08 }),
        thud(0.01, 0.16, 0.29, { from: 92, to: 48, filter: 370, send: 0.05 }),
      ];
    case 'pile':
      return [
        noise(0, 0.09, 0.1, { filterType: 'bandpass', filter: 2800, filterTo: 1050, q: 1.2, attack: 0.002, send: 0.06, pan: -0.08 }),
        tone('sine', 'A4', 0.025, 0.09, 0.09, { attack: 0.004, filter: 1800, send: 0.06 }),
        tone('triangle', 'D5', 0.075, 0.12, 0.08, { attack: 0.005, filter: 2200, send: 0.08, pan: 0.08 }),
      ];
    case 'annuler':
      return [
        noise(0, 0.12, 0.1, { filterType: 'lowpass', filter: 1900, filterTo: 600, attack: 0.008, send: 0.08, pan: 0.1 }),
        tone('sine', 'A4', 0, 0.15, 0.1, { slideTo: 'F4', filter: 1500, send: 0.08 }),
        tone('triangle', 'D4', 0.1, 0.21, 0.1, { filter: 950, attack: 0.02, send: 0.12, pan: -0.08 }),
      ];
    case 'hover':
      return [tone('sine', 'A4', 0, 0.055, 0.055, { attack: 0.003, filter: 1700, send: 0.035 })];

    default:
      return null;
  }
}

function makeReverbImpulse(context) {
  if (typeof context.createBuffer !== 'function' || !context.sampleRate) return null;
  const sampleRate = context.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * REVERB_SECONDS));
  const impulse = context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const progress = index / length;
      const envelope = (1 - progress) ** 3.2;
      // Deux impulsions légèrement différentes ouvrent la réverbération sans
      // déplacer le centre des impacts et des annonces.
      const stereoWeight = channel === 0 ? 0.96 : 1.04;
      samples[index] = (Math.random() * 2 - 1) * envelope * stereoWeight;
    }
  }
  return impulse;
}

/** Lecteur WebAudio : muet tant que `unlock()` n'a pas suivi un geste joueur. */
export class RpgAudioPlayer {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.limiter = null;
    this.reverb = null;
    this.reverbFilter = null;
    this.reverbReturn = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.cardPlaceAudio = null;
    this.cardDrawAudio = null;
    this.attackersConfirmAudio = null;
    this.playerAttackHitAudio = null;
    this.flameGustAudio = null;
    this.waterWaveAudio = null;
    this.cardCounteredAudio = null;
    this.blockImpactAudio = null;
    this.destructionHitAudio = null;
    this.pageTurnAudio = null;
    const AudioCtor = typeof window !== 'undefined' ? window.Audio : null;
    if (typeof AudioCtor === 'function') {
      try {
        this.cardPlaceAudio = new AudioCtor(CARD_PLACE_SAMPLE_URL.href);
        this.cardPlaceAudio.preload = 'auto';
        this.cardPlaceAudio.volume = CARD_PLACE_VOLUME;
        this.cardDrawAudio = new AudioCtor(CARD_DRAW_SAMPLE_URL.href);
        this.cardDrawAudio.preload = 'auto';
        this.cardDrawAudio.volume = CARD_DRAW_VOLUME;
        this.attackersConfirmAudio = new AudioCtor(ATTACKERS_CONFIRM_SAMPLE_URL.href);
        this.attackersConfirmAudio.preload = 'auto';
        this.attackersConfirmAudio.volume = ATTACKERS_CONFIRM_VOLUME;
        this.playerAttackHitAudio = new AudioCtor(PLAYER_ATTACK_HIT_SAMPLE_URL.href);
        this.playerAttackHitAudio.preload = 'auto';
        this.playerAttackHitAudio.volume = PLAYER_ATTACK_HIT_VOLUME;
        this.flameGustAudio = new AudioCtor(FLAME_GUST_SAMPLE_URL.href);
        this.flameGustAudio.preload = 'auto';
        this.flameGustAudio.volume = FLAME_GUST_VOLUME;
        this.waterWaveAudio = new AudioCtor(WATER_WAVE_SAMPLE_URL.href);
        this.waterWaveAudio.preload = 'auto';
        this.waterWaveAudio.volume = WATER_WAVE_VOLUME;
        this.cardCounteredAudio = new AudioCtor(CARD_COUNTERED_SAMPLE_URL.href);
        this.cardCounteredAudio.preload = 'auto';
        this.cardCounteredAudio.volume = CARD_COUNTERED_VOLUME;
        this.blockImpactAudio = new AudioCtor(BLOCK_IMPACT_SAMPLE_URL.href);
        this.blockImpactAudio.preload = 'auto';
        this.blockImpactAudio.volume = BLOCK_IMPACT_VOLUME;
        this.destructionHitAudio = new AudioCtor(DESTRUCTION_HIT_SAMPLE_URL.href);
        this.destructionHitAudio.preload = 'auto';
        this.destructionHitAudio.volume = DESTRUCTION_HIT_VOLUME;
        this.pageTurnAudio = new AudioCtor(PAGE_TURN_SAMPLE_URL.href);
        this.pageTurnAudio.preload = 'auto';
        this.pageTurnAudio.volume = PAGE_TURN_VOLUME;
      } catch { /* l’échantillon reste optionnel si Audio n’est pas disponible */ }
    }
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') this.ctx.resume().catch(() => {});
      return;
    }
    const AudioContext = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContext) return;

    let context;
    try {
      context = new AudioContext();
      this.ctx = context;
      this.master = context.createGain();
      this.master.gain.value = this.muted ? MIN_GAIN : MASTER_VOLUME;

      this.sfxBus = context.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);

      // Le limiteur évite les crêtes quand les impacts se superposent aux cartes.
      if (typeof context.createDynamicsCompressor === 'function') {
        this.limiter = context.createDynamicsCompressor();
        this.limiter.threshold.value = -12;
        this.limiter.knee.value = 12;
        this.limiter.ratio.value = 4;
        this.limiter.attack.value = 0.004;
        this.limiter.release.value = 0.18;
        this.master.connect(this.limiter);
        this.limiter.connect(context.destination);
      } else {
        this.master.connect(context.destination);
      }

      // Réverbération courte et générée à la volée : aucun fichier audio ni
      // chargement réseau. Les retours sont filtrés pour rester doux au casque.
      if (typeof context.createConvolver === 'function') {
        const impulse = makeReverbImpulse(context);
        if (impulse) {
          this.reverb = context.createConvolver();
          this.reverb.buffer = impulse;
          this.reverbFilter = typeof context.createBiquadFilter === 'function'
            ? context.createBiquadFilter()
            : null;
          if (this.reverbFilter) {
            this.reverbFilter.type = 'lowpass';
            this.reverbFilter.frequency.value = 5200;
            this.reverb.connect(this.reverbFilter);
          }
          this.reverbReturn = context.createGain();
          this.reverbReturn.gain.value = REVERB_RETURN;
          (this.reverbFilter || this.reverb).connect(this.reverbReturn);
          this.reverbReturn.connect(this.master);
        }
      }
    } catch {
      this.ctx = null;
      this.master = null;
      this.sfxBus = null;
      this.limiter = null;
      this.reverb = null;
      this.reverbFilter = null;
      this.reverbReturn = null;
      if (context && typeof context.close === 'function') {
        try { context.close(); } catch { /* Contexte incomplet ou déjà fermé. */ }
      }
      return;
    }

    if (context.state === 'suspended' && typeof context.resume === 'function') context.resume().catch(() => {});
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.cardPlaceAudio) {
      this.cardPlaceAudio.volume = this.muted ? 0 : CARD_PLACE_VOLUME;
      if (this.muted) this.cardPlaceAudio.pause?.();
    }
    if (this.cardDrawAudio) {
      this.cardDrawAudio.volume = this.muted ? 0 : CARD_DRAW_VOLUME;
      if (this.muted) this.cardDrawAudio.pause?.();
    }
    if (this.attackersConfirmAudio) {
      this.attackersConfirmAudio.volume = this.muted ? 0 : ATTACKERS_CONFIRM_VOLUME;
      if (this.muted) this.attackersConfirmAudio.pause?.();
    }
    if (this.playerAttackHitAudio) {
      this.playerAttackHitAudio.volume = this.muted ? 0 : PLAYER_ATTACK_HIT_VOLUME;
      if (this.muted) this.playerAttackHitAudio.pause?.();
    }
    if (this.flameGustAudio) {
      this.flameGustAudio.volume = this.muted ? 0 : FLAME_GUST_VOLUME;
      if (this.muted) this.flameGustAudio.pause?.();
    }
    if (this.waterWaveAudio) {
      this.waterWaveAudio.volume = this.muted ? 0 : WATER_WAVE_VOLUME;
      if (this.muted) this.waterWaveAudio.pause?.();
    }
    if (this.cardCounteredAudio) {
      this.cardCounteredAudio.volume = this.muted ? 0 : CARD_COUNTERED_VOLUME;
      if (this.muted) this.cardCounteredAudio.pause?.();
    }
    if (this.blockImpactAudio) {
      this.blockImpactAudio.volume = this.muted ? 0 : BLOCK_IMPACT_VOLUME;
      if (this.muted) this.blockImpactAudio.pause?.();
    }
    if (this.destructionHitAudio) {
      this.destructionHitAudio.volume = this.muted ? 0 : DESTRUCTION_HIT_VOLUME;
      if (this.muted) this.destructionHitAudio.pause?.();
    }
    if (this.pageTurnAudio) {
      this.pageTurnAudio.volume = this.muted ? 0 : PAGE_TURN_VOLUME;
      if (this.muted) this.pageTurnAudio.pause?.();
    }
    if (!this.master) return;
    const now = this.ctx?.currentTime ?? 0;
    const parameter = this.master.gain;
    parameter.cancelScheduledValues?.(now);
    if (typeof parameter.setTargetAtTime === 'function') {
      parameter.setTargetAtTime(this.muted ? MIN_GAIN : MASTER_VOLUME, now, 0.035);
    } else {
      parameter.value = this.muted ? MIN_GAIN : MASTER_VOLUME;
    }
  }

  play(name, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    if (name === 'card_place' || name === 'card_draw' || name === 'attackers_confirm' || name === 'player_attack_hit' || name === 'flame_gust' || name === 'water_wave' || name === 'card_countered' || name === 'block_impact' || name === 'destruction_hit' || name === 'page_turn') {
      const sample = name === 'card_place'
        ? this.cardPlaceAudio
        : name === 'card_draw' ? this.cardDrawAudio
          : name === 'attackers_confirm' ? this.attackersConfirmAudio
                : name === 'player_attack_hit' ? this.playerAttackHitAudio
                : name === 'flame_gust' ? this.flameGustAudio
                : name === 'water_wave' ? this.waterWaveAudio
                : name === 'card_countered' ? this.cardCounteredAudio
                : name === 'block_impact' ? this.blockImpactAudio
                  : name === 'destruction_hit' ? this.destructionHitAudio : this.pageTurnAudio;
      if (!sample) return;
      try {
        sample.currentTime = 0;
        const playback = sample.play();
        playback?.catch?.(() => {});
      } catch { /* le navigateur peut refuser la lecture sans geste utilisateur */ }
      return;
    }
    const sequence = rpgSfx(name);
    if (!sequence) return;
    const safeDelay = Number.isFinite(Number(delay)) ? Math.max(0, Number(delay)) : 0;
    const startAt = this.ctx.currentTime + safeDelay;
    for (const event of sequence) this.schedule(event, startAt + event.at);
  }

  envelope(gain, peak, time, duration, requestedAttack = null) {
    const safeDuration = Math.max(0.008, duration);
    const attack = Math.max(0.002, Math.min(
      Number.isFinite(requestedAttack) ? requestedAttack : Math.min(0.012, safeDuration * 0.25),
      safeDuration * 0.45,
    ));
    gain.gain.setValueAtTime(MIN_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, time + safeDuration);
  }

  routeVoice(source, voiceGain, event, intermediateNodes = []) {
    const context = this.ctx;
    let output = voiceGain;
    let panner = null;
    const pan = Math.max(-1, Math.min(1, Number(event.pan) || 0));
    if (Math.abs(pan) > 0.001 && typeof context.createStereoPanner === 'function') {
      panner = context.createStereoPanner();
      panner.pan.value = pan;
      voiceGain.connect(panner);
      output = panner;
    }
    output.connect(this.sfxBus || this.master);

    let sendGain = null;
    const sendAmount = event.send === undefined
      ? (event.kind === 'bell' ? 0.32 : event.kind === 'tone' ? 0.14 : 0.1)
      : Math.max(0, Math.min(0.6, Number(event.send) || 0));
    if (this.reverb && sendAmount > 0) {
      sendGain = context.createGain();
      sendGain.gain.value = sendAmount;
      output.connect(sendGain);
      sendGain.connect(this.reverb);
    }

    source.onended = () => {
      for (const node of [source, ...intermediateNodes, voiceGain, panner, sendGain]) {
        try { node?.disconnect?.(); } catch { /* Le nœud a déjà été libéré. */ }
      }
    };
  }

  makeFilter(event, time, defaultType = 'lowpass') {
    const context = this.ctx;
    if (typeof context.createBiquadFilter !== 'function') return null;
    if (!event.filter && !event.filterTo && !event.filterType) return null;
    const filter = context.createBiquadFilter();
    filter.type = event.filterType || defaultType;
    const startFrequency = Math.max(40, Number(event.filter) || 5200);
    filter.frequency.setValueAtTime(startFrequency, time);
    filter.Q.value = Math.max(0.0001, Number(event.q) || 0.8);
    if (event.filterTo) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, Number(event.filterTo)), time + Math.max(0.01, event.filterDuration || event.dur));
    }
    return filter;
  }

  schedule(event, time) {
    const context = this.ctx;
    if (!context || !this.master) return;
    if (event.kind === 'noise') {
      if (!this.noiseBuffer) {
        const sampleRate = context.sampleRate || 44100;
        const length = Math.floor(sampleRate);
        this.noiseBuffer = context.createBuffer(1, length, sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
      }
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = this.makeFilter(event, time, 'lowpass');
      const voiceGain = context.createGain();
      this.envelope(voiceGain, event.g, time, event.dur, event.attack);
      if (filter) {
        source.connect(filter);
        filter.connect(voiceGain);
      } else {
        source.connect(voiceGain);
      }
      this.routeVoice(source, voiceGain, event, filter ? [filter] : []);
      source.start(time, Math.random() * 0.8);
      source.stop(time + event.dur);
      return;
    }

    if (event.kind === 'thud') {
      const source = context.createOscillator();
      source.type = 'sine';
      const startFrequency = Math.max(25, Number(event.from) || 135);
      const endFrequency = Math.max(25, Number(event.to) || 42);
      source.frequency.setValueAtTime(startFrequency, time);
      source.frequency.exponentialRampToValueAtTime(endFrequency, time + Math.max(0.015, event.pitchSweep || event.dur * 0.82));
      const filter = this.makeFilter({ ...event, filter: event.filter || 420 }, time, 'lowpass');
      const voiceGain = context.createGain();
      this.envelope(voiceGain, event.g, time, event.dur, event.attack ?? 0.004);
      if (filter) {
        source.connect(filter);
        filter.connect(voiceGain);
      } else {
        source.connect(voiceGain);
      }
      this.routeVoice(source, voiceGain, event, filter ? [filter] : []);
      source.start(time);
      source.stop(time + event.dur + 0.03);
      return;
    }

    if (event.kind === 'bell') {
      const fundamental = hz(event.note);
      const partials = [[1, 1], [2.01, 0.26], [2.74, 0.095]];
      for (const [multiplier, level] of partials) {
        const source = context.createOscillator();
        source.type = 'sine';
        source.frequency.setValueAtTime(fundamental * multiplier, time);
        const voiceGain = context.createGain();
        this.envelope(voiceGain, event.g * level, time, event.dur, event.attack ?? 0.003);
        this.routeVoice(source, voiceGain, event);
        source.start(time);
        source.stop(time + event.dur + 0.04);
      }
      return;
    }

    const source = context.createOscillator();
    source.type = event.wave || 'sine';
    source.frequency.setValueAtTime(hz(event.note), time);
    if (event.slideTo && hz(event.slideTo)) {
      source.frequency.exponentialRampToValueAtTime(
        hz(event.slideTo),
        time + Math.max(0.01, event.slideDuration || event.dur * 0.78),
      );
    }
    if (event.detune && source.detune) source.detune.setValueAtTime(event.detune, time);
    const filter = this.makeFilter(event, time, 'lowpass');
    const voiceGain = context.createGain();
    this.envelope(voiceGain, event.g, time, event.dur, event.attack);
    if (filter) {
      source.connect(filter);
      filter.connect(voiceGain);
    } else {
      source.connect(voiceGain);
    }
    this.routeVoice(source, voiceGain, event, filter ? [filter] : []);
    source.start(time);
    source.stop(time + event.dur + 0.04);
  }

  destroy() {
    const context = this.ctx;
    if (this.master && context) {
      try {
        this.master.gain.cancelScheduledValues?.(context.currentTime);
        this.master.gain.setTargetAtTime?.(MIN_GAIN, context.currentTime, 0.025);
      } catch { /* Le contexte peut déjà être fermé. */ }
    }
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.limiter = null;
    this.reverb = null;
    this.reverbFilter = null;
    this.reverbReturn = null;
    this.noiseBuffer = null;
    if (this.cardPlaceAudio) {
      try {
        this.cardPlaceAudio.pause?.();
        this.cardPlaceAudio.removeAttribute?.('src');
        this.cardPlaceAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.cardPlaceAudio = null;
    if (this.cardDrawAudio) {
      try {
        this.cardDrawAudio.pause?.();
        this.cardDrawAudio.removeAttribute?.('src');
        this.cardDrawAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.cardDrawAudio = null;
    if (this.attackersConfirmAudio) {
      try {
        this.attackersConfirmAudio.pause?.();
        this.attackersConfirmAudio.removeAttribute?.('src');
        this.attackersConfirmAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.attackersConfirmAudio = null;
    if (this.playerAttackHitAudio) {
      try {
        this.playerAttackHitAudio.pause?.();
        this.playerAttackHitAudio.removeAttribute?.('src');
        this.playerAttackHitAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.playerAttackHitAudio = null;
    if (this.flameGustAudio) {
      try {
        this.flameGustAudio.pause?.();
        this.flameGustAudio.removeAttribute?.('src');
        this.flameGustAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.flameGustAudio = null;
    if (this.waterWaveAudio) {
      try {
        this.waterWaveAudio.pause?.();
        this.waterWaveAudio.removeAttribute?.('src');
        this.waterWaveAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.waterWaveAudio = null;
    if (this.cardCounteredAudio) {
      try {
        this.cardCounteredAudio.pause?.();
        this.cardCounteredAudio.removeAttribute?.('src');
        this.cardCounteredAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.cardCounteredAudio = null;
    if (this.blockImpactAudio) {
      try {
        this.blockImpactAudio.pause?.();
        this.blockImpactAudio.removeAttribute?.('src');
        this.blockImpactAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.blockImpactAudio = null;
    if (this.destructionHitAudio) {
      try {
        this.destructionHitAudio.pause?.();
        this.destructionHitAudio.removeAttribute?.('src');
        this.destructionHitAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.destructionHitAudio = null;
    if (this.pageTurnAudio) {
      try {
        this.pageTurnAudio.pause?.();
        this.pageTurnAudio.removeAttribute?.('src');
        this.pageTurnAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.pageTurnAudio = null;
    if (context && typeof context.close === 'function') {
      try { context.close(); } catch { /* Contexte déjà fermé. */ }
    }
  }
}
