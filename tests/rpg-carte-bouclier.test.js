/**
 * La face en bouclier des créatures Défenseur — tests/rpg-carte-bouclier.test.js
 * ----------------------------------------------------------------------------
 * Vérifie, sans navigateur : qui reçoit l'écu (et qui ne le reçoit pas), que
 * la classe est bien posée sur les faces du duel, et que la feuille dessine la
 * forme avec un rayon — jamais un `clip-path`, qui couperait le sonar rouge,
 * les pierres d'effets et la pastille d'arme qui débordent de la carte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

import { RPG_DUEL_CARDS, cardById } from '../src/games/rpgCards.js';
import { CLASSE_BOUCLIER, classeBouclier, estCreatureBouclier } from '../src/games/rpgBouclier.js';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const css = lire('rpg-bouclier.css');
const duel = lire('RpgDuelPage.jsx');

test('seules les créatures et les héros Défenseur deviennent des écus', () => {
  const gardien = cardById('gardien-de-la-porte-ardente');
  const simple = cardById('chercheuse-des-armes-ensevelies');
  assert.ok(gardien?.defenseur, 'le Gardien imprime Défenseur');
  assert.equal(classeBouclier(gardien), CLASSE_BOUCLIER);
  assert.equal(estCreatureBouclier(gardien), true);
  assert.equal(classeBouclier(simple), '', 'une créature sans Défenseur reste rectangulaire');

  // Un Défenseur reçu en cours de partie (sort, équipement, arrivée) compte
  // aussi, même si la carte ne l'imprime pas.
  for (const capacite of [{ defenseur: true }, { defenseurAccorde: true }, { provocation: true }, { prioriteAttaqueRapide: true }]) {
    assert.equal(classeBouclier(simple, capacite), CLASSE_BOUCLIER, JSON.stringify(capacite));
  }

  // Sites, sorts, armes et terrains restent exclus, même avec un marqueur.
  for (const id of ['source-de-bimini', 'trait-de-braise', 'armure-de-cendres']) {
    const carte = cardById(id);
    assert.ok(carte, `${id} existe`);
    assert.equal(classeBouclier(carte, { defenseur: true }), '', `${id} n'est pas un écu`);
  }
  assert.equal(classeBouclier(null, { defenseur: true }), '', 'sans définition de carte, pas d’écu');

  // Toutes les cartes qui impriment Défenseur sont couvertes.
  const imprimees = RPG_DUEL_CARDS.filter((carte) => carte.defenseur || carte.prioriteAttaqueRapide || carte.provocation);
  assert.ok(imprimees.length >= 20, `${imprimees.length} cartes Défenseur dans le catalogue`);
  for (const carte of imprimees) assert.equal(classeBouclier(carte), CLASSE_BOUCLIER, carte.id);
});

test('la classe est posée sur les faces du duel, du catalogue et de l’atelier', () => {
  assert.match(duel, /import '\.\/rpg-bouclier\.css';/, 'la feuille est chargée par le duel');
  assert.match(duel, /classeBouclier\(carte, entite\)/, 'la table lit l’état courant de l’entité');
  // Une classe par présentation : main, mulligan, aperçu, catalogue.
  assert.equal((duel.match(/classeBouclier\(carte\)/g) ?? []).length, 4,
    'main, mulligan, aperçu et catalogue portent la classe');
  assert.match(lire('RpgDeckAtelier.jsx'), /classeBouclier\(carte\)/, 'vignette de l’atelier');
  assert.match(lire('RpgMobaBoard.jsx'), /classeBouclier\(card\)/, 'main du MOBA');
  assert.match(lire('RpgBoosterOuverture.jsx'), /classeBouclier\(carte\)/, 'carte révélée au Souk');
  assert.match(lire('RpgCardGuide.jsx'), /classeBouclier\(carte\)/, 'fiche du guide');
  // La feuille est chargée par chaque écran qui peut s'ouvrir seul.
  for (const fichier of ['RpgDuelPage.jsx', 'RpgDeckCreation.jsx', 'RpgBoosterOuverture.jsx', 'RpgCardGuide.jsx', 'RpgMobaBoard.jsx']) {
    assert.match(lire(fichier), /import '\.\/rpg-bouclier\.css';/, fichier);
  }
});

test('TableCard dessine l’écu pour un Défenseur, pas pour les autres', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const rendre = (entite) => {
      const dom = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite, cote: 'joueur' })));
      return dom.window.document.querySelector('.rpg-card');
    };
    const base = { id: 'c1', carteId: 'chercheuse-des-armes-ensevelies', name: 'Éclaireuse', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true };
    assert.equal(rendre(base).classList.contains(CLASSE_BOUCLIER), false);
    assert.equal(rendre({ ...base, defenseurAccorde: true }).classList.contains(CLASSE_BOUCLIER), true,
      'Défenseur accordé pendant la partie');
    const imprime = { id: 'c2', carteId: 'gardien-de-la-porte-ardente', name: 'Gardien', atk: 2, def: 4, pv: 4, pvMax: 4, ready: true };
    assert.equal(rendre(imprime).classList.contains(CLASSE_BOUCLIER), true, 'Défenseur imprimé');
    // Le sonar rouge et la pierre Défenseur restent en place : l’écu s’ajoute,
    // il ne remplace aucun des repères existants.
    const carte = rendre(imprime);
    assert.ok(carte.classList.contains('has-garde'));
    assert.equal(carte.querySelectorAll('.rpg-card__resonance--garde').length, 1);
    assert.equal(carte.querySelectorAll('[data-effet="defenseur"]').length, 1);
    // Un site avec un marqueur de Défenseur n'est pas une créature.
    const site = { id: 'c3', carteId: 'source-de-bimini', name: 'Source', atk: 0, def: 4, pv: 4, pvMax: 4, ready: true, defenseur: true };
    assert.equal(rendre(site).classList.contains(CLASSE_BOUCLIER), false);
  } finally { await vite.close(); }
});

test('l’écusson est un rayon héraldique, pas un rognage', () => {
  const rayon = /50% 50% 50% 50% \/ 7% 7% 38% 38%/;
  assert.match(css, /--rpg-card-radius:\s*50% 50% 50% 50% \/ 7% 7% 38% 38%;/);
  assert.match(css, /--rpg-card-radius-sm:\s*50% 50% 50% 50% \/ 7% 7% 38% 38%;/);
  assert.ok(rayon.test(css), 'arche haute + longue pointe basse');
  assert.doesNotMatch(css, /clip-path\s*:/, 'un clip-path couperait les débordements du sonar et des pierres');
  assert.match(css, /border-radius:\s*var\(--rpg-card-radius-sm\) !important;/, 'les gabarits mobiles ne remettent pas la face au carré');
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier::before[\s\S]{0,900}?inset 0 0 0 2px/, 'liseré de l’écusson');
  for (const face of ['.rpg-card-guide__example', '.rpg-souk__carte']) {
    assert.match(css, new RegExp(`${face.replace('.', '\\.')}\\.rpg-carte-bouclier::before`), `liseré sur ${face}`);
  }
  assert.match(css, /\.rpg-card--img\.rpg-carte-bouclier \.rpg-card__foot,\s*\.rpg-hand__card--img\.rpg-carte-bouclier \.rpg-hand__stats \{[^}]*left:\s*22% !important;[^}]*bottom:\s*8% !important;/s);
  assert.match(css, /\.rpg-card--img\.rpg-carte-bouclier \.rpg-card__type,[\s\S]{0,300}?bottom:\s*20% !important;/);
  assert.match(css, /font-size:\s*clamp\(6px, 7cqw, 11px\) !important;/, 'statistiques réduites dans la pointe');
  assert.match(css, /rpg-hover-card-preview__face\.rpg-carte-bouclier \.rpg-card__foot[\s\S]{0,300}?left:\s*18% !important;[^}]*bottom:\s*10% !important;/s);
  assert.match(css, /rpg-card-catalogue__art\.rpg-carte-bouclier \.rpg-card-icones--colonne[\s\S]{0,300}?bottom:\s*22% !important;[^}]*right:\s*8% !important;/s);
});

test('les repères restent à l’intérieur de la silhouette de l’écusson', () => {
  // Même géométrie que `--rpg-card-radius` : haut 7 %, bas 38 %, rayons
  // horizontaux 50 %. Demi-largeur disponible à une hauteur y donnée.
  const HAUT = 0.07;
  const BAS = 0.38;
  const demiLargeur = (y) => {
    if (y <= HAUT) return 0.5 * Math.sqrt(Math.max(0, 1 - ((HAUT - y) / HAUT) ** 2));
    if (y >= 1 - BAS) return 0.5 * Math.sqrt(Math.max(0, 1 - ((y - (1 - BAS)) / BAS) ** 2));
    return 0.5;
  };
  // marge = part coupée de chaque côté ; la demi-largeur utile est 0.5 - marge.
  const tient = (marge, bas) => {
    const y = 1 - bas;
    return 0.5 - marge <= demiLargeur(y) + 1e-9;
  };
  assert.ok(tient(0.22, 0.08), 'ATQ/DÉF de la table et de la main');
  assert.ok(tient(0.18, 0.10), 'ATQ/DÉF de l’aperçu et du mulligan');
  assert.ok(tient(0.08, 0.20), 'ligne de type');
  assert.ok(tient(0.08, 0.22), 'colonne de pierres du catalogue');
  // Le haut bombé laisse passer le titre posé à 5 % du haut, marge 6 %.
  assert.ok(0.5 - 0.06 <= demiLargeur(0.05) + 1e-9, 'titre dans l’arche haute');
});
