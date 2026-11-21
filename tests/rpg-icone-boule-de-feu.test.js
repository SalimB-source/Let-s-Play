import test from 'node:test';
import assert from 'node:assert/strict';
import { carteLanceBouleDeFeu } from '../src/games/rpgCartesBouleDeFeu.js';
import { cardById } from '../src/games/rpgCards.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lire = (nom) => readFileSync(fileURLToPath(new URL(`../src/games/${nom}`, import.meta.url)), 'utf8');

const ids = (liste) => liste.map((id) => cardById(id)).filter(Boolean);

test('boule de feu : les Djinns et le Sahir des braises projettent du feu', () => {
  for (const carte of ids([
    'sahir-des-braises',
    'djinn-de-la-premiere-etincelle',
    'djinn-de-la-fleche-ardente',
    'djinn-de-foudre',
    'ifrit-des-ergs',
    'kagutsuchi-flamme-originelle',
  ])) {
    assert.equal(carteLanceBouleDeFeu(carte), true, carte.id);
  }
});

test('boule de feu : les créatures qui tirent gardent l’arc', () => {
  for (const carte of ids([
    'archere-viking-du-givre',
    'archer-du-pachyderme-ardent',
    'ashigaru-des-braises',
    'archer-samourai-des-cendres',
    'tengu-du-mont-ardent',
    'galion-de-la-flotte',
    'guetteuse-des-marees',
    'eclipse-silencieuse',
  ])) {
    assert.equal(carteLanceBouleDeFeu(carte), false, carte.id);
  }
});

test('boule de feu : une arme équipée reste un arc, une carte peut l’imprimer', () => {
  assert.equal(carteLanceBouleDeFeu({ kind: 'arme', porteeArme: 'distance', text: 'Djinn' }), false);
  assert.equal(carteLanceBouleDeFeu({ kind: 'creature', bouleDeFeu: true, text: '' }), true);
  assert.equal(carteLanceBouleDeFeu(null), false);
  assert.equal(carteLanceBouleDeFeu(undefined), false);
});

test('boule de feu : l’icône d’ATQ bascule sur la boule pour une créature sans arme', () => {
  const page = lire('RpgDuelPage.jsx');
  const moba = lire('RpgMobaBoard.jsx');
  assert.match(page, /data-stat-icon=\{arc \? \(feu \? 'boule-de-feu' : 'arc'\) : type\}/);
  // Une boule simple : une seule silhouette pleine, inclinée en diagonale.
  assert.match(page, /data-boule-de-feu="" fill="currentColor" stroke="none"/);
  assert.match(page, /M18\.6 2\.4c/); // la pointe en haut à droite, le corps vers le bas à gauche
  assert.doesNotMatch(page, /data-boule-(corps|coeur|tracee|sillage)/);
  assert.match(page, /bouleDeFeu=\{carteLanceBouleDeFeu\(entite\.carte \?\? entite\)\}/);
  assert.match(page, /bouleDeFeu=\{!armesEquipees\.length && carteLanceBouleDeFeu\(carte\)\}/);
  assert.match(moba, /bouleDeFeu=\{carteLanceBouleDeFeu\(card\)\}/);
  // Les armes gardent l'arc : la fiche d'arme ne reçoit pas la boule.
  assert.match(page, /<CardStatIcon type="attack" distance=\{carte\.porteeArme === 'distance'\} \/>/);
});
