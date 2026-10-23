import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campMusicalDuTerritoire, plateauMusicalDuCamp, RpgConqueteMusic } from '../src/games/rpgConqueteMusic.js';

const JAPON = 'cour-de-l-empereur';
const MER = 'ruines-de-tipaza';

test('20 points d’écart : seuils inclusifs 60/40 et hystérésis dans la bande neutre', () => {
  assert.equal(campMusicalDuTerritoire(60, 'sorcier'), 'joueur');
  assert.equal(campMusicalDuTerritoire(40, 'joueur'), 'sorcier');
  for (const part of [40.1, 49, 50, 59.9]) {
    assert.equal(campMusicalDuTerritoire(part, 'joueur'), 'joueur');
    assert.equal(campMusicalDuTerritoire(part, 'sorcier'), 'sorcier');
  }
  assert.equal(campMusicalDuTerritoire(50), 'joueur');
  assert.equal(campMusicalDuTerritoire(100, 'sorcier'), 'joueur');
  assert.equal(campMusicalDuTerritoire(0), 'sorcier');
});

test('chaque camp impose son thème, avec repli quand le terrain est sans piste', () => {
  assert.equal(plateauMusicalDuCamp('sorcier', JAPON, MER), MER);
  assert.equal(plateauMusicalDuCamp('joueur', JAPON, MER), JAPON);
  assert.equal(plateauMusicalDuCamp('sorcier', JAPON, 'necropole-des-dalles'), JAPON);
  assert.equal(plateauMusicalDuCamp('joueur', 'necropole-des-dalles', MER), MER);
  assert.equal(plateauMusicalDuCamp('sorcier', 'necropole-des-dalles', 'palais-du-pharaon'), 'palais-du-pharaon');
});

function installerAudio(t) {
  const avant = globalThis.window;
  const pistes = [];
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; pistes.push(this); }
    async play() { if (this.refuse) throw new Error('autoplay'); this.paused = false; }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  globalThis.window = { Audio };
  t.after(() => { if (avant === undefined) delete globalThis.window; else globalThis.window = avant; });
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  return pistes;
}

const audible = (lecteur) => [...new Set(lecteur.lecteurs.values())].filter((e) => e.gain > 0 && !e.lecteur.audio?.paused);

test('fondu de 1,2 s, position conservée au retour, aucune relance à chaque rendu', async (t) => {
  const pistes = installerAudio(t);
  let tirages = 0;
  const musique = new RpgConqueteMusic(() => { tirages++; return .1; });
  t.after(() => musique.destroy());
  musique.setPlateau(JAPON, { reroll: true });
  await musique.start();
  const japon = pistes[0];
  japon.currentTime = 42;
  musique.setPlateau(MER);
  await musique.start();
  assert.equal(pistes.length, 2);
  const mer = pistes[1];
  t.mock.timers.tick(600);
  assert.ok(Math.abs(japon.volume - .08) < .00001);
  assert.ok(Math.abs(mer.volume - .08) < .00001);
  await musique.start(); // ne recommence pas le fondu
  t.mock.timers.tick(600);
  assert.equal(japon.paused, true);
  assert.equal(mer.volume, .16);
  mer.currentTime = 18;
  musique.setPlateau(JAPON);
  await musique.start();
  t.mock.timers.tick(1200);
  assert.equal(japon.currentTime, 42);
  assert.equal(mer.currentTime, 18);
  assert.equal(mer.paused, true);
  assert.equal(audible(musique).length, 1);
  assert.equal(pistes.length, 2);
  assert.equal(tirages, 1, 'le thème japonais n’est tiré qu’une fois par duel');
  musique.setPlateau(JAPON, { reroll: true });
  await musique.start();
  assert.equal(tirages, 2, 'nouvelle partie : nouveau tirage');
  assert.equal(japon.src, '', 'les anciens lecteurs sont libérés');
});

test('inversion pendant un fondu, pause/reprise, mute et volume ne laissent aucune piste fantôme', async (t) => {
  const pistes = installerAudio(t);
  const musique = new RpgConqueteMusic(() => .1);
  t.after(() => musique.destroy());
  musique.setPlateau(JAPON);
  await musique.start();
  musique.setPlateau(MER);
  await musique.start();
  t.mock.timers.tick(400);
  musique.setPlateau(JAPON);
  await musique.start();
  t.mock.timers.tick(200);
  musique.pause();
  const gains = pistes.map((p) => p.volume);
  assert.ok(pistes.every((p) => p.paused));
  t.mock.timers.tick(2000);
  assert.deepEqual(pistes.map((p) => p.volume), gains);
  musique.resume();
  await Promise.resolve(); await Promise.resolve();
  musique.setVolume(.5);
  musique.setMuted(true);
  assert.ok(pistes.every((p) => p.muted));
  t.mock.timers.tick(1200);
  musique.setMuted(false);
  assert.equal(pistes[0].volume, .08);
  assert.equal(pistes[1].paused, true);
  musique.stop();
  assert.ok(pistes.every((p) => p.paused && p.currentTime === 0));
  assert.equal(musique.timer, null);
});

test('un refus de play garde l’ancienne musique et autorise une nouvelle tentative', async (t) => {
  const pistes = installerAudio(t);
  const musique = new RpgConqueteMusic(() => .1);
  t.after(() => musique.destroy());
  musique.setPlateau(JAPON);
  await musique.start();
  musique.setPlateau(MER);
  // Le lecteur HTML est créé dans start(), forcer son refus à la création.
  const AncienAudio = window.Audio;
  window.Audio = class extends AncienAudio { constructor(src) { super(src); this.refuse = true; } };
  await musique.start();
  t.mock.timers.tick(2000);
  assert.equal(pistes[0].volume, .16);
  assert.equal(pistes[0].paused, false);
  pistes[1].refuse = false;
  await musique.start();
  t.mock.timers.tick(1200);
  assert.equal(pistes[0].paused, true);
  assert.equal(pistes[1].volume, .16);
});

test('deux terrains partageant un fichier ne lancent pas deux copies du morceau', async (t) => {
  const pistes = installerAudio(t);
  const musique = new RpgConqueteMusic(() => .1);
  t.after(() => musique.destroy());
  musique.setPlateau('caravane-de-gourara');
  await musique.start();
  pistes[0].currentTime = 13;
  musique.setPlateau('desert-de-verre');
  await musique.start();
  assert.equal(pistes.length, 1);
  assert.equal(pistes[0].currentTime, 13);
});

test('les anciens play asynchrones ne repartent pas après une pause ou un changement de cible', async (t) => {
  const pistes = installerAudio(t);
  const musique = new RpgConqueteMusic(() => .1);
  t.after(() => musique.destroy());
  musique.setPlateau(JAPON);
  await musique.start();
  const AncienAudio = window.Audio;
  let finir;
  window.Audio = class extends AncienAudio {
    play() { return new Promise((resolve) => { finir = () => { this.paused = false; resolve(); }; }); }
  };
  musique.setPlateau(MER);
  const attente = musique.start();
  musique.pause();
  finir();
  await attente;
  assert.ok(pistes.every((p) => p.paused));
  assert.equal(musique.timer, null);
});
