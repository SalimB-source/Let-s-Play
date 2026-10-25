/** Routage audio de l'Éclair du marteau et de l'effet d'arrivée du Maître. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ECLAIR_DU_MARTEAU_ID,
  MAITRE_DU_MARTEAU_ID,
  blessureDuMarteau,
  rpgFoudreSoundFor,
} from '../src/games/rpgFoudreAudio.js';
import {
  RPG_FOUDRE_MARTEAU_SFX,
  RPG_SFX_NAMES,
  RpgAudioPlayer,
  rpgSfx,
} from '../src/games/rpgAudio.js';
import { cardById } from '../src/games/rpgCards.js';

test('Thunder Spark est conservé intact dans public et dans les assets du jeu', () => {
  const source = readFileSync(new URL('../public/26509%20Thunder%20spark%20transition-full.mp3', import.meta.url));
  const asset = readFileSync(new URL('../src/games/assets/thunder-spark-transition-full.mp3', import.meta.url));
  assert.equal(source.byteLength, 136880);
  assert.ok(asset.equals(source), 'la copie Vite est identique octet pour octet au fichier de public/');
  assert.equal(RPG_FOUDRE_MARTEAU_SFX, 'foudre_marteau');
  assert.ok(RPG_SFX_NAMES.includes(RPG_FOUDRE_MARTEAU_SFX));
  assert.deepEqual(rpgSfx(RPG_FOUDRE_MARTEAU_SFX), [{ kind: 'sample', at: 0, dur: 3.422, g: 1 }]);
});

test('le même tonnerre accompagne le sort et l’arrivée du Maître, pas les autres actions', () => {
  assert.equal(ECLAIR_DU_MARTEAU_ID, 'eclair-du-marteau');
  assert.equal(MAITRE_DU_MARTEAU_ID, 'maitre-du-marteau');
  assert.equal(rpgFoudreSoundFor(ECLAIR_DU_MARTEAU_ID, 'spell'), RPG_FOUDRE_MARTEAU_SFX);
  assert.equal(rpgFoudreSoundFor(cardById(ECLAIR_DU_MARTEAU_ID), 'spell'), RPG_FOUDRE_MARTEAU_SFX,
    'le routage accepte aussi la fiche de carte');
  assert.equal(rpgFoudreSoundFor(ECLAIR_DU_MARTEAU_ID, 'attack'), null);
  assert.equal(rpgFoudreSoundFor(ECLAIR_DU_MARTEAU_ID, 'arrival'), null);
  assert.equal(rpgFoudreSoundFor(MAITRE_DU_MARTEAU_ID, 'arrival'), RPG_FOUDRE_MARTEAU_SFX);
  assert.equal(rpgFoudreSoundFor(MAITRE_DU_MARTEAU_ID, 'spell'), null);
  assert.equal(rpgFoudreSoundFor('poigne-de-givre', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('djinn-de-foudre', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('unknown-card', 'spell'), null);
  assert.equal(rpgFoudreSoundFor(null, 'spell'), null);
});

test('RpgAudioPlayer lit le fichier Thunder Spark et respecte le mute', () => {
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
      lectures.push(this.src);
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
        gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; } },
        connect() { return this; },
        disconnect() {},
      };
    }
    async resume() {}
    async close() {}
  }

  const previousWindow = globalThis.window;
  globalThis.window = { Audio: FakeAudio, AudioContext: FakeAudioContext };
  try {
    const player = new RpgAudioPlayer();
    player.unlock();
    assert.match(player.foudreMarteauAudio.src, /thunder-spark-transition-full\.mp3$/);
    assert.equal(player.foudreMarteauAudio.volume, 0.58);

    player.play(RPG_FOUDRE_MARTEAU_SFX);
    assert.equal(lectures.length, 1, 'la lecture SFX démarre le sample');
    assert.match(lectures[0], /thunder-spark-transition-full\.mp3$/);

    player.setMuted(true);
    player.play(RPG_FOUDRE_MARTEAU_SFX);
    assert.equal(lectures.length, 1, 'le mute empêche la lecture suivante');
    player.destroy();
    assert.equal(player.foudreMarteauAudio, null, 'le sample est libéré au démontage');
  } finally {
    globalThis.window = previousWindow;
  }
});

test('les blessures des deux marteaux se reconnaissent dans le journal à leur carte', () => {
  assert.equal(blessureDuMarteau({ sourceCarteId: ECLAIR_DU_MARTEAU_ID }), true,
    'la foudre du sort continue de s’allumer à l’écran');
  assert.equal(blessureDuMarteau({ sourceCarteId: MAITRE_DU_MARTEAU_ID, recus: 3 }), true,
    'les 3 dégâts d’arrivée du Maître allument la même animation sur leur cible');
  assert.equal(blessureDuMarteau({ sourceCarteId: MAITRE_DU_MARTEAU_ID, recus: 3, mortelle: true }), true,
    'la foudre accompagne aussi une cible détruite sur son ancien emplacement');
  assert.equal(blessureDuMarteau({ sourceCarteId: 'poigne-de-givre' }), false,
    'un autre sort de Neige n’allume pas la foudre du marteau');
  assert.equal(blessureDuMarteau({ sourceCarteId: null }), false,
    'un coup sans carte connue — une capacité — ne fait pas tomber le marteau');
  assert.equal(blessureDuMarteau({ elements: ['neige'] }), false,
    'la couleur seule ne suffit pas');
  assert.equal(blessureDuMarteau(null), false);
  assert.equal(blessureDuMarteau(undefined), false);
});
