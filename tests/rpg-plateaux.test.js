import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  chargerChoixPlateau,
  normaliserChoixPlateau,
  plateauParId,
  plateauVerrouille,
  RPG_PLATEAU_ALEATOIRE,
  RPG_PLATEAU_STORAGE_KEY,
  RPG_PLATEAUX,
  sauverChoixPlateau,
  tirerPlateau,
} from '../src/games/rpgPlateaux.js';

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
  // Le tirage n'a de sens qu'avec au moins deux terrains différents.
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
  // Les trois atmosphères du jeu : Bab El, le désert vivant, la terre brûlée.
  assert.equal(new Set(RPG_PLATEAUX.map((plateau) => plateau.fichier)).size, RPG_PLATEAUX.length,
    'aucun plateau ne réutilise le fond d’un autre');
});

// ── Le tirage : le plateau change de partie en partie ───────────────────────

test('chaque nouvelle partie tire un plateau, jamais celui du duel précédent', () => {
  const precedent = RPG_PLATEAUX[0];
  for (const valeur of [0, 0.1, 0.5, 0.75, 0.999]) {
    const plateau = tirerPlateau({ rng: () => valeur, precedentId: precedent.id });
    assert.ok(plateau, 'un plateau est toujours rendu');
    assert.notEqual(plateau.id, precedent.id, 'le même terrain ne revient pas deux duels de suite');
  }
});

test('le tirage reste déterministe avec le rng du duel', () => {
  assert.equal(tirerPlateau({ rng: () => 0 }).id, RPG_PLATEAUX[0].id);
  assert.equal(tirerPlateau({ rng: () => 0.999 }).id, RPG_PLATEAUX.at(-1).id);
  assert.equal(tirerPlateau({ rng: () => 0.999 }).id, tirerPlateau({ rng: () => 0.999 }).id);
});

test('un tirage hors bornes ne casse rien', () => {
  for (const valeur of [Number.NaN, Number.POSITIVE_INFINITY, -3, 12, 'x']) {
    const plateau = tirerPlateau({ rng: () => valeur });
    assert.ok(RPG_PLATEAUX.includes(plateau), `valeur ${String(valeur)} : plateau valide`);
  }
  assert.ok(RPG_PLATEAUX.includes(tirerPlateau({ rng: null })));
  assert.ok(RPG_PLATEAUX.includes(tirerPlateau()));
  // Un précédent inconnu n'écarte aucun plateau.
  assert.equal(tirerPlateau({ rng: () => 0, precedentId: 'plateau-inconnu' }).id, RPG_PLATEAUX[0].id);
});

// ── Le verrou : garder le même terrain d'un duel à l'autre ──────────────────

test('un plateau verrouillé est toujours rendu, quel que soit le tirage', () => {
  const verrou = RPG_PLATEAUX.at(-1);
  assert.equal(plateauVerrouille(verrou.id), true);
  assert.equal(plateauVerrouille(RPG_PLATEAU_ALEATOIRE), false);
  for (const valeur of [0, 0.5, 0.999]) {
    const plateau = tirerPlateau({ choix: verrou.id, rng: () => valeur, precedentId: RPG_PLATEAUX[0].id });
    assert.equal(plateau.id, verrou.id, 'le verrou l’emporte sur le tirage et sur le précédent');
  }
  // Le verrou reste ignoré s'il ne correspond à aucun plateau connu.
  assert.equal(normaliserChoixPlateau('plateau-inconnu'), RPG_PLATEAU_ALEATOIRE);
  assert.equal(normaliserChoixPlateau(undefined), RPG_PLATEAU_ALEATOIRE);
  assert.equal(normaliserChoixPlateau(verrou.id), verrou.id);
});

test('le choix de plateau survit à un aller-retour de sauvegarde', () => {
  const donnees = new Map();
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => donnees.set(cle, valeur),
      removeItem: (cle) => donnees.delete(cle),
    },
  });
  try {
    assert.equal(chargerChoixPlateau(), RPG_PLATEAU_ALEATOIRE, 'sans sauvegarde, le plateau est tiré');
    assert.equal(sauverChoixPlateau('erg-du-sahara'), true);
    assert.equal(donnees.get(RPG_PLATEAU_STORAGE_KEY), 'erg-du-sahara');
    assert.equal(chargerChoixPlateau(), 'erg-du-sahara');

    donnees.set(RPG_PLATEAU_STORAGE_KEY, 'plateau-disparu');
    assert.equal(chargerChoixPlateau(), RPG_PLATEAU_ALEATOIRE,
      'un plateau retiré du catalogue rend la main au tirage');
    assert.equal(sauverChoixPlateau('plateau-disparu'), true, 'l’écriture reste silencieuse');
    assert.equal(donnees.get(RPG_PLATEAU_STORAGE_KEY), RPG_PLATEAU_ALEATOIRE,
      'la valeur inconnue est normalisée avant d’être écrite');
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});

test('le choix se lit aussi sans aucun stockage disponible', () => {
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('mode privé'); },
  });
  try {
    assert.equal(chargerChoixPlateau(), RPG_PLATEAU_ALEATOIRE);
    assert.equal(sauverChoixPlateau('erg-du-sahara'), false);
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});
