/**
 * L'écusson des créatures Défenseur — tests/rpg-carte-bouclier.test.js
 * ----------------------------------------------------------------------
 * Vérifie, sans navigateur : qui reçoit l'écusson (et qui ne le reçoit pas),
 * que la classe est bien posée sur les faces du duel, que le tracé SVG montre
 * une vraie pointe en bas, et surtout que la feuille ne touche PLUS aux
 * pastilles ATQ/DÉF ni aux autres repères — ils restent comme sur les autres
 * cartes. Aucun `border-radius` de découpe, aucun `clip-path`.
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
const battleCss = lire('rpg-battle.css');
const mobileCss = lire('rpg-mobile.css');
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

test('l’écusson est un tracé SVG avec une vraie pointe, sans découper la carte', () => {
  assert.match(css, /--rpg-ecusson-trait:\s*url\("data:image\/svg\+xml,/, 'tracé vectoriel');
  assert.match(css, /M1%208/, 'arche haute');
  assert.match(css, /50%20124/, 'pointe centrée en bas');
  assert.match(css, /C99%20100%2065%20112%2050%20124/, 'courbe droite qui descend vers la pointe');
  assert.match(css, /C35%20112%201%20100%201%2062/, 'courbe gauche qui remonte depuis la pointe');
  assert.match(css, /stroke='rgb%28224,205,138%29'/, 'filet or');
  assert.match(css, /stroke='rgb%2831,28,56%29'/, 'liseré marine');
  // L'URI reste un SVG valide une fois décodée : la pointe ne doit pas être
  // perdue dans un mauvais échappement.
  const uri = css.match(/--rpg-ecusson-trait:\s*url\("([^"]+)"\)/)[1];
  const svg = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  assert.match(svg, /^<svg /);
  assert.match(svg, /50 124/, 'pointe lisible dans le SVG décodé');
  assert.match(svg, /rgb\(224,205,138\)/, 'or lisible dans le SVG décodé');
  assert.match(css, /background-image:\s*var\(--rpg-ecusson-trait\);/);
  assert.match(css, /background-size:\s*100% 100%;/);
  assert.match(css, /z-index:\s*1;/, 'sous le titre et les statistiques');
  assert.match(css, /pointer-events:\s*none;/);
  assert.doesNotMatch(css, /--rpg-card-radius/, 'la carte garde son rayon habituel');
  assert.doesNotMatch(css, /border-radius\s*:/, 'aucune découpe de la face');
  assert.doesNotMatch(css, /clip-path\s*:/, 'le sonar et les pierres qui débordent restent visibles');
  for (const face of [
    '.rpg-card', '.rpg-hand__card', '.rpg-mulligan__card', '.rpg-hover-card-preview__face',
    '.rpg-card-catalogue__art', '.rpg-atelier__carte-art', '.rpg-card-guide__example', '.rpg-souk__carte',
  ]) {
    assert.match(css, new RegExp(`${face.replace('.', '\\.')}\\.rpg-carte-bouclier::before`), `écusson sur ${face}`);
  }
});

test('ATQ/DÉF et les autres repères restent exactement comme sur les autres cartes', () => {
  // La feuille de l'écusson ne doit plus contenir la moindre règle sur les
  // repères : c'est `rpg-battle.css` / `rpg-mobile.css` qui font foi.
  for (const selectors of [
    'rpg-card__foot', 'rpg-card__stat--atk', 'rpg-card__pt', 'rpg-hand__stats',
    'rpg-hand__stat', 'rpg-card__type', 'rpg-hand__type', 'rpg-card-icones--colonne',
  ]) {
    assert.doesNotMatch(css, new RegExp(selectors), `${selectors} n'est pas touché`);
  }
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__foot/, 'gabarit normal du pied de carte');
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__stat--atk/, 'gabarit normal de l’ATQ');
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__pt/, 'gabarit normal de la DÉF');
  assert.match(mobileCss, /\.rpg-card--img \.rpg-card__foot/, 'gabarit mobile inchangé');
  // Le sonar rouge et la pierre Défenseur restent protégés par leur propre test.
  assert.match(battleCss, /\.rpg-card\.has-garde/, 'sonar rouge toujours présent');
});
