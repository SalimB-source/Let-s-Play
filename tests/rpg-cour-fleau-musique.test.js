import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RpgPlateauMusic, RPG_PLATEAU_MUSIC_FILES } from '../src/games/rpgPlateauMusic.js';
import { RpgConqueteMusic } from '../src/games/rpgConqueteMusic.js';

function installerAudio(t) {
  const ancien = globalThis.window;
  const instances = [];
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; this.loop = false; instances.push(this); }
    async play() { this.paused = false; }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  globalThis.window = { Audio };
  t.after(() => { if (ancien === undefined) delete globalThis.window; else globalThis.window = ancien; });
  return instances;
}
const prochaine = async (audio) => { audio.paused = true; audio.onended(); await Promise.resolve(); await Promise.resolve(); };
test('Les trois pistes de la Cour du Fléau sont livrées', () => {
  const pistes = RPG_PLATEAU_MUSIC_FILES['cour-du-fleau'];
  assert.deepEqual(pistes, ['/Cathedral_of_Ash.mp3', '/Nocturne_of_the_Last_Hand.mp3', '/Le Sceau de Sang (Instrumental).mp3']);
  for (const piste of pistes) assert.ok(existsSync(new URL(`../public${piste}`, import.meta.url)));
});
test('Le lecteur alterne les trois pistes pendant le duel, puis reste silencieux après arrêt', async (t) => {
  const instances = installerAudio(t); const lecteur = new RpgPlateauMusic(() => 0);
  lecteur.setPlateau('cour-du-fleau'); await lecteur.start(); const audio = instances[0];
  assert.equal(audio.src, '/Cathedral_of_Ash.mp3'); assert.equal(audio.loop, false);
  lecteur.setMuted(true); lecteur.setVolume(.5);
  await prochaine(audio); assert.equal(audio.src, '/Nocturne_of_the_Last_Hand.mp3');
  assert.equal(audio.muted, true); assert.equal(audio.paused, false);
  await prochaine(audio); assert.equal(audio.src, '/Le Sceau de Sang (Instrumental).mp3');
  await prochaine(audio); assert.equal(audio.src, '/Cathedral_of_Ash.mp3');
  lecteur.pause(); audio.onended(); assert.equal(audio.src, '/Cathedral_of_Ash.mp3');
  lecteur.resume(); await Promise.resolve(); lecteur.stop(); audio.onended();
  assert.equal(audio.paused, true); assert.equal(audio.src, '/Cathedral_of_Ash.mp3');
  lecteur.setPlateau('necropole-des-dalles'); await lecteur.start();
  assert.equal(audio.loop, true); assert.equal(audio.src, '/Egypt.mp3');
  lecteur.destroy(); assert.equal(audio.onended, null);
});
test('La troisième piste peut être choisie au départ et revient ensuite à la première', async (t) => {
  const instances = installerAudio(t); const lecteur = new RpgPlateauMusic(() => .99);
  lecteur.setPlateau('cour-du-fleau'); await lecteur.start();
  assert.equal(instances[0].src, '/Le Sceau de Sang (Instrumental).mp3');
  await prochaine(instances[0]); assert.equal(instances[0].src, '/Cathedral_of_Ash.mp3');
  lecteur.destroy();
});
test('L’alternance fonctionne également dans le mode Conquête', async (t) => {
  const instances = installerAudio(t); const lecteur = new RpgConqueteMusic(() => 0);
  lecteur.setPlateau('cour-du-fleau'); await lecteur.start();
  await prochaine(instances[0]); assert.equal(instances[0].src, '/Nocturne_of_the_Last_Hand.mp3');
  lecteur.destroy();
});

test('En Conquête, le cimetière et la playlist de la Cour restent indépendants malgré leur piste commune', () => {
  for (const ordre of [
    ['cimetiere-des-noms-effaces', 'cour-du-fleau'],
    ['cour-du-fleau', 'cimetiere-des-noms-effaces'],
  ]) {
    const lecteur = new RpgConqueteMusic(() => .99);
    for (const plateau of ordre) lecteur.setPlateau(plateau);
    assert.notEqual(lecteur.lecteurs.get(ordre[0]), lecteur.lecteurs.get(ordre[1]));
    lecteur.destroy();
  }
});
