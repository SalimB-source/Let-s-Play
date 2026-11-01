/**
 * Couche pure des bruitages + lecteur WebAudio sans carte son réelle.
 *
 * **Tout le catalogue est fait de fichiers** : plus une seule forme d'onde
 * fabriquée par du code. Le moteur de synthèse a été supprimé, et l'ancien bip
 * de survol est devenu un extrait du vrai enregistrement de carte
 * (`hover.wav`). Les tests vérifient autant ce qui reste que ce qui doit
 * rester muet.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  rpgActivationsFurieDepuisJournal,
  rpgSfx,
  rpgSonsFurie,
  rpgSonArriveePirate,
  RPG_PIRATE_ARRIVEES_SFX,
  RPG_PIRATE_ARRIVEE_SFX,
  RPG_PIRATE_DIALOGUE_SFX,
  RPG_SFX_NAMES,
  RPG_FOUDRE_MARTEAU_SFX,
  RPG_FREEZE_IMPACT_SFX,
  RpgAudioPlayer,
} from '../src/games/rpgAudio.js';

test('le catalogue se résume au survol et aux échantillons fournis', () => {
  assert.deepEqual([...RPG_SFX_NAMES].sort(), [
    'abordage', 'attackers_confirm', 'block_impact', 'card_countered', 'card_draw',
    'cold_wind', 'creature_return', 'defaite', 'degats', 'degats_sorcier', 'destruction_hit', 'flame_gust', 'fleche', 'freeze_impact', 'furie_viking', 'furie_viking_femelle', 'hover',
    'navire_arrivee', 'page_turn', 'pirate_arrivee', 'pirate_dialogue', 'dwarf_dialogue', 'player_attack_hit', 'victoire', 'weapon_break',
    'foudre_marteau',
  ].sort(), 'le son du duel = les échantillons de la table, survol compris');
  for (const name of RPG_SFX_NAMES) {
    const sequence = rpgSfx(name);
    assert.ok(Array.isArray(sequence) && sequence.length > 0, `séquence manquante : ${name}`);
  }
  assert.equal(rpgSfx('silence-total'), null);
});

test('la Furie utilise le cri viking fourni par le joueur', () => {
  assert.deepEqual(rpgSfx('furie_viking'), [{ kind: 'sample', at: 0, dur: 1.512, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/furie-viking.mp3', import.meta.url)));
});

test('les Valkyries et la Völva jouent la voix féminine de Furie', () => {
  assert.deepEqual(rpgSfx('furie_viking_femelle'), [{ kind: 'sample', at: 0, dur: 1.512, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/furie-viking-femelle.mp3', import.meta.url)));
  assert.deepEqual(rpgSonsFurie([{ carteId: 'valkyrie-au-corbeau' }]), ['furie_viking_femelle']);
  assert.deepEqual(rpgSonsFurie([{ carteId: 'volva-soigneuse' }]), ['furie_viking_femelle']);
  assert.deepEqual(rpgSonsFurie([{ name: 'Valkyrie au corbeau' }]), ['furie_viking_femelle']);
  assert.deepEqual(rpgSonsFurie([{ name: 'Völva soigneuse' }]), ['furie_viking_femelle']);
  assert.deepEqual(rpgSonsFurie([{ carteId: 'berserk-des-trois-hivers' }]), ['furie_viking']);
  assert.deepEqual(rpgSonsFurie([
    { carteId: 'valkyrie-des-neuf-nuits' },
    { carteId: 'berserk-des-trois-hivers' },
  ]), ['furie_viking_femelle', 'furie_viking']);
  const journal = rpgActivationsFurieDepuisJournal([
    'Berserk entre en furie : +2/+0.',
    'Soigneuse réussit son jet : aucun événement.',
    'Valkyrie au corbeau entre en furie : +2/+0, Envol.',
  ]);
  assert.deepEqual(journal, [{ name: 'Berserk' }, { name: 'Valkyrie au corbeau' }]);
  assert.deepEqual(rpgSonsFurie(journal), ['furie_viking_femelle', 'furie_viking']);
});

test('l’abordage joue le cliquetis de chaînes fourni, livré avec le jeu', () => {
  assert.ok(RPG_SFX_NAMES.includes('abordage'));
  assert.deepEqual(rpgSfx('abordage'), [{ kind: 'sample', at: 0, dur: 2.4, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/chain-rattle.wav', import.meta.url)),
    'ChainRattleMetalChainManyVariations_jxKTo_03.wav voyage dans src/games/assets/chain-rattle.wav');
});

test('les arrivées jouent le cri pirate et l’ambiance de quai, tous deux sur échantillons', () => {
  assert.ok(RPG_SFX_NAMES.includes('pirate_arrivee'));
  assert.ok(RPG_SFX_NAMES.includes('navire_arrivee'));
  assert.deepEqual(rpgSfx('pirate_arrivee'), [{ kind: 'sample', at: 0, dur: 1.411, g: 1 }]);
  assert.deepEqual(rpgSfx('navire_arrivee'), [{ kind: 'sample', at: 0, dur: 2.352, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/pirate-ahoy.mp3', import.meta.url)),
    'le cri « Ahoy ! » salue l’arrivée des cartes pirates');
  assert.ok(existsSync(new URL('../src/games/assets/dock-sound.mp3', import.meta.url)),
    'Dock Sound_320k.mp3 voyage dans src/games/assets/dock-sound.mp3');
});

test('le dialogue « Alright » est le second accueil pirate, en alternance avec « Ahoy ! »', () => {
  assert.ok(RPG_SFX_NAMES.includes('pirate_dialogue'));
  assert.deepEqual(rpgSfx('pirate_dialogue'), [{ kind: 'sample', at: 0, dur: 0.779, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/pirate-dialogue-alright.wav', import.meta.url)),
    'Pirate_Dialogue_Alright.wav voyage dans src/games/assets/pirate-dialogue-alright.wav');

  // Le cycle : une arrivée sur deux pour chaque voix, sans fin ni trou.
  assert.deepEqual(RPG_PIRATE_ARRIVEES_SFX, [RPG_PIRATE_ARRIVEE_SFX, RPG_PIRATE_DIALOGUE_SFX]);
  const cycle = Array.from({ length: 6 }, (_, index) => rpgSonArriveePirate(index));
  assert.deepEqual(cycle, [
    'pirate_arrivee', 'pirate_dialogue', 'pirate_arrivee',
    'pirate_dialogue', 'pirate_arrivee', 'pirate_dialogue',
  ]);
  // Un index inattendu retombe sur le premier son ; un indice négatif reste
  // dans le cycle plutôt que de sortir du tableau.
  assert.equal(rpgSonArriveePirate(undefined), RPG_PIRATE_ARRIVEE_SFX);
  assert.equal(rpgSonArriveePirate('bonjour'), RPG_PIRATE_ARRIVEE_SFX);
  assert.equal(rpgSonArriveePirate(-1), RPG_PIRATE_DIALOGUE_SFX);
});

test('la voix naine des guerriers du Nord est un échantillon fourni', () => {
  assert.ok(RPG_SFX_NAMES.includes('dwarf_dialogue'));
  assert.deepEqual(rpgSfx('dwarf_dialogue'), [{ kind: 'sample', at: 0, dur: 2.259, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/dwarf-dialogue-my-axe-shall-speak-for-me.wav', import.meta.url)));
});

test('Thunder Spark est un sample partagé par les deux marteaux', () => {
  assert.equal(RPG_FOUDRE_MARTEAU_SFX, 'foudre_marteau');
  assert.ok(RPG_SFX_NAMES.includes(RPG_FOUDRE_MARTEAU_SFX));
  assert.deepEqual(rpgSfx(RPG_FOUDRE_MARTEAU_SFX), [{ kind: 'sample', at: 0, dur: 3.422, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/thunder-spark-transition-full.mp3', import.meta.url)),
    'Thunder Spark Transition voyage dans src/games/assets');
});

test('le gel joue le Foley de glace fourni', () => {
  assert.equal(RPG_FREEZE_IMPACT_SFX, 'freeze_impact');
  assert.ok(RPG_SFX_NAMES.includes(RPG_FREEZE_IMPACT_SFX));
  assert.deepEqual(rpgSfx(RPG_FREEZE_IMPACT_SFX), [{ kind: 'sample', at: 0, dur: 1.068, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/ice-freeze.wav', import.meta.url)),
    'IceFoley6095_90_1.wav voyage dans src/games/assets/ice-freeze.wav');
});

test('la victoire est le cri de guerre viking, livré avec le jeu', () => {
  assert.ok(RPG_SFX_NAMES.includes('victoire'));
  assert.deepEqual(rpgSfx('victoire'), [{ kind: 'sample', at: 0, dur: 2.56, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/viking-warrior-battle-cry-with-horn.mp3', import.meta.url)),
    'Le cri de guerre viking voyage dans src/games/assets');
  assert.ok(!existsSync(new URL('../src/games/assets/victory-trumpets.mp3', import.meta.url)),
    'Victory Trumpets a entièrement disparu du jeu');
});

test('la défaite et les coups blessants jouent les fichiers fournis', () => {
  assert.deepEqual(rpgSfx('defaite'), [{ kind: 'sample', at: 0, dur: 4.493, g: 1 }]);
  assert.deepEqual(rpgSfx('degats'), [{ kind: 'sample', at: 0, dur: 0.625, g: 1 }]);
  assert.deepEqual(rpgSfx('degats_sorcier'), [{ kind: 'sample', at: 0, dur: 0.625, g: 1 }],
    'le même coup sec sert la blessure du joueur et celle du sorcier adverse');
  assert.ok(existsSync(new URL('../src/games/assets/game-lost.mp3', import.meta.url)));
  assert.ok(existsSync(new URL('../src/games/assets/hit.wav', import.meta.url)));
});

test('toutes les synthèses retirées restent muettes, sans repli synthétique', () => {
  const retires = [
    'apparition', 'whoosh', 'hit', 'heal', 'zone', 'bell', 'blip',
    'explore', 'souffle', 'tour', 'phase', 'annonce', 'pass', 'terrain_pose', 'terrain_tap',
    'mana', 'mythic_impact', 'creature', 'magie', 'pioche', 'destruction', 'burn', 'soin_long',
    'soin_vie', 'soin_vie_adverse', 'bouclier', 'attaque_declaree', 'attaque_confirmee',
    'blocage', 'choc_lames', 'sword', 'combat', 'coup_rapide',
    'impact', 'contresort', 'menu', 'select', 'erreur', 'pile', 'annuler',
  ];
  for (const name of retires) {
    assert.ok(!RPG_SFX_NAMES.includes(name), `${name} n'est plus déclaré au catalogue`);
    assert.equal(rpgSfx(name), null, `${name} se joue en silence`);
  }
  // Aucune séquence du catalogue ne fabrique de son : tout est un fichier.
  for (const name of RPG_SFX_NAMES) {
    const sequence = rpgSfx(name);
    assert.ok(sequence.every((event) => event.kind === 'sample'),
      `${name} : le catalogue ne contient que des échantillons`);
  }
});

test('toutes les séquences ont des départs, durées et gains valides', () => {
  for (const name of RPG_SFX_NAMES) {
    for (const event of rpgSfx(name)) {
      assert.ok(event.at >= 0, `${name} : départ négatif`);
      assert.ok(event.dur > 0, `${name} : durée nulle`);
      assert.ok(event.g > 0 && event.g <= 1, `${name} : gain hors limites`);
      assert.equal(event.kind, 'sample', `${name} : un fichier, pas une synthèse`);
    }
  }
});

test('le survol est un vrai froissement de papier, à peine audible', () => {
  const [survol] = rpgSfx('hover');
  assert.equal(survol.kind, 'sample', 'le survol est un fichier, plus une sinusoïde');
  assert.ok(survol.dur <= 0.1, 'le survol reste un frémissement');
  // Son fichier mesure -11,4 LUFS : à 0,05 il joue vers -37,4 LUFS, 17,4 dB
  // sous les bruitages. Au-delà de 0,08 (≈ -33 LUFS), le balayage d'une main
  // de cartes redevient un clic — c'est le reproche qui a fait baisser la dose.
  assert.ok(survol.g > 0 && survol.g <= 0.08,
    'sa dose le garde loin sous le niveau commun : un froissement qu’on devine');
  assert.ok(existsSync(new URL('../src/games/assets/hover.wav', import.meta.url)),
    'hover.wav est livré avec le jeu (tools/make-son-survol.py)');
});

function fakeParam(value = 0) {
  return {
    value,
    events: [],
    setValueAtTime(next, time) { this.value = next; this.events.push(['set', next, time]); },
    exponentialRampToValueAtTime(next, time) { this.value = next; this.events.push(['exp', next, time]); },
    cancelScheduledValues(time) { this.events.push(['cancel', time]); },
    setTargetAtTime(next, time, constant) { this.value = next; this.events.push(['target', next, time, constant]); },
  };
}

function fakeNode(extra = {}) {
  return {
    connections: [],
    connect(destination) { this.connections.push(destination); return destination; },
    disconnect() { this.connections = []; },
    ...extra,
  };
}

class FakeAudioContext {
  constructor() {
    this.sampleRate = 8000;
    this.currentTime = 2;
    this.destination = fakeNode();
    this.state = 'running';
    this.counters = { oscillators: 0, sources: 0, filters: 0, panners: 0, convolvers: 0, compressors: 0 };
    this.closed = false;
  }
  createGain() { return fakeNode({ gain: fakeParam() }); }
  createOscillator() {
    this.counters.oscillators += 1;
    return fakeNode({
      type: 'sine', frequency: fakeParam(), detune: fakeParam(),
      start() {}, stop() {},
    });
  }
  createBiquadFilter() {
    this.counters.filters += 1;
    return fakeNode({ type: 'lowpass', frequency: fakeParam(), Q: fakeParam() });
  }
  createStereoPanner() {
    this.counters.panners += 1;
    return fakeNode({ pan: fakeParam() });
  }
  createDynamicsCompressor() {
    this.counters.compressors += 1;
    return fakeNode({
      threshold: fakeParam(), knee: fakeParam(), ratio: fakeParam(), attack: fakeParam(), release: fakeParam(),
    });
  }
  createConvolver() {
    this.counters.convolvers += 1;
    return fakeNode({ buffer: null });
  }
  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }
  createBufferSource() {
    this.counters.sources += 1;
    return fakeNode({ buffer: null, loop: false, start() {}, stop() {} });
  }
  async resume() { this.state = 'running'; }
  async close() { this.closed = true; }
}

class FakeAudioElement {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.playCount = 0;
  }
  play() { this.playCount += 1; return Promise.resolve(); }
  pause() {}
  removeAttribute() {}
  load() {}
}

const originalWindow = globalThis.window;
test.after(() => { globalThis.window = originalWindow; });

test('le lecteur ne construit qu’un bus de fichiers : aucun oscillateur, aucune réverbération', () => {
  globalThis.window = { AudioContext: FakeAudioContext };
  const player = new RpgAudioPlayer();
  player.unlock();
  const context = player.ctx;

  assert.ok(context instanceof FakeAudioContext, 'un contexte audio est créé après le geste');
  assert.equal(context.counters.compressors, 1, 'un seul limiteur : celui du bus des échantillons');
  assert.equal(context.counters.convolvers, 0, 'plus de réverbération de convolution');
  assert.equal(player.master, undefined, 'plus de gain maître de synthèse');
  assert.ok(player.busEchantillons, 'le bus des échantillons est la sortie du jeu');
  assert.deepEqual(player.busEchantillons.connections, [player.limiteurEchantillons],
    'les fichiers passent par le limiteur avant la sortie');

  // Aucun <audio> dans ce faux navigateur : rien n'est planifié, et surtout
  // aucune synthèse ne vient masquer le fichier manquant.
  player.play('hover', 0.05);
  for (const name of RPG_SFX_NAMES) player.play(name);
  assert.equal(context.counters.oscillators, 0, 'plus un seul oscillateur');
  assert.equal(context.counters.filters + context.counters.panners, 0, 'plus de filtre ni de panoramique');
  assert.equal(context.counters.sources, 0, 'aucune source de bruit planifiée');

  const beforeMute = { ...context.counters };
  player.setMuted(true);
  player.play('hover');
  player.play('son-inconnu');
  assert.deepEqual(context.counters, beforeMute, 'muet ou inconnu : aucun nœud supplémentaire');

  player.destroy();
  assert.equal(context.closed, true, 'le contexte est libéré au démontage');
  assert.equal(player.ctx, null);
});

test('lecteur sans navigateur ou sans WebAudio : il reste muet sans planter', () => {
  globalThis.window = {};
  const player = new RpgAudioPlayer();
  player.unlock();
  assert.equal(player.ctx, null);
  player.play('hover');
  player.setMuted(true);
  player.play('flame_gust');
  player.destroy();
  assert.ok(true);
});

test('le lecteur joue sans délai immédiatement et annule les lectures différées au démontage', async () => {
  const originalWindowLocal = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext, Audio: FakeAudioElement };
  const player = new RpgAudioPlayer();
  player.unlock();
  const audio = player.echantillonsParNom.get('furie_viking')?.audio;
  assert.ok(audio, 'le cri est chargé dans le lecteur');

  player.play('furie_viking');
  assert.equal(audio.playCount, 1, 'sans délai, le cri démarre immédiatement');
  player.play('furie_viking', 0.04);
  assert.equal(audio.playCount, 1, 'le départ différé attend toujours son délai');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(audio.playCount, 2, 'le départ différé part ensuite');

  player.play('furie_viking', 0.08);
  player.destroy();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(audio.playCount, 2, 'le démontage annule une lecture encore en attente');
  globalThis.window = originalWindowLocal;
});

test('setVolume ajuste le gain de chaque fichier, dose du survol comprise', () => {
  globalThis.window = { AudioContext: FakeAudioContext };
  const player = new RpgAudioPlayer();
  player.unlock();
  const survol = player.echantillonsParNom.get('hover');
  assert.ok(survol, 'le survol est un échantillon comme les autres');
  assert.ok(Math.abs(player.gainEchantillon(survol) - 0.05) < 1e-6,
    'sa dose discrète reste loin sous le niveau commun');

  player.setVolume(0.5);
  assert.equal(player.volume, 0.5);
  assert.ok(Math.abs(player.gainEchantillon(survol) - 0.025) < 1e-6, 'le volume du jeu divise la dose');

  player.setVolume(0);
  assert.equal(player.gainEchantillon(survol), 0, 'à volume 0, le survol est muet');
  player.destroy();
});

test('les voix des cartes et les dialogues génériques ont un volume indépendant des bruitages', async () => {
  const precedent = globalThis.window;
  class FakeMediaContext extends FakeAudioContext {
    createMediaElementSource() { return fakeNode(); }
  }
  globalThis.window = { AudioContext: FakeMediaContext, Audio: FakeAudioElement };
  const player = new RpgAudioPlayer();
  try {
    player.unlock();
    const effet = player.echantillonsParNom.get('hover');
    const pirate = player.echantillonsParNom.get('pirate_arrivee');
    const nain = player.echantillonsParNom.get('dwarf_dialogue');
    player.setVolume(0);
    player.setVolumeVoix(0.4);
    assert.equal(player.gainEchantillon(effet), 0);
    assert.equal(player.gainEchantillon(pirate), pirate.gain * 0.4);
    assert.equal(player.gainEchantillon(nain), nain.gain * 0.4);
    player.play('hover');
    player.play('pirate_arrivee');
    assert.equal(effet.audio.playCount, 0);
    assert.equal(pirate.audio.playCount, 1);
    assert.equal(player.playCardVoice('/voix-test.mp3'), true);
    const voix = player.voixEntrees.get('/voix-test.mp3');
    assert.equal(player.gainEchantillon(voix), voix.gain * 0.4);
    assert.equal(voix.noeud.gain.value, voix.gain * 0.4);

    player.setVolume(0.6);
    player.setVolumeVoix(0);
    assert.equal(player.gainEchantillon(voix), 0);
    assert.equal(voix.noeud.gain.value, 0, 'le réglage affecte immédiatement une voix en cours');
    player.play('hover');
    player.play('dwarf_dialogue');
    assert.equal(effet.audio.playCount, 1);
    assert.equal(nain.audio.playCount, 0);
    assert.equal(player.playCardVoice('/autre.mp3'), false);

    player.setVolumeVoix(1);
    player.play('pirate_arrivee', 0.02);
    player.playCardVoice('/voix-test.mp3', 0.02);
    player.setVolumeVoix(0);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(pirate.audio.playCount, 1, 'une voix différée ne démarre pas après coupure');
    assert.equal(voix.audio.playCount, 1, 'la réplique différée reste muette');
    player.setVolumeVoix(0.4);
    player.setMuted(true);
    assert.equal(player.gainEchantillon(effet), 0);
    assert.equal(player.gainEchantillon(voix), 0);
    player.setMuted(false);
    assert.equal(player.gainEchantillon(voix), voix.gain * 0.4);
    assert.equal(player.gainEchantillon(effet), effet.gain * 0.6);
  } finally {
    player.destroy();
    globalThis.window = precedent;
  }
});
