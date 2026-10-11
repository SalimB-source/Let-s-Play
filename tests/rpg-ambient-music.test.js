/**
 * Tests de la musique d'ambiance du mode Histoire.
 *
 * Comme pour `rpgAudio.js`, la couche pure est testée sans navigateur :
 * on vérifie que les cinq tours ont bien un BPM, un thème et qu'une
 * instance reste muette en l'absence de window.AudioContext (ne plante pas,
 * comme le veut la convention du dépôt).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_AMBIENT_BPM,
  RPG_AMBIENT_THEMES,
  RPG_AMBIENT_LOOP_STEPS,
  RpgAmbientMusic,
} from '../src/games/rpgAmbientMusic.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

test('cinq ambiances, une par tour du mode Histoire', () => {
  const tourIds = RPG_STORY_TOURS.map((t) => t.id);
  assert.equal(tourIds.length, 5, 'le mode Histoire doit compter cinq tours');
  for (const id of tourIds) {
    assert.ok(RPG_AMBIENT_BPM[id], `BPM manquant pour la tour : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id], `thème manquant pour la tour : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id].nom, `nom manquant : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id].ambiance, `description d'ambiance manquante : ${id}`);
    assert.ok(RPG_AMBIENT_BPM[id] >= 55 && RPG_AMBIENT_BPM[id] <= 110,
      `le BPM de ${id} doit rester lent (ambiance, pas course) : ${RPG_AMBIENT_BPM[id]}`);
  }
});

test('supportedTours liste bien les cinq tours', () => {
  const supported = RpgAmbientMusic.supportedTours();
  assert.ok(Array.isArray(supported));
  assert.equal(supported.length, 5);
  for (const { id } of RPG_STORY_TOURS) assert.ok(supported.includes(id), `tour absente : ${id}`);
});

test('boucle de 8 mesures × 16 pas = 128 pas', () => {
  assert.equal(RPG_AMBIENT_LOOP_STEPS, 128);
});

test('setTour change la tour sans lancer d\'exception', () => {
  const player = new RpgAmbientMusic();
  for (const { id } of RPG_STORY_TOURS) {
    player.setTour(id);
    assert.equal(player.tourId, id);
  }
  // Un identifiant inconnu ne doit pas changer la tour.
  const before = player.tourId;
  player.setTour('tour-inexistante');
  assert.equal(player.tourId, before);
});

test('lecteur sans navigateur : start/stop/pause/resume/setMuted/destroy ne plantent pas', async () => {
  const player = new RpgAmbientMusic();
  await player.start(); // pas de window.AudioContext → pas de contexte
  assert.equal(player.context, null);
  assert.equal(player.running, false);
  player.pause();
  player.resume();
  player.setMuted(true);
  player.stop();
  player.destroy();
  assert.ok(true);
});

test('noms des ambiances reflètent bien chaque tour', () => {
  assert.match(RPG_AMBIENT_THEMES['tour-des-listes'].nom, /Horloger|Liste|compte/i);
  assert.match(RPG_AMBIENT_THEMES['tour-du-souk'].nom, /étal|souk/i);
  assert.match(RPG_AMBIENT_THEMES['tour-des-sables'].nom, /zénith|portail|sable/i);
  assert.match(RPG_AMBIENT_THEMES['tour-des-abysses'].nom, /cloche|fond|abîme/i);
  assert.match(RPG_AMBIENT_THEMES['tour-du-fjord'].nom, /hiver|fjord|glace|neige/i);
});
