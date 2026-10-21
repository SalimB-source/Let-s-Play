/**
 * Couche pure des bruitages + lecteur WebAudio sans carte son réelle.
 * Le catalogue est réduit aux échantillons fournis et au seul bip de survol :
 * les anciennes synthèses ont été retirées du jeu, et les tests vérifient
 * autant ce qui reste que ce qui doit rester muet.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { hz, rpgSfx, RPG_SFX_NAMES, RpgAudioPlayer } from '../src/games/rpgAudio.js';

test('hz : le la de référence et ses voisins', () => {
  assert.equal(Math.round(hz('A4')), 440);
  assert.equal(Math.round(hz('C4')), 262);
  assert.equal(Math.round(hz('A5')), 880);
  assert.equal(Math.round(hz('F#4')), Math.round(hz('G4') * 2 ** (-1 / 12)));
  assert.equal(hz('nimportequoi'), 0);
});

test('le catalogue se résume au survol et aux échantillons fournis', () => {
  assert.deepEqual([...RPG_SFX_NAMES].sort(), [
    'abordage', 'attackers_confirm', 'block_impact', 'card_countered', 'card_draw', 'card_place',
    'creature_return', 'defaite', 'degats', 'degats_sorcier', 'destruction_hit', 'flame_gust', 'hover', 'page_turn',
    'player_attack_hit', 'victoire', 'water_wave',
  ].sort(), 'le son du duel = la synthèse du survol + les échantillons de la table');
  for (const name of RPG_SFX_NAMES) {
    const sequence = rpgSfx(name);
    assert.ok(Array.isArray(sequence) && sequence.length > 0, `séquence manquante : ${name}`);
  }
  assert.equal(rpgSfx('silence-total'), null);
});

test('l’abordage joue la voix pirate « Ahoy ! » fournie, livrée avec le jeu', () => {
  assert.ok(RPG_SFX_NAMES.includes('abordage'));
  assert.deepEqual(rpgSfx('abordage'), [{ kind: 'sample', at: 0, dur: 1.411, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/pirate-ahoy.mp3', import.meta.url)),
    'Cartoon Pirate Voice - Ahoy.mp3 voyage dans src/games/assets/pirate-ahoy.mp3');
});

test('la victoire est la fanfare fournie, livrée avec le jeu', () => {
  assert.ok(RPG_SFX_NAMES.includes('victoire'));
  assert.deepEqual(rpgSfx('victoire'), [{ kind: 'sample', at: 0, dur: 4.624, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/victory-trumpets.mp3', import.meta.url)),
    'Victory Trumpets voyage dans src/games/assets');
});

test('la défaite et les coups blessants jouent les fichiers fournis', () => {
  assert.deepEqual(rpgSfx('defaite'), [{ kind: 'sample', at: 0, dur: 4.493, g: 1 }]);
  assert.deepEqual(rpgSfx('degats'), [{ kind: 'sample', at: 0, dur: 0.625, g: 1 }]);
  assert.deepEqual(rpgSfx('degats_sorcier'), [{ kind: 'sample', at: 0, dur: 0.625, g: 1 }],
    'le même coup sec sert la blessure du joueur et celle du sorcier adverse');
  assert.ok(existsSync(new URL('../src/games/assets/game-lost.mp3', import.meta.url)));
  assert.ok(existsSync(new URL('../src/games/assets/hit.wav', import.meta.url)));
});

test('toutes les synthèses retirées restent muettes — le survol est la seule survivante', () => {
  const retires = [
    'apparition', 'whoosh', 'hit', 'heal', 'zone', 'bell', 'blip',
    'explore', 'souffle', 'tour', 'phase', 'annonce', 'pass', 'terrain_pose', 'terrain_tap',
    'mana', 'mythic_impact', 'creature', 'magie', 'pioche', 'destruction', 'burn', 'soin_long',
    'soin_vie', 'soin_vie_adverse', 'bouclier', 'attaque_declaree', 'attaque_confirmee',
    'blocage', 'choc_lames', 'sword', 'combat', 'coup_rapide',
    'impact', 'contresort', 'foudre_marteau', 'menu', 'select', 'erreur', 'pile', 'annuler',
  ];
  for (const name of retires) {
    assert.ok(!RPG_SFX_NAMES.includes(name), `${name} n'est plus déclaré au catalogue`);
    assert.equal(rpgSfx(name), null, `${name} se joue en silence`);
  }
  // Le seul son encore synthétisé : un effleurement de survol, court et filtré.
  const survol = rpgSfx('hover');
  assert.ok(survol, 'le survol reste au catalogue');
  assert.ok(survol.every((event) => event.kind === 'tone'));
  assert.ok(survol.every((event) => event.dur <= 0.1), 'le survol reste un frémissement');
});

test('toutes les séquences ont des départs, durées et gains valides', () => {
  for (const name of RPG_SFX_NAMES) {
    for (const event of rpgSfx(name)) {
      assert.ok(event.at >= 0, `${name} : départ négatif`);
      assert.ok(event.dur > 0, `${name} : durée nulle`);
      assert.ok(event.g > 0 && event.g <= 1, `${name} : gain hors limites`);
      if (event.kind === 'tone' || event.kind === 'bell') {
        assert.ok(hz(event.n) > 0, `${name} : note invalide ${event.n}`);
      }
      if (event.slideTo) assert.ok(hz(event.slideTo) > 0, `${name} : glissé invalide ${event.slideTo}`);
      if (event.pan !== undefined) assert.ok(event.pan >= -1 && event.pan <= 1, `${name} : panoramique hors limites`);
      if (event.filter !== undefined) assert.ok(event.filter >= 40, `${name} : filtre trop bas`);
      if (event.filterTo !== undefined) assert.ok(event.filterTo >= 40, `${name} : destination du filtre trop basse`);
      if (event.send !== undefined) assert.ok(event.send >= 0 && event.send <= 0.6, `${name} : réverbération hors limites`);
    }
  }
});

test('le survol reste feutré plutôt que chiptune', () => {
  for (const event of rpgSfx('hover')) {
    if (event.kind === 'tone') assert.notEqual(event.w, 'square', 'jamais de bip carré brut');
  }
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

const originalWindow = globalThis.window;
test.after(() => { globalThis.window = originalWindow; });

test('le lecteur construit la chaîne moderne, joue le survol et respecte le mute', () => {
  globalThis.window = { AudioContext: FakeAudioContext };
  const player = new RpgAudioPlayer();
  player.setMuted(true);
  player.unlock();
  const context = player.ctx;

  assert.ok(context instanceof FakeAudioContext, 'un contexte audio est créé après le geste');
  assert.equal(context.counters.compressors, 1, 'les crêtes passent par un limiteur');
  assert.equal(context.counters.convolvers, 1, 'la réverbération est procédurale');
  assert.equal(player.master.gain.value, 0.0001, 'le choix muet posé avant le déverrouillage est conservé');

  player.setMuted(false);
  player.play('hover', 0.05);
  for (const name of RPG_SFX_NAMES) player.play(name);
  assert.ok(context.counters.oscillators > 0, 'le survol est planifié');
  assert.ok(context.counters.filters > 0, 'sa matière passe par un filtre');
  // Les échantillons passent par leurs éléments <audio>, absents du faux
  // navigateur : aucune synthèse de bruit ne subsiste dans le catalogue.
  assert.equal(context.counters.sources, 0, 'aucune source de bruit n’est planifiée');

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

test('setVolume ajuste le gain des sons du jeu et coupe la lecture à zéro', () => {
  globalThis.window = { AudioContext: FakeAudioContext };
  const player = new RpgAudioPlayer();
  player.unlock();
  player.setVolume(0.5);
  assert.equal(player.volume, 0.5);
  assert.ok(Math.abs(player.master.gain.value - 0.11) < 1e-6, 'le gain maître est réduit de moitié');

  const beforeZero = { ...player.ctx.counters };
  player.setVolume(0);
  player.play('hover');
  assert.deepEqual(player.ctx.counters, beforeZero, 'à volume 0, aucun oscillateur supplémentaire n’est planifié');
  player.destroy();
});
