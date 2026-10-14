import test from 'node:test';
import assert from 'node:assert/strict';
import {
  choixPondere,
  graineNumerique,
  melanger,
  rngSeme,
  tirerIndex,
  tirerParmi,
} from '../src/games/rpgHasard.js';

// ── La graine ────────────────────────────────────────────────────────────────

test('la graine est stable, sans collision sur les textes du jeu', () => {
  assert.equal(graineNumerique('2026-10-14:appareil-abc'), graineNumerique('2026-10-14:appareil-abc'));
  assert.notEqual(graineNumerique('2026-10-14:appareil-abc'), graineNumerique('2026-10-15:appareil-abc'));
  const empreintes = new Set();
  for (let index = 0; index < 500; index += 1) empreintes.add(graineNumerique(`sablier-quetes:2026-01-${index}:joueur`));
  assert.equal(empreintes.size, 500, 'cinq cents textes, cinq cents graines');
});

test('un générateur semé rend toujours la même suite', () => {
  const premier = rngSeme(4242);
  const second = rngSeme(4242);
  const suiteA = Array.from({ length: 20 }, () => premier());
  const suiteB = Array.from({ length: 20 }, () => second());
  assert.deepEqual(suiteA, suiteB);
  assert.ok(suiteA.every((valeur) => valeur >= 0 && valeur < 1), 'les tirages restent dans [0, 1[');
  assert.notDeepEqual(suiteA, Array.from({ length: 20 }, () => rngSeme(1)()));
});

// ── Les tirages ──────────────────────────────────────────────────────────────

test('tirerIndex et tirerParmi restent dans la liste, et rendent null (ou -1) sur une liste vide', () => {
  const liste = ['a', 'b', 'c'];
  for (let index = 0; index < 50; index += 1) {
    const choisi = tirerParmi(liste);
    assert.ok(liste.includes(choisi));
    assert.ok(tirerIndex(liste) >= 0 && tirerIndex(liste) < 3);
  }
  assert.equal(tirerParmi([], Math.random), null);
  assert.equal(tirerIndex([], Math.random), -1);
});

test('le tirage pondéré respecte les poids et retombe sur le défaut sans poids', () => {
  const rng = rngSeme(7);
  const comptes = { rare: 0, commune: 0 };
  for (let index = 0; index < 4000; index += 1) {
    comptes[choixPondere([['commune', 0.8], ['rare', 0.2]], rng, 'commune')] += 1;
  }
  const part = comptes.rare / 4000;
  assert.ok(part > 0.16 && part < 0.24, `la part rare vaut ${part}`);
  assert.equal(choixPondere([], rng, 'defaut'), 'defaut');
  assert.equal(choixPondere([['a', 0], ['b', -1]], rng, 'defaut'), 'defaut');
});

test('melanger ne touche pas la liste d’origine et garde tous les éléments', () => {
  const originale = ['a', 'b', 'c', 'd', 'e'];
  const melangee = melanger(originale, rngSeme(3));
  assert.deepEqual(originale, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(melangee.length, originale.length);
  assert.deepEqual([...melangee].sort(), [...originale].sort());
});
