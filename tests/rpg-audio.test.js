/**
 * Couche pure des bruitages + lecteur WebAudio sans carte son réelle.
 * Les séquences restent vérifiables en Node ; le faux AudioContext vérifie
 * aussi la chaîne de synthèse, de réverbération et de limitation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { hz, rpgSfx, RPG_SFX_NAMES, RpgAudioPlayer } from '../src/games/rpgAudio.js';

test('hz : le la de référence et ses voisins', () => {
  assert.equal(Math.round(hz('A4')), 440);
  assert.equal(Math.round(hz('C4')), 262);
  assert.equal(Math.round(hz('A5')), 880);
  assert.equal(Math.round(hz('F#4')), Math.round(hz('G4') * 2 ** (-1 / 12)));
  assert.equal(hz('nimportequoi'), 0);
});

test('chaque action de jeu a une séquence, l’inconnu se tait', () => {
  assert.ok(RPG_SFX_NAMES.length >= 35, 'le catalogue couvre le duel, les cartes et l’interface');
  for (const name of RPG_SFX_NAMES) {
    const sequence = rpgSfx(name);
    assert.ok(Array.isArray(sequence) && sequence.length > 0, `séquence manquante : ${name}`);
  }
  assert.equal(rpgSfx('silence-total'), null);
});

test('le blocage fait entendre un choc métallique de lames', () => {
  assert.ok(RPG_SFX_NAMES.includes('choc_lames'), 'le choc de lames est déclaré parmi les bruitages du duel');
  const clash = rpgSfx('choc_lames');
  assert.ok(clash.some((event) => event.kind === 'thud'), 'un impact bref ancre le choc');
  assert.ok(clash.some((event) => event.kind === 'noise' && event.filterType === 'bandpass'),
    'un bruit métallique filtré donne l’attaque de la lame');
  assert.ok(clash.filter((event) => event.kind === 'bell').length >= 2,
    'deux résonances décalées font tinter les épées qui s’entrechoquent');
});

test('toutes les séquences ont des notes, départs, durées et gains valides', () => {
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

test('la palette est feutrée plutôt que chiptune, avec des glissés et des couches spatiales', () => {
  for (const name of RPG_SFX_NAMES) {
    for (const event of rpgSfx(name)) {
      if (event.kind === 'tone') assert.notEqual(event.w, 'square', `${name} : éviter le bip carré brut`);
    }
  }
  assert.ok(rpgSfx('whoosh').some((event) => event.filterTo), 'un whoosh module son filtre');
  assert.ok(rpgSfx('apparition').some((event) => event.slideTo), 'l’apparition fait glisser une hauteur');
  assert.ok(rpgSfx('victoire').some((event) => event.pan > 0), 'les effets donnent une largeur stéréo');
});

test('l’apparition monte, la fanfare finit plus haut et la défaite redescend', () => {
  const apparition = rpgSfx('apparition').filter((event) => event.kind === 'tone');
  assert.ok(hz(apparition.at(-1).n) > hz(apparition[0].n), 'l’apparition doit se conclure en hauteur');

  const victoire = rpgSfx('victoire').filter((event) => event.kind === 'tone');
  assert.ok(hz(victoire.at(-1).n) > hz(victoire[0].n), 'la fanfare doit finir plus haut');

  const defaite = rpgSfx('defaite').map((event) => hz(event.n));
  for (let index = 1; index < defaite.length; index += 1) {
    assert.ok(defaite[index] < defaite[index - 1], 'la défaite doit descendre');
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

test('le lecteur construit la chaîne moderne, joue les événements et respecte le mute', () => {
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
  player.play('apparition', 0.05);
  for (const name of RPG_SFX_NAMES) player.play(name);
  assert.ok(context.counters.oscillators > 0, 'les notes et partiels sont planifiés');
  assert.ok(context.counters.sources > 0, 'le souffle est planifié');
  assert.ok(context.counters.filters > 0, 'les matières passent par des filtres');
  assert.ok(context.counters.panners > 0, 'les éléments stéréo sont panoramiqués');

  const beforeMute = { ...context.counters };
  player.setMuted(true);
  player.play('victoire');
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
  player.play('apparition');
  player.setMuted(true);
  player.play('victoire');
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
  player.play('victoire');
  assert.deepEqual(player.ctx.counters, beforeZero, 'à volume 0, aucun oscillateur supplémentaire n’est planifié');
  player.destroy();
});

