/**
 * L'écusson des créatures Défenseur — tests/rpg-carte-bouclier.test.js
 * ----------------------------------------------------------------------
 * Vérifie, sans navigateur : qui reçoit l'écusson, que la silhouette est un
 * masque SVG plein SANS aucun contour ni rectangle visible, que les repères
 * (ATQ/DÉF, type, pierres, sonar) ne sont pas touchés, et que les APERÇUS
 * restent des cartes rectangulaires normales avec ATQ à gauche / DÉF à droite.
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

test('la classe est posée sur les faces en jeu, mais PAS sur les aperçus', () => {
  assert.match(duel, /import '\.\/rpg-bouclier\.css';/, 'la feuille est chargée par le duel');
  assert.match(duel, /classeBouclier\(carte, entite\)/, 'la table lit l’état courant de l’entité');
  // Main, mulligan et vignette du catalogue : l'aperçu au survol est retiré.
  assert.equal((duel.match(/classeBouclier\(carte\)/g) ?? []).length, 3,
    'main, mulligan et catalogue portent la classe ; plus l’aperçu');
  const ligneApercu = duel.split('\n').find((l) => l.includes('className={`rpg-hover-card-preview__face'));
  assert.ok(ligneApercu, 'la face d’aperçu existe');
  assert.doesNotMatch(ligneApercu, /classeBouclier/, 'l’aperçu reste une carte rectangulaire normale');
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

test('la carte EST l’écusson : masque plein, aucun contour, aucun rectangle', () => {
  assert.match(css, /--rpg-ecusson-masque:\s*url\("data:image\/svg\+xml,/, 'masque vectoriel');
  assert.match(css, /--rpg-ecusson-fond:\s*#211d3b;/, 'aplat marine de la référence');
  assert.match(css, /background-color:\s*var\(--rpg-ecusson-fond\);/);
  assert.match(css, /mask-image:\s*var\(--rpg-ecusson-masque\);/);
  assert.match(css, /-webkit-mask-image:\s*var\(--rpg-ecusson-masque\);/);
  assert.match(css, /mask-size:\s*100% 100%;/);
  // Plus aucun rectangle : fond, cadre, bordure, rayon, ombre, outline.
  for (const regle of [
    /background:\s*transparent !important;/,
    /background-image:\s*none !important;/,
    /border:\s*0 !important;/,
    /border-radius:\s*0 !important;/,
    /box-shadow:\s*none !important;/,
    /outline:\s*none !important;/,
    /overflow:\s*visible !important;/,
  ]) assert.match(css, regle, `règle ${regle}`);
  // Aucun trait résiduel : l'ancien filet or / liseré marine a disparu.
  assert.doesNotMatch(css, /stroke=/, 'aucun stroke SVG');
  assert.doesNotMatch(css, /--rpg-ecusson-trait/, 'l’ancien tracé contour est retiré');
  assert.doesNotMatch(css, /224,205,138|240, 205, 138|#e0cd8a/, 'plus de filet doré');
  assert.doesNotMatch(css, /clip-path\s*:/, 'mask-image et non clip-path : les repères débordent');
  assert.equal(
    (css.match(/border-radius\s*:/g) ?? []).length,
    (css.match(/border-radius\s*:\s*0\s*!important;/g) ?? []).length,
    'toutes les déclarations de rayon sont à zéro',
  );
  // Le masque décodé est un SVG valide, rempli de blanc, avec la vraie pointe.
  const uri = css.match(/--rpg-ecusson-masque:\s*url\("([^"]+)"\)/)[1];
  const svg = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  assert.match(svg, /^<svg /);
  assert.match(svg, /50 124/, 'pointe en V lisible');
  assert.match(svg, /fill='rgb\(255,255,255\)'/, 'silhouette pleine');
  assert.doesNotMatch(svg, /stroke/, 'aucun contour dans le SVG');
  assert.match(css, /\.rpg-carte-bouclier::before/, 'le fond masqué existe');
  assert.match(css, /pointer-events:\s*none;/);
});

test('ATQ/DÉF et les autres repères restent exactement comme sur les autres cartes', () => {
  // La feuille de l'écusson ne contient aucune règle de position / de taille
  // sur les repères : c'est `rpg-battle.css` / `rpg-mobile.css` qui font foi.
  for (const selectors of [
    'rpg-card__foot', 'rpg-card__stat--atk', 'rpg-card__pt', 'rpg-hand__stats',
    'rpg-hand__stat', 'rpg-card-icones--colonne',
  ]) {
    assert.doesNotMatch(css, new RegExp(selectors), `${selectors} n'est pas touché`);
  }
  assert.doesNotMatch(css, /rpg-card__type\s*\{/, 'le type n’est pas repositionné');
  assert.doesNotMatch(css, /rpg-hand__type\s*\{/, 'le type de la main n’est pas repositionné');
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__foot/, 'gabarit normal du pied de carte');
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__stat--atk/, 'gabarit normal de l’ATQ');
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__pt/, 'gabarit normal de la DÉF');
  assert.match(mobileCss, /\.rpg-card--img \.rpg-card__foot/, 'gabarit mobile inchangé');
  assert.match(battleCss, /\.rpg-card\.has-garde/, 'sonar rouge toujours présent');
});

test('les aperçus restent rectangulaires avec ATQ à gauche et DÉF à droite', () => {
  const ligneApercu = duel.split('\n').find((l) => l.includes('className={`rpg-hover-card-preview__face'));
  assert.ok(ligneApercu);
  assert.doesNotMatch(ligneApercu, /classeBouclier/, 'pas d’écusson sur l’aperçu');
  assert.match(ligneApercu, /rpg-hover-card-preview__face/, 'la face d’aperçu existe bien');
  // Le pied de l'aperçu garde sa grille deux colonnes : ATQ à gauche, DÉF à droite.
  assert.match(battleCss, /\.rpg-hover-card-preview__face \.rpg-card__foot,[\s\S]{0,400}?grid-template-columns:\s*repeat\(2,/, 'ATQ à gauche, DÉF à droite');
  assert.match(duel, /rpg-hover-card-preview__face[\s\S]{0,1200}?rpg-card__foot/, 'les statistiques restent sur la face d’aperçu');
});
