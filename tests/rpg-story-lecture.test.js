import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  MS_PAR_CARACTERE,
  PREFERENCES_LECTURE_DEFAUT,
  RPG_LECTURE_STORAGE_KEY,
  chargerPreferencesLecture,
  delaiAutoLecture,
  mouvementReduit,
  preferencesLecture,
  sauverPreferencesLecture,
} from '../src/games/rpgStoryLecture.js';
import { RPG_STORY_CAST, standHistoire } from '../src/games/rpgStoryCast.js';
import { RPG_STORY_SCENES } from '../src/games/rpgStoryScenes.js';

function avecStockage(fn) {
  const donnees = new Map();
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => donnees.get(key) ?? null,
    setItem: (key, value) => donnees.set(key, value),
    removeItem: (key) => donnees.delete(key),
  } });
  try { fn(donnees); } finally {
    if (avant) Object.defineProperty(globalThis, 'localStorage', avant);
    else delete globalThis.localStorage;
  }
}

test('les préférences de lecture reprennent leurs valeurs par défaut quand elles sont absentes ou corrompues', () => {
  assert.deepEqual(preferencesLecture(null), PREFERENCES_LECTURE_DEFAUT);
  assert.deepEqual(preferencesLecture(undefined), PREFERENCES_LECTURE_DEFAUT);
  assert.deepEqual(preferencesLecture('oui'), PREFERENCES_LECTURE_DEFAUT);
  assert.deepEqual(preferencesLecture({}), PREFERENCES_LECTURE_DEFAUT);
  assert.deepEqual(preferencesLecture({ machine: 'non', auto: 1 }), PREFERENCES_LECTURE_DEFAUT);
  assert.deepEqual(preferencesLecture({ machine: false }), { machine: false, auto: false });
  assert.deepEqual(preferencesLecture({ auto: true, inconnu: 'x' }), { machine: true, auto: true });
  // Le défaut lui-même n'est jamais muté par les allers-retours.
  preferencesLecture({ machine: false, auto: true });
  assert.deepEqual(PREFERENCES_LECTURE_DEFAUT, { machine: true, auto: false });
});

test('les préférences survivent au rechargement et au stockage refusé', () => {
  avecStockage((donnees) => {
    assert.deepEqual(chargerPreferencesLecture(), PREFERENCES_LECTURE_DEFAUT);
    assert.equal(sauverPreferencesLecture({ machine: false, auto: true }), true);
    assert.deepEqual(JSON.parse(donnees.get(RPG_LECTURE_STORAGE_KEY)), { machine: false, auto: true });
    assert.deepEqual(chargerPreferencesLecture(), { machine: false, auto: true });
    donnees.set(RPG_LECTURE_STORAGE_KEY, '{invalide');
    assert.deepEqual(chargerPreferencesLecture(), PREFERENCES_LECTURE_DEFAUT);
  });
  const proto = { setItem: () => { throw new Error('quota'); }, getItem: () => null };
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: proto });
  try {
    assert.equal(sauverPreferencesLecture({ machine: false }), false, 'le refus de stockage n’interrompt pas la session');
    assert.deepEqual(chargerPreferencesLecture(), PREFERENCES_LECTURE_DEFAUT);
  } finally {
    if (avant) Object.defineProperty(globalThis, 'localStorage', avant);
    else delete globalThis.localStorage;
  }
});

test('l’auto-lecture laisse respirer les répliques courtes et plafonne les longues', () => {
  const breve = delaiAutoLecture('Ils sont derrière moi.');
  const longue = delaiAutoLecture('x'.repeat(400));
  assert.equal(delaiAutoLecture(''), 1500, 'une réplique vide garde un socle de respiration');
  assert.ok(breve >= 1500 && breve < 3000, 'une réplique courte ne s’attarde pas');
  assert.equal(longue, 6000, 'une réplique très longue plafonne à six secondes');
  const moyenne = delaiAutoLecture('x'.repeat(100));
  assert.ok(moyenne > breve && moyenne < longue);
  assert.equal(delaiAutoLecture(null), 1500);
});

test('la machine à écrire a un rythme lisible et respecte prefers-reduced-motion', () => {
  assert.ok(MS_PAR_CARACTERE >= 10 && MS_PAR_CARACTERE <= 30, 'entre lecture fluide et patience raisonnable');
  assert.equal(mouvementReduit(), false, 'sans media query (essai hors navigateur), le mouvement reste possible');
});

test('chaque sprite « découpé » annoncé est un fichier livré, et le récit entier est complet', () => {
  for (const personnage of Object.values(RPG_STORY_CAST)) {
    if (!personnage.stand) continue;
    const chemin = fileURLToPath(new URL(`../public/${personnage.stand}`, import.meta.url));
    assert.ok(existsSync(chemin), `${personnage.id} : ${personnage.stand} est livré`);
    assert.match(personnage.stand, /^sablier-story\/stands\/stand-[\w-]+\.webp$/);
    // L'URL est datée : sa révision n'est jamais figée dans un test, mais elle
    // doit exister pour qu'un nouveau détourage ne soit pas servi depuis un cache.
    const url = standHistoire(personnage.id, '/base/');
    assert.equal(url.split('?')[0], `/base/${personnage.stand}`);
    assert.match(url, /\?v=[\w-]+$/);
  }
  assert.equal(standHistoire('narrateur', '/'), null, 'la ville n’a pas de corps');
  assert.equal(standHistoire('absent', '/'), null);
  // Les cinq actes se jouent de bout en bout en personnages découpés : chaque
  // figure d'une scène — et non le seul hôte — a son sprite.
  for (const scene of RPG_STORY_SCENES) {
    const presents = new Set([scene.figure, ...scene.repliques.map((ligne) => ligne.personnage)]);
    for (const id of presents) {
      if (id === 'narrateur') continue;
      assert.ok(RPG_STORY_CAST[id]?.stand, `${scene.id} : ${id} a un sprite découpé`);
    }
  }
});
