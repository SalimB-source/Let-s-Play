/**
 * Le niveau d'écoute commun des sons du Sablier.
 *
 * Le duel jouait ses échantillons à volume d'élément presque égal (0,5 à 0,64),
 * alors que les fichiers eux-mêmes vont de -37 LUFS (la pose d'une carte) à
 * -6 LUFS (le coup d'épée) : trente-deux décibels d'écart, une carte inaudible
 * et une frappe assourdissante. `rpgNiveauxSons.js` porte la mesure de chaque
 * fichier, et le lecteur en déduit un gain qui ramène tout le monde au même
 * niveau perçu.
 *
 * Ces tests figent trois choses : la table est complète (aucun son du jeu ne
 * joue à son niveau d'origine), le gain de chacun atteint bien le niveau
 * commun, et le lecteur applique ce gain — par un nœud WebAudio quand le
 * navigateur sait router un élément `<audio>`, par le volume de l'élément
 * sinon.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_ECHANTILLONS_NAMES,
  RPG_SFX_NAMES,
  RpgAudioPlayer,
  rpgSfx,
} from '../src/games/rpgAudio.js';
import {
  RPG_NIVEAU_CIBLE_LUFS,
  RPG_NIVEAUX_ECHANTILLONS,
  RPG_NIVEAUX_VOIX,
  RPG_PLAFOND_CRETE_DBFS,
  gainDepuisCrete,
  gainDepuisNiveau,
  gainEchantillon,
  gainVoixArrivee,
} from '../src/games/rpgNiveauxSons.js';
import { RPG_ARRIVAL_VOICE_FILES } from '../src/games/rpgArrivalVoices.js';

const NIVEAU_ATTEINT = (lufs, gain) => lufs + 20 * Math.log10(gain);

test('la table des bruitages couvre exactement le registre du lecteur', () => {
  const mesures = Object.keys(RPG_NIVEAUX_ECHANTILLONS).sort();
  const registre = RPG_ECHANTILLONS_NAMES.filter((nom) => nom !== 'hover').sort();
  assert.deepEqual(mesures, registre,
    'chaque échantillon joué par le lecteur est mesuré une fois — et une seule');
  for (const nom of mesures) {
    const [lufs, crete] = RPG_NIVEAUX_ECHANTILLONS[nom];
    assert.ok(Number.isFinite(lufs) && lufs < 0 && lufs > -70, `${nom} : niveau intégré plausible`);
    assert.ok(Number.isFinite(crete) && crete <= 0.5, `${nom} : crête plausible`);
  }
});

test('les 74 voix d’arrivée sont toutes mesurées', () => {
  const fichiers = [...new Set(Object.values(RPG_ARRIVAL_VOICE_FILES))].sort();
  assert.deepEqual(Object.keys(RPG_NIVEAUX_VOIX).sort(), fichiers,
    'aucune voix ne joue à son niveau d’origine, aucune mesure orpheline');
  assert.equal(fichiers.length, 74);
});

test('chaque son tient le niveau commun de -20 LUFS', () => {
  assert.equal(RPG_NIVEAU_CIBLE_LUFS, -20);
  const ecarts = [];
  const verifier = (nom, [lufs, crete], gain) => {
    const atteint = NIVEAU_ATTEINT(lufs, gain);
    // Le gain ne pousse jamais la crête au-delà du plafond du lecteur.
    assert.ok(crete + 20 * Math.log10(gain) <= RPG_PLAFOND_CRETE_DBFS + 1e-6,
      `${nom} : crête ${(crete + 20 * Math.log10(gain)).toFixed(1)} dBFS au-delà du plafond`);
    // Et il ne s'en écarte que lorsque la crête l'interdit.
    if (atteint < RPG_NIVEAU_CIBLE_LUFS - 0.1) {
      assert.ok(Math.abs(gain - gainDepuisCrete(crete)) < 1e-9,
        `${nom} : le gain est bridé sans que la crête l'exige`);
      ecarts.push({ nom, ecart: RPG_NIVEAU_CIBLE_LUFS - atteint });
    } else {
      assert.ok(Math.abs(atteint - RPG_NIVEAU_CIBLE_LUFS) < 0.1,
        `${nom} : ${atteint.toFixed(1)} LUFS au lieu de ${RPG_NIVEAU_CIBLE_LUFS}`);
    }
  };
  for (const [nom, mesure] of Object.entries(RPG_NIVEAUX_ECHANTILLONS)) {
    verifier(nom, mesure, gainEchantillon(nom));
  }
  for (const [fichier, mesure] of Object.entries(RPG_NIVEAUX_VOIX)) {
    verifier(fichier, mesure, gainVoixArrivee(fichier));
  }
  // La quasi-totalité des fichiers tombe pile sur la cible ; les quelques
  // autres restent bridés par leur forme d'onde (l'outil réécrit les WAV, pas
  // les MP3 fournis).
  assert.ok(ecarts.length <= 4, `écarts résiduels : ${ecarts.map((e) => e.nom).join(', ')}`);
  const pire = Math.max(0, ...ecarts.map((e) => e.ecart));
  assert.ok(pire < 4.5, `écart maximal : ${pire.toFixed(1)} dB`);
});

test('l’écart d’origine était bien celui qu’on corrige', () => {
  const niveaux = Object.values(RPG_NIVEAUX_ECHANTILLONS).map(([lufs]) => lufs);
  const ecart = Math.max(...niveaux) - Math.min(...niveaux);
  assert.ok(ecart > 15, `les bruitages vont de ${Math.min(...niveaux)} à ${Math.max(...niveaux)} LUFS`);
  // Les fichiers remontés (gain > 1) sont ceux que `<audio>.volume` ne pouvait
  // pas rattraper ; les plus forts descendent, eux, de plus de dix décibels.
  assert.ok(gainEchantillon('navire_arrivee') > 1.4, 'l’ambiance de quai remonte de 3 dB');
  assert.ok(gainEchantillon('player_attack_hit') < 0.2, 'le coup d’épée descend de 14 dB');
  assert.ok(gainVoixArrivee('La dame des neufs mondes.mp3') > 1.8, 'la voix la plus basse remonte de 8,6 dB');
  assert.ok(gainVoixArrivee('Susanoo.mp3') < 0.5, 'la plus forte descend de 6,5 dB');
});

test('gainDepuisNiveau : la formule, ses bords et ses valeurs inattendues', () => {
  assert.equal(gainDepuisNiveau(RPG_NIVEAU_CIBLE_LUFS), 1, 'au niveau commun, aucun gain');
  assert.ok(Math.abs(gainDepuisNiveau(-26) - 10 ** 0.3) < 1e-9, 'six décibels sous la cible : ×1,995');
  assert.ok(Math.abs(gainDepuisNiveau(-26) - 2) < 0.01, 'soit presque le double');
  assert.ok(Math.abs(gainDepuisNiveau(-14) - 10 ** -0.3) < 1e-9, 'six décibels au-dessus : ÷1,995');
  assert.equal(gainDepuisNiveau(Number.NaN), 1, 'une mesure absente ne coupe pas le son');
  assert.equal(gainEchantillon('son-inconnu'), 1, 'un bruitage non mesuré garde son niveau');
  assert.equal(gainVoixArrivee('voix-inconnue.mp3'), 1, 'une voix non mesurée garde son niveau');
});

// ── Le lecteur applique la table ─────────────────────────────────────────────
class FakeAudio {
  constructor(src) {
    this.src = src;
    this.preload = '';
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    FakeAudio.instances.push(this);
  }

  play() { this.paused = false; FakeAudio.lectures.push(this); return Promise.resolve(); }

  pause() { this.paused = true; }

  removeAttribute() { this.src = ''; }

  load() {}
}
FakeAudio.instances = [];
FakeAudio.lectures = [];

function noeudFactice(extra = {}) {
  const noeud = {
    gain: { value: 1 },
    connections: [],
    connect(destination) { this.connections.push(destination); return destination; },
    disconnect() { this.connections = []; },
    ...extra,
  };
  return noeud;
}

/**
 * Un contexte qui sait router les éléments `<audio>` : chaque source de média
 * garde l'élément dont elle vient, ce qui permet de vérifier le gain posé sur
 * chaque fichier.
 */
class FakeAudioContext {
  constructor() {
    this.sampleRate = 8000;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = noeudFactice();
    this.sources = [];
    this.compressors = [];
  }

  createGain() { return noeudFactice(); }

  createMediaElementSource(audio) {
    const source = noeudFactice({ audio });
    this.sources.push(source);
    return source;
  }

  createDynamicsCompressor() {
    const compresseur = noeudFactice({
      threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 },
    });
    this.compressors.push(compresseur);
    return compresseur;
  }

  createBiquadFilter() { return noeudFactice({ type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 } }); }

  createConvolver() { return noeudFactice({ buffer: null }); }

  createBuffer(canaux, longueur, taux) {
    return {
      numberOfChannels: canaux,
      length: longueur,
      sampleRate: taux,
      getChannelData: () => new Float32Array(longueur),
    };
  }

  async resume() { this.state = 'running'; }

  async close() { this.state = 'closed'; }
}

function lecteurAvecRoutage() {
  const precedent = globalThis.window;
  globalThis.window = { Audio: FakeAudio, AudioContext: FakeAudioContext };
  FakeAudio.instances = [];
  FakeAudio.lectures = [];
  const player = new RpgAudioPlayer();
  player.unlock();
  return { player, rendre: () => { globalThis.window = precedent; } };
}

test('le lecteur pose sur chaque échantillon le gain de sa mesure', () => {
  const { player, rendre } = lecteurAvecRoutage();
  try {
    const context = player.ctx;
    // Une source par *fichier* : `degats` et `degats_sorcier` partagent le même
    // `hit.wav`, donc un seul élément et un seul nœud. Le survol, lui, a bien
    // son fichier depuis que le bip de synthèse a été remplacé.
    assert.equal(context.sources.length, RPG_ECHANTILLONS_NAMES.length - 1,
      'un nœud source par fichier du registre');
    // Chaque source rejoint un nœud de gain, qui rejoint le bus des échantillons.
    for (const source of context.sources) {
      const gain = source.connections[0];
      assert.ok(gain && gain !== context.destination, 'la source passe par un nœud de gain');
      assert.deepEqual(gain.connections, [player.busEchantillons],
        'et le nœud rejoint le bus commun, jamais la sortie directement');
    }
    // Le bus passe par son limiteur avant la sortie.
    assert.equal(context.compressors.length, 1,
      'un seul limiteur : celui du bus des échantillons (plus de chaîne de synthèse)');
    assert.deepEqual(player.busEchantillons.connections, [player.limiteurEchantillons]);
    assert.deepEqual(player.limiteurEchantillons.connections, [context.destination]);

    // Le gain effectif de chaque fichier est celui de la table, corrigé de sa
    // dose de catalogue — nulle part ailleurs que sur le survol.
    for (const entree of player.echantillons) {
      // Le gain du nœud = niveau mesuré du fichier × dose de catalogue. Les
      // doses valent 1 partout, sauf pour le survol (0,05) : un effleurement
      // à peine audible, pas un événement.
      const dose = rpgSfx(entree.nom)[0].g;
      assert.ok(Math.abs(entree.noeud.gain.value - gainEchantillon(entree.nom) * dose) < 1e-9,
        `${entree.nom} : gain ${entree.noeud.gain.value}`);
      assert.equal(entree.audio.volume, 1, 'l’élément ne coupe pas ce que le nœud règle');
    }
    // Le survol reste très en dessous du niveau commun : 17,4 dB sous les
    // bruitages, un froissement qu'on devine (dose 0,05, fichier -11,4 LUFS).
    assert.ok(player.echantillonsParNom.get('hover').noeud.gain.value <= 0.08);
    // La pioche a été remontée **dans son fichier** (gain + limiteur hors
    // ligne) : à la lecture, son gain reste dans la marge de crête, et le
    // limiteur du bus n'a plus qu'un rôle de secours.
    assert.ok(gainEchantillon('card_draw') > 0.9 && gainEchantillon('card_draw') < 1.1);
  } finally {
    player.destroy();
    rendre();
  }
});

test('le volume des sons du jeu et le mute pilotent les nœuds des échantillons', () => {
  const { player, rendre } = lecteurAvecRoutage();
  try {
    const pioche = player.echantillonsParNom.get('card_draw');
    const epee = player.echantillonsParNom.get('player_attack_hit');
    player.setVolume(0.5);
    assert.ok(Math.abs(pioche.noeud.gain.value - gainEchantillon('card_draw') / 2) < 1e-9);
    assert.ok(Math.abs(epee.noeud.gain.value - gainEchantillon('player_attack_hit') / 2) < 1e-9);

    player.setMuted(true);
    assert.equal(pioche.noeud.gain.value, 0, 'le silence coupe le nœud, pas seulement l’élément');
    assert.equal(pioche.audio.paused, true, 'la lecture en cours est mise en pause');

    player.setMuted(false);
    player.setVolume(1);
    assert.ok(Math.abs(pioche.noeud.gain.value - gainEchantillon('card_draw')) < 1e-9);
  } finally {
    player.destroy();
    rendre();
  }
});

test('la voix d’arrivée passe par son propre gain, dans le même bus', () => {
  const { player, rendre } = lecteurAvecRoutage();
  try {
    const url = '/Tengu.wav';
    const gain = gainVoixArrivee('/Tengu.wav');
    const avant = player.ctx.sources.length;
    assert.equal(player.playCardVoice(url), true);
    assert.equal(player.ctx.sources.length, avant + 1, 'la voix rejoint le bus à sa première lecture');
    const entree = player.voixEntrees.get(url);
    assert.ok(Math.abs(entree.noeud.gain.value - gainVoixArrivee('Tengu.wav')) < 1e-9,
      'la voix du Tengu porte le gain de sa mesure');
    assert.ok(gain > 1, 'sa mesure la place sous le niveau commun : elle monte');
    // L'adresse encodée d'une voix à apostrophe retrouve aussi sa mesure.
    assert.ok(Math.abs(gainVoixArrivee("/dame%20aux%20ailes%20d'or.mp3")
      - gainVoixArrivee("dame aux ailes d'or.mp3")) < 1e-12);
    // Une seconde arrivée réutilise l'élément et son nœud.
    player.playCardVoice(url);
    assert.equal(player.ctx.sources.length, avant + 1);
  } finally {
    player.destroy();
    rendre();
  }
});

test('sans routage des médias, le gain retombe sur le volume de l’élément', () => {
  class ContexteSansRoutage extends FakeAudioContext {
    constructor() {
      super();
      this.createMediaElementSource = undefined;
    }
  }
  const precedent = globalThis.window;
  globalThis.window = { Audio: FakeAudio, AudioContext: ContexteSansRoutage };
  FakeAudio.instances = [];
  FakeAudio.lectures = [];
  const player = new RpgAudioPlayer();
  try {
    player.unlock();
    assert.equal(player.ctx.sources.length, 0, 'aucun élément n’est routé');
    const plume = player.echantillonsParNom.get('page_turn');
    const epee = player.echantillonsParNom.get('player_attack_hit');
    assert.ok(plume.audio.volume <= 1,
      'sans nœud, le volume de l’élément reste borné à 1 — un fichier remonté perd son gain');
    assert.ok(Math.abs(epee.audio.volume - gainEchantillon('player_attack_hit')) < 1e-9,
      'les sons atténués gardent leur juste niveau');
    player.play('page_turn');
    assert.equal(FakeAudio.lectures.length, 1, 'et le son se joue quand même');
  } finally {
    player.destroy();
    globalThis.window = precedent;
  }
});

test('le démontage libère les éléments, les nœuds et les champs historiques', () => {
  const { player, rendre } = lecteurAvecRoutage();
  try {
    player.playCardVoice('/Salem.mp3');
    const sources = [...player.ctx.sources];
    player.destroy();
    assert.equal(player.arrowShotAudio, null);
    assert.equal(player.foudreMarteauAudio, null);
    assert.equal(player.busEchantillons, null);
    assert.equal(player.voixEntrees.size, 0);
    assert.equal(player.cardVoiceAudios.size, 0);
    assert.deepEqual(sources.map((source) => source.connections), sources.map(() => []),
      'les sources sont débranchées du graphe');
  } finally {
    rendre();
  }
});

test('le survol est un fichier, joué en murmurme hors du niveau commun', () => {
  // Son fichier n'a pas à être ramené au niveau commun : le survol reste le
  // seul son du jeu dont la dose n'est pas 1, parce qu'un effleurement n'est
  // pas un événement. Il n'a donc pas d'entrée dans la table des niveaux.
  assert.equal(RPG_NIVEAUX_ECHANTILLONS.hover, undefined);
  assert.ok(RPG_SFX_NAMES.includes('hover'));
  assert.equal(rpgSfx('hover')[0].kind, 'sample', 'plus une seule synthèse dans le jeu');
});
