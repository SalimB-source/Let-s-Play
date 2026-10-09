/**
 * Couche pure du son : conversion note → Hz et séquences d'événements.
 * Le lecteur WebAudio, lui, ne tourne que dans un vrai navigateur.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { hz, rpgSfx, RpgAudioPlayer } from '../src/games/rpgAudio.js';

test('hz : le la de référence et ses voisins', () => {
  assert.equal(Math.round(hz('A4')), 440);
  assert.equal(Math.round(hz('C4')), 262);
  assert.equal(Math.round(hz('A5')), 880);
  assert.equal(Math.round(hz('F#4')), Math.round(hz('G4') * 2 ** (-1 / 12)));
  assert.equal(hz('nimportequoi'), 0);
});

test('chaque événement du jeu a une séquence, l’inconnu se tait', () => {
  for (const name of ['apparition', 'victoire', 'defaite', 'whoosh', 'hit', 'heal', 'zone', 'bell', 'blip', 'explore', 'souffle']) {
    const seq = rpgSfx(name);
    assert.ok(Array.isArray(seq) && seq.length > 0, `séquence manquante : ${name}`);
  }
  assert.equal(rpgSfx('silence-total'), null);
});

test('toutes les notes sont jouables : départ, durée, gain valides', () => {
  for (const name of ['apparition', 'victoire', 'defaite', 'whoosh', 'hit', 'heal', 'zone', 'bell', 'blip', 'explore', 'souffle']) {
    for (const ev of rpgSfx(name)) {
      assert.ok(ev.at >= 0, `${name} : départ négatif`);
      assert.ok(ev.dur > 0, `${name} : durée nulle`);
      assert.ok(ev.g > 0 && ev.g <= 1, `${name} : gain hors limites`);
      if (ev.kind === 'tone' || ev.kind === 'bell') assert.ok(hz(ev.n) > 0, `${name} : note invalide ${ev.n}`);
    }
  }
});

test('l’arpège d’apparition monte, la fanfare finit plus haut qu’elle ne commence', () => {
  const app = rpgSfx('apparition').filter((e) => e.kind === 'tone');
  const freqs = app.map((e) => hz(e.n));
  for (let i = 1; i < freqs.length; i += 1) assert.ok(freqs[i] > freqs[i - 1], 'apparition doit monter');
  const win = rpgSfx('victoire').filter((e) => e.kind === 'tone' && e.w === 'square');
  assert.ok(hz(win[win.length - 1].n) > hz(win[0].n), 'la fanfare doit finir plus haut');
  const loss = rpgSfx('defaite').map((e) => hz(e.n));
  for (let i = 1; i < loss.length; i += 1) assert.ok(loss[i] < loss[i - 1], 'la défaite doit descendre');
});

test('lecteur sans navigateur : play() ne plante pas et reste muet', () => {
  const player = new RpgAudioPlayer();
  player.unlock(); // pas de window.AudioContext → pas de contexte
  assert.equal(player.ctx, null);
  player.play('apparition'); // doit simplement ne rien faire
  player.setMuted(true);
  player.play('victoire');
  assert.ok(true);
});
