/**
 * Arrivées en jeu des pirates et des navires — journaux audio du moteur et
 * routage des échantillons par `RpgAudioPlayer`.
 *
 * Une créature jouée depuis la main et qui entre en jeu est classée une seule
 * fois : les navires (type imprimé « Navire », tous sets confondus) vont au
 * journal `navire_arrivee`, les autres créatures pirates du set Lettres de
 * Marque au journal `pirate_arrivee`. Les jetons, réanimations et retours de
 * cale ne sont pas des arrivées : aucun journal ne les mentionne.
 *
 * L'accueil pirate a deux voix jouées en alternance d'une arrivée à l'autre :
 * le cri « Ahoy ! » (`pirate_arrivee`) puis le dialogue « Alright »
 * (`pirate_dialogue`, `Pirate_Dialogue_Alright.wav`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RPG_ABORDAGE_SFX,
  RPG_NAVIRE_ARRIVEE_SFX,
  RPG_PIRATE_ARRIVEE_SFX,
  RPG_PIRATE_DIALOGUE_SFX,
  RPG_SFX_NAMES,
  RpgAudioPlayer,
  rpgSonArriveePirate,
} from '../src/games/rpgAudio.js';
import { rpgEstCartePirate } from '../src/games/rpgLettresDeMarque.js';
import { cardById, cardHasPrintedType } from '../src/games/rpgCards.js';
import {
  rpgConsommerArriveesNavire,
  rpgConsommerArriveesPirate,
  rpgJouerCreature,
  rpgNouveauDuel,
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

test('les deux échantillons d’arrivée sont livrés avec le jeu, octet pour octet', () => {
  const dock = readFileSync(new URL('../src/games/assets/dock-sound.mp3', import.meta.url));
  assert.equal(dock.byteLength, 94125,
    'Dock Sound_320k.mp3 est conservé intact dans src/games/assets/dock-sound.mp3');
  const ahoy = readFileSync(new URL('../src/games/assets/pirate-ahoy.mp3', import.meta.url));
  assert.equal(ahoy.byteLength, 57631,
    'Cartoon Pirate Voice - Ahoy.mp3 reste l’échantillon du cri d’arrivée pirate');
  const alright = readFileSync(new URL('../src/games/assets/pirate-dialogue-alright.wav', import.meta.url));
  assert.equal(alright.byteLength, 266158,
    'Pirate_Dialogue_Alright.wav est conservé intact dans src/games/assets/pirate-dialogue-alright.wav');
  // Même contenu que le fichier déposé dans public/ : aucun ré-encodage.
  const publicAlright = readFileSync(new URL('../public/Pirate_Dialogue_Alright.wav', import.meta.url));
  assert.ok(alright.equals(publicAlright), 'la copie du jeu est identique octet pour octet à public/');
});

test('les deux accueils pirates alternent d’une arrivée à l’autre', () => {
  assert.deepEqual(
    Array.from({ length: 4 }, (_, index) => rpgSonArriveePirate(index)),
    [RPG_PIRATE_ARRIVEE_SFX, RPG_PIRATE_DIALOGUE_SFX, RPG_PIRATE_ARRIVEE_SFX, RPG_PIRATE_DIALOGUE_SFX],
  );
});

test('les prédicats identifient les pirates et les navires', () => {
  assert.equal(rpgEstCartePirate(cardById('mousse-des-galiotes')), true);
  assert.equal(rpgEstCartePirate(cardById('la-barbe-rousse')), true);
  // Le jeton Corsaire et les magies du set ne sont pas des cartes pirates jouées.
  assert.equal(rpgEstCartePirate(cardById('corsaire')), false);
  assert.equal(rpgEstCartePirate(cardById('lettre-de-marque')), false);
  // Les créatures des autres sets ne sont pas des pirates du set Piraterie.
  assert.equal(rpgEstCartePirate(cardById('fennec-des-decombres')), false);
  assert.equal(rpgEstCartePirate(null), false);

  assert.equal(cardHasPrintedType(cardById('cotre-de-course'), 'Navire'), true);
  assert.equal(cardHasPrintedType(cardById('drakkar-a-tete-de-dragon'), 'Navire'), true);
  assert.equal(cardHasPrintedType(cardById('mousse-des-galiotes'), 'Navire'), false);
});

test('une pirate non-navire journalise une arrivée pirate, jamais une arrivée navire', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'mousse-des-galiotes');
  const pose = rpgJouerCreature(duel, 'joueur', 'mousse-des-galiotes');
  assert.equal(pose.ok, true);

  const pirates = rpgConsommerArriveesPirate(duel);
  assert.deepEqual(pirates, [{
    entityId: pose.entite.id,
    carteId: 'mousse-des-galiotes',
    cote: 'joueur',
  }]);
  assert.deepEqual(rpgConsommerArriveesNavire(duel), []);
  // Le journal se vide à la consommation : un second relevé ne rejoue rien.
  assert.deepEqual(rpgConsommerArriveesPirate(duel), []);
});

test('un navire du set pirate accoste au journal navire — sans doublon du cri pirate', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'cotre-de-course');
  const pose = rpgJouerCreature(duel, 'joueur', 'cotre-de-course');
  assert.equal(pose.ok, true);

  const navires = rpgConsommerArriveesNavire(duel);
  assert.equal(navires.length, 1);
  assert.equal(navires[0].carteId, 'cotre-de-course');
  assert.equal(navires[0].entityId, pose.entite.id);
  // Le type Navire prime : le même navire ne remplit pas le journal pirate.
  assert.deepEqual(rpgConsommerArriveesPirate(duel), []);
});

test('le Drakkar neigeux est un navire lui aussi, bien qu’il soit d’un autre set', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'drakkar-a-tete-de-dragon');
  const pose = rpgJouerCreature(duel, 'joueur', 'drakkar-a-tete-de-dragon');
  assert.equal(pose.ok, true);

  const navires = rpgConsommerArriveesNavire(duel);
  assert.equal(navires.length, 1);
  assert.equal(navires[0].carteId, 'drakkar-a-tete-de-dragon');
  assert.deepEqual(rpgConsommerArriveesPirate(duel), []);
});

test('une créature ordinaire d’un autre set ne déclenche aucun journal d’arrivée', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'fennec-des-decombres');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').ok, true);
  assert.deepEqual(rpgConsommerArriveesPirate(duel), []);
  assert.deepEqual(rpgConsommerArriveesNavire(duel), []);
});

test('La Barbe-Rousse journalise son arrivée, mais pas les deux jetons Corsaire qu’elle crée', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'la-barbe-rousse');
  const pose = rpgJouerCreature(duel, 'joueur', 'la-barbe-rousse');
  assert.equal(pose.ok, true);
  // L’amiral + ses deux jetons occupent trois cases.
  assert.equal(duel.joueur.creatures.length, 3);
  assert.equal(duel.joueur.creatures.filter((e) => e.jeton).length, 2);

  const pirates = rpgConsommerArriveesPirate(duel);
  assert.deepEqual(pirates.map((e) => e.carteId), ['la-barbe-rousse']);
  assert.equal(pirates[0].entityId, pose.entite.id);
  assert.deepEqual(rpgConsommerArriveesNavire(duel), []);
});

test('le sorcier adverse journalise aussi ses arrivées, du bon côté', () => {
  const duel = duelDeTest();
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'mousse-des-galiotes').ok, true);
  const pirates = rpgConsommerArriveesPirate(duel);
  assert.equal(pirates.length, 1);
  assert.equal(pirates[0].cote, 'sorcier');

  donner(duel, 'sorcier', 'le-brulot');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'le-brulot').ok, true);
  const navires = rpgConsommerArriveesNavire(duel);
  assert.deepEqual(navires.map((e) => ({ carteId: e.carteId, cote: e.cote })), [
    { carteId: 'le-brulot', cote: 'sorcier' },
  ]);
  assert.deepEqual(rpgConsommerArriveesPirate(duel), []);
});

test('RpgAudioPlayer route les quatre échantillons maritimes vers les bons fichiers', () => {
  assert.ok(RPG_SFX_NAMES.includes('pirate_arrivee'));
  assert.ok(RPG_SFX_NAMES.includes('pirate_dialogue'));
  assert.ok(RPG_SFX_NAMES.includes('navire_arrivee'));
  assert.ok(RPG_SFX_NAMES.includes('abordage'));

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
    assert.match(player.pirateDialogueAudio.src, /pirate-dialogue-alright\.wav$/);
    assert.match(player.dockSoundAudio.src, /dock-sound\.mp3$/);
    assert.match(player.chainRattleAudio.src, /chain-rattle\.wav$/);

    player.play(RPG_PIRATE_ARRIVEE_SFX);
    player.play(RPG_PIRATE_DIALOGUE_SFX);
    player.play(RPG_NAVIRE_ARRIVEE_SFX);
    player.play(RPG_ABORDAGE_SFX);
    const fichiers = lectures.map((l) => l.src.split('/').pop());
    assert.deepEqual(fichiers, [
      'pirate-ahoy.mp3', 'pirate-dialogue-alright.wav', 'dock-sound.mp3', 'chain-rattle.wav',
    ]);

    player.setMuted(true);
    const avantMute = lectures.length;
    player.play(RPG_PIRATE_ARRIVEE_SFX);
    player.play(RPG_PIRATE_DIALOGUE_SFX);
    player.play(RPG_NAVIRE_ARRIVEE_SFX);
    assert.equal(lectures.length, avantMute, 'muet : aucun son d’arrivée supplémentaire');

    player.destroy();
    assert.equal(player.pirateAhoyAudio, null);
    assert.equal(player.pirateDialogueAudio, null);
    assert.equal(player.dockSoundAudio, null);
    assert.equal(player.chainRattleAudio, null);
  } finally {
    globalThis.window = prevWindow;
  }
});
