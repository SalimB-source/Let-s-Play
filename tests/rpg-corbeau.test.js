/**
 * La Tour du Corbeau — le set hybride Neige + Ténèbres (doc 22).
 *
 * Trois familles d'assertions :
 *
 *  1. **Le set** — six cartes, toutes Neige + Ténèbres, un seul héros
 *     mythique, une peinture plein art par carte, et la figure retournée du
 *     Père des corbeaux qui réunit les mots-clés des deux identités.
 *  2. **La tour** — quatre étages, quatre paquets hybrides valides, une
 *     puissance qui monte, le Maître des corbeaux au sommet, et sa place
 *     avant la tour terminale du Sablier renversé.
 *  3. **Le jeu** — le Maître exile bien une créature de coût 4 au plus, son
 *     Tribut paie, le corbeau de givre et la Valkyrie respectent leur seuil
 *     de coût, et Neige noire gèle toute la table adverse en payant son prix
 *     en PV.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  cardById,
  cardColors,
  cardColorCost,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import {
  RPG_CORBEAU_CARDS,
  RPG_CORBEAU_CREATURES,
  RPG_CORBEAU_FIGURES,
  RPG_CORBEAU_MAGIES,
  RPG_CORBEAU_SET_ID,
  carteDuCorbeauParId,
} from '../src/games/rpgCorbeau.js';
import { RPG_RECETTES_HISTOIRE } from '../src/games/rpgDeckRecipes.js';
import { composerDeck } from '../src/games/rpgDeckComposer.js';
import { CATALOGUE_DU_COMPOSEUR } from '../src/games/rpgCards.js';
import {
  RPG_STORY_DECKS,
  RPG_STORY_TOURS,
  deckHistoire,
  etageHistoireParId,
  tourHistoireParId,
} from '../src/games/rpgStoryTours.js';
import { plateauDeDeck } from '../src/games/rpgPlateaux.js';
import {
  COLLECTION_DEPART,
  RPG_REVELATIONS_PAR_ETAGE,
  possedeCarte,
} from '../src/games/rpgCollection.js';
import { cardArt, cardArtFurie } from '../src/games/rpgCardArt.js';
import { RPG_PLATEAU_MUSIC_FILES, RPG_PLATEAUX_MUSICAUX } from '../src/games/rpgPlateauMusic.js';
import { RPG_STORY_TOWER_THEMES } from '../src/games/rpgStoryTowerModels.js';
import {
  rpgAttaquerSorcier,
  rpgJouerCreature,
  rpgLancerMagie,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';

const ETAGES = ['corbeau-1', 'corbeau-2', 'corbeau-3', 'corbeau-4'];
const DECKS = ['corbeaux-du-givre', 'serment-des-neuf-nuits', 'veille-du-corbeau', 'maitre-des-corbeaux'];

const duelDeBase = (opts = {}) => rpgNouveauDuel({
  joueurDeck: ['chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'porteuse-de-cruches', 'guetteur-du-beffroi', 'dune-marchante'],
  sorcierDeck: ['chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante'],
  rng: () => 0.5,
  ...opts,
});

const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);
const donnerMana = (duel, cote, n) => {
  duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, n]));
};

// ── 1. Le set ───────────────────────────────────────────────────────────────

test('le Corbeau des neuf nuits est un set hybride complet : six cartes, toutes Neige + Ténèbres', () => {
  assert.equal(RPG_CORBEAU_SET_ID, 'corbeau-des-neuf-nuits');
  assert.equal(RPG_CORBEAU_CARDS.length, 6, 'six cartes signature, ni plus ni moins');
  assert.equal(RPG_CORBEAU_CREATURES.length, 4);
  assert.equal(RPG_CORBEAU_FIGURES.length, 1, 'une seule figure mythique');
  assert.equal(RPG_CORBEAU_MAGIES.length, 1);

  const ids = new Set();
  for (const carte of RPG_CORBEAU_CARDS) {
    assert.equal(ids.has(carte.id), false, `identifiant dupliqué : ${carte.id}`);
    ids.add(carte.id);
    assert.equal(carte.set, RPG_CORBEAU_SET_ID, `${carte.id} appartient au set`);
    assert.deepEqual(cardColors(carte), ['neige', 'tenebres'], `${carte.id} est Neige + Ténèbres`);
    const auCatalogue = cardById(carte.id);
    assert.ok(auCatalogue, `${carte.id} est bien au catalogue du duel`);
    assert.equal(auCatalogue.set, RPG_CORBEAU_SET_ID, `${carte.id} garde son set au catalogue`);
    assert.equal(carteDuCorbeauParId(carte.id), carte);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${carte.id}.jpg`, import.meta.url))),
      `${carte.id} a sa peinture plein art`);
    // Aucun des deux éléments n'est oublié dans le coût : la carte demande
    // bien une source de chaque couleur.
    const cout = cardColorCost(carte);
    assert.equal(cout.neige, 1, `${carte.id} demande un pip de Neige`);
    assert.equal(cout.tenebres, 1, `${carte.id} demande un pip de Ténèbres`);
  }
  assert.equal(carteDuCorbeauParId('inconnue'), null);
  assert.equal(new Set(RPG_DUEL_CARDS.map((carte) => carte.id)).size, RPG_DUEL_CARDS.length,
    'le catalogue entier reste sans doublon');
});

test('le Maître des corbeaux est la figure retournée du Père des corbeaux', () => {
  const maitre = cardById('maitre-des-corbeaux');
  const pere = cardById('pere-des-corbeaux');
  assert.equal(maitre.kind, 'hero');
  assert.equal(maitre.rarity, 'mythique');
  assert.equal(maitre.role, 'Celui qui voit dans la nuit');
  assert.deepEqual([maitre.cost, maitre.atk, maitre.def], [7, 5, 6]);
  // Les mots-clés des deux identités se rencontrent sur la même fiche.
  assert.equal(maitre.envol, true, 'la Neige garde son Envol');
  assert.equal(maitre.tenacite, true, 'la Neige garde sa Tenacité');
  assert.equal(maitre.tribut, 1, 'les Ténèbres apportent le Tribut');
  assert.deepEqual(maitre.arrivee, { type: 'exil', cible: 'creature', coutMax: 4 });
  assert.ok(maitre.cost > pere.cost, 'la figure retournée coûte plus cher que son état d’origine');
  assert.ok(maitre.arrivee.coutMax >= pere.arrivee.coutMax, 'ses corbeaux emportent au moins les mêmes créatures que le Père');
  for (const carte of [maitre, pere]) {
    assert.doesNotMatch(`${carte.name} ${carte.role} ${carte.text} ${carte.flavor}`, /\bdieu(x)?\b/i,
      'aucune figure du Nord n’est nommée divinité');
  }
  assert.match(maitre.flavor, /œil/, 'la saveur reprend l’œil donné du Père');
  assert.match(maitre.flavor, /neige/i, 'et la neige qui entre dans la nuit');
});

test('les cartes du Corbeau réunissent les vocabulaires imprimés des deux couleurs', () => {
  const corbeau = cardById('corbeau-de-givre');
  assert.equal(corbeau.envol, true);
  assert.deepEqual(corbeau.arrivee, { type: 'gel', cible: 'creature', coutMax: 3 },
    'le cri ne fige que les créatures de coût 3 ou moins');

  const veilleuse = cardById('veilleuse-au-corbeau-noir');
  assert.equal(veilleuse.rapidite, true, 'la Neige prête sa Rapidité');
  assert.equal(veilleuse.tribut, 1, 'les Ténèbres prêtent le Tribut');

  const berserk = cardById('berserk-du-crepuscule');
  assert.deepEqual([berserk.atk, berserk.def], [3, 5], 'le berserker tient la ligne : 3/5');
  assert.equal(berserk.provocation, true, 'la Provocation ouvre le combat');
  assert.equal(berserk.furie, 2, 'la Furie est un mot-clé de Neige');
  assert.equal(berserk.tribut, 2, 'le Tribut est un mot-clé de Ténèbres');
  assert.equal(berserk.destruction, undefined, 'la mort ne paie plus : le Tribut paie au contact');

  const valkyrie = cardById('valkyrie-des-neuf-nuits');
  assert.equal(valkyrie.envol, true);
  assert.equal(valkyrie.furie, 2);
  assert.deepEqual(valkyrie.arrivee, { type: 'exil', cible: 'creature', coutMax: 3 },
    'sa révision porte le seuil d’exil de 2 à 3 manas');

  const neige = cardById('neige-noire');
  assert.equal(neige.kind, 'magie');
  assert.equal(neige.cost, 6, 'la neige noire coûte six manas');
  assert.equal(neige.prixPv, 3, 'le Prix se paie en PV');
  assert.deepEqual(neige.effet, { type: 'destruction-coutmax', coutMax: 3, cible: 'creatures-adverses', gel: true },
    'la vague brise les coûts de 3 ou moins, puis fige les survivantes — d’un seul côté');
  assert.doesNotMatch(neige.text, /dégâts? nus?/i, 'aucune carte du set ne frappe nu');
});

test('le Berserk du crépuscule et la Valkyrie des neuf nuits changent de peinture en Furie', () => {
  // Les deux cartes du set hybride qui portent la Furie ont leur visuel
  // alternatif : tant que l’état est déclenché, la table et la preview
  // affichent `*-furie.jpg`, daté sous sa propre révision pour qu’aucun cache
  // ne resserve la face calme.
  const portraits = [
    // Les deux furies ont été repeintes dans la passe Souls (octobre 2026) :
    // même composition, mais l'huile sombre de la collection au lieu d'une
    // facture d'une autre époque.
    //
    // Le Berserk du crépuscule a ensuite été recadré (octobre 2026) : sa tête
    // tombait sous le bandeau de nom. Face intacte et face de Furie ont été
    // resserrées ensemble, avec le crâne dégagé sous le bandeau —
    // et portent donc chacune leur révision, le temps que les caches se
    // retournent.
    ['berserk-du-crepuscule', 'corbeau-furie-crepuscule-charge-v4', 'corbeau-crepuscule-zoom-v4'],
    ['valkyrie-des-neuf-nuits', 'corbeau-furie-souls-v1', 'corbeau-neuf-nuits-v1'],
  ];
  for (const [carteId, revision, revisionIntacte] of portraits) {
    const carte = cardById(carteId);
    assert.equal(carte.furie, 2, `${carteId} porte bien la Furie 2`);
    assert.equal(cardArtFurie(carte),
      `/cards/${carteId}-furie.jpg?v=${revision}`,
      `${carteId} affiche sa peinture furie, datée sous ${revision}`);
    assert.match(cardArt(carte), new RegExp(`^/cards/${carteId}\\.jpg\\?v=${revisionIntacte}$`),
      `${carteId} garde sa peinture intacte, sous ${revisionIntacte}`);
    assert.ok(existsSync(fileURLToPath(
      new URL(`../public/cards/${carteId}-furie.jpg`, import.meta.url),
    )), `${carteId}-furie.jpg est livré avec le jeu`);
  }
});

// ── 2. La tour ──────────────────────────────────────────────────────────────

test('la Tour du Corbeau dresse quatre étages hybrides avant la tour du Sablier renversé', () => {
  const tour = tourHistoireParId('tour-du-corbeau');
  assert.ok(tour, 'la tour fait partie des Tours de Bab El');
  assert.equal(RPG_STORY_TOURS.at(-2).id, 'tour-du-sablier-renverse',
    'le Sablier renversé reste la dernière tour du récit, la Tour Oubliée n’étant qu’un épilogue secret');
  const position = RPG_STORY_TOURS.findIndex((candidate) => candidate.id === tour.id);
  assert.equal(RPG_STORY_TOURS[position + 1].id, 'tour-du-sablier-renverse',
    'la Tour du Corbeau se dresse juste avant elle');
  assert.equal(tour.miniature, 'tour-du-corbeau.jpg');
  assert.match(tour.resume, /neige|corbeau/i, 'son résumé annonce la neige et le corbeau');
  assert.match(tour.resume, /nuit|noir/i, 'et la nuit qui l’accompagne');
  assert.equal(tour.etages.length, 4);
  assert.deepEqual(tour.etages.map((etage) => etage.id), ETAGES);
  assert.deepEqual(tour.etages.map((etage) => etage.deck), DECKS);
  assert.deepEqual(tour.etages.map((etage) => etage.puissance), [4, 5, 6, 7],
    'la puissance monte d’étage en étage');

  const niveaux = tour.etages.map((etage) => etage.ia.niveau);
  assert.deepEqual(niveaux, ['normale', 'veilleur', 'veilleur', 'sablier'],
    'la tour finit sur le cerveau le plus fort du jeu');
  assert.equal(tour.etages.at(-1).nom, 'Le Maître des corbeaux');
  assert.equal(tour.etages.at(-1).avatar, 'maitre-des-corbeaux');
  for (const etage of tour.etages.slice(0, 3)) {
    assert.ok(etage.avatar && cardById(etage.avatar), `${etage.id} : le portrait est une carte du catalogue`);
  }
  for (const etage of tour.etages) {
    assert.equal(etageHistoireParId(etage.id).tour.id, tour.id);
  }
});

test('les quatre paquets de la tour sont hybrides, valides et composés par leur recette', () => {
  for (const deckId of DECKS) {
    const recette = RPG_RECETTES_HISTOIRE[deckId];
    assert.ok(recette, `${deckId} a sa recette`);
    assert.deepEqual(recette.identite, ['neige', 'tenebres'], `${deckId} est hybride Neige + Ténèbres`);
    assert.deepEqual(RPG_STORY_DECKS[deckId], composerDeck(recette, CATALOGUE_DU_COMPOSEUR),
      `${deckId} vaut la composition de sa recette`);

    const deck = deckHistoire(deckId);
    const validation = rpgValiderDeck(deck);
    assert.equal(validation.ok, true, `${deckId} : ${validation.raison}`);
    assert.equal(deck.length, 30);
    const couleurs = [...new Set(deck.flatMap((id) => cardColors(cardById(id))))].sort();
    assert.deepEqual(couleurs, ['neige', 'tenebres'], `${deckId} ne sort pas de son identité`);
  }

  // La difficulté des paquets monte : le premier étage ménage ses mythiques,
  // le dernier les aligne.
  const mythiques = (deckId) => deckHistoire(deckId).filter((id) => cardById(id).rarity === 'mythique').length;
  const suite = DECKS.map(mythiques);
  assert.deepEqual(suite, [...suite].sort((a, b) => a - b), 'les mythiques s’ajoutent d’étage en étage');
  assert.ok(suite.at(-1) >= 5, 'le Maître des corbeaux aligne au moins cinq figures mythiques');

  const boss = deckHistoire('maitre-des-corbeaux');
  assert.ok(boss.includes('maitre-des-corbeaux'), 'la figure du sommet joue dans son propre paquet');
  assert.ok(boss.includes('pere-des-corbeaux'), 'et son état d’origine aussi : le set raconte le retournement');
  assert.ok(boss.includes('valkyrie-des-neuf-nuits') && boss.includes('neige-noire'),
    'les deux rares signature du set montent avec lui');
  for (const deckId of DECKS) {
    for (const id of deckHistoire(deckId).filter((carteId) => cardById(carteId).set === RPG_CORBEAU_SET_ID)) {
      assert.ok(RPG_CORBEAU_CARDS.some((carte) => carte.id === id), `${deckId} : ${id} est une carte du set`);
    }
  }
});

test('chaque carte du Corbeau se révèle à un étage, jamais offerte d’entrée', () => {
  const revealed = Object.values(RPG_REVELATIONS_PAR_ETAGE).flat();
  for (const carte of RPG_CORBEAU_CARDS) {
    assert.equal(possedeCarte(COLLECTION_DEPART, carte.id), false, `${carte.id} n’est pas dans la dotation`);
    const etages = Object.entries(RPG_REVELATIONS_PAR_ETAGE)
      .filter(([, cartes]) => cartes.includes(carte.id)).map(([etageId]) => etageId);
    assert.equal(etages.length, 1, `${carte.id} se révèle à un seul étage`);
    assert.ok(ETAGES.includes(etages[0]), `${carte.id} se révèle dans la Tour du Corbeau`);
  }
  for (const etageId of ETAGES) {
    assert.ok(RPG_REVELATIONS_PAR_ETAGE[etageId]?.length >= 1, `${etageId} révèle au moins une carte`);
  }
  assert.equal(new Set(revealed).size, revealed.length, 'aucune carte révélée deux fois');
});

test('la tour se bat dans son propre cercle, et partout en Neige + Ténèbres', () => {
  for (const deckId of DECKS) {
    const resolution = plateauDeDeck(deckId);
    assert.equal(resolution.plateau.id, 'cercle-des-corbeaux', `${deckId} reçoit au Cercle des corbeaux`);
    assert.equal(resolution.motif, 'deck', 'la correspondance est explicite, pas une couleur dominante');
  }
  assert.ok(RPG_STORY_TOWER_THEMES['tour-du-corbeau'], 'la tour a sa maquette');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has('cercle-des-corbeaux'), 'le plateau est musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES['cercle-des-corbeaux'], '/raspberrymusic - A Vikings.mp3',
    'la clairière joue la piste viking livrée dans public/');
  assert.ok(existsSync(new URL('../public/raspberrymusic - A Vikings.mp3', import.meta.url)),
    'le MP3 du Cercle des corbeaux est bien livré');
  // Le son du duel vient de la table, pas d'une ambiance de tour : le Cercle
  // des corbeaux est le seul morceau de ses quatre étages.
  assert.ok(RPG_PLATEAUX_MUSICAUX.has('cercle-des-corbeaux'),
    'le Cercle des corbeaux est musical : ses duels n’ont pas de fond sonore de tour');
});

// ── 3. Le jeu ───────────────────────────────────────────────────────────────

test('le Maître des corbeaux exile une créature de coût 4 au plus, jamais au-delà', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  const petite = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  // Une créature de coût 4 : la limite haute que les corbeaux soulèvent.
  donner(duel, 'sorcier', 'celle-qui-pese');
  const moyenne = rpgJouerCreature(duel, 'sorcier', 'celle-qui-pese').entite;
  donner(duel, 'joueur', 'maitre-des-corbeaux');
  const pose = rpgJouerCreature(duel, 'joueur', 'maitre-des-corbeaux', moyenne.id);
  assert.equal(pose.ok, true, pose.raison);
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === moyenne.id), false,
    'ses corbeaux emportent la créature de coût 4');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === petite.id), true,
    'une seule créature part : les autres restent sur la table');
  assert.ok(duel.sorcier.exil?.includes('celle-qui-pese'), 'la victime est exilée, hors de la partie');
  assert.equal(pose.entite.envol, true);
  assert.equal(pose.entite.tribut, 1);
});

test('le Tribut du Maître des corbeaux transfère la vie au contact du sorcier', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'maitre-des-corbeaux');
  const pose = rpgJouerCreature(duel, 'joueur', 'maitre-des-corbeaux');
  pose.entite.ready = true;
  const pvJoueur = duel.joueur.pv;
  const pvSorcier = duel.sorcier.pv;
  const attaque = rpgAttaquerSorcier(duel, 'joueur', pose.entite.id);
  assert.equal(attaque.ok, true, attaque.raison);
  assert.equal(duel.sorcier.pv, pvSorcier - 1 - pose.entite.atk, 'le Tribut ajoute son point de contact');
  assert.equal(duel.joueur.pv, pvJoueur + 1, 'et la vie change de camp');
});

test('le Corbeau de givre ne gèle que les créatures de coût 3 ou moins', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'momie-de-lin');
  donner(duel, 'sorcier', 'celle-qui-pese');
  const petite = rpgJouerCreature(duel, 'sorcier', 'momie-de-lin').entite; // coût 3
  const grosse = rpgJouerCreature(duel, 'sorcier', 'celle-qui-pese').entite; // coût 4
  assert.equal(petite.carteId, 'momie-de-lin');
  donner(duel, 'joueur', 'corbeau-de-givre');
  const refus = rpgJouerCreature(duel, 'joueur', 'corbeau-de-givre', grosse.id);
  assert.equal(refus.ok, false, 'le cri ne mord pas une créature de coût 4');
  assert.equal(refus.raison, 'cible');
  const pose = rpgJouerCreature(duel, 'joueur', 'corbeau-de-givre', petite.id);
  assert.equal(pose.ok, true, pose.raison);
  assert.ok(petite.gelToursRestants > 0, 'la créature de coût 3 est gelée');
  assert.equal(grosse.gelToursRestants ?? 0, 0, 'la créature de coût 4 reste libre');
});

test('la Valkyrie des neuf nuits n’emporte que les créatures de coût 3 ou moins', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'momie-de-lin');
  donner(duel, 'sorcier', 'celle-qui-pese');
  const petite = rpgJouerCreature(duel, 'sorcier', 'momie-de-lin').entite; // coût 3
  const grosse = rpgJouerCreature(duel, 'sorcier', 'celle-qui-pese').entite; // coût 4
  donner(duel, 'joueur', 'valkyrie-des-neuf-nuits');
  const refus = rpgJouerCreature(duel, 'joueur', 'valkyrie-des-neuf-nuits', grosse.id);
  assert.equal(refus.ok, false, 'les corbeaux n’emportent pas une créature de coût 4');
  assert.equal(refus.raison, 'cible');
  const pose = rpgJouerCreature(duel, 'joueur', 'valkyrie-des-neuf-nuits', petite.id);
  assert.equal(pose.ok, true, pose.raison);
  assert.ok(duel.sorcier.exil?.includes('momie-de-lin'), 'la créature de coût 3 est exilée');
  assert.ok(duel.sorcier.creatures.includes(grosse), 'celle de coût 4 reste sur la table');
});

test('Neige noire brise les créatures de coût 3 ou moins, gèle les autres — et épargne son camp', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  // Chez le sorcier : une créature de coût 3 (brisée) et une de coût 4 (gelée).
  donner(duel, 'sorcier', 'momie-de-lin');
  donner(duel, 'sorcier', 'celle-qui-pese');
  const petite = rpgJouerCreature(duel, 'sorcier', 'momie-de-lin').entite;
  const grosse = rpgJouerCreature(duel, 'sorcier', 'celle-qui-pese').entite;
  // Chez le joueur : la neige ne tombe jamais sur les siens.
  const alliee = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'neige-noire');
  const pvAvant = duel.joueur.pv;
  const sort = rpgLancerMagie(duel, 'joueur', 'neige-noire');
  assert.equal(sort.ok, true, sort.raison);
  assert.equal(duel.joueur.pv, pvAvant - 3, 'le Prix se paie en PV');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === petite.id), false,
    'la créature de coût 3 est détruite');
  assert.ok(duel.sorcier.cimetiere.includes('momie-de-lin'), 'elle rejoint le cimetière');
  assert.ok(duel.sorcier.creatures.some((entite) => entite.id === grosse.id),
    'la créature de coût 4 survit à la vague');
  assert.ok(grosse.gelToursRestants > 0, '…et reste gelée');
  assert.ok(duel.joueur.creatures.some((entite) => entite.id === alliee.id),
    'le camp du lanceur n’est pas touché');
  assert.equal(alliee.gelToursRestants ?? 0, 0, 'ni détruit, ni gelé');
});
