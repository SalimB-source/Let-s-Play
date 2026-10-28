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
 * Tous ces fichiers sont joués **au même niveau d'écoute** : chaque échantillon
 * est mesuré (LUFS, ITU-R BS.1770) et son gain en découle — voir
 * `rpgNiveauxSons.js`, engendré par `tools/mesure-sons-sablier.py`. Le lecteur
 * applique ce gain par un nœud WebAudio, dans un bus commun qui finit sur un
 * limiteur ; sans routage des médias, il retombe sur le volume de l'élément.
 *
 * Deux couches :
 *  - `hz()` et `rpgSfx()` décrivent des événements purs, faciles à tester ;
 *  - `RpgAudioPlayer` ne s'éveille qu'après un geste joueur, ménage les pics
 *    de volume et se tait si WebAudio manque ou si le joueur coupe le son.
 */

import { RPG_DWARF_DIALOGUE_SFX } from './rpgDwarfAudio.js';
import { gainEchantillon, gainVoixArrivee } from './rpgNiveauxSons.js';

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
/**
 * Le registre des échantillons du duel : nom du bruitage, fichier livré dans
 * `assets/`, et champ historique du lecteur (les tests et la page de la salle
 * d'écoute lisent encore `player.arrowShotAudio`).
 *
 * Chaque fichier est joué par son propre élément `<audio>`, puis ramené au
 * **même niveau d'écoute** que tous les autres sons du jeu par un gain calculé
 * à partir de sa mesure (`rpgNiveauxSons.js`, mesuré par
 * `tools/mesure-sons-sablier.py`). Les anciennes constantes de volume, réglées
 * à la main entre 0,5 et 0,64, laissaient trente-deux décibels d'écart entre la
 * pose d'une carte et un coup d'épée.
 */
const ECHANTILLONS_FICHIERS = Object.freeze([
  ['card_place', new URL('./assets/card-place.wav', import.meta.url), 'cardPlaceAudio'],
  ['card_draw', new URL('./assets/card-draw.wav', import.meta.url), 'cardDrawAudio'],
  ['attackers_confirm', new URL('./assets/attackers-confirm.mp3', import.meta.url), 'attackersConfirmAudio'],
  ['player_attack_hit', new URL('./assets/player-attack-hit.wav', import.meta.url), 'playerAttackHitAudio'],
  ['flame_gust', new URL('./assets/flame-gust.wav', import.meta.url), 'flameGustAudio'],
  ['water_wave', new URL('./assets/water-wave.wav', import.meta.url), 'waterWaveAudio'],
  ['card_countered', new URL('./assets/card-countered.wav', import.meta.url), 'cardCounteredAudio'],
  ['creature_return', new URL('./assets/creature-return.wav', import.meta.url), 'creatureReturnAudio'],
  ['block_impact', new URL('./assets/block-impact.mp3', import.meta.url), 'blockImpactAudio'],
  ['destruction_hit', new URL('./assets/destruction-hit.mp3', import.meta.url), 'destructionHitAudio'],
  ['page_turn', new URL('./assets/page-turn.mp3', import.meta.url), 'pageTurnAudio'],
  ['victoire', new URL('./assets/viking-warrior-battle-cry-with-horn.mp3', import.meta.url), 'victoryCryAudio'],
  ['defaite', new URL('./assets/game-lost.mp3', import.meta.url), 'gameLostAudio'],
  // Le même coup sec sert la blessure des deux camps.
  ['degats', new URL('./assets/hit.wav', import.meta.url), 'hitAudio'],
  ['degats_sorcier', new URL('./assets/hit.wav', import.meta.url), 'hitAudio'],
  // Prise en cale par Abordage : cliquetis de chaînes métalliques.
  ['abordage', new URL('./assets/chain-rattle.wav', import.meta.url), 'chainRattleAudio'],
  // Une carte pirate jouée depuis la main entre en jeu : « Ahoy ! ».
  ['pirate_arrivee', new URL('./assets/pirate-ahoy.mp3', import.meta.url), 'pirateAhoyAudio'],
  // L'autre accueil pirate, joué une arrivée sur deux : « Alright ».
  ['pirate_dialogue', new URL('./assets/pirate-dialogue-alright.wav', import.meta.url), 'pirateDialogueAudio'],
  // « My axe shall speak for me » pour les guerriers du Nord.
  ['dwarf_dialogue', new URL('./assets/dwarf-dialogue-my-axe-shall-speak-for-me.wav', import.meta.url), 'dwarfDialogueAudio'],
  // Un navire accoste : l'ambiance du quai.
  ['navire_arrivee', new URL('./assets/dock-sound.mp3', import.meta.url), 'dockSoundAudio'],
  // Souffle froid du gel de masse : vent hivernal.
  ['cold_wind', new URL('./assets/cold-wind.wav', import.meta.url), 'coldWindAudio'],
  // Impact de glace fourni (IceFoley6095_90_1.wav).
  ['freeze_impact', new URL('./assets/ice-freeze.wav', import.meta.url), 'iceFreezeAudio'],
  // Thunder Spark Transition, partagé par l'Éclair du marteau et l'arrivée du Maître.
  ['foudre_marteau', new URL('./assets/thunder-spark-transition-full.mp3', import.meta.url), 'foudreMarteauAudio'],
  // La flèche de l'Attaque ciblée : un échantillon généré par
  // `tools/make-arrow-shot.mjs` (corde lâchée + souffle du trait + empennage).
  ['fleche', new URL('./assets/arrow-shot.wav', import.meta.url), 'arrowShotAudio'],
]);

/** Les noms des échantillons jouables, dans l'ordre du registre. */
export const RPG_ECHANTILLONS_NAMES = Object.freeze(ECHANTILLONS_FICHIERS.map(([nom]) => nom));

/**
 * Le bus des échantillons : tous les fichiers du duel s'y rejoignent, avant un
 * limiteur de secours. Le gain de chaque fichier est déjà borné par sa crête
 * (`rpgNiveauxSons.js`), et les fichiers trop pointus ont été remontés dans le
 * fichier même : le limiteur ne sert plus qu'aux sons qui se superposent — deux
 * frappes et une voix sur la même image.
 */
const LIMITEUR_ECHANTILLONS = Object.freeze({
  threshold: -0.3,
  knee: 1,
  ratio: 20,
  attack: 0.001,
  release: 0.2,
});

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
 * ciblée d'une créature (coup rapide, 30 % de chances de rater) est un tir à
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
    // Le bus des échantillons : un nœud de gain par fichier — c'est lui qui
    // applique le niveau mesuré — puis un limiteur avant la sortie.
    this.busEchantillons = null;
    this.limiteurEchantillons = null;
    // Le registre vivant : `{ nom, audio, gain, noeud }`, un par fichier. Deux
    // noms peuvent partager le même fichier (`degats`, `degats_sorcier`) : ils
    // partagent alors l'élément et son nœud.
    this.echantillons = [];
    this.echantillonsParNom = new Map();
    // Voix d'arrivée : un élément `<audio>` par carte, construit à la première
    // entrée en jeu puis gardé pour le reste de la partie.
    this.cardVoiceAudios = new Map();
    this.voixEntrees = new Map();
    this.cardVoiceCourante = null;
    // Départs différés des voix d'un même relevé d'arrivées.
    this.cardVoiceTimers = new Set();

    const AudioCtor = typeof window !== 'undefined' ? window.Audio : null;
    const parUrl = new Map();
    for (const [nom, url, champ] of ECHANTILLONS_FICHIERS) {
      let entree = parUrl.get(url.href);
      if (!entree) {
        let audio = null;
        if (typeof AudioCtor === 'function') {
          try {
            audio = new AudioCtor(url.href);
            audio.preload = 'auto';
          } catch { /* l’échantillon reste optionnel si Audio n’est pas disponible */ }
        }
        entree = { nom, audio, gain: gainEchantillon(nom), noeud: null };
        if (audio) audio.volume = this.volumeElement(entree);
        parUrl.set(url.href, entree);
        this.echantillons.push(entree);
      }
      this.echantillonsParNom.set(nom, entree);
      // Le champ historique reste lisible (`player.arrowShotAudio`,
      // `player.foudreMarteauAudio`…) et repasse à null au démontage.
      this[champ] = entree.audio;
    }
  }

  effectiveMasterGain() {
    if (this.muted || this.volume <= 0) return MIN_GAIN;
    return Math.max(MIN_GAIN, MASTER_VOLUME * this.volume);
  }

  /**
   * Le gain d'un échantillon : son niveau mesuré (`rpgNiveauxSons.js`) fois le
   * volume des sons choisi par le joueur. Il peut dépasser 1 — c'est tout
   * l'intérêt du nœud de gain WebAudio : l'ambiance de quai, mesurée à
   * -23 LUFS, remonte de 3 dB pour rejoindre les autres.
   */
  gainEchantillon(entree) {
    if (!entree || this.muted || this.volume <= 0) return 0;
    return entree.gain * this.volume;
  }

  /**
   * Le volume d'élément `<audio>`, borné à 1 par la norme. Il ne sert que de
   * repli quand le fichier ne peut pas passer par le nœud de gain (navigateur
   * sans `createMediaElementSource`) : les sons remontés y perdent alors ce
   * que la pleine échelle ne permet pas.
   */
  volumeElement(entree) {
    return Math.max(0, Math.min(1, this.gainEchantillon(entree)));
  }

  /** Applique le gain courant à une entrée, par son nœud ou, à défaut, par son élément. */
  appliquerGain(entree) {
    if (!entree) return;
    const gain = this.gainEchantillon(entree);
    if (entree.noeud) {
      entree.noeud.gain.value = gain;
      if (entree.audio) entree.audio.volume = 1;
    } else if (entree.audio) {
      entree.audio.volume = Math.max(0, Math.min(1, gain));
    }
    if (gain <= 0 && entree.audio) {
      try { entree.audio.pause?.(); } catch { /* élément déjà arrêté */ }
    }
  }

  /**
   * Fait passer un échantillon par son nœud de gain, dans le bus du duel.
   *
   * Un élément `<audio>` ne peut être branché qu'une fois (`createMediaElementSource`
   * refuse la seconde fois) : le nœud est donc mémorisé sur l'entrée. Un
   * navigateur sans routage des médias, ou un contexte refusé, laisse
   * l'échantillon sur son élément — il joue, simplement sans le gain des sons
   * remontés.
   */
  routerEchantillon(entree) {
    if (!entree || entree.noeud || !entree.audio) return;
    const context = this.ctx;
    if (!context || !this.busEchantillons) return;
    if (typeof context.createMediaElementSource !== 'function') return;
    try {
      const source = context.createMediaElementSource(entree.audio);
      const noeud = context.createGain();
      noeud.gain.value = this.gainEchantillon(entree);
      source.connect(noeud);
      noeud.connect(this.busEchantillons);
      entree.noeud = noeud;
      entree.source = source;
      entree.audio.volume = 1;
    } catch {
      entree.noeud = null;
      entree.audio.volume = this.volumeElement(entree);
    }
  }

  /** Rend un élément `<audio>` au navigateur (démontage, ou voix remplacée). */
  libererAudio(audio) {
    if (!audio) return;
    try {
      audio.pause?.();
      audio.removeAttribute?.('src');
      audio.load?.();
    } catch { /* élément audio déjà libéré */ }
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

      // Le bus des échantillons ne passe pas par le gain maître : les fichiers
      // sont déjà ramenés au niveau commun par leur propre nœud, et le gain
      // maître est calibré pour les synthèses (0,22). Le limiteur du bus
      // écrête les trois fichiers remontés au-delà de la pleine échelle et
      // empêche deux sons superposés de saturer.
      this.busEchantillons = context.createGain();
      this.busEchantillons.gain.value = 1;
      if (typeof context.createDynamicsCompressor === 'function') {
        this.limiteurEchantillons = context.createDynamicsCompressor();
        this.limiteurEchantillons.threshold.value = LIMITEUR_ECHANTILLONS.threshold;
        this.limiteurEchantillons.knee.value = LIMITEUR_ECHANTILLONS.knee;
        this.limiteurEchantillons.ratio.value = LIMITEUR_ECHANTILLONS.ratio;
        this.limiteurEchantillons.attack.value = LIMITEUR_ECHANTILLONS.attack;
        this.limiteurEchantillons.release.value = LIMITEUR_ECHANTILLONS.release;
        this.busEchantillons.connect(this.limiteurEchantillons);
        this.limiteurEchantillons.connect(context.destination);
      } else {
        this.busEchantillons.connect(context.destination);
      }
    } catch {
      this.ctx = null;
      this.master = null;
      this.sfxBus = null;
      this.limiter = null;
      this.reverb = null;
      this.reverbFilter = null;
      this.reverbReturn = null;
      this.busEchantillons = null;
      this.limiteurEchantillons = null;
      if (context && typeof context.close === 'function') {
        try { context.close(); } catch { /* Contexte incomplet ou déjà fermé. */ }
      }
      return;
    }

    if (context.state === 'suspended' && typeof context.resume === 'function') context.resume().catch(() => {});

    for (const entree of this.echantillons) this.routerEchantillon(entree);
  }

  syncOutputGain() {
    // Chaque échantillon porte son niveau mesuré : le volume du jeu les
    // atténue tous ensemble, le son coupé les met en pause.
    for (const entree of this.echantillons) this.appliquerGain(entree);
    // Les voix de cartes suivent la même règle — chacune avec son niveau.
    for (const entree of this.voixEntrees.values()) this.appliquerGain(entree);
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
      let entree = this.voixEntrees.get(url);
      if (!entree) {
        const audio = new AudioCtor(url);
        audio.preload = 'auto';
        // Le niveau de la voix vient de la mesure de son fichier
        // (`rpgNiveauxSons.js`) : les voix enregistrées très bas — « Celle qui
        // pèse », « La dame des neufs mondes », le Tengu — remontent au même
        // niveau d'écoute que les bruitages de table.
        entree = { nom: url, audio, gain: gainVoixArrivee(url), noeud: null };
        audio.volume = this.volumeElement(entree);
        this.voixEntrees.set(url, entree);
        // `cardVoiceAudios` reste la carte des éléments, lue par les tests et
        // par la salle d'écoute.
        this.cardVoiceAudios.set(url, audio);
        this.routerEchantillon(entree);
      }
      if (this.cardVoiceCourante && this.cardVoiceCourante !== entree) {
        try { this.cardVoiceCourante.audio.pause(); } catch { /* déjà arrêtée */ }
      }
      this.cardVoiceCourante = entree;
      this.appliquerGain(entree);
      entree.audio.currentTime = 0;
      const playback = entree.audio.play();
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
    const entree = this.echantillonsParNom.get(name);
    if (entree) {
      if (!entree.audio) return;
      // Le contexte a pu s'ouvrir après la construction du lecteur : c'est ici
      // que l'échantillon rejoint le bus, s'il ne l'a pas déjà fait.
      this.routerEchantillon(entree);
      this.appliquerGain(entree);
      try {
        entree.audio.currentTime = 0;
        const playback = entree.audio.play();
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
    this.busEchantillons = null;
    this.limiteurEchantillons = null;
    for (const entree of this.echantillons) {
      this.libererAudio(entree.audio);
      try {
        entree.source?.disconnect?.();
        entree.noeud?.disconnect?.();
      } catch { /* nœud déjà libéré */ }
      entree.noeud = null;
      entree.source = null;
      entree.audio = null;
    }
    // Les champs historiques (`player.arrowShotAudio`…) repassent à null.
    for (const [, , champ] of ECHANTILLONS_FICHIERS) this[champ] = null;
    if (this.cardVoiceTimers) {
      for (const timer of this.cardVoiceTimers) clearTimeout(timer);
      this.cardVoiceTimers.clear();
    }
    if (this.voixEntrees) {
      for (const entree of this.voixEntrees.values()) {
        try {
          entree.source?.disconnect?.();
          entree.noeud?.disconnect?.();
        } catch { /* nœud déjà libéré */ }
      }
      this.voixEntrees.clear();
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
