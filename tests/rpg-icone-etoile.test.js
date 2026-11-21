import test from 'node:test';
import assert from 'node:assert/strict';
import { carteLanceEtoile, entiteLanceEtoile } from '../src/games/rpgCartesEtoile.js';
import { cardById } from '../src/games/rpgCards.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lire = (nom) => readFileSync(fileURLToPath(new URL(`../src/games/${nom}`, import.meta.url)), 'utf8');
const ids = (liste) => liste.map((id) => cardById(id)).filter(Boolean);

test('étoile : les Djinns et le Sahir des braises invoquent au lieu de tirer', () => {
  for (const carte of ids([
    'sahir-des-braises',
    'djinn-de-la-premiere-etincelle',
    'djinn-de-la-fleche-ardente',
    'djinn-de-foudre',
    'ifrit-des-ergs',
    'kagutsuchi-flamme-originelle',
  ])) {
    assert.equal(carteLanceEtoile(carte), true, carte.id);
  }
});

test('étoile : les créatures qui tirent gardent l’arc', () => {
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
    assert.equal(carteLanceEtoile(carte), false, carte.id);
  }
});

test('étoile : une arme équipée reste un arc, une carte peut l’imprimer', () => {
  assert.equal(carteLanceEtoile({ kind: 'arme', porteeArme: 'distance', text: 'Djinn' }), false);
  assert.equal(carteLanceEtoile({ kind: 'creature', etoile: true, text: '' }), true);
  assert.equal(carteLanceEtoile(null), false);
  assert.equal(carteLanceEtoile(undefined), false);
});

test('étoile : visible sur le plateau, depuis la créature en jeu', () => {
  for (const id of ['sahir-des-braises', 'djinn-de-foudre', 'kagutsuchi-flamme-originelle']) {
    const fiche = cardById(id);
    const entite = { id: 'e1', carteId: id, distance: fiche.distance, atk: fiche.atk, pv: fiche.def };
    assert.equal(entiteLanceEtoile(entite), true, id);
  }
  for (const id of ['archere-viking-du-givre', 'ashigaru-des-braises', 'galion-de-la-flotte']) {
    const fiche = cardById(id);
    assert.equal(entiteLanceEtoile({ id: 'e2', carteId: id, distance: fiche.distance }), false, id);
  }
  // Un jeton qui porte sa nature sur l'entité elle-même est reconnu aussi.
  assert.equal(entiteLanceEtoile({ id: 'e3', typeLine: 'Créature — Djinn', distance: true }), true);
  assert.equal(entiteLanceEtoile(null), false);
});

test('étoile : l’icône d’ATQ dessine une étoile à cinq branches, centrée', () => {
  const page = lire('RpgDuelPage.jsx');
  const moba = lire('RpgMobaBoard.jsx');
  assert.match(page, /data-stat-icon=\{arc \? \(etoile \? 'etoile' : 'arc'\) : type\}/);
  assert.match(page, /data-stat-etoile="" d="M12 2\.8 14\.5 9\.3 21\.4 9\.7 16\.1 14\.1 17\.8 20\.8 12 17\.1 6\.2 20\.8 7\.9 14\.1 2\.6 9\.7 9\.5 9\.3Z"/);
  assert.doesNotMatch(page, /boule-de-feu|data-boule-/);
  // Le plateau passe par l'entité en jeu, la main et la fiche par la carte.
  assert.match(page, /magique=\{entiteLanceEtoile\(entite\)\}/);
  assert.match(page, /magique=\{!armesEquipees\.length && carteLanceEtoile\(carte\)\}/);
  assert.match(page, /magique=\{carteLanceEtoile\(carte\)\}/);
  assert.match(moba, /magique=\{carteLanceEtoile\(card\)\}/);
  // Les armes gardent l'arc : la fiche d'arme ne reçoit pas l'étoile.
  assert.match(page, /<CardStatIcon type="attack" distance=\{carte\.porteeArme === 'distance'\} \/>/);
});
