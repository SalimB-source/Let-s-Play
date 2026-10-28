/**
 * Signature sonore — « Le Sablier ».
 *
 * Les bruitages du jeu sont les échantillons fournis (cartes, frappes, souffle
 * du feu, vagues, contres, renvois, chocs, pages, cri de victoire viking et
 * fanfare de défaite, coups blessants) lus sous forme de fichiers, et les voix
 * d'arrivée des créatures (`rpgArrivalVoices.js` : un MP3 par carte, joué par
 * `playCardVoice`). Le seul son encore synthétisé en WebAudio est
 * l'effleurement de survol de l'interface : tout le reste du catalogue
 * synthétique a été retiré, et les noms inconnus de `rpgSfx` restent muets.
 *
 * Deux couches :
 *  - `hz()` et `rpgSfx()` décrivent des événements purs, faciles à tester ;
 *  - `RpgAudioPlayer` ne s'éveille qu'après un geste joueur, ménage les pics
 *    de volume et se tait si WebAudio manque ou si le joueur coupe le son.
 */

import { RPG_DWARF_DIALOGUE_SFX } from './rpgDwarfAudio.js';

/** Tonnerre partagé par l'Éclair du marteau et l'arrivée du Maître. */
export const RPG_FOUDRE_MARTEAU_SFX = 'foudre_marteau';

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MASTER_VOLUME = 0.22;
const REVERB_SECONDS = 0.68;
const REVERB_RETURN = 0.16;
const MIN_GAIN = 0.0001;

export function clampRpgVolume(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(0, Math.min(1, num));
}
const CARD_PLACE_SAMPLE_URL = new URL('./assets/card-place.wav', import.meta.url);
const CARD_DRAW_SAMPLE_URL = new URL('./assets/card-draw.wav', import.meta.url);
const ATTACKERS_CONFIRM_SAMPLE_URL = new URL('./assets/attackers-confirm.mp3', import.meta.url);
const PLAYER_ATTACK_HIT_SAMPLE_URL = new URL('./assets/player-attack-hit.wav', import.meta.url);
const FLAME_GUST_SAMPLE_URL = new URL('./assets/flame-gust.wav', import.meta.url);
const WATER_WAVE_SAMPLE_URL = new URL('./assets/water-wave.wav', import.meta.url);
const CARD_COUNTERED_SAMPLE_URL = new URL('./assets/card-countered.wav', import.meta.url);
const CREATURE_RETURN_SAMPLE_URL = new URL('./assets/creature-return.wav', import.meta.url);
const BLOCK_IMPACT_SAMPLE_URL = new URL('./assets/block-impact.mp3', import.meta.url);
const DESTRUCTION_HIT_SAMPLE_URL = new URL('./assets/destruction-hit.mp3', import.meta.url);
const PAGE_TURN_SAMPLE_URL = new URL('./assets/page-turn.mp3', import.meta.url);
const VICTORY_CRY_SAMPLE_URL = new URL('./assets/viking-warrior-battle-cry-with-horn.mp3', import.meta.url);
const GAME_LOST_SAMPLE_URL = new URL('./assets/game-lost.mp3', import.meta.url);
const HIT_SAMPLE_URL = new URL('./assets/hit.wav', import.meta.url);
const PIRATE_AHOY_SAMPLE_URL = new URL('./assets/pirate-ahoy.mp3', import.meta.url);
const PIRATE_DIALOGUE_SAMPLE_URL = new URL('./assets/pirate-dialogue-alright.wav', import.meta.url);
const DWARF_DIALOGUE_SAMPLE_URL = new URL('./assets/dwarf-dialogue-my-axe-shall-speak-for-me.wav', import.meta.url);
const CHAIN_RATTLE_SAMPLE_URL = new URL('./assets/chain-rattle.wav', import.meta.url);
const DOCK_SOUND_SAMPLE_URL = new URL('./assets/dock-sound.mp3', import.meta.url);
const COLD_WIND_SAMPLE_URL = new URL('./assets/cold-wind.wav', import.meta.url);
const ICE_FREEZE_SAMPLE_URL = new URL('./assets/ice-freeze.wav', import.meta.url);
const FOUDRE_MARTEAU_SAMPLE_URL = new URL('./assets/thunder-spark-transition-full.mp3', import.meta.url);
// La flèche de l'Attaque ciblée : un échantillon généré par
// `tools/make-arrow-shot.mjs` (corde lâchée + souffle du trait + empennage).
const ARROW_SHOT_SAMPLE_URL = new URL('./assets/arrow-shot.wav', import.meta.url);
const CARD_PLACE_VOLUME = 0.62;
const CARD_DRAW_VOLUME = 0.52;
const ATTACKERS_CONFIRM_VOLUME = 0.58;
const PLAYER_ATTACK_HIT_VOLUME = 0.64;
const FLAME_GUST_VOLUME = 0.56;
const WATER_WAVE_VOLUME = 0.58;
const CARD_COUNTERED_VOLUME = 0.6;
const CREATURE_RETURN_VOLUME = 0.58;
const BLOCK_IMPACT_VOLUME = 0.58;
const DESTRUCTION_HIT_VOLUME = 0.6;
const PAGE_TURN_VOLUME = 0.5;
const VICTORY_CRY_VOLUME = 0.6;
const GAME_LOST_VOLUME = 0.6;
const HIT_VOLUME = 0.62;
const PIRATE_AHOY_VOLUME = 0.62;
const PIRATE_DIALOGUE_VOLUME = 0.62;
const DWARF_DIALOGUE_VOLUME = 0.62;
const CHAIN_RATTLE_VOLUME = 0.62;
const DOCK_SOUND_VOLUME = 0.62;
const COLD_WIND_VOLUME = 0.58;
const ICE_FREEZE_VOLUME = 0.62;
const FOUDRE_MARTEAU_VOLUME = 0.58;
const ARROW_SHOT_VOLUME = 0.6;
// Les voix d'arrivée des créatures (une par carte, voir
// `rpgArrivalVoices.js`) passent sous les bruitages de table : elles se
// superposent à `card_place` sans l'écraser.
const CARD_VOICE_VOLUME = 0.5;

/** Le gain de base des voix d'arrivée des créatures. */
export const RPG_CARD_VOICE_VOLUME = CARD_VOICE_VOLUME;

/** Le cliquetis de chaînes joué lorsqu'une créature avec Abordage kidnappe une créature en cale. */
export const RPG_ABORDAGE_SFX = 'abordage';

/** Le cri pirate (« Ahoy ! ») joué quand une carte pirate arrive en jeu. */
export const RPG_PIRATE_ARRIVEE_SFX = 'pirate_arrivee';

/** Le dialogue pirate (« Alright »), seconde voix de l'arrivée des cartes pirates. */
export const RPG_PIRATE_DIALOGUE_SFX = 'pirate_dialogue';

/**
 * Les deux accueils des cartes pirates, joués **en alternance** : une arrivée
 * sur deux est saluée par `pirate_arrivee` (« Ahoy ! »), l'autre par
 * `pirate_dialogue` (« Alright »).
 */
export const RPG_PIRATE_ARRIVEES_SFX = Object.freeze([
  RPG_PIRATE_ARRIVEE_SFX,
  RPG_PIRATE_DIALOGUE_SFX,
]);

/**
 * Le son d'arrivée pirate de la n-ième arrivée depuis le début de la partie
 * (`0` → « Ahoy ! », `1` → « Alright », `2` → « Ahoy ! »…). Toute valeur
 * inattendue retombe sur le premier son, et les indices négatifs restent dans
 * le cycle au lieu de sortir du tableau.
 */
export function rpgSonArriveePirate(index = 0) {
  const total = RPG_PIRATE_ARRIVEES_SFX.length;
  const depart = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : 0;
  return RPG_PIRATE_ARRIVEES_SFX[((depart % total) + total) % total];
}

/** L'ambiance de quai (« Dock Sound ») jouée quand un navire arrive en jeu. */
export const RPG_NAVIRE_ARRIVEE_SFX = 'navire_arrivee';

/**
 * Le trait de l'**Attaque ciblée** : une flèche, pas une épée. La frappe
 * ciblée d'une créature (coup rapide, 25 % de chances de rater) est un tir à
 * distance : elle siffle, et le coup d'épée commun (`player_attack_hit`)
 * reste au corps à corps — les deux ne se superposent jamais pour un même
 * attaquant.
 */
export const RPG_ARROW_SFX = 'fleche';

/** Souffle froid du gel de masse (Verglas / Brume / Blizzard / Géant) — vent hivernal. */
export const RPG_COLD_WIND_SFX = 'cold_wind';

/** Impact de glace joué lorsqu'un sort ou un effet gèle réellement une créature. */
export const RPG_FREEZE_IMPACT_SFX = 'freeze_impact';

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

/**
 * Le catalogue du duel : les échantillons fournis plus le seul bruitage
 * encore synthétisé, le survol. Les entrées `sample` documentent la durée et
 * le gain de chaque fichier ; leur lecture passe par les éléments `<audio>`
 * de `RpgAudioPlayer`.
 */
const RPG_SFX_TABLE = {
  // Interface : le dernier son synthétisé du jeu — un effleurement de survol.
  hover: [tone('sine', 'A4', 0, 0.055, 0.055, { attack: 0.003, filter: 1700, send: 0.035 })],

  // Les échantillons fournis, dans `src/games/assets/`.
  card_place: [{ kind: 'sample', at: 0, dur: 0.608, g: 1 }],
  card_draw: [{ kind: 'sample', at: 0, dur: 0.7, g: 1 }],
  attackers_confirm: [{ kind: 'sample', at: 0, dur: 0.7, g: 1 }],
  player_attack_hit: [{ kind: 'sample', at: 0, dur: 0.666, g: 1 }],
  flame_gust: [{ kind: 'sample', at: 0, dur: 2.287, g: 1 }],
  water_wave: [{ kind: 'sample', at: 0, dur: 2.691, g: 1 }],
  card_countered: [{ kind: 'sample', at: 0, dur: 1.602, g: 1 }],
  creature_return: [{ kind: 'sample', at: 0, dur: 1.585, g: 1 }],
  block_impact: [{ kind: 'sample', at: 0, dur: 0.967, g: 1 }],
  destruction_hit: [{ kind: 'sample', at: 0, dur: 1.698, g: 1 }],
  page_turn: [{ kind: 'sample', at: 0, dur: 1.097, g: 1 }],
  // Cri de guerre viking (viking-warrior-battle-cry-with-horn.mp3, 2,56 s).
  victoire: [{ kind: 'sample', at: 0, dur: 2.56, g: 1 }],
  defaite: [{ kind: 'sample', at: 0, dur: 4.493, g: 1 }],
  // Le même coup sec sert la blessure des deux camps.
  degats: [{ kind: 'sample', at: 0, dur: 0.625, g: 1 }],
  degats_sorcier: [{ kind: 'sample', at: 0, dur: 0.625, g: 1 }],
  // Prise en cale par Abordage : cliquetis de chaînes métalliques
  // (ChainRattleMetalChainManyVariations_jxKTo_03.wav).
  abordage: [{ kind: 'sample', at: 0, dur: 2.4, g: 1 }],
  // Une carte pirate jouée depuis la main entre en jeu : « Ahoy ! »
  // (Cartoon Pirate Voice - Ahoy.mp3, le même échantillon que l'ancien abordage).
  pirate_arrivee: [{ kind: 'sample', at: 0, dur: 1.411, g: 1 }],
  // L'autre accueil pirate, joué une arrivée sur deux : « Alright »
  // (Pirate_Dialogue_Alright.wav, 0,779 s — PCM 16 bits, 44,1 kHz, stéréo).
  pirate_dialogue: [{ kind: 'sample', at: 0, dur: 0.779, g: 1 }],
  // « My axe shall speak for me » pour quatre guerriers du Nord (2,259 s).
  [RPG_DWARF_DIALOGUE_SFX]: [{ kind: 'sample', at: 0, dur: 2.259, g: 1 }],
  // Un navire (type imprimé « Navire ») accoste : l'ambiance du quai
  // (Dock Sound_320k.mp3 — MPEG-1 Layer III, 320 kbps CBR, 48 kHz).
  navire_arrivee: [{ kind: 'sample', at: 0, dur: 2.352, g: 1 }],
  // Souffle froid du gel de masse : vent hivernal (cold-wind.wav, 2s, CC0/Pixabay).
  cold_wind: [{ kind: 'sample', at: 0, dur: 2.0, g: 1 }],
  // Impact de glace fourni par l'utilisateur (IceFoley6095_90_1.wav, 1,068 s).
  [RPG_FREEZE_IMPACT_SFX]: [{ kind: 'sample', at: 0, dur: 1.068, g: 1 }],
  // Thunder Spark Transition (MPEG-1 Layer III, 320 kbps, 44.1 kHz, 3.422 s).
  [RPG_FOUDRE_MARTEAU_SFX]: [{ kind: 'sample', at: 0, dur: 3.422, g: 1 }],
  // La flèche de l'Attaque ciblée (arrow-shot.wav, 0.55 s, PCM 16 bits,
  // 44,1 kHz mono — `tools/make-arrow-shot.mjs`).
  [RPG_ARROW_SFX]: [{ kind: 'sample', at: 0, dur: 0.55, g: 1 }],
};

/** Toutes les séquences nommées sont jouables par le lecteur et couvertes par les tests. */
export const RPG_SFX_NAMES = Object.freeze(Object.keys(RPG_SFX_TABLE));

/**
 * Les événements d'un bruitage, clonés à la demande. Les options restent des
 * nuances de synthèse (`filter`, `attack`, `send`) pour le seul son encore
 * généré — le survol. Tout nom inconnu renvoie `null` : le jeu se tait.
 */
export function rpgSfx(name) {
  const sequence = RPG_SFX_TABLE[name];
  return sequence ? sequence.map((event) => ({ ...event })) : null;
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
    this.volume = 1;
    this.cardPlaceAudio = null;
    this.cardDrawAudio = null;
    this.attackersConfirmAudio = null;
    this.playerAttackHitAudio = null;
    this.flameGustAudio = null;
    this.waterWaveAudio = null;
    this.cardCounteredAudio = null;
    this.creatureReturnAudio = null;
    this.blockImpactAudio = null;
    this.destructionHitAudio = null;
    this.pageTurnAudio = null;
    this.victoryCryAudio = null;
    this.gameLostAudio = null;
    this.hitAudio = null;
    this.pirateAhoyAudio = null;
    this.pirateDialogueAudio = null;
    this.dwarfDialogueAudio = null;
    this.chainRattleAudio = null;
    this.dockSoundAudio = null;
    this.coldWindAudio = null;
    this.iceFreezeAudio = null;
    this.foudreMarteauAudio = null;
    this.arrowShotAudio = null;
    // Voix d'arrivée : un élément `<audio>` par carte, construit à la première
    // entrée en jeu puis gardé pour le reste de la partie.
    this.cardVoiceAudios = new Map();
    this.cardVoiceCourante = null;
    // Départs différés des voix d'un même relevé d'arrivées.
    this.cardVoiceTimers = new Set();
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
        this.creatureReturnAudio = new AudioCtor(CREATURE_RETURN_SAMPLE_URL.href);
        this.creatureReturnAudio.preload = 'auto';
        this.creatureReturnAudio.volume = CREATURE_RETURN_VOLUME;
        this.blockImpactAudio = new AudioCtor(BLOCK_IMPACT_SAMPLE_URL.href);
        this.blockImpactAudio.preload = 'auto';
        this.blockImpactAudio.volume = BLOCK_IMPACT_VOLUME;
        this.destructionHitAudio = new AudioCtor(DESTRUCTION_HIT_SAMPLE_URL.href);
        this.destructionHitAudio.preload = 'auto';
        this.destructionHitAudio.volume = DESTRUCTION_HIT_VOLUME;
        this.pageTurnAudio = new AudioCtor(PAGE_TURN_SAMPLE_URL.href);
        this.pageTurnAudio.preload = 'auto';
        this.pageTurnAudio.volume = PAGE_TURN_VOLUME;
        this.victoryCryAudio = new AudioCtor(VICTORY_CRY_SAMPLE_URL.href);
        this.victoryCryAudio.preload = 'auto';
        this.victoryCryAudio.volume = VICTORY_CRY_VOLUME;
        this.gameLostAudio = new AudioCtor(GAME_LOST_SAMPLE_URL.href);
        this.gameLostAudio.preload = 'auto';
        this.gameLostAudio.volume = GAME_LOST_VOLUME;
        this.hitAudio = new AudioCtor(HIT_SAMPLE_URL.href);
        this.hitAudio.preload = 'auto';
        this.hitAudio.volume = HIT_VOLUME;
        this.pirateAhoyAudio = new AudioCtor(PIRATE_AHOY_SAMPLE_URL.href);
        this.pirateAhoyAudio.preload = 'auto';
        this.pirateAhoyAudio.volume = PIRATE_AHOY_VOLUME;
        this.pirateDialogueAudio = new AudioCtor(PIRATE_DIALOGUE_SAMPLE_URL.href);
        this.pirateDialogueAudio.preload = 'auto';
        this.pirateDialogueAudio.volume = PIRATE_DIALOGUE_VOLUME;
        this.dwarfDialogueAudio = new AudioCtor(DWARF_DIALOGUE_SAMPLE_URL.href);
        this.dwarfDialogueAudio.preload = 'auto';
        this.dwarfDialogueAudio.volume = DWARF_DIALOGUE_VOLUME;
        this.chainRattleAudio = new AudioCtor(CHAIN_RATTLE_SAMPLE_URL.href);
        this.chainRattleAudio.preload = 'auto';
        this.chainRattleAudio.volume = CHAIN_RATTLE_VOLUME;
        this.dockSoundAudio = new AudioCtor(DOCK_SOUND_SAMPLE_URL.href);
        this.dockSoundAudio.preload = 'auto';
        this.dockSoundAudio.volume = DOCK_SOUND_VOLUME;
        this.coldWindAudio = new AudioCtor(COLD_WIND_SAMPLE_URL.href);
        this.coldWindAudio.preload = 'auto';
        this.coldWindAudio.volume = COLD_WIND_VOLUME;
        this.iceFreezeAudio = new AudioCtor(ICE_FREEZE_SAMPLE_URL.href);
        this.iceFreezeAudio.preload = 'auto';
        this.iceFreezeAudio.volume = ICE_FREEZE_VOLUME;
        this.foudreMarteauAudio = new AudioCtor(FOUDRE_MARTEAU_SAMPLE_URL.href);
        this.foudreMarteauAudio.preload = 'auto';
        this.foudreMarteauAudio.volume = FOUDRE_MARTEAU_VOLUME;
        this.arrowShotAudio = new AudioCtor(ARROW_SHOT_SAMPLE_URL.href);
        this.arrowShotAudio.preload = 'auto';
        this.arrowShotAudio.volume = ARROW_SHOT_VOLUME;
      } catch { /* l’échantillon reste optionnel si Audio n’est pas disponible */ }
    }
  }

  effectiveMasterGain() {
    if (this.muted || this.volume <= 0) return MIN_GAIN;
    return Math.max(MIN_GAIN, MASTER_VOLUME * this.volume);
  }

  sampleVolume(baseVolume) {
    if (this.muted || this.volume <= 0) return 0;
    return Math.max(0, Math.min(1, baseVolume * this.volume));
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
      this.master.gain.value = this.effectiveMasterGain();

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

  syncOutputGain() {
    const silent = this.muted || this.volume <= 0;
    const samples = [
      [this.cardPlaceAudio, CARD_PLACE_VOLUME],
      [this.cardDrawAudio, CARD_DRAW_VOLUME],
      [this.attackersConfirmAudio, ATTACKERS_CONFIRM_VOLUME],
      [this.playerAttackHitAudio, PLAYER_ATTACK_HIT_VOLUME],
      [this.flameGustAudio, FLAME_GUST_VOLUME],
      [this.waterWaveAudio, WATER_WAVE_VOLUME],
      [this.cardCounteredAudio, CARD_COUNTERED_VOLUME],
      [this.creatureReturnAudio, CREATURE_RETURN_VOLUME],
      [this.blockImpactAudio, BLOCK_IMPACT_VOLUME],
      [this.destructionHitAudio, DESTRUCTION_HIT_VOLUME],
      [this.pageTurnAudio, PAGE_TURN_VOLUME],
      [this.victoryCryAudio, VICTORY_CRY_VOLUME],
      [this.gameLostAudio, GAME_LOST_VOLUME],
      [this.hitAudio, HIT_VOLUME],
      [this.pirateAhoyAudio, PIRATE_AHOY_VOLUME],
      [this.pirateDialogueAudio, PIRATE_DIALOGUE_VOLUME],
      [this.dwarfDialogueAudio, DWARF_DIALOGUE_VOLUME],
      [this.chainRattleAudio, CHAIN_RATTLE_VOLUME],
      [this.dockSoundAudio, DOCK_SOUND_VOLUME],
      [this.coldWindAudio, COLD_WIND_VOLUME],
      [this.iceFreezeAudio, ICE_FREEZE_VOLUME],
      [this.foudreMarteauAudio, FOUDRE_MARTEAU_VOLUME],
      [this.arrowShotAudio, ARROW_SHOT_VOLUME],
    ];
    for (const [audio, base] of samples) {
      if (!audio) continue;
      audio.volume = this.sampleVolume(base);
      if (silent) audio.pause?.();
    }
    // Les voix de cartes suivent la même règle : le son coupé les met en
    // pause, le volume du jeu les atténue.
    for (const voice of this.cardVoiceAudios.values()) {
      voice.volume = this.sampleVolume(CARD_VOICE_VOLUME);
      if (silent) voice.pause?.();
    }
    if (!this.master) return;
    const now = this.ctx?.currentTime ?? 0;
    const parameter = this.master.gain;
    const target = this.effectiveMasterGain();
    parameter.cancelScheduledValues?.(now);
    if (typeof parameter.setTargetAtTime === 'function') {
      parameter.setTargetAtTime(target, now, 0.035);
    } else {
      parameter.value = target;
    }
  }

  /**
   * Joue la voix d'arrivée d'une créature (`rpgArrivalVoiceUrl(carte)`).
   *
   * Une seule voix à la fois : une nouvelle arrivée coupe la précédente plutôt
   * que de la chevaucher — le duel ne pose qu'une carte par geste, et deux
   * répliques simultanées ne se comprennent pas. `delay` (secondes) décale le
   * départ : deux créatures posées d'un même relevé ne parlent pas en même
   * temps. Renvoie `true` quand la voix a été lancée (ou programmée), `false`
   * si le son est coupé, l'adresse vide ou le navigateur sans `Audio`.
   */
  playCardVoice(url, delay = 0) {
    if (!url || this.muted || this.volume <= 0) return false;
    const AudioCtor = typeof window !== 'undefined' ? window.Audio : null;
    if (typeof AudioCtor !== 'function') return false;
    const retard = Number.isFinite(Number(delay)) ? Math.max(0, Number(delay)) : 0;
    if (retard > 0.001) {
      const timer = setTimeout(() => {
        this.cardVoiceTimers.delete(timer);
        this.playCardVoiceNow(url, AudioCtor);
      }, retard * 1000);
      this.cardVoiceTimers.add(timer);
      return true;
    }
    return this.playCardVoiceNow(url, AudioCtor);
  }

  playCardVoiceNow(url, AudioCtor) {
    if (this.muted || this.volume <= 0) return false;
    try {
      let voice = this.cardVoiceAudios.get(url);
      if (!voice) {
        voice = new AudioCtor(url);
        voice.preload = 'auto';
        voice.volume = this.sampleVolume(CARD_VOICE_VOLUME);
        this.cardVoiceAudios.set(url, voice);
      }
      if (this.cardVoiceCourante && this.cardVoiceCourante !== voice) {
        try { this.cardVoiceCourante.pause(); } catch { /* déjà arrêtée */ }
      }
      this.cardVoiceCourante = voice;
      voice.currentTime = 0;
      voice.volume = this.sampleVolume(CARD_VOICE_VOLUME);
      const playback = voice.play();
      playback?.catch?.(() => {});
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.syncOutputGain();
  }

  setVolume(volume) {
    this.volume = clampRpgVolume(volume);
    this.syncOutputGain();
  }

  play(name, delay = 0) {
    if (!this.ctx || !this.master || this.muted || this.volume <= 0) return;
    if (name === 'card_place' || name === 'card_draw' || name === 'attackers_confirm' || name === 'player_attack_hit' || name === 'flame_gust' || name === 'water_wave' || name === 'card_countered' || name === 'creature_return' || name === 'block_impact' || name === 'destruction_hit' || name === 'page_turn' || name === 'victoire' || name === 'defaite' || name === 'degats' || name === 'degats_sorcier' || name === 'abordage' || name === 'pirate_arrivee' || name === 'pirate_dialogue' || name === RPG_DWARF_DIALOGUE_SFX || name === 'navire_arrivee' || name === 'cold_wind' || name === RPG_FREEZE_IMPACT_SFX || name === RPG_FOUDRE_MARTEAU_SFX || name === RPG_ARROW_SFX) {
      const sample = name === 'card_place'
        ? this.cardPlaceAudio
        : name === 'card_draw' ? this.cardDrawAudio
          : name === 'attackers_confirm' ? this.attackersConfirmAudio
                : name === 'player_attack_hit' ? this.playerAttackHitAudio
                : name === 'flame_gust' ? this.flameGustAudio
                : name === 'water_wave' ? this.waterWaveAudio
                : name === 'card_countered' ? this.cardCounteredAudio
                : name === 'creature_return' ? this.creatureReturnAudio
                : name === 'block_impact' ? this.blockImpactAudio
                  : name === 'destruction_hit' ? this.destructionHitAudio : name === 'page_turn' ? this.pageTurnAudio : name === 'victoire' ? this.victoryCryAudio : name === 'defaite' ? this.gameLostAudio : name === 'abordage' ? this.chainRattleAudio : name === 'pirate_arrivee' ? this.pirateAhoyAudio : name === 'pirate_dialogue' ? this.pirateDialogueAudio : name === RPG_DWARF_DIALOGUE_SFX ? this.dwarfDialogueAudio : name === 'navire_arrivee' ? this.dockSoundAudio : name === 'cold_wind' ? this.coldWindAudio : name === RPG_FREEZE_IMPACT_SFX ? this.iceFreezeAudio : name === RPG_FOUDRE_MARTEAU_SFX ? this.foudreMarteauAudio : name === RPG_ARROW_SFX ? this.arrowShotAudio : this.hitAudio;
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
    if (this.creatureReturnAudio) {
      try {
        this.creatureReturnAudio.pause?.();
        this.creatureReturnAudio.removeAttribute?.('src');
        this.creatureReturnAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.creatureReturnAudio = null;
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
    if (this.victoryCryAudio) {
      try {
        this.victoryCryAudio.pause?.();
        this.victoryCryAudio.removeAttribute?.('src');
        this.victoryCryAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.victoryCryAudio = null;
    if (this.gameLostAudio) {
      try {
        this.gameLostAudio.pause?.();
        this.gameLostAudio.removeAttribute?.('src');
        this.gameLostAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.gameLostAudio = null;
    if (this.hitAudio) {
      try {
        this.hitAudio.pause?.();
        this.hitAudio.removeAttribute?.('src');
        this.hitAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.hitAudio = null;
    if (this.pirateAhoyAudio) {
      try {
        this.pirateAhoyAudio.pause?.();
        this.pirateAhoyAudio.removeAttribute?.('src');
        this.pirateAhoyAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.pirateAhoyAudio = null;
    if (this.pirateDialogueAudio) {
      try {
        this.pirateDialogueAudio.pause?.();
        this.pirateDialogueAudio.removeAttribute?.('src');
        this.pirateDialogueAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.pirateDialogueAudio = null;
    if (this.dwarfDialogueAudio) {
      try {
        this.dwarfDialogueAudio.pause?.();
        this.dwarfDialogueAudio.removeAttribute?.('src');
        this.dwarfDialogueAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.dwarfDialogueAudio = null;
    if (this.chainRattleAudio) {
      try {
        this.chainRattleAudio.pause?.();
        this.chainRattleAudio.removeAttribute?.('src');
        this.chainRattleAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.chainRattleAudio = null;
    if (this.dockSoundAudio) {
      try {
        this.dockSoundAudio.pause?.();
        this.dockSoundAudio.removeAttribute?.('src');
        this.dockSoundAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.dockSoundAudio = null;
    if (this.coldWindAudio) {
      try {
        this.coldWindAudio.pause?.();
        this.coldWindAudio.removeAttribute?.('src');
        this.coldWindAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.coldWindAudio = null;
    if (this.iceFreezeAudio) {
      try {
        this.iceFreezeAudio.pause?.();
        this.iceFreezeAudio.removeAttribute?.('src');
        this.iceFreezeAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.iceFreezeAudio = null;
    if (this.foudreMarteauAudio) {
      try {
        this.foudreMarteauAudio.pause?.();
        this.foudreMarteauAudio.removeAttribute?.('src');
        this.foudreMarteauAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.foudreMarteauAudio = null;
    if (this.arrowShotAudio) {
      try {
        this.arrowShotAudio.pause?.();
        this.arrowShotAudio.removeAttribute?.('src');
        this.arrowShotAudio.load?.();
      } catch { /* élément audio déjà libéré */ }
    }
    this.arrowShotAudio = null;
    if (this.cardVoiceTimers) {
      for (const timer of this.cardVoiceTimers) clearTimeout(timer);
      this.cardVoiceTimers.clear();
    }
    if (this.cardVoiceAudios) {
      for (const voice of this.cardVoiceAudios.values()) {
        try {
          voice.pause?.();
          voice.removeAttribute?.('src');
          voice.load?.();
        } catch { /* élément audio déjà libéré */ }
      }
      this.cardVoiceAudios.clear();
    }
    this.cardVoiceCourante = null;
    if (context && typeof context.close === 'function') {
      try { context.close(); } catch { /* Contexte déjà fermé. */ }
    }
  }
}
