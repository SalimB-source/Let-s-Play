import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_ABORDAGE_SFX, RPG_SFX_NAMES, RpgAudioPlayer, rpgSfx } from '../src/games/rpgAudio.js';
import {
  rpgConsommerPrisesEnCale,
  rpgJouerArme,
  rpgJouerCreature,
  rpgLancerMagie,
  rpgNouveauDuel,
  rpgPrisesEnCale,
  rpgRanconner,
  rpgResoudreArriveeCiblee,
} from '../src/games/rpgDuel.js';

function duelDeTest() {
  const deck = Array.from({ length: 30 }, () => 'mousse-des-galiotes');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.42 });
  duel.mulliganFait = { joueur: true, sorcier: true };
  duel.tour = 'joueur';
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = { braise: 10, eau: 10, sable: 10, neige: 10, tenebres: 10 };
    duel[cote].manaMax = { ...duel[cote].mana };
    duel[cote].main = [];
    duel[cote].creatures = [];
  }
  return duel;
}

function donner(duel, cote, carteId) {
  duel[cote].main.push(carteId);
}

test('pirate-ahoy.mp3 est l’échantillon fourni, déclaré et lu par RpgAudioPlayer', () => {
  const mp3 = readFileSync(new URL('../src/games/assets/pirate-ahoy.mp3', import.meta.url));
  assert.equal(mp3.byteLength, 57631, 'Cartoon Pirate Voice - Ahoy.mp3 est conservé octet pour octet');
  assert.equal(RPG_ABORDAGE_SFX, 'abordage');
  assert.ok(RPG_SFX_NAMES.includes('abordage'));
  assert.deepEqual(rpgSfx('abordage'), [{ kind: 'sample', at: 0, dur: 1.411, g: 1 }]);

  const lectures = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.preload = '';
      this.volume = 1;
      this.currentTime = 0;
      this.paused = true;
    }
    play() {
      this.paused = false;
      lectures.push({ src: this.src, volume: this.volume });
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  class FakeAudioContext {
    constructor() {
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = { connect() { return this; }, disconnect() {} };
      this.state = 'running';
    }
    createGain() {
      return {
        gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } },
        connect() { return this; },
        disconnect() {},
      };
    }
    async resume() {}
    async close() {}
  }

  const prevWindow = globalThis.window;
  globalThis.window = { Audio: FakeAudio, AudioContext: FakeAudioContext };
  try {
    const player = new RpgAudioPlayer();
    player.unlock();
    assert.match(player.pirateAhoyAudio.src, /pirate-ahoy\.mp3$/);

    player.play(RPG_ABORDAGE_SFX);
    assert.equal(lectures.length, 1, 'le cri pirate « Ahoy ! » est joué');
    assert.match(lectures[0].src, /pirate-ahoy\.mp3$/);

    player.setMuted(true);
    player.play(RPG_ABORDAGE_SFX);
    assert.equal(lectures.length, 1, 'muet : aucune lecture supplémentaire');
    assert.equal(player.pirateAhoyAudio.paused, true);

    player.destroy();
    assert.equal(player.pirateAhoyAudio, null);
  } finally {
    globalThis.window = prevWindow;
  }
});

test('le journal des prises en cale ne sonne que lorsqu’une créature est réellement kidnappée', () => {
  const duel = duelDeTest();

  // 1. Table adverse vide : poser une créature avec Abordage ne kidnappe rien.
  donner(duel, 'joueur', 'rais-de-la-galiote');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'rais-de-la-galiote', null, { cibleDifferee: true }).ok, true);
  assert.deepEqual(rpgConsommerPrisesEnCale(duel), [], 'aucune prise sur table vide');
  assert.deepEqual(rpgPrisesEnCale(duel), []);

  // 2. Désignation différée (table réelle) : la pose ouvre l'attente en silence,
  //    puis le clic sur la victime déclenche la prise et l'événement audio.
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'mousse-des-galiotes').ok, true);
  const mousse = duel.sorcier.creatures[0];

  duel.tour = 'joueur';
  donner(duel, 'joueur', 'cotre-de-course');
  const pose = rpgJouerCreature(duel, 'joueur', 'cotre-de-course', null, { cibleDifferee: true });
  assert.equal(pose.arriveeEnAttente, true);
  assert.deepEqual(rpgConsommerPrisesEnCale(duel), [], 'l’attente seule ne sonne pas avant la désignation');

  const capture = rpgResoudreArriveeCiblee(duel, 'joueur', mousse.id);
  assert.equal(capture.ok, true);
  const prisesFraiches = rpgConsommerPrisesEnCale(duel);
  assert.equal(prisesFraiches.length, 1, 'la capture produit une prise fraîche');
  assert.equal(prisesFraiches[0].entityId, mousse.id);
  assert.equal(prisesFraiches[0].capteurCarteId, 'cotre-de-course');
  assert.deepEqual(rpgConsommerPrisesEnCale(duel), [], 'le journal audio est consommé une seule fois');
  assert.equal(rpgPrisesEnCale(duel).length, 1, 'l’historique de la table reste intact');

  // 3. Payer la rançon ne rejoue pas le cri d'abordage.
  duel.tour = 'sorcier';
  assert.equal(rpgRanconner(duel, 'sorcier', pose.entite.id).ok, true);
  assert.deepEqual(rpgConsommerPrisesEnCale(duel), [], 'la rançon ne sonne pas comme un kidnapping');
});

test('l’IA sorcier, la Lettre de marque et le Grappin d’abordage déclenchent aussi la prise', () => {
  const duel = duelDeTest();

  // Côté joueur : une cible de coût 1 est posée.
  donner(duel, 'joueur', 'mousse-des-galiotes');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'mousse-des-galiotes').ok, true);

  // Côté sorcier : un Raïs accoste et kidnappe automatiquement la Mousse.
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'rais-de-la-galiote');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'rais-de-la-galiote').ok, true);
  const priseSorcier = rpgConsommerPrisesEnCale(duel);
  assert.equal(priseSorcier.length, 1, 'la prise du sorcier est enregistrée');
  assert.equal(priseSorcier[0].coteCapteur, 'sorcier');

  // Côté joueur : Lettre de marque donne Abordage aux créatures qui arrivent.
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'lettre-de-marque');
  donner(duel, 'joueur', 'tercio-de-cuivre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'lettre-de-marque', 'soi').ok, true);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'tercio-de-cuivre').ok, true);
  const priseLettre = rpgConsommerPrisesEnCale(duel);
  assert.equal(priseLettre.length, 1, 'une créature sous Lettre de marque kidnappe le Raïs');
  assert.equal(priseLettre[0].capteurCarteId, 'tercio-de-cuivre');

  // Duel dédié pour le Grappin d'abordage : le porteur kidnappe une créature adverse de coût 1.
  const duelGrappin = duelDeTest();
  donner(duelGrappin, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duelGrappin, 'joueur', 'fennec-des-decombres').entite;
  duelGrappin.tour = 'sorcier';
  donner(duelGrappin, 'sorcier', 'mousse-des-galiotes');
  const victime = rpgJouerCreature(duelGrappin, 'sorcier', 'mousse-des-galiotes').entite;
  duelGrappin.tour = 'joueur';
  donner(duelGrappin, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(duelGrappin, 'joueur', 'grappin-d-abordage', fennec.id).ok, true);
  assert.deepEqual(rpgConsommerPrisesEnCale(duelGrappin), [], 'l’attente du Grappin ne sonne pas encore');
  assert.equal(rpgResoudreArriveeCiblee(duelGrappin, 'joueur', victime.id).ok, true);
  assert.equal(rpgConsommerPrisesEnCale(duelGrappin).length, 1, 'le Grappin d’abordage déclenche aussi le son');
});

test('RpgDuelPage joue « abordage » au kidnapping (joueur et sorcier), sans bruit de destruction', async () => {
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'scripts/rpg-abordage-audio-smoke.jsx',
      outDir: 'node_modules/.cache/rpg-abordage-audio',
      emptyOutDir: true,
    },
  });
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  const fichiersLus = [];
  dom.window.HTMLMediaElement.prototype.play = function fakeMediaPlay() {
    fichiersLus.push(this.src);
    return Promise.resolve();
  };
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  dom.window.AudioContext = class FakeDomAudioContext {
    constructor() {
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = { connect() { return this; }, disconnect() {} };
      this.state = 'running';
    }
    createGain() {
      return {
        gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } },
        connect() { return this; },
        disconnect() {},
      };
    }
    async resume() {}
    async close() {}
  };
  const savedGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const { checkRpgAbordageAudio } = await import('../node_modules/.cache/rpg-abordage-audio/rpg-abordage-audio-smoke.js');
    await checkRpgAbordageAudio(assert, fichiersLus);
  } finally {
    dom.window.close();
    for (const [key, value] of Object.entries(savedGlobals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
