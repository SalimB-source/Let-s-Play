/**
 * Signature sonore — « Le Sablier ».
 *
 * **Tout le son du jeu sort d'un fichier.** Les bruitages (cartes, frappes,
 * souffle du feu, vagues, contres, renvois, chocs, pages, cri de victoire
 * viking et fanfare de défaite, coups blessants) sont les échantillons
 * fournis, les voix d'arrivée des créatures sont des MP3
 * (`rpgArrivalVoices.js`, préchargés par `prechargerVoix` puis joués par
 * `playCardVoice`), et l'effleurement de survol lui-même est un extrait du vrai
 * enregistrement de carte (`hover.wav`, découpé par `tools/make-son-survol.py`).
 *
 * Il n'y a **plus une seule forme d'onde fabriquée par du code** : le moteur
 * de synthèse (oscillateurs, bruit blanc, réverbération de convolution) a été
 * supprimé. Un nom absent du catalogue se joue en silence — il n'existe pas de
 * repli synthétique pour le masquer.
 *
 * Tous ces fichiers sont joués **au même niveau d'écoute** : chaque échantillon
 * est mesuré (LUFS, ITU-R BS.1770) et son gain en découle — voir
 * `rpgNiveauxSons.js`, engendré par `tools/mesure-sons-sablier.py`. Le lecteur
 * applique ce gain par un nœud WebAudio, dans un bus commun qui finit sur un
 * limiteur ; sans routage des médias, il retombe sur le volume de l'élément.
 *
 * Deux couches :
 *  - `rpgSfx()` décrit le catalogue (un événement `sample` par nom), facile à
 *    tester ;
 *  - `RpgAudioPlayer` ne s'éveille qu'après un geste joueur, ménage les pics
 *    de volume et se tait si WebAudio manque ou si le joueur coupe le son.
 */

import { RPG_DWARF_DIALOGUE_SFX } from './rpgDwarfAudio.js';
import { gainEchantillon, gainVoixArrivee } from './rpgNiveauxSons.js';

/** Tonnerre partagé par l'Éclair du marteau et l'arrivée du Maître. */
export const RPG_FOUDRE_MARTEAU_SFX = 'foudre_marteau';

/**
 * La dose du survol : le seul son du jeu qui n'est pas un événement, mais un
 * effleurement. Il se déclenche à chaque carte touchée, parfois plusieurs fois
 * par seconde, et **les cartes de la main** en sont le terrain de jeu — le
 * joueur les balaie du regard en permanence. Il reste donc très **sous** le
 * niveau commun : son fichier mesure -11,4 LUFS, et à 0,05 il joue vers
 * -37,4 LUFS, soit 17,4 dB sous les bruitages de table. C'est un froissement
 * qu'on distingue à peine — le geste se voit, le son se devine.
 */
const DOSE_SURVOL = 0.05;

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
  // L'effleurement de survol : un extrait du vrai enregistrement de carte, pas
  // une sinusoïde (`tools/make-son-survol.py`).
  ['hover', new URL('./assets/hover.wav', import.meta.url), 'hoverAudio'],
  ['card_draw', new URL('./assets/card-draw.wav', import.meta.url), 'cardDrawAudio'],
  ['attackers_confirm', new URL('./assets/attackers-confirm.mp3', import.meta.url), 'attackersConfirmAudio'],
  ['player_attack_hit', new URL('./assets/player-attack-hit.wav', import.meta.url), 'playerAttackHitAudio'],
  ['flame_gust', new URL('./assets/flame-gust.wav', import.meta.url), 'flameGustAudio'],
  ['card_countered', new URL('./assets/card-countered.wav', import.meta.url), 'cardCounteredAudio'],
  ['creature_return', new URL('./assets/creature-return.wav', import.meta.url), 'creatureReturnAudio'],
  ['block_impact', new URL('./assets/block-impact.mp3', import.meta.url), 'blockImpactAudio'],
  ['destruction_hit', new URL('./assets/destruction-hit.mp3', import.meta.url), 'destructionHitAudio'],
  ['page_turn', new URL('./assets/page-turn.mp3', import.meta.url), 'pageTurnAudio'],
  ['victoire', new URL('./assets/viking-warrior-battle-cry-with-horn.mp3', import.meta.url), 'victoryCryAudio'],
  ['furie_viking', new URL('./assets/furie-viking.mp3', import.meta.url), 'furieVikingAudio'],
  ['furie_viking_femelle', new URL('./assets/furie-viking-femelle.mp3', import.meta.url), 'furieVikingFemelleAudio'],
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

/**
 * Le catalogue du duel : un événement `sample` par nom jouable. Chaque entrée
 * documente la durée du fichier et sa **dose** — le facteur appliqué au gain
 * mesuré du fichier (`rpgNiveauxSons.js`). Toutes les doses valent 1 : le
 * niveau commun suffit. Seul le survol garde une dose discrète, parce qu'un
 * effleurement n'est pas un événement.
 *
 * Aucune entrée n'est synthétisée : le moteur de synthèse a été retiré, et un
 * nom absent d'ici se joue en silence.
 */
const RPG_SFX_TABLE = {
  // Interface : le froissement d'une carte effleurée.
  hover: [{ kind: 'sample', at: 0, dur: 0.08, g: DOSE_SURVOL }],

  // Les échantillons fournis, dans `src/games/assets/`.
  card_draw: [{ kind: 'sample', at: 0, dur: 0.7, g: 1 }],
  attackers_confirm: [{ kind: 'sample', at: 0, dur: 0.7, g: 1 }],
  player_attack_hit: [{ kind: 'sample', at: 0, dur: 0.666, g: 1 }],
  flame_gust: [{ kind: 'sample', at: 0, dur: 2.287, g: 1 }],
  card_countered: [{ kind: 'sample', at: 0, dur: 1.602, g: 1 }],
  creature_return: [{ kind: 'sample', at: 0, dur: 1.585, g: 1 }],
  block_impact: [{ kind: 'sample', at: 0, dur: 0.967, g: 1 }],
  destruction_hit: [{ kind: 'sample', at: 0, dur: 1.698, g: 1 }],
  page_turn: [{ kind: 'sample', at: 0, dur: 1.097, g: 1 }],
  // Cri de guerre viking (viking-warrior-battle-cry-with-horn.mp3, 2,56 s).
  victoire: [{ kind: 'sample', at: 0, dur: 2.56, g: 1 }],
  // Cri de Furie viking fourni par le joueur (furie-viking.mp3, 1,512 s).
  furie_viking: [{ kind: 'sample', at: 0, dur: 1.512, g: 1 }],
  // Cri féminin de Furie viking fourni par le joueur (1,512 s).
  furie_viking_femelle: [{ kind: 'sample', at: 0, dur: 1.512, g: 1 }],
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
 * Les événements d'un bruitage, clonés à la demande. Tout nom inconnu renvoie
 * `null` : le jeu se tait — il n'y a pas de repli synthétique.
 */
export function rpgSfx(name) {
  const sequence = RPG_SFX_TABLE[name];
  return sequence ? sequence.map((event) => ({ ...event })) : null;
}

const RPG_VIKINGS_FEMININES_FURIE = new Set([
  'volva-soigneuse',
  'valkyrie-au-corbeau',
  'valkyrie-des-glaces',
  'valkyrie-des-neuf-nuits',
]);
const RPG_NOMS_VIKINGS_FEMININES_FURIE = new Set([
  'Völva soigneuse',
  'Valkyrie au corbeau',
  'Valkyrie des glaces',
  'Valkyrie des neuf nuits',
]);

/** Les groupes de cris distincts à jouer pour les créatures qui viennent
 *  réellement d’entrer en Furie durant une même résolution de combat. */
export function rpgSonsFurie(activations = []) {
  const furies = Array.isArray(activations) ? activations : [];
  const estFurieVikingFeminine = ({ carteId, name }) => (
    RPG_VIKINGS_FEMININES_FURIE.has(carteId) || RPG_NOMS_VIKINGS_FEMININES_FURIE.has(name)
  );
  const sons = [];
  if (furies.some(estFurieVikingFeminine)) {
    sons.push('furie_viking_femelle');
  }
  if (furies.some((activation) => !estFurieVikingFeminine(activation))) {
    sons.push('furie_viking');
  }
  return sons;
}

/** Retrouve les entrées en Furie depuis les nouvelles lignes du journal du duel. */
export function rpgActivationsFurieDepuisJournal(lignes = []) {
  if (!Array.isArray(lignes)) return [];
  return lignes
    .map((ligne) => /^(.+?) entre en furie\b/.exec(String(ligne))?.[1])
    .filter(Boolean)
    .map((name) => ({ name }));
}

/** Lecteur WebAudio : muet tant que `unlock()` n'a pas suivi un geste joueur. */
export class RpgAudioPlayer {
  constructor() {
    this.ctx = null;
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
    this.sampleTimers = new Set();

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
        // Le niveau mesuré du fichier, corrigé de sa dose de catalogue : le
        // survol est le seul à en avoir une (un effleurement, pas un événement).
        const dose = rpgSfx(nom)?.[0]?.g ?? 1;
        entree = { nom, audio, gain: gainEchantillon(nom) * dose, noeud: null };
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

  /**
   * Le gain d'un échantillon : son niveau mesuré (`rpgNiveauxSons.js`) fois sa
   * dose de catalogue fois le volume des sons choisi par le joueur. Il peut
   * dépasser 1 — c'est tout l'intérêt du nœud de gain WebAudio : l'ambiance de
   * quai, mesurée à -23 LUFS, remonte de 3 dB pour rejoindre les autres.
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

      // Toute la sortie est celle des échantillons : chaque fichier arrive par
      // son propre nœud, au niveau commun, et le limiteur du bus écrête les
      // fichiers remontés au-delà de la pleine échelle et les sons superposés.
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

  /**
   * L'élément d'une voix, créé à la première demande — lecture **ou simple
   * préchargement** — puis gardé pour le reste de la partie.
   *
   * Le niveau de la voix vient de la mesure de son fichier
   * (`rpgNiveauxSons.js`) : les voix enregistrées très bas — « Celle qui
   * pèse », « La dame des neufs mondes », le Tengu — remontent au même niveau
   * d'écoute que les bruitages de table.
   */
  entreeVoix(url, AudioCtor) {
    let entree = this.voixEntrees.get(url);
    if (entree) return entree;
    const audio = new AudioCtor(url);
    audio.preload = 'auto';
    entree = { nom: url, audio, gain: gainVoixArrivee(url), noeud: null };
    audio.volume = this.volumeElement(entree);
    this.voixEntrees.set(url, entree);
    // `cardVoiceAudios` reste la carte des éléments, lue par les tests et
    // par la salle d'écoute.
    this.cardVoiceAudios.set(url, audio);
    this.routerEchantillon(entree);
    return entree;
  }

  /**
   * Prépare la voix d'une carte **sans la jouer**.
   *
   * La voix d'arrivée précède sa créature : elle part au geste qui pose la
   * carte. Encore faut-il que le fichier soit là — sinon le premier `<audio>`
   * télécharge son MP3 et la réplique n'arrive qu'une fois la créature déjà
   * sur le plateau. Préchargé en silence, l'échantillon démarre à l'instant du
   * geste. Renvoie `true` quand l'élément est prêt (ou l'était déjà).
   */
  prechargerVoix(url) {
    if (!url) return false;
    const AudioCtor = typeof window !== 'undefined' ? window.Audio : null;
    if (typeof AudioCtor !== 'function') return false;
    try {
      return Boolean(this.entreeVoix(url, AudioCtor)?.audio);
    } catch {
      return false;
    }
  }

  /**
   * Coupe la voix en cours : une créature contrée n'achève pas son cri, et la
   * voix suivante ne doit pas hériter du sien.
   */
  couperVoix() {
    const entree = this.cardVoiceCourante;
    this.cardVoiceCourante = null;
    if (!entree?.audio) return;
    try {
      entree.audio.pause();
      entree.audio.currentTime = 0;
    } catch { /* élément déjà arrêté */ }
  }

  playCardVoiceNow(url, AudioCtor) {
    if (this.muted || this.volume <= 0) return false;
    try {
      const entree = this.entreeVoix(url, AudioCtor);
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
    if (!this.ctx || this.muted || this.volume <= 0) return;
    const entree = this.echantillonsParNom.get(name);
    if (!entree) return;                     // pas de fichier : pas de son
    if (!entree.audio) return;
    const delai = Number.isFinite(Number(delay)) ? Math.max(0, Number(delay)) : 0;
    let timer = null;
    const lancer = () => {
      if (timer !== null) this.sampleTimers.delete(timer);
      if (!this.ctx || this.muted || this.volume <= 0 || !entree.audio) return;
      // Le contexte a pu s'ouvrir après la construction du lecteur : c'est ici
      // que l'échantillon rejoint son bus, juste avant sa lecture.
      this.routerEchantillon(entree);
      this.appliquerGain(entree);
      try {
        entree.audio.currentTime = 0;
        const playback = entree.audio.play();
        playback?.catch?.(() => {});
      } catch { /* le navigateur peut refuser la lecture sans geste utilisateur */ }
    };
    if (delai > 0) {
      timer = setTimeout(lancer, delai * 1000);
      this.sampleTimers.add(timer);
      return;
    }
    lancer();
  }

  destroy() {
    const context = this.ctx;
    this.ctx = null;
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
    if (this.sampleTimers) {
      for (const timer of this.sampleTimers) clearTimeout(timer);
      this.sampleTimers.clear();
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
