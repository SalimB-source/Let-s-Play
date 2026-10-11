import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as plateaux from '../src/games/rpgPlateaux.js';
import {
  couleurDominanteDeck,
  plateauDeDeck,
  plateauDeRepli,
  plateauParId,
  RPG_PLATEAU_DE_REPLI,
  RPG_PLATEAUX,
  RPG_PLATEAUX_PAR_COULEUR,
  RPG_PLATEAUX_PAR_DECK,
  tirerPlateauDuDuel,
} from '../src/games/rpgPlateaux.js';
import { RPG_DECKS } from '../src/games/rpgCards.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';

// ── Le catalogue des plateaux ───────────────────────────────────────────────

test('chaque plateau a un identifiant unique, un nom et un fichier livré', () => {
  const vus = new Set();
  for (const plateau of RPG_PLATEAUX) {
    assert.ok(!vus.has(plateau.id), `identifiant dupliqué : ${plateau.id}`);
    vus.add(plateau.id);
    assert.equal(typeof plateau.id, 'string');
    assert.ok(plateau.nom.length > 0, `${plateau.id} : nom vide`);
    assert.ok(plateau.lieu.length > 0, `${plateau.id} : lieu vide`);
    assert.ok(plateau.resume.length > 0, `${plateau.id} : résumé vide`);
    assert.ok(existsSync(new URL(`../public/${plateau.fichier}`, import.meta.url)),
      `${plateau.id} : le fond public/${plateau.fichier} est absent`);
    assert.equal(plateauParId(plateau.id), plateau);
  }
  // Deux camps peuvent imposer deux terrains différents : il en faut au moins deux.
  assert.ok(RPG_PLATEAUX.length >= 2, 'il faut au moins deux plateaux');
  assert.equal(plateauParId('plateau-inconnu'), null);
  assert.equal(plateauParId(null), null);
  assert.equal(plateauParId(42), null);
});

test('le désert du Sahara est livré comme plateau de plein droit', () => {
  const sahara = plateauParId('erg-du-sahara');
  assert.ok(sahara, 'l’Erg du Sahara fait partie des plateaux');
  assert.match(sahara.fichier, /\.jpg$/);
  assert.match(sahara.nom, /Sahara/i);
  assert.match(sahara.resume, /sable/i);
  // Deux terrains sahariens distincts : la dune ouverte et la piste de caravane.
  const caravane = plateauParId('caravane-de-gourara');
  assert.ok(caravane && caravane.fichier !== sahara.fichier, 'chaque plateau saharien a son propre fond');
});

test('la terre de damnation est livrée comme plateau de plein droit', () => {
  const damnation = plateauParId('terre-de-damnation');
  assert.ok(damnation, 'la Terre de Damnation fait partie des plateaux');
  assert.match(damnation.fichier, /\.jpg$/);
  assert.match(damnation.nom, /damnation/i);
  assert.match(damnation.resume, /feu|braise|cendre|calcin/i,
    'le résumé annonce bien les flammes et la désolation');
  // Les quatre atmosphères du jeu : Bab El, les déserts, la terre brûlée,
  // la cité antique au bord de la mer.
  assert.equal(new Set(RPG_PLATEAUX.map((plateau) => plateau.fichier)).size, RPG_PLATEAUX.length,
    'aucun plateau ne réutilise le fond d’un autre');
});

test('les ruines de Tipaza sont livrées comme plateau de plein droit', () => {
  const tipaza = plateauParId('ruines-de-tipaza');
  assert.ok(tipaza, 'les Ruines de Tipaza font partie des plateaux');
  assert.match(tipaza.fichier, /\.jpg$/);
  assert.match(tipaza.nom, /Tipaza/);
  assert.match(tipaza.lieu, /Tipasa/);
  assert.match(tipaza.resume, /mosaïque|romaine|colonne/i,
    'le résumé annonce bien la mosaïque et les ruines romaines');
});

// ── Le joueur ne choisit plus son plateau ───────────────────────────────────

test('le choix de plateau a disparu : ni verrou, ni pastille aléatoire, ni sauvegarde', () => {
  for (const retire of ['chargerChoixPlateau', 'sauverChoixPlateau', 'normaliserChoixPlateau',
    'plateauVerrouille', 'tirerPlateau', 'RPG_PLATEAU_ALEATOIRE', 'RPG_PLATEAU_STORAGE_KEY']) {
    assert.ok(!(retire in plateaux), `${retire} ne fait plus partie du module des plateaux`);
  }
  assert.ok(typeof tirerPlateauDuDuel === 'function', 'le tirage du duel le remplace');
});

test('rien n’est écrit sur l’appareil au moment du tirage', () => {
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const ecrits = [];
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: (cle, valeur) => ecrits.push([cle, valeur]),
      removeItem: (cle) => ecrits.push([cle, null]),
    },
  });
  try {
    tirerPlateauDuDuel({ deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns', rng: () => 0.2 });
    plateauDeDeck('maree-des-abysses');
    assert.deepEqual(ecrits, [], 'le plateau ne se mémorise plus : aucun écrit dans le stockage');
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});

// ── Chaque deck a son terrain ───────────────────────────────────────────────

test('chaque deck du catalogue impose un plateau connu', () => {
  for (const deck of RPG_DECKS) {
    const resolu = plateauDeDeck(deck);
    assert.equal(resolu.motif, 'deck', `${deck.id} a son terrain attitré`);
    assert.ok(RPG_PLATEAUX.includes(resolu.plateau), `${deck.id} : plateau du catalogue`);
    assert.equal(plateauDeDeck(deck.id).plateau.id, resolu.plateau.id,
      `${deck.id} : l’identifiant seul rend le même terrain`);
  }
  // Les terrains suivent l’identité du deck : le Sable dans l’Erg, la Braise
  // sur la terre brûlée, l’Eau au bord de la mer, l’hybride sur la piste.
  assert.equal(plateauDeDeck('veilleurs-du-desert').plateau.id, 'erg-du-sahara');
  assert.equal(plateauDeDeck('cour-des-djinns').plateau.id, 'terre-de-damnation');
  assert.equal(plateauDeDeck('sentiers-de-cendre').plateau.id, 'caravane-de-gourara');
  assert.equal(plateauDeDeck('maree-des-abysses').plateau.id, 'ruines-de-tipaza');
});

test('chaque deck de la campagne impose un plateau connu', () => {
  for (const cle of Object.keys(RPG_STORY_DECKS)) {
    const resolu = plateauDeDeck(cle);
    assert.equal(resolu.motif, 'deck', `le deck de campagne ${cle} a son terrain attitré`);
    assert.ok(RPG_PLATEAUX.includes(resolu.plateau), `${cle} : plateau du catalogue`);
  }
  // Le Grand Horloger reçoit dans la salle haute de la Chambre.
  assert.equal(plateauDeDeck('grand-horloger').plateau.id, 'table-des-heures');
});

test('toutes les correspondances de decks pointent vers un plateau livré', () => {
  for (const [deckId, plateauId] of Object.entries(RPG_PLATEAUX_PAR_DECK)) {
    assert.ok(plateauParId(plateauId), `${deckId} → ${plateauId} : plateau inconnu`);
  }
  for (const [couleur, plateauId] of Object.entries(RPG_PLATEAUX_PAR_COULEUR)) {
    assert.ok(plateauParId(plateauId), `${couleur} → ${plateauId} : plateau inconnu`);
  }
  // Aucun plateau ne devient inaccessible : chacun est le terrain d’au moins un
  // deck, ou le repli.
  const atteignables = new Set([
    ...Object.values(RPG_PLATEAUX_PAR_DECK),
    ...Object.values(RPG_PLATEAUX_PAR_COULEUR),
    RPG_PLATEAU_DE_REPLI,
  ]);
  for (const { id } of RPG_PLATEAUX) {
    assert.ok(atteignables.has(id), `le plateau ${id} n’est plus atteignable par aucun deck`);
  }
});

// ── Un deck sans identité parle par sa couleur dominante ────────────────────

test('un paquet brut prend le terrain de sa couleur dominante', () => {
  assert.equal(couleurDominanteDeck(['desert', 'desert', 'chien-du-guet']), 'sable');
  assert.equal(plateauDeDeck(['desert', 'desert', 'chien-du-guet']).plateau.id, 'erg-du-sahara');
  assert.equal(plateauDeDeck(Array(8).fill('montagne')).plateau.id, 'terre-de-damnation');
  assert.equal(plateauDeDeck(Array(8).fill('mer')).plateau.id, 'ruines-de-tipaza');
  // Deux couleurs à égalité : le carrefour des pistes.
  assert.equal(couleurDominanteDeck(['desert', 'desert', 'mer', 'mer']), 'hybride');
  assert.equal(plateauDeDeck(['desert', 'desert', 'mer', 'mer']).plateau.id, 'caravane-de-gourara');
  // La majorité l’emporte sur les cartes isolées d’une autre couleur.
  const sable = ['desert', 'desert', 'desert', 'chien-du-guet', 'fennec-des-decombres', 'mer'];
  assert.equal(couleurDominanteDeck(sable), 'sable');
  assert.equal(plateauDeDeck(sable).motif, 'couleur');
});

test('un deck illisible retombe sur la table d’origine, sans casser le tirage', () => {
  for (const muet of [null, undefined, [], ['carte-inconnue'], 42, 'deck-inconnu', {}]) {
    const resolu = plateauDeDeck(muet);
    assert.equal(resolu.motif, 'repli', `${JSON.stringify(muet) ?? 'vide'} : aucun terrain lisible`);
    assert.equal(resolu.plateau.id, RPG_PLATEAU_DE_REPLI);
  }
  assert.equal(plateauDeRepli(), plateauParId(RPG_PLATEAU_DE_REPLI));
  assert.ok(RPG_PLATEAUX.includes(plateauDeRepli()), 'le repli est toujours un plateau livré');
});

// ── Le tirage : le deck de l'un des deux duellistes impose le terrain ───────

test('le tirage désigne un camp, et c’est son deck qui donne le plateau', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns' };
  for (const valeur of [0, 0.1, 0.4999]) {
    const tirage = tirerPlateauDuDuel({ ...duel, rng: () => valeur });
    assert.equal(tirage.camp, 'joueur', `rng ${valeur} : le joueur impose son terrain`);
    assert.equal(tirage.plateau.id, 'erg-du-sahara');
    assert.equal(tirage.motif, 'deck');
  }
  for (const valeur of [0.5, 0.75, 0.999]) {
    const tirage = tirerPlateauDuDuel({ ...duel, rng: () => valeur });
    assert.equal(tirage.camp, 'adversaire', `rng ${valeur} : l’adversaire impose son terrain`);
    assert.equal(tirage.plateau.id, 'terre-de-damnation');
  }
});

test('le tirage reste déterministe avec le rng du duel', () => {
  const duel = { deckJoueur: 'maree-des-abysses', deckAdverse: 'sentiers-de-cendre' };
  assert.equal(tirerPlateauDuDuel({ ...duel, rng: () => 0.2 }).plateau.id, 'ruines-de-tipaza');
  assert.equal(tirerPlateauDuDuel({ ...duel, rng: () => 0.9 }).plateau.id, 'caravane-de-gourara');
  assert.deepEqual(tirerPlateauDuDuel({ ...duel, rng: () => 0.9 }), tirerPlateauDuDuel({ ...duel, rng: () => 0.9 }));
  // Un seul appel au rng par partie : le reste du moteur garde sa suite.
  let appels = 0;
  tirerPlateauDuDuel({ ...duel, rng: () => { appels += 1; return 0.4; } });
  assert.equal(appels, 1, 'le tirage consomme exactement une valeur du rng du duel');
});

test('un tirage hors bornes ne casse rien', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns' };
  for (const valeur of [Number.NaN, Number.POSITIVE_INFINITY, -3, 12, 'x']) {
    const tirage = tirerPlateauDuDuel({ ...duel, rng: () => valeur });
    assert.ok(RPG_PLATEAUX.includes(tirage.plateau), `valeur ${String(valeur)} : plateau valide`);
    assert.ok(['joueur', 'adversaire'].includes(tirage.camp), `valeur ${String(valeur)} : camp valide`);
  }
  assert.ok(RPG_PLATEAUX.includes(tirerPlateauDuDuel({ ...duel, rng: null }).plateau));
  assert.ok(RPG_PLATEAUX.includes(tirerPlateauDuDuel(duel).plateau), 'sans rng, Math.random suffit');
  assert.ok(RPG_PLATEAUX.includes(tirerPlateauDuDuel().plateau), 'sans aucun deck, la table d’origine');
});

test('un camp muet laisse la place au deck de l’autre', () => {
  // Le camp désigné n'a rien de lisible : on ne retombe sur la table d'origine
  // que si les deux paquets se taisent.
  assert.equal(tirerPlateauDuDuel({ deckJoueur: null, deckAdverse: 'maree-des-abysses', rng: () => 0.1 })
    .plateau.id, 'ruines-de-tipaza');
  assert.equal(tirerPlateauDuDuel({ deckJoueur: null, deckAdverse: 'maree-des-abysses', rng: () => 0.1 })
    .camp, 'adversaire');
  assert.equal(tirerPlateauDuDuel({ deckJoueur: ['desert', 'desert', 'desert'], deckAdverse: null, rng: () => 0.9 })
    .plateau.id, 'erg-du-sahara');
  assert.equal(tirerPlateauDuDuel({ rng: () => 0.9 }).plateau.id, RPG_PLATEAU_DE_REPLI);
});

test('deux decks du même terrain se jouent sur ce terrain', () => {
  for (const valeur of [0, 0.5, 0.999]) {
    const tirage = tirerPlateauDuDuel({
      deckJoueur: 'veilleurs-du-desert',
      deckAdverse: ['desert', 'desert', 'chien-du-guet', 'fennec-des-decombres'],
      rng: () => valeur,
    });
    assert.equal(tirage.plateau.id, 'erg-du-sahara', 'les deux paquets de Sable se retrouvent dans l’Erg');
  }
});
