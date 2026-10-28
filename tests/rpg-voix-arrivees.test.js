/**
 * Voix d'arrivée des créatures — le rapprochement entre les fichiers « Game
 * voices » déposés à la racine de `public/` et les cartes du Sablier.
 *
 * Les noms livrés ne sont presque jamais les identifiants des cartes
 * (« Damiyo » → le Daimyō du Soleil rouge, « Shogun » → le Samouraï du Torii,
 * « Viking des trois hivers » → le Berserk des trois hivers, « Serpent de
 * verre » → la Vipère de verre…). Ces tests figent le rapprochement : chaque
 * voix appartient à une carte existante, aucune voix du lot ne reste orpheline
 * et aucune piste de musique ne se glisse dans le catalogue des voix.
 *
 * Ils vérifient aussi le contrat d'exécution : le moteur journalise toute
 * entrée en jeu (la page y lit la voix), la carte qui a une voix supplante son
 * accueil générique, et `RpgAudioPlayer.playCardVoice` lance le bon fichier,
 * une seule voix à la fois, en respectant le son coupé.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  RPG_ARRIVAL_VOICE_CARD_IDS,
  RPG_ARRIVAL_VOICE_FILES,
  rpgACarteUneVoix,
  rpgArrivalVoiceFile,
  rpgArrivalVoiceUrl,
} from '../src/games/rpgArrivalVoices.js';
import { cardById } from '../src/games/rpgCards.js';
import {
  rpgConsommerArriveesCreature,
  rpgConsommerArriveesDwarf,
  rpgConsommerArriveesNavire,
  rpgConsommerArriveesPirate,
  rpgJouerCreature,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';
import { RPG_CARD_VOICE_VOLUME, RpgAudioPlayer } from '../src/games/rpgAudio.js';

const PUBLIC = new URL('../public/', import.meta.url);

/** Les deux courts MP3 de `public/` qui ne sont pas des voix de carte. */
const DEJA_BRANCHES = new Set([
  'viking warrior battle cry with horn.mp3', // bruitage `victoire`
  '26509 Thunder spark transition-full.mp3', // bruitage `foudre_marteau`
]);

const fichiersVoix = readdirSync(PUBLIC)
  .filter((nom) => /\.mp3$/i.test(nom))
  .map((nom) => ({ nom, taille: readFileSync(new URL(nom, PUBLIC)).byteLength }))
  .filter(({ nom, taille }) => taille < 1_000_000 && !DEJA_BRANCHES.has(nom))
  .map(({ nom }) => nom);

function duelDeTest() {
  const deck = Array.from({ length: 30 }, () => 'fennec-des-decombres');
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

test('chaque voix appartient à une créature ou à un héros du jeu', () => {
  assert.equal(RPG_ARRIVAL_VOICE_CARD_IDS.length, 37, 'le lot « Game voices » compte 37 cartes');
  for (const carteId of RPG_ARRIVAL_VOICE_CARD_IDS) {
    const carte = cardById(carteId);
    assert.ok(carte, `${carteId} est une carte du jeu`);
    assert.ok(['creature', 'hero'].includes(carte.kind),
      `${carteId} (${carte.name}) est une créature ou un héros — jamais une magie, un terrain ni un jeton`);
  }
});

test('le rapprochement des noms approximatifs est figé', () => {
  // Les fichiers dont le nom ne dit pas la carte, un par un.
  const attendus = {
    'daimyo-du-soleil-rouge': 'Damiyo.mp3',
    'samourai-du-torii': 'Shogun.mp3',
    'vipere-de-verre': 'Serpent de verre.mp3',
    'geant-des-banquises': 'Géant de glace.mp3',
    'valkyrie-des-glaces': 'Valkyrie de glace.mp3',
    'valkyrie-au-corbeau': 'Valkyrie du corbeau.mp3',
    'valkyrie-des-neuf-nuits': 'Valkyrie des neufs nuits.mp3',
    'berserk-des-trois-hivers': 'Viking des trois hivers.mp3',
    'passeur-au-masque-de-chacal': 'Le passeur.mp3',
    'lionne-du-midi-ardent': 'lionne du soleil.mp3',
    'dame-aux-ailes-d-or': "dame aux ailes d'or.mp3",
    'faucon-du-zenith': 'faucon du zenith.mp3',
    'seigneur-des-machoires': 'Seigneur des machoires.mp3',
    'cavalier-amazigh-du-desert': 'Cavalier amazigh du desert.mp3',
    'la-barbe-rousse': 'Barbe rousse.mp3',
    'la-barbe-noire': 'Black beard.mp3',
    'kagutsuchi-flamme-originelle': 'Kagutsuchi(1).MP3',
    'la-devoreuse': 'La dévoreuse(1).MP3',
    'kusayla-roi-des-imazighen': 'Kusayla.mp3',
    'ifrit-al-ahmar': 'Ifrit el ahmar.mp3',
    'maitre-des-hieroglyphes': 'Maitre des Hieroglyphes.mp3',
    'maitre-du-marteau': 'Maitre du marteau.mp3',
    'maitre-des-corbeaux': 'Maitre des corbeaux.mp3',
  };
  for (const [carteId, fichier] of Object.entries(attendus)) {
    assert.equal(rpgArrivalVoiceFile(carteId), fichier, `${carteId} parle avec ${fichier}`);
  }
  // Les cartes dont le nom du fichier suffit.
  for (const carteId of ['susanoo', 'jormungandr', 'salem', 'yamina', 'boualem',
    'cavalier-des-deux-sabres', 'celui-qui-juge', 'jarl-au-marteau-de-guerre',
    'berserk-du-crepuscule', 'oni-de-la-fournaise', 'onna-musha-des-cendres',
    'kenshi-de-la-forge', 'tojiro-le-pourfendeur', 'celui-qui-juge', 'salem']) {
    assert.ok(rpgArrivalVoiceFile(carteId), `${carteId} a bien une voix`);
  }
});

test('chaque voix est un fichier court livré dans public/, une seule fois', () => {
  const vus = new Set();
  for (const [carteId, fichier] of Object.entries(RPG_ARRIVAL_VOICE_FILES)) {
    assert.equal(vus.has(fichier), false, `${fichier} n'est attribué qu'à une carte (${carteId})`);
    vus.add(fichier);
    const octets = readFileSync(new URL(fichier, PUBLIC)).byteLength;
    assert.ok(octets > 30_000, `${fichier} n'est pas un fichier vide`);
    assert.ok(octets < 200_000,
      `${fichier} est une voix d'arrivée (${octets} octets), pas une piste de musique`);
  }
});

test('aucune voix du lot ne reste orpheline — et aucune musique ne s’y invite', () => {
  // À la racine de public/, tout MP3 de moins d'1 Mo est une voix de carte ;
  // les pistes de plateau pèsent toutes plus de 3 Mo.
  assert.equal(fichiersVoix.length, 37, 'le dépôt livre exactement 37 voix de créature');
  const attribues = new Set(Object.values(RPG_ARRIVAL_VOICE_FILES));
  for (const nom of fichiersVoix) {
    assert.ok(attribues.has(nom), `${nom} est attribué à une carte`);
  }
  for (const nom of attribues) {
    assert.ok(fichiersVoix.includes(nom), `${nom} vit bien dans public/`);
  }
});

test('l’adresse publique encode le nom du fichier sans toucher à la base', () => {
  const url = rpgArrivalVoiceUrl('dame-aux-ailes-d-or');
  assert.ok(url.endsWith("dame%20aux%20ailes%20d'or.mp3"), url);
  assert.ok(url.startsWith('/'), 'base publique de repli hors Vite');
  assert.equal(rpgArrivalVoiceUrl(cardById('salem')), '/Salem.mp3', 'une fiche de carte suffit');
  assert.equal(rpgArrivalVoiceUrl('fennec-des-decombres'), null, 'les cartes sans voix se taisent');
  assert.equal(rpgArrivalVoiceUrl('corsaire'), null, 'un jeton n’a pas de voix');
  assert.equal(rpgArrivalVoiceUrl(null), null);
  assert.equal(rpgArrivalVoiceUrl('toString'), null, 'aucune clé héritée ne fait parler une carte');
  assert.equal(rpgACarteUneVoix('susanoo'), true);
  assert.equal(rpgACarteUneVoix('susanoo-n-est-pas-une-carte'), false);
});

test('le moteur journalise toute entrée en jeu, voix ou non', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'susanoo');
  const pose = rpgJouerCreature(duel, 'joueur', 'susanoo');
  assert.equal(pose.ok, true);
  assert.deepEqual(rpgConsommerArriveesCreature(duel), [{
    entityId: pose.entite.id,
    carteId: 'susanoo',
    cote: 'joueur',
  }]);
  assert.deepEqual(rpgConsommerArriveesCreature(duel), [], 'le journal se vide à la consommation');

  // Une carte sans voix passe par le même journal : la page décide.
  donner(duel, 'sorcier', 'fennec-des-decombres');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').ok, true);
  const sansVoix = rpgConsommerArriveesCreature(duel);
  assert.equal(sansVoix.length, 1);
  assert.equal(sansVoix[0].cote, 'sorcier');
  assert.equal(rpgACarteUneVoix(sansVoix[0].carteId), false);
});

test('La Barbe-Rousse et le Berserk du crépuscule entrent en jeu avec leur propre voix', () => {
  const duel = duelDeTest();
  donner(duel, 'joueur', 'la-barbe-rousse');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'la-barbe-rousse').ok, true);
  const arrivees = rpgConsommerArriveesCreature(duel);
  assert.deepEqual(arrivees.map((entree) => entree.carteId), ['la-barbe-rousse']);
  // Le jeton Corsaire créé par l'amiral n'est pas une arrivée : il ne parle pas.
  assert.equal(duel.joueur.creatures.length, 2);
  assert.deepEqual(rpgConsommerArriveesCreature(duel), []);
  // Les journaux génériques existent toujours : la page les tait, pas le moteur.
  assert.equal(rpgConsommerArriveesPirate(duel).length, 1);
  assert.deepEqual(rpgConsommerArriveesNavire(duel), []);

  donner(duel, 'sorcier', 'berserk-du-crepuscule');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'berserk-du-crepuscule').ok, true);
  assert.deepEqual(rpgConsommerArriveesCreature(duel).map((entree) => entree.carteId),
    ['berserk-du-crepuscule']);
  // Le Berserk garde sa réplique naine dans le journal générique — la voix
  // propre de la carte la remplace à l'écoute.
  assert.deepEqual(rpgConsommerArriveesDwarf(duel).map((entree) => entree.carteId),
    ['berserk-du-crepuscule']);
});

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.preload = '';
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    FakeAudio.instances.push(this);
  }

  play() {
    this.paused = false;
    FakeAudio.lectures.push({ src: this.src, volume: this.volume });
    return Promise.resolve();
  }

  pause() { this.paused = true; }

  removeAttribute() { this.src = ''; }

  load() {}
}
FakeAudio.instances = [];
FakeAudio.lectures = [];

function playerDeTest() {
  FakeAudio.instances = [];
  FakeAudio.lectures = [];
  const precedent = globalThis.window;
  globalThis.window = { Audio: FakeAudio };
  const player = new RpgAudioPlayer();
  return { player, rendre: () => { globalThis.window = precedent; } };
}

test('RpgAudioPlayer joue la voix de la carte, une seule à la fois', () => {
  const { player, rendre } = playerDeTest();
  try {
    const dame = rpgArrivalVoiceUrl('dame-aux-ailes-d-or');
    assert.equal(player.playCardVoice(dame), true);
    assert.equal(FakeAudio.lectures.length, 1);
    assert.ok(FakeAudio.lectures[0].src.endsWith("dame%20aux%20ailes%20d'or.mp3"));
    assert.equal(FakeAudio.lectures[0].volume, RPG_CARD_VOICE_VOLUME);

    // La deuxième arrivée coupe la première : le duel ne les chevauche pas.
    assert.equal(player.playCardVoice(rpgArrivalVoiceUrl('salem')), true);
    const premier = player.cardVoiceAudios.get(dame);
    assert.equal(premier.paused, true, 'la voix précédente est mise en pause');
    assert.equal(FakeAudio.lectures.length, 2);

    // Une même carte réutilise son élément au lieu d'en empiler un nouveau.
    const avant = FakeAudio.instances.length;
    assert.equal(player.playCardVoice(dame), true);
    assert.equal(FakeAudio.instances.length, avant, 'aucun élément audio de plus');
    assert.equal(player.cardVoiceAudios.size, 2);
    assert.equal(player.cardVoiceAudios.get(dame).paused, false);
  } finally {
    player.destroy();
    rendre();
  }
});

test('une voix ne se joue jamais quand le son est coupé', () => {
  const { player, rendre } = playerDeTest();
  try {
    const url = rpgArrivalVoiceUrl('susanoo');
    player.setMuted(true);
    assert.equal(player.playCardVoice(url), false);
    assert.equal(FakeAudio.lectures.length, 0);

    player.setMuted(false);
    player.setVolume(0);
    assert.equal(player.playCardVoice(url), false);
    assert.equal(FakeAudio.lectures.length, 0);

    assert.equal(player.playCardVoice(null), false, 'aucune adresse, aucun son');
  } finally {
    player.destroy();
    rendre();
  }
});

test('les arrivées d’un même relevé sont décalées, et le démontage les coupe', async () => {
  const { player, rendre } = playerDeTest();
  try {
    const premiere = rpgArrivalVoiceUrl('susanoo');
    const seconde = rpgArrivalVoiceUrl('salem');
    assert.equal(player.playCardVoice(premiere, 0), true);
    assert.equal(player.playCardVoice(seconde, 0.05), true);
    assert.equal(FakeAudio.lectures.length, 1, 'la seconde voix attend son tour');
    await new Promise((resolve) => { setTimeout(resolve, 90); });
    assert.equal(FakeAudio.lectures.length, 2, 'puis elle parle à son tour');

    // Le démontage annule les départs en attente.
    assert.equal(player.playCardVoice(premiere, 0.2), true);
    player.destroy();
    await new Promise((resolve) => { setTimeout(resolve, 260); });
    assert.equal(FakeAudio.lectures.length, 2, 'aucune voix ne parle après le démontage');
  } finally {
    rendre();
  }
});
