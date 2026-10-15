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
  RPG_PLATEAUX_VARIANTES_FANTAISISTES,
  tirerPlateauDuDuel,
  varianteFantaisisteDe,
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

test('le fjord des Neuf Hivers est livré comme plateau de plein droit', () => {
  const fjord = plateauParId('fjord-des-neuf-hivers');
  assert.ok(fjord, 'le Fjord des Neuf Hivers fait partie des plateaux');
  assert.match(fjord.fichier, /\.jpg$/);
  assert.match(fjord.nom, /fjord/i);
  assert.match(fjord.resume, /glace/i, 'le résumé annonce bien la glace du fjord');
  // Le décor du Nord : lanterne, cor, corde, hache et bâton de runes.
  for (const accessoire of ['lanterne', 'cor', 'corde', 'hache', 'runes']) {
    assert.match(fjord.resume, new RegExp(accessoire, 'i'),
      `le résumé nomme ${accessoire} au bord du plateau`);
  }
  assert.equal(new Set(RPG_PLATEAUX.map((plateau) => plateau.fichier)).size, RPG_PLATEAUX.length,
    'aucun plateau ne réutilise le fond d’un autre');
});

test('la Terre de Damnation est retirée du jeu et la Braise rejoint la table d’origine', () => {
  assert.equal(plateauParId('terre-de-damnation'), null, 'le plateau retiré ne fait plus partie du catalogue');
  assert.ok(!RPG_PLATEAUX.some(({ fichier }) => fichier === 'plateau-terre-de-damnation.jpg'));
  assert.equal(existsSync(new URL('../public/plateau-terre-de-damnation.jpg', import.meta.url)), false,
    'le fond retiré n’est plus livré avec le jeu');
  assert.equal(RPG_PLATEAUX_PAR_DECK['cour-des-djinns'], 'table-des-heures');
  assert.equal(RPG_PLATEAUX_PAR_COULEUR.braise, 'table-des-heures');
  assert.equal(plateauDeDeck('cour-des-djinns').plateau.id, 'table-des-heures');
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

test('le sanctuaire du Soleil rouge est livré comme plateau de plein droit', () => {
  const sanctuaire = plateauParId('sanctuaire-du-soleil-rouge');
  assert.ok(sanctuaire, 'le sanctuaire du Soleil rouge fait partie des plateaux');
  assert.match(sanctuaire.fichier, /\.jpg$/);
  assert.match(sanctuaire.nom, /Soleil rouge/);
  assert.match(sanctuaire.lieu, /Kyō/);
  // Le décor de l’estampe : la cour de gravier ratissée (le centre où les cartes
  // se posent), le portique, les lanternes, la cloche et les pétales.
  for (const accessoire of ['ratissé', 'torii', 'lanterne', 'cloche', 'éventail', 'pétales']) {
    assert.match(sanctuaire.resume, new RegExp(accessoire, 'i'),
      `le résumé nomme ${accessoire} de la cour`);
  }
  // Le Serment du Soleil rouge se bat chez lui, sous ses cerisiers.
  assert.equal(RPG_PLATEAUX_PAR_DECK['serment-du-soleil-rouge'], 'sanctuaire-du-soleil-rouge');
  assert.equal(plateauDeDeck('serment-du-soleil-rouge').plateau.id, 'sanctuaire-du-soleil-rouge');
  assert.equal(plateauDeDeck('serment-du-soleil-rouge').motif, 'deck');
  // Le sanctuaire reste unique : pas de double merveilleux, et le second tirage
  // n’est donc jamais consommé quand il impose le terrain.
  assert.equal(varianteFantaisisteDe('sanctuaire-du-soleil-rouge'), null);
  let appels = 0;
  const tirage = tirerPlateauDuDuel({
    deckJoueur: 'serment-du-soleil-rouge', deckAdverse: 'cour-des-djinns',
    variantesFantaisistes: true, rng: () => { appels += 1; return 0.1; },
  });
  assert.equal(tirage.plateau.id, 'sanctuaire-du-soleil-rouge');
  assert.equal(tirage.camp, 'joueur');
  assert.equal(tirage.variante, false, 'le sanctuaire n’a pas de version fantaisiste');
  assert.equal(appels, 1, 'terrain unique : le second tirage n’est pas consommé');
  // Quand c’est l’autre camp qui impose son terrain, le sanctuaire laisse la
  // place : le tirage départage bien les deux paquets.
  assert.equal(tirerPlateauDuDuel({
    deckJoueur: 'serment-du-soleil-rouge', deckAdverse: 'veilleurs-du-desert', rng: () => 0.9,
  }).plateau.id, 'erg-du-sahara');
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
  // sur la table d’origine, l’Eau au bord de la mer, l’hybride sur la piste.
  assert.equal(plateauDeDeck('veilleurs-du-desert').plateau.id, 'erg-du-sahara');
  assert.equal(plateauDeDeck('cour-des-djinns').plateau.id, 'table-des-heures');
  assert.equal(plateauDeDeck('sentiers-de-cendre').plateau.id, 'caravane-de-gourara');
  assert.equal(plateauDeDeck('maree-des-abysses').plateau.id, 'ruines-de-tipaza');
  assert.equal(plateauDeDeck('serment-des-neuf-hivers').plateau.id, 'fjord-des-neuf-hivers');
});

test('chaque deck de la campagne impose un plateau connu', () => {
  for (const cle of Object.keys(RPG_STORY_DECKS)) {
    const resolu = plateauDeDeck(cle);
    assert.equal(resolu.motif, 'deck', `le deck de campagne ${cle} a son terrain attitré`);
    assert.ok(RPG_PLATEAUX.includes(resolu.plateau), `${cle} : plateau du catalogue`);
  }
  // Le Grand Horloger reçoit dans la salle haute de la Chambre.
  assert.equal(plateauDeDeck('grand-horloger').plateau.id, 'table-des-heures');
  // Les étages de la Tour du Fjord gardent la glace de leur deck de Neige.
  for (const cle of ['gardes-du-fjord', 'meute-des-neiges', 'serment-des-neuf-hivers', 'maitre-des-neuf-hivers']) {
    assert.equal(plateauDeDeck(cle).plateau.id, 'fjord-des-neuf-hivers', `${cle} se bat sur le fjord`);
  }
});

test('toutes les correspondances de decks pointent vers un plateau livré', () => {
  for (const [deckId, plateauId] of Object.entries(RPG_PLATEAUX_PAR_DECK)) {
    assert.ok(plateauParId(plateauId), `${deckId} → ${plateauId} : plateau inconnu`);
  }
  for (const [couleur, plateauId] of Object.entries(RPG_PLATEAUX_PAR_COULEUR)) {
    assert.ok(plateauParId(plateauId), `${couleur} → ${plateauId} : plateau inconnu`);
  }
  // Aucun plateau ne devient inaccessible : chacun est le terrain d’au moins un
  // deck, le repli, ou le double merveilleux d’un terrain.
  const atteignables = new Set([
    ...Object.values(RPG_PLATEAUX_PAR_DECK),
    ...Object.values(RPG_PLATEAUX_PAR_COULEUR),
    ...Object.values(RPG_PLATEAUX_VARIANTES_FANTAISISTES),
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
  assert.equal(plateauDeDeck(Array(8).fill('montagne')).plateau.id, 'table-des-heures');
  assert.equal(plateauDeDeck(Array(8).fill('mer')).plateau.id, 'ruines-de-tipaza');
  // La quatrième couleur : la Neige prend la glace du fjord.
  assert.equal(couleurDominanteDeck(['glacier', 'glacier', 'loup-des-neiges']), 'neige');
  assert.equal(plateauDeDeck(Array(8).fill('glacier')).plateau.id, 'fjord-des-neuf-hivers');
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
    assert.equal(tirage.plateau.id, 'table-des-heures');
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

// ── Les doubles merveilleux : un terrain classique peut s'échanger ──────────

/** Un rng scripté : chaque appel rend la valeur suivante, la dernière en boucle. */
const rngSequentiel = (valeurs) => {
  let appel = 0;
  return () => valeurs[Math.min(appel++, valeurs.length - 1)];
};

test('chaque terrain classique a son double merveilleux, sauf la piste caravanière et la table d’origine', () => {
  assert.deepEqual(RPG_PLATEAUX_VARIANTES_FANTAISISTES, {
    'erg-du-sahara': 'desert-de-verre',
    'ruines-de-tipaza': 'abysses-phosphorescentes',
    'fjord-des-neuf-hivers': 'iles-celestes',
  });
  for (const [classiqueId, varianteId] of Object.entries(RPG_PLATEAUX_VARIANTES_FANTAISISTES)) {
    const classique = plateauParId(classiqueId);
    const variante = varianteFantaisisteDe(classiqueId);
    assert.ok(classique && variante, `${classiqueId} a son double ${varianteId}`);
    assert.equal(variante.id, varianteId);
    assert.equal(varianteFantaisisteDe(classique), variante, 'le plateau lui-même répond comme son identifiant');
    assert.notEqual(variante.fichier, classique.fichier, `${varianteId} a son propre fond 4K`);
    assert.equal(varianteFantaisisteDe(variante), null, 'une variante n’a pas de double au second degré');
  }
  for (const sansDouble of ['caravane-de-gourara', 'table-des-heures', 'cavernes-de-cristal', 'plateau-inconnu', null, 42]) {
    assert.equal(varianteFantaisisteDe(sansDouble), null, `${String(sansDouble)} reste unique`);
  }
  // Le plateau retiré (les Cavernes de Cristal) ne fait plus partie du catalogue.
  assert.equal(plateauParId('cavernes-de-cristal'), null);
});

test('sans l’option, le tirage ne rend jamais un double merveilleux', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns' };
  const doubles = new Set(Object.values(RPG_PLATEAUX_VARIANTES_FANTAISISTES));
  for (const valeur of [0, 0.1, 0.4999, 0.5, 0.75, 0.999]) {
    const tirage = tirerPlateauDuDuel({ ...duel, rng: () => valeur });
    assert.equal(tirage.variante, false, `rng ${valeur} : pas de variante sans l’option`);
    assert.ok(!doubles.has(tirage.plateau.id), `rng ${valeur} : terrain classique`);
  }
});

test('avec l’option, le second tirage peut donner le double merveilleux', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns', variantesFantaisistes: true };
  // Premier tirage : le camp. Second : le double (≥ 0,5).
  const merveilleux = tirerPlateauDuDuel({ ...duel, rng: rngSequentiel([0.1, 0.9]) });
  assert.equal(merveilleux.camp, 'joueur');
  assert.equal(merveilleux.motif, 'deck');
  assert.equal(merveilleux.plateau.id, 'desert-de-verre');
  assert.equal(merveilleux.variante, true);
  const classique = tirerPlateauDuDuel({ ...duel, rng: rngSequentiel([0.1, 0.2]) });
  assert.equal(classique.plateau.id, 'erg-du-sahara');
  assert.equal(classique.variante, false);
  // La Cour des Djinns se bat sur la Table des Heures : la table d'origine
  // reste unique, le second tirage l'y laisse.
  const adverse = tirerPlateauDuDuel({ ...duel, rng: rngSequentiel([0.9, 0.9]) });
  assert.equal(adverse.camp, 'adversaire');
  assert.equal(adverse.plateau.id, 'table-des-heures');
  assert.equal(adverse.variante, false);
  // Le tirage reste déterministe : rejoué à l’identique, même terrain.
  const rejoue = () => tirerPlateauDuDuel({ ...duel, rng: rngSequentiel([0.1, 0.9]) });
  assert.deepEqual(rejoue(), rejoue());
  assert.equal(rejoue().plateau.id, 'desert-de-verre');
});

test('le second tirage n’est consommé que si le terrain a un double', () => {
  const avecOption = { variantesFantaisistes: true };
  let appels = 0;
  tirerPlateauDuDuel({
    ...avecOption, deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns',
    rng: () => { appels += 1; return 0.1; },
  });
  assert.equal(appels, 2, 'terrain à double : le camp puis la variante');
  // Deux terrains restent uniques : la piste caravanière et la Table des
  // Heures, la table d'origine depuis le retrait des Cavernes de Cristal. Le
  // second tirage n'est alors pas consommé.
  appels = 0;
  const caravane = tirerPlateauDuDuel({
    ...avecOption, deckJoueur: 'sentiers-de-cendre', deckAdverse: 'sentiers-de-cendre',
    rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(caravane.plateau.id, 'caravane-de-gourara');
  assert.equal(caravane.variante, false, 'la piste caravanière garde son terrain unique');
  assert.equal(appels, 1, 'terrain unique : le second tirage n’est pas consommé');
  // Le Grand Horloger reçoit sur la table d'origine : elle non plus n'a pas de
  // double merveilleux.
  appels = 0;
  const horloger = tirerPlateauDuDuel({
    ...avecOption, deckJoueur: 'grand-horloger', deckAdverse: 'grand-horloger',
    rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(horloger.plateau.id, 'table-des-heures');
  assert.equal(horloger.variante, false, 'la table d’origine garde son terrain unique');
  assert.equal(appels, 1, 'la Table des Heures ne consomme pas le second tirage');
});

test('avec l’option, un tirage hors bornes rend toujours un plateau valide', () => {
  const duel = { deckJoueur: 'maree-des-abysses', deckAdverse: 'sentiers-de-cendre', variantesFantaisistes: true };
  for (const valeur of [Number.NaN, Number.POSITIVE_INFINITY, -3, 12, 'x']) {
    const tirage = tirerPlateauDuDuel({ ...duel, rng: () => valeur });
    assert.ok(RPG_PLATEAUX.includes(tirage.plateau), `valeur ${String(valeur)} : plateau valide`);
    assert.equal(typeof tirage.variante, 'boolean', `valeur ${String(valeur)} : variante renseignée`);
  }
});
