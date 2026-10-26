import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  PLATEAU_VIGNETTE_REVISION,
  RPG_PLATEAU_MOTIF_CHOIX,
  resoudrePlateauxDuDuel,
  tirerPlateauDuDuel,
  varianteFantaisisteDe,
  vignettePlateau,
  vignettePlateauRelative,
} from '../src/games/rpgPlateaux.js';
import { RPG_DECKS_ARCHETYPES } from '../src/games/rpgCards.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';


/** La taille d'un JPEG sans dépendance : le premier marqueur SOFn. */
const tailleJpeg = (fichier) => {
  const data = readFileSync(fichier);
  for (let i = 2; i < data.length;) {
    if (data[i] !== 0xff) { i += 1; continue; }
    const marqueur = data[i + 1];
    if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
      return { height: data.readUInt16BE(i + 5), width: data.readUInt16BE(i + 7) };
    }
    i += 2 + data.readUInt16BE(i + 2);
  }
  return null;
};

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

test('le Village Viking remplace le Fjord des Neuf Hivers comme plateau de la Neige', () => {
  const village = plateauParId('village-viking');
  assert.ok(village, 'Le Village Viking fait partie des plateaux');
  assert.equal(village.fichier, 'plateau-village-viking.jpg');
  assert.match(village.nom, /Village Viking/i);
  assert.match(village.lieu, /village|Nord|fjord/i);
  assert.match(village.resume, /vol d’oiseau|vol d.oiseau/i, 'le résumé annonce la vue à vol d’oiseau');
  assert.match(village.resume, /place|nue|cartes/i, 'le centre de la place est dégagé pour les cartes');
  // Le décor du village du Nord : la halle du Jarl, les maisons longues, les
  // boucliers ronds, les stèles runiques, les tonneaux, la corde et les braseros.
  for (const accessoire of ['halle', 'maisons', 'boucliers', 'runes', 'tonneaux', 'corde', 'braseros']) {
    assert.match(village.resume, new RegExp(accessoire, 'i'),
      `le résumé nomme ${accessoire} autour de la place`);
  }
  const taille = tailleJpeg(new URL(`../public/${village.fichier}`, import.meta.url));
  assert.deepEqual(taille, { width: 3840, height: 2560 }, 'fond livré en 4K au ratio 3:2');
  // L'ancien plateau du Fjord des Neuf Hivers a quitté le jeu, fonds compris.
  assert.equal(plateauParId('fjord-des-neuf-hivers'), null, 'le Fjord des Neuf Hivers n’est plus au catalogue');
  assert.ok(!RPG_PLATEAUX.some(({ fichier }) => /fjord-des-neuf-hivers/.test(fichier)));
  assert.equal(existsSync(new URL('../public/plateau-fjord-des-neuf-hivers.jpg', import.meta.url)), false,
    'l’ancien fond du fjord n’est plus livré');
  assert.equal(existsSync(new URL('../public/plateau-fjord-des-neuf-hivers-vide.jpg', import.meta.url)), false,
    'l’ancienne plaque vide du fjord n’est plus livrée');
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

test('la cour de l’Empereur est livrée comme plateau de plein droit', () => {
  const cour = plateauParId('cour-de-l-empereur');
  assert.ok(cour, 'la cour de l’Empereur fait partie des plateaux');
  assert.match(cour.fichier, /\.jpg$/);
  assert.match(cour.nom, /Empereur/);
  assert.match(cour.lieu, /Kyō/);
  // Le décor de la peinture : le parvis de gravier ratissé (le milieu vide où
  // les cartes se posent), le palais et ses tuiles turquoise, ses colonnes
  // vermillon, ses galeries, ses lanternes de pierre et ses bannières.
  for (const accessoire of ['ratissé', 'turquoise', 'vermillon', 'lanterne', 'tambour', 'bannières']) {
    assert.match(cour.resume, new RegExp(accessoire, 'i'),
      `le résumé nomme ${accessoire} de la cour`);
  }
  // Le Serment du Soleil rouge se bat chez lui, dans la cour du palais.
  assert.equal(RPG_PLATEAUX_PAR_DECK['serment-du-soleil-rouge'], 'cour-de-l-empereur');
  assert.equal(plateauDeDeck('serment-du-soleil-rouge').plateau.id, 'cour-de-l-empereur');
  assert.equal(plateauDeDeck('serment-du-soleil-rouge').motif, 'deck');
  // La cour reste unique : pas de double merveilleux, et le second tirage
  // n’est donc jamais consommé quand il impose le terrain.
  assert.equal(varianteFantaisisteDe('cour-de-l-empereur'), null);
  let appels = 0;
  const tirage = tirerPlateauDuDuel({
    deckJoueur: 'serment-du-soleil-rouge', deckAdverse: 'cour-des-djinns',
    variantesFantaisistes: true, rng: () => { appels += 1; return 0.1; },
  });
  assert.equal(tirage.plateau.id, 'cour-de-l-empereur');
  assert.equal(tirage.camp, 'joueur');
  assert.equal(tirage.variante, false, 'la cour n’a pas de version fantaisiste');
  assert.equal(appels, 1, 'terrain unique : le second tirage n’est pas consommé');
  // Quand c’est l’autre camp qui impose son terrain, le sanctuaire laisse la
  // place : le tirage départage bien les deux paquets.
  assert.equal(tirerPlateauDuDuel({
    deckJoueur: 'serment-du-soleil-rouge', deckAdverse: 'veilleurs-du-desert', rng: () => 0.9,
  }).plateau.id, 'erg-du-sahara');
});

test('les deux plateaux des Ténèbres sont livrés : le désert du Nil et le palais du Pharaon', () => {
  const necropole = plateauParId('necropole-des-dalles');
  assert.ok(necropole, 'la Nécropole des dalles fait partie des plateaux');
  assert.match(necropole.nom, /Nécropole/i);
  assert.match(necropole.fichier, /\.jpg$/);
  // L’Égypte : le Nil, les pyramides, le cercle d’hiéroglyphes, la pesée des âmes.
  for (const motif of ['Nil', 'pyramides', 'hiéroglyphes', 'canopes', 'shabti']) {
    assert.match(necropole.resume, new RegExp(motif, 'i'), `le résumé nomme ${motif}`);
  }
  // Le décor est **entièrement extérieur et en plein jour** : pas de temple,
  // pas de nuit. Le résumé le dit, et le lieu aussi.
  assert.match(necropole.resume, /extérieur/i, 'le résumé annonce un décor extérieur');
  assert.match(necropole.resume, /plein jour|zénith/i, 'le résumé annonce le plein jour');
  assert.doesNotMatch(necropole.resume, /basalte|nuit|lune|torche|temple|parapet/i,
    'ni basalte de nuit, ni temple, ni parapet : le plateau est dehors, au soleil');
  assert.match(necropole.lieu, /désert/i);
  assert.match(necropole.lieu, /midi|jour/i);
  // Les pyramides sont **sur le plateau**, vues d'en haut — pas à l'horizon.
  assert.match(necropole.resume, /pyramides[^.]*sur le plateau|sur le plateau[^.]*pyramides/i,
    'les pyramides sont posées sur le plateau, pas au loin');
  assert.match(necropole.resume, /d’en haut|d.en haut/i, 'et vues de dessus');
  assert.match(necropole.resume, /deux pyramides[^.]*gauche/i, 'deux pyramides à gauche');
  assert.match(necropole.resume, /une[^.]*droite/i, 'et une à droite');
  // Le centre du plateau reste vide : c'est la zone des cartes.
  assert.match(necropole.resume, /au centre[^.]*cercle[^.]*vide|cercle[^.]*vide/i,
    'le cercle du centre est vide');
  // Le Nil longe le bas du cadre.
  assert.match(necropole.resume, /Nil[^.]*bas du cadre/i, 'le Nil est en bas');
  // Le décor est allégé : quelques objets nommés, pas un inventaire.
  assert.doesNotMatch(necropole.resume, /natron|bandelettes|scarabée/i,
    'le plateau allégé ne garde que quelques objets');
  assert.equal(necropole.fichier, 'plateau-necropole-des-dalles.jpg');

  const palais = plateauParId('palais-du-pharaon');
  assert.ok(palais, 'Le Palais du Pharaon fait partie des plateaux');
  assert.match(palais.nom, /Palais du Pharaon/);
  assert.match(palais.fichier, /\.jpg$/);
  // Un **intérieur** : le dallage, le trône, les colonnes de lotus, les
  // braseros. Rien de l'extérieur ni de Babylone.
  assert.match(palais.resume, /intérieur/i, 'le résumé annonce un intérieur');
  for (const motif of ['dallage', 'trône', 'colonnes', 'lotus', 'brasero', 'éventail']) {
    assert.match(palais.resume, new RegExp(motif, 'i'), `le résumé nomme ${motif}`);
  }
  assert.doesNotMatch(palais.resume, /ciel|nuage|horizon|extérieur|dehors/i,
    'aucun morceau de ciel : le palais est une salle');
  assert.match(palais.lieu, /salle du trône/i);
  // Le centre reste nu, et le décor est allégé : peu d'objets, tous aux bords.
  assert.match(palais.resume, /centre reste nu/i, 'le centre du plateau reste vide');
  assert.match(palais.resume, /peu d’objets|peu d.objets/i, 'le résumé annonce peu d’objets');
  assert.match(palais.resume, /aux bords/i, 'rangés aux bords du plateau');
  // Deux fonds distincts, livrés en 3:2 dans public/.
  assert.notEqual(necropole.fichier, palais.fichier);
  assert.equal(new Set(RPG_PLATEAUX.map((plateau) => plateau.fichier)).size, RPG_PLATEAUX.length,
    'les deux nouveaux plateaux ne réutilisent le fond d’aucun autre');
  // L'ancien plateau de Babylone a bien quitté le jeu, fond compris.
  assert.equal(plateauParId('sceaux-de-babylone'), null, 'Babylone n’est plus un plateau');
  assert.ok(!RPG_PLATEAUX.some(({ fichier }) => /babylone/.test(fichier)));
  assert.equal(existsSync(new URL('../public/plateau-sceaux-de-babylone.jpg', import.meta.url)), false,
    'le fond de Babylone n’est plus livré');
  // Livrés comme les autres : 4K au ratio 3:2 (3840×2560), sans texte.
  for (const plateau of [necropole, palais]) {
    const taille = tailleJpeg(new URL(`../public/${plateau.fichier}`, import.meta.url));
    assert.deepEqual(taille, { width: 3840, height: 2560 }, `${plateau.id} : fond 4K 3:2`);
  }
  // Chacun a son deck : le set égyptien pour les dalles, le tribunal de la
  // Nécropole pour la salle du trône.
  assert.equal(RPG_PLATEAUX_PAR_DECK['balance-des-heures'], 'necropole-des-dalles');
  assert.equal(RPG_PLATEAUX_PAR_DECK['juges-de-la-necropole'], 'palais-du-pharaon');
  assert.equal(plateauDeDeck('juges-de-la-necropole').motif, 'deck');
  assert.equal(plateauDeDeck('juges-de-la-necropole').plateau.id, 'palais-du-pharaon');
  // La couleur Ténèbres retombe sur les dalles, pas sur le palais.
  assert.equal(RPG_PLATEAUX_PAR_COULEUR.tenebres, 'necropole-des-dalles');
  // Les étages de la Tour de la Nécropole se répartissent entre les deux.
  for (const cle of ['momies-de-la-necropole', 'chacals-du-seuil']) {
    assert.equal(plateauDeDeck(cle).plateau.id, 'necropole-des-dalles', `${cle} se bat sur les dalles`);
  }
  // Aucun des deux n’a de double merveilleux : le second tirage n’est jamais
  // consommé quand ils imposent le terrain.
  for (const id of ['necropole-des-dalles', 'palais-du-pharaon']) {
    assert.equal(varianteFantaisisteDe(id), null, `${id} reste unique`);
  }
  let appels = 0;
  const tirage = tirerPlateauDuDuel({
    deckJoueur: 'balance-des-heures', deckAdverse: 'juges-de-la-necropole',
    variantesFantaisistes: true, rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(tirage.plateau.id, 'palais-du-pharaon');
  assert.equal(tirage.variante, false);
  assert.equal(appels, 1, 'un terrain sans double ne consomme pas le second tirage');
  // Deux decks des Ténèbres : la table se découpe entre le désert et le palais.
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'balance-des-heures', deckAdverse: 'juges-de-la-necropole',
  });
  assert.equal(resolution.joueur.plateau.id, 'necropole-des-dalles');
  assert.equal(resolution.adversaire.plateau.id, 'palais-du-pharaon');
  assert.equal(resolution.decouper, true, 'les deux terrains des Ténèbres se partagent la table');
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
  for (const deck of RPG_DECKS_ARCHETYPES) {
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
  assert.equal(plateauDeDeck('serment-des-neuf-hivers').plateau.id, 'village-viking');
  // Les Ténèbres ont leur terrain : la Balance des Heures, le set égyptien,
  // se bat sur les dalles de la Nécropole (doc 16 §9).
  assert.equal(plateauDeDeck('balance-des-heures').plateau.id, 'necropole-des-dalles');
  // Les Lettres de Marque embarquent sur leur propre navire pirate.
  assert.equal(plateauDeDeck('lettres-de-marque').plateau.id, 'navire-pirate');
});

test('le navire pirate est livré en 4K 3:2 et sert de terrain aux Lettres de Marque', () => {
  const navire = plateauParId('navire-pirate');
  assert.ok(navire, 'Le Navire Pirate fait partie des plateaux');
  assert.equal(navire.fichier, 'plateau-navire-pirate.jpg');
  assert.match(navire.nom, /Navire Pirate/i);
  assert.match(navire.lieu, /mer|pont|galion/i);
  for (const motif of ['90°', 'rose des vents', 'canons', 'coffre au trésor', 'carte marine', 'longue-vue', 'fanaux', 'turquoise']) {
    assert.match(navire.resume, new RegExp(motif, 'i'), `le résumé du navire pirate mentionne ${motif}`);
  }
  const taille = tailleJpeg(new URL(`../public/${navire.fichier}`, import.meta.url));
  assert.deepEqual(taille, { width: 3840, height: 2560 }, 'fond livré en 4K au ratio 3:2');
  assert.equal(RPG_PLATEAUX_PAR_DECK['lettres-de-marque'], 'navire-pirate');
  assert.equal(RPG_PLATEAUX_PAR_DECK['essai-mana-lettres-de-marque'], 'navire-pirate');
  assert.equal(plateauDeDeck('essai-mana-lettres-de-marque').plateau.id, 'navire-pirate');
  // Un paquet maison construit autour des cartes corsaires rejoint aussi le navire.
  const paquetCorsaire = RPG_DECKS_ARCHETYPES.find(({ id }) => id === 'lettres-de-marque').cardIds;
  assert.equal(plateauDeDeck(paquetCorsaire).plateau.id, 'navire-pirate');
  assert.equal(varianteFantaisisteDe('navire-pirate'), null, 'le navire pirate est un terrain unique');
  let appels = 0;
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'lettres-de-marque',
    deckAdverse: 'cour-des-djinns',
    variantesFantaisistes: true,
    rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(resolution.joueur.plateau.id, 'navire-pirate');
  assert.equal(resolution.adversaire.plateau.id, 'table-des-heures');
  assert.equal(resolution.decouper, true);
  assert.equal(appels, 0, 'aucun tirage consommé pour deux terrains uniques');
});

test('chaque deck de la campagne impose un plateau connu', () => {
  for (const cle of Object.keys(RPG_STORY_DECKS)) {
    const resolu = plateauDeDeck(cle);
    assert.equal(resolu.motif, 'deck', `le deck de campagne ${cle} a son terrain attitré`);
    assert.ok(RPG_PLATEAUX.includes(resolu.plateau), `${cle} : plateau du catalogue`);
  }
  // Le Grand Horloger reçoit dans la salle haute de la Chambre.
  assert.equal(plateauDeDeck('grand-horloger').plateau.id, 'table-des-heures');
  // Les étages de la Tour du Fjord se battent au village viking.
  for (const cle of ['gardes-du-fjord', 'meute-des-neiges', 'serment-des-neuf-hivers', 'maitre-des-neuf-hivers']) {
    assert.equal(plateauDeDeck(cle).plateau.id, 'village-viking', `${cle} se bat au village viking`);
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
  assert.equal(couleurDominanteDeck(['chien-du-guet', 'chien-du-guet', 'chien-du-guet']), 'sable');
  assert.equal(plateauDeDeck(['chien-du-guet', 'chien-du-guet', 'chien-du-guet']).plateau.id, 'erg-du-sahara');
  assert.equal(plateauDeDeck(Array(8).fill('trait-de-braise')).plateau.id, 'table-des-heures');
  assert.equal(plateauDeDeck(Array(8).fill('ressac')).plateau.id, 'ruines-de-tipaza');
  // La quatrième couleur : la Neige prend la place du village viking.
  assert.equal(couleurDominanteDeck(['loup-des-neiges', 'loup-des-neiges', 'loup-des-neiges']), 'neige');
  assert.equal(plateauDeDeck(Array(8).fill('loup-des-neiges')).plateau.id, 'village-viking');
  // La cinquième couleur : les Ténèbres prennent les dalles de la Nécropole.
  assert.equal(couleurDominanteDeck(['chacal-du-seuil', 'chacal-du-seuil', 'papyrus']), 'tenebres');
  assert.equal(plateauDeDeck(Array(8).fill('chacal-du-seuil')).plateau.id, 'necropole-des-dalles');
  assert.equal(plateauDeDeck(Array(8).fill('chacal-du-seuil')).motif, 'couleur');
  // Deux couleurs à égalité : le carrefour des pistes.
  assert.equal(couleurDominanteDeck(['chien-du-guet', 'chien-du-guet', 'ressac', 'ressac']), 'hybride');
  assert.equal(plateauDeDeck(['chien-du-guet', 'chien-du-guet', 'ressac', 'ressac']).plateau.id, 'caravane-de-gourara');
  // La majorité l’emporte sur les cartes isolées d’une autre couleur.
  const sable = ['chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'ressac'];
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

test('en duel libre, le deck du joueur impose toujours son plateau', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns', campImpose: 'joueur' };
  for (const valeur of [0, 0.5, 0.999]) {
    const tirage = tirerPlateauDuDuel({ ...duel, rng: () => valeur });
    assert.equal(tirage.camp, 'joueur');
    assert.equal(tirage.plateau.id, 'erg-du-sahara');
    assert.equal(tirage.motif, 'deck');
  }
  const deckImpérial = tirerPlateauDuDuel({
    deckJoueur: 'serment-du-soleil-rouge', deckAdverse: 'veilleurs-du-desert',
    campImpose: 'joueur', rng: () => 0.999,
  });
  assert.equal(deckImpérial.plateau.id, 'cour-de-l-empereur');
});

test('un deck joueur illisible ne cède pas le terrain au deck adverse si son camp est imposé', () => {
  const tirage = tirerPlateauDuDuel({
    deckJoueur: 'deck-inconnu', deckAdverse: 'maree-des-abysses',
    campImpose: 'joueur', rng: () => 0.999,
  });
  assert.equal(tirage.camp, 'joueur');
  assert.equal(tirage.plateau.id, RPG_PLATEAU_DE_REPLI);
  assert.equal(tirage.motif, 'repli');
});

test('la page découpe la table : chaque camp reçoit le plateau de son deck', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /const modeLibre = !modeTutoriel && !etageCourant;/);
  assert.match(page, /const resolutionPlateaux = resoudrePlateauxDuDuel\(\{/,
    'la page résout un plateau par camp au lancement de la partie');
  assert.match(page, /const plateau = resolutionPlateaux\.joueur\.plateau;/,
    'le plateau du joueur reste le principal (musique, décor 3D)');
  assert.match(page, /setPlateauAdverseId\(resolutionPlateaux\.adversaire\.plateau\.id\)/,
    'le plateau adverse est mémorisé pour la moitié haute de la table');
  assert.match(page, /const plateauDecoupe = plateauAdverse\.id !== plateau\.id;/,
    'la table n’est découpée que si les deux terrains diffèrent');
  assert.match(page, /rpg-plateau-moitie--adverse/, 'la moitié haute porte la peinture adverse');
  assert.match(page, /rpg-plateau-moitie--joueur/, 'la moitié basse porte la peinture du joueur');
  assert.match(page, /enabled=\{decor3dVisible\}/,
    'le décor 3D s’efface quand la table est découpée');
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
  assert.equal(tirerPlateauDuDuel({ deckJoueur: ['chien-du-guet', 'chien-du-guet', 'chien-du-guet'], deckAdverse: null, rng: () => 0.9 })
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

test('chaque terrain classique a son double merveilleux, sauf la piste caravanière, la table d’origine et les Ténèbres', () => {
  assert.deepEqual(RPG_PLATEAUX_VARIANTES_FANTAISISTES, {
    'erg-du-sahara': 'desert-de-verre',
    'ruines-de-tipaza': 'abysses-phosphorescentes',
    'village-viking': 'iles-celestes',
    // La Tour Oubliée a deux visages : le cimetière où son nom a été effacé —
    // sa table attitrée — et le fond du puits. Le second tirage fait descendre
    // les duellistes dans la Fosse.
    'cimetiere-des-noms-effaces': 'fosse-de-l-oubliee',
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
  for (const sansDouble of ['caravane-de-gourara', 'table-des-heures', 'necropole-des-dalles',
    'palais-du-pharaon', 'cavernes-de-cristal', 'plateau-inconnu', null, 42]) {
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

// ── La table découpée : un plateau par camp ─────────────────────────────────

test('chaque camp reçoit le plateau de son deck, le joueur en principal', () => {
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'veilleurs-du-desert', deckAdverse: 'cour-des-djinns', rng: () => 0.9,
  });
  assert.equal(resolution.joueur.plateau.id, 'erg-du-sahara', 'la moitié du joueur : le terrain de son deck');
  assert.equal(resolution.joueur.motif, 'deck');
  assert.equal(resolution.adversaire.plateau.id, 'table-des-heures', 'la moitié adverse : le terrain de son deck');
  assert.equal(resolution.principal, resolution.joueur, 'le plateau du joueur pilote musique et décor 3D');
  assert.equal(resolution.decouper, true, 'deux terrains différents : la table se découpe');
  assert.equal(resolution.joueur.variante, false);
  assert.equal(resolution.adversaire.variante, false);
});

test('deux decks du même terrain : la table reste d’un seul tenant', () => {
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'veilleurs-du-desert',
    deckAdverse: ['desert', 'desert', 'chien-du-guet', 'fennec-des-decombres'],
  });
  assert.equal(resolution.joueur.plateau.id, 'erg-du-sahara');
  assert.equal(resolution.adversaire.plateau.id, 'erg-du-sahara');
  assert.equal(resolution.decouper, false, 'même terrain des deux côtés : aucune couture');
});

test('un deck illisible retombe sur la table d’origine dans sa moitié seulement', () => {
  const resolution = resoudrePlateauxDuDuel({ deckJoueur: null, deckAdverse: 'maree-des-abysses' });
  assert.equal(resolution.joueur.plateau.id, RPG_PLATEAU_DE_REPLI);
  assert.equal(resolution.joueur.motif, 'repli');
  assert.equal(resolution.adversaire.plateau.id, 'ruines-de-tipaza',
    'le repli du joueur n’emprunte rien au terrain adverse');
  assert.equal(resolution.decouper, true);
  const muette = resoudrePlateauxDuDuel();
  assert.equal(muette.joueur.plateau.id, RPG_PLATEAU_DE_REPLI);
  assert.equal(muette.adversaire.plateau.id, RPG_PLATEAU_DE_REPLI);
  assert.equal(muette.decouper, false, 'sans aucun deck lisible, la table d’origine pleine');
});

test('sans les variantes fantaisistes, la résolution ne consomme aucun tirage', () => {
  let appels = 0;
  resoudrePlateauxDuDuel({
    deckJoueur: 'veilleurs-du-desert', deckAdverse: 'maree-des-abysses',
    rng: () => { appels += 1; return 0.4; },
  });
  assert.equal(appels, 0, 'rien à départager : la suite du rng du duel reste intacte');
});

test('chaque camp tire son double merveilleux indépendamment, joueur d’abord', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'maree-des-abysses', variantesFantaisistes: true };
  // Premier tirage : le joueur (≥ 0,5 → double). Second : l’adversaire.
  const joueurMerveilleux = resoudrePlateauxDuDuel({ ...duel, rng: rngSequentiel([0.9, 0.1]) });
  assert.equal(joueurMerveilleux.joueur.plateau.id, 'desert-de-verre');
  assert.equal(joueurMerveilleux.joueur.variante, true);
  assert.equal(joueurMerveilleux.adversaire.plateau.id, 'ruines-de-tipaza');
  assert.equal(joueurMerveilleux.adversaire.variante, false);
  const adverseMerveilleux = resoudrePlateauxDuDuel({ ...duel, rng: rngSequentiel([0.1, 0.9]) });
  assert.equal(adverseMerveilleux.joueur.plateau.id, 'erg-du-sahara');
  assert.equal(adverseMerveilleux.joueur.variante, false);
  assert.equal(adverseMerveilleux.adversaire.plateau.id, 'abysses-phosphorescentes');
  assert.equal(adverseMerveilleux.adversaire.variante, true);
  // La résolution reste déterministe : rejouée à l’identique, mêmes terrains.
  const rejoue = () => resoudrePlateauxDuDuel({ ...duel, rng: rngSequentiel([0.9, 0.9]) });
  assert.deepEqual(rejoue(), rejoue());
  // Un camp sans double ne consomme pas son tirage : la Table des Heures du
  // joueur laisse la première valeur à l’adversaire.
  let appels = 0;
  const horloger = resoudrePlateauxDuDuel({
    deckJoueur: 'grand-horloger', deckAdverse: 'veilleurs-du-desert', variantesFantaisistes: true,
    rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(horloger.joueur.plateau.id, 'table-des-heures');
  assert.equal(horloger.adversaire.plateau.id, 'desert-de-verre');
  assert.equal(appels, 1, 'seul le camp dont le terrain a un double consomme un tirage');
  // Hors bornes : les classiques sont gardés, les deux plateaux restent valides.
  for (const valeur of [Number.NaN, Number.POSITIVE_INFINITY, -3, 12, 'x']) {
    const resolution = resoudrePlateauxDuDuel({ ...duel, rng: () => valeur });
    assert.ok(RPG_PLATEAUX.includes(resolution.joueur.plateau), `valeur ${String(valeur)} : plateau joueur valide`);
    assert.ok(RPG_PLATEAUX.includes(resolution.adversaire.plateau), `valeur ${String(valeur)} : plateau adverse valide`);
    assert.equal(typeof resolution.decouper, 'boolean', `valeur ${String(valeur)} : découpe renseignée`);
  }
});

// ── Le plateau choisi : la moitié du joueur, et seulement elle ──────────────

test('le joueur qui a choisi une table reçoit chez lui, l’adversaire chez lui', () => {
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'veilleurs-du-desert',
    deckAdverse: 'maree-des-abysses',
    plateauChoisi: 'cour-de-l-empereur',
  });
  assert.equal(resolution.joueur.plateau.id, 'cour-de-l-empereur', 'la moitié basse obéit au joueur');
  assert.equal(resolution.joueur.motif, RPG_PLATEAU_MOTIF_CHOIX, 'et le dit : ce n’est ni le deck ni un tirage');
  assert.equal(resolution.joueur.variante, false);
  assert.equal(resolution.adversaire.plateau.id, 'ruines-de-tipaza', 'la moitié haute reste celle du deck adverse');
  assert.equal(resolution.principal.plateau.id, 'cour-de-l-empereur', 'le choix pilote musique et décor 3D');
  assert.equal(resolution.decouper, true, 'deux terrains différents : la table se découpe');
});

test('un terrain choisi n’est jamais échangé contre son double merveilleux', () => {
  let appels = 0;
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'veilleurs-du-desert',
    deckAdverse: 'maree-des-abysses',
    variantesFantaisistes: true,
    plateauChoisi: 'erg-du-sahara',
    rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(resolution.joueur.plateau.id, 'erg-du-sahara', 'l’Erg choisi reste l’Erg');
  assert.equal(resolution.joueur.variante, false, 'pas de Désert de Verre imposé à qui a demandé l’Erg');
  assert.equal(appels, 1, 'le joueur ne tire pas : son tirage n’existe pas');
  assert.equal(resolution.adversaire.plateau.id, 'abysses-phosphorescentes',
    'et l’adversaire prend la première valeur du rng, pas la seconde');
});

test('sans choix, ou avec un choix inconnu, la résolution reste celle d’avant', () => {
  const duel = { deckJoueur: 'veilleurs-du-desert', deckAdverse: 'maree-des-abysses', variantesFantaisistes: true };
  const suite = () => [0.9, 0.1];
  const reference = resoudrePlateauxDuDuel({ ...duel, rng: rngSequentiel(suite()) });
  assert.deepEqual(resoudrePlateauxDuDuel({ ...duel, plateauChoisi: null, rng: rngSequentiel(suite()) }), reference,
    'null : le deck décide, bit à bit comme avant');
  assert.deepEqual(resoudrePlateauxDuDuel({ ...duel, plateauChoisi: 'table-retiree-du-catalogue', rng: rngSequentiel(suite()) }), reference,
    'un identifiant inconnu rend la main au deck');
  // Et le rng n’est pas consommé différemment : sans choix, zéro appel quand
  // rien n’a de double, comme le test ci-dessus le tient déjà.
});

test('les vignettes des plateaux portent leur révision de cache', () => {
  assert.equal(vignettePlateau(plateauParId('erg-du-sahara'), '/Let-s-Play/'),
    `/Let-s-Play/${vignettePlateauRelative('erg-du-sahara')}?v=${PLATEAU_VIGNETTE_REVISION}`);
  assert.equal(vignettePlateau('table-inconnue'), null, 'un plateau inconnu n’a pas de vignette');
  assert.equal(vignettePlateau(null), null);
  for (const plateau of RPG_PLATEAUX) {
    assert.equal(vignettePlateauRelative(plateau), `profil/plateaux/${plateau.id}.webp`,
      `${plateau.id} : le chemin de l’outil et celui de l’écran sont le même`);
  }
});

test('la page passe le choix du profil aux deux résolutions de table', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /const plateauChoisiDuProfil = plateauParId\(profilJoueur\?\.plateau\)\?\.id \?\? null;/,
    'le choix est validé par le catalogue, une fois, à la lecture du profil');
  assert.match(page, /plateauChoisi: modeTutoriel \? null : plateauChoisiDuProfil,/,
    'la partie lancée reçoit le choix — sauf le tutoriel, qui impose sa table');
  assert.match(page, /\n      plateauChoisi: plateauChoisiDuProfil,\n/, 'le duel en ligne aussi');
});

test('la Tour du Sablier renversé a son plateau : la chambre de verre du sablier retourné', () => {
  const sablier = plateauParId('sablier-renverse');
  assert.ok(sablier, 'Le Sablier renversé fait partie des plateaux');
  assert.equal(sablier.fichier, 'plateau-sablier-renverse.jpg');
  assert.match(sablier.nom, /sablier/i);
  assert.match(sablier.lieu, /tour|verre|Bab El/i);
  for (const motif of ['albâtre', 'laiton', 'cabochons', 'verre', 'safran', 'braise', 'nuit', 'orrery']) {
    assert.match(sablier.resume, new RegExp(motif, 'i'), `le résumé du sablier mentionne ${motif}`);
  }
  assert.match(sablier.resume, /milieu du plateau reste vide/i,
    'le centre du plateau reste libre pour les cartes');
  const taille = tailleJpeg(new URL(`../public/${sablier.fichier}`, import.meta.url));
  assert.deepEqual(taille, { width: 3840, height: 2560 }, 'fond livré en 4K au ratio 3:2');
  // La tour terminale est elle-même le plateau : ses sept étages s'y battent.
  const paquets = [
    'veilleurs-absolus', 'flamme-absolue', 'maree-absolue', 'hiver-absolu',
    'jugement-absolu', 'course-absolue', 'le-sablier',
  ];
  for (const paquet of paquets) {
    assert.equal(RPG_PLATEAUX_PAR_DECK[paquet], 'sablier-renverse', `${paquet} se bat dans le sablier`);
    assert.equal(plateauDeDeck(paquet).plateau.id, 'sablier-renverse');
    assert.equal(plateauDeDeck(paquet).motif, 'deck', `${paquet} : le plateau vient du deck, pas de la couleur`);
  }
  // Aucun autre deck ne l’emprunte : la chambre de verre reste celle de la tour.
  const autres = Object.entries(RPG_PLATEAUX_PAR_DECK)
    .filter(([cle]) => !paquets.includes(cle))
    .filter(([, plateau]) => plateau === 'sablier-renverse');
  assert.deepEqual(autres, [], 'aucun autre deck ne reçoit dans le sablier');
  // Terrain unique : pas de double merveilleux, le tirage n’est jamais consommé.
  assert.equal(varianteFantaisisteDe('sablier-renverse'), null);
  let appels = 0;
  const resolution = resoudrePlateauxDuDuel({
    deckJoueur: 'veilleurs-absolus',
    deckAdverse: 'le-sablier',
    variantesFantaisistes: true,
    rng: () => { appels += 1; return 0.9; },
  });
  assert.equal(appels, 0, 'aucun tirage : le sablier n’a pas de variante fantaisiste');
  assert.equal(resolution.joueur.plateau.id, 'sablier-renverse');
  assert.equal(resolution.adversaire.plateau.id, 'sablier-renverse');
  assert.equal(resolution.decouper, false, 'les deux moitiés sont le même terrain : la table reste d’un seul tenant');
  // Sa vignette de profil est livrée, comme celles des autres terrains.
  assert.ok(existsSync(new URL('../public/profil/plateaux/sablier-renverse.webp', import.meta.url)),
    'la vignette du sablier est livrée dans public/profil/plateaux/');
  assert.equal(vignettePlateauRelative(sablier), 'profil/plateaux/sablier-renverse.webp');
});
