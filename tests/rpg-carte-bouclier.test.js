/**
 * L'écusson des créatures Défenseur — tests/rpg-carte-bouclier.test.js
 * ----------------------------------------------------------------------
 * Vérifie, sans navigateur : qui reçoit l'écusson, que le cadre acier AFFINÉ
 * suit la silhouette SANS ailettes et SANS couper la pointe du bas, avec un
 * liseré de la couleur de l'élément et une ombre portée (aucun rectangle,
 * aucun `outline`, aucun `box-shadow` de boîte), que TOUS les effets pleine
 * face (égide de Bouclier, impact, Furie, Envol, brume, ondes, sang, givre)
 * prennent eux aussi la forme de l'écu, que les repères (ATQ/DÉF, type,
 * pierres, sonar) ne sont pas touchés, et que MAIN, MULLIGAN, MAIN MOBA et
 * APERÇUS restent des cartes rectangulaires normales avec ATQ à gauche / DÉF
 * à droite.
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

/** Les quelques lignes qui suivent un marqueur, pour tester un bloc JSX. */
const blocApres = (source, marqueur, taille = 18) => {
  const lignes = source.split('\n');
  const i = lignes.findIndex((l) => l.includes(marqueur));
  assert.ok(i >= 0, `${marqueur} existe`);
  return lignes.slice(i, i + taille).join('\n');
};

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

test('la classe est posée sur le plateau et les vignettes, PAS sur la main ni les aperçus', () => {
  assert.match(duel, /import '\.\/rpg-bouclier\.css';/, 'la feuille est chargée par le duel');
  assert.match(duel, /classeBouclier\(carte, entite\)/, 'la table lit l’état courant de l’entité');
  // Une seule classe « carte seule » : la vignette du catalogue. La main, le
  // mulligan et l'aperçu au survol ne la posent plus.
  assert.equal((duel.match(/classeBouclier\(carte\)/g) ?? []).length, 1,
    'seule la vignette du catalogue porte la classe');
  assert.doesNotMatch(blocApres(duel, "'rpg-mulligan__card'"), /classeBouclier/,
    'le mulligan reste une carte rectangulaire normale');
  assert.doesNotMatch(blocApres(duel, "'rpg-hand__card rpg-hand__card--img'"), /classeBouclier/,
    'la main reste une carte rectangulaire normale');
  const ligneApercu = duel.split('\n').find((l) => l.includes('className={`rpg-hover-card-preview__face'));
  assert.ok(ligneApercu, 'la face d’aperçu existe');
  assert.doesNotMatch(ligneApercu, /classeBouclier/, 'l’aperçu reste une carte rectangulaire normale');
  assert.doesNotMatch(lire('RpgMobaBoard.jsx'), /classeBouclier/, 'la main du MOBA reste normale');
  assert.match(lire('RpgDeckAtelier.jsx'), /classeBouclier\(carte\)/, 'vignette de l’atelier');
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

test('la carte EST l’écusson : cadre acier affiné, aucune ailette, pointe non coupée', () => {
  const svgDe = (nom) => {
    const ligne = css.split('\n').find((l) => l.includes(`${nom}:`));
    assert.ok(ligne, `${nom} existe`);
    const uri = ligne.match(/url\("([^"]+)"\)/)[1];
    return decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  };
  const aplat = svgDe('--rpg-ecusson-aplat');
  const masque = svgDe('--rpg-ecusson-masque');
  const cadreMasque = svgDe('--rpg-ecusson-cadre-masque');
  const acier = svgDe('--rpg-ecusson-acier');
  const effetMasque = svgDe('--rpg-ecusson-effet-masque');
  const effetLiseret = svgDe('--rpg-ecusson-effet-liseret');
  for (const [nom, svg] of [
    ['aplat', aplat], ['masque', masque], ['cadre', cadreMasque],
    ['acier', acier], ['effets', effetMasque], ['filet', effetLiseret],
  ]) {
    assert.match(svg, /^<svg /, `${nom} est un SVG`);
    assert.match(svg, /viewBox='-5 -5 110 137'/, `marges de respiration dans ${nom}`);
    assert.match(svg, /50 124/, `pointe en V dans ${nom}`);
    // Le viewBox doit contenir TOUT le trait autour de la pointe (8 / 2 = 4).
    const [minX, minY, largeur, hauteur] = svg.match(/viewBox='([^']+)'/)[1].split(' ').map(Number);
    const demiTrait = 4;
    assert.ok(minY + hauteur > 124 + demiTrait, `${nom} : marge sous la pointe (bas ${minY + hauteur} > 128)`);
    assert.ok(minY < 1 - demiTrait, `${nom} : marge au-dessus du dôme`);
    assert.ok(minX < 1 - demiTrait, `${nom} : marge à gauche`);
    assert.ok(minX + largeur > 99 + demiTrait, `${nom} : marge à droite`);
  }
  assert.match(aplat, /fill='rgb\(33,29,59\)'/, 'aplat marine plein');
  assert.doesNotMatch(aplat, /stroke/, 'l’aplat n’a pas de trait');
  assert.match(masque, /fill='rgb\(255,255,255\)'/, 'masque blanc de l’illustration');
  assert.doesNotMatch(masque, /stroke/, 'le masque de l’illustration n’a pas de trait');
  // Le masque des effets = le plein de l'écu + un anneau : leur halo suit la
  // silhouette au lieu de dessiner un rectangle autour de la carte.
  assert.match(effetMasque, /<path d='[^']+' fill='rgb\(255,255,255\)'\/>/, 'plein de l’écu pour les effets');
  assert.match(effetMasque, /stroke='rgb\(255,255,255\)' stroke-width='8'/, 'anneau de halo pour les effets');
  assert.equal((effetMasque.match(/<path /g) ?? []).length, 2, 'exactement deux tracés dans le masque des effets');
  assert.match(effetLiseret, /stroke-width='3\.2'/, 'filet fin du liseré des effets');
  assert.doesNotMatch(effetLiseret, /fill='rgb/, 'le liseré n’est qu’un trait');

  // Cadre AFFINÉ : dégradé, traits fins, reflet sur le dôme. Plus d'ailettes.
  assert.match(acier, /<linearGradient id='a'/, 'dégradé acier');
  assert.match(acier, /stroke-width='6\.4'/, 'contour sombre affiné');
  assert.match(acier, /stroke-width='4\.8'/, 'acier affiné (contre 7 avant)');
  assert.match(acier, /stroke-width='1\.3'/, 'gorge sombre affinée');
  assert.match(acier, /stroke-width='0\.55'/, 'filet de lumière');
  assert.match(acier, /stroke-opacity='\.55'/, 'reflet sur le dôme');
  assert.doesNotMatch(acier, /stroke-width='(?:7|10)'/, 'plus de trait épais');
  assert.match(cadreMasque, /stroke-width='8'/, 'masque de 8 (au lieu de 10)');
  for (const [nom, svg] of [['cadre', cadreMasque], ['acier', acier]]) {
    assert.doesNotMatch(svg, /M-9 52|M109 52|M-10 51|M110 51/, `${nom} : aucune ailette latérale`);
  }
  assert.doesNotMatch(css, /M-9%2052|M109%2052|M-10%2051|M110%2051/, 'aucun tracé d’ailette encodé');

  assert.match(css, /--rpg-ecusson-fond:\s*#211d3b;/, 'marine de la référence');
  assert.match(css, /background-image:\s*var\(--rpg-ecusson-aplat\) !important;/, 'l’aplat remplace le fond des cadres');
  assert.match(css, /mask-image:\s*var\(--rpg-ecusson-masque\);/);
  assert.match(css, /-webkit-mask-image:\s*var\(--rpg-ecusson-masque\);/);
  assert.match(css, /mask-size:\s*100% 100%;/);

  // Le cadre : acier + liseré de la couleur de l'élément, sur `::before`.
  assert.match(css, /background-color:\s*var\(--rpg-frame-color, #f1f3f5\);/);
  assert.match(css, /background-image:\s*var\(--rpg-ecusson-acier\);/);
  assert.match(css, /mask-image:\s*var\(--rpg-ecusson-cadre-masque\);/);
  assert.match(css, /\.rpg-carte-bouclier::before\s*\{[^}]*z-index:\s*2;/s, 'cadre au-dessus du bandeau de titre');
  assert.match(css, /pointer-events:\s*none;/);
  assert.doesNotMatch(css, /--rpg-ecusson-liseret/, 'l’ancien liseré seul est remplacé par le cadre');

  // Ombre portée : `drop-shadow` lit l'alpha de l'écusson. Aucune ombre de
  // boîte rectangulaire, aucun outline visible.
  assert.match(css, /filter:\s*drop-shadow\(0 3px 6px rgba\(0, 0, 0, \.42\)\);/);
  for (const [propriete, neutre] of [
    ['box-shadow', /box-shadow\s*:\s*none\s*!important;/g],
    ['outline', /outline\s*:\s*none\s*!important;/g],
    ['border-radius', /border-radius\s*:\s*0\s*!important;/g],
  ]) {
    const total = (css.match(new RegExp(`${propriete}\\s*:`, 'g')) ?? []).length;
    const sansRectangle = (css.match(neutre) ?? []).length;
    assert.equal(total, sansRectangle, `aucune déclaration ${propriete} ne dessine un rectangle`);
    assert.ok(total > 0, `${propriete} est bien neutralisée`);
  }
  for (const regle of [
    /background:\s*transparent !important;/,
    /border:\s*0 !important;/,
    /overflow:\s*visible !important;/,
  ]) assert.match(css, regle, `règle ${regle}`);

  // L'ancien tracé or en surimpression a disparu : la couleur vient de
  // `--rpg-frame-color`, et aucun filet n'est codé en dur.
  assert.doesNotMatch(css, /--rpg-ecusson-trait/, 'l’ancien tracé contour est retiré');
  assert.doesNotMatch(css, /224,205,138|240, 205, 138|#e0cd8a/, 'plus de filet doré');
  assert.doesNotMatch(css, /clip-path\s*:/, 'mask-image et non clip-path : les repères débordent');
});

test('tous les effets pleine face prennent la forme de l’écu, avec un liseré d’écu', () => {
  // Les six calques qui peignaient un rectangle bordé sur la table. Le sang et
  // le givre étaient déjà dans la liste des fonds masqués.
  const regleEffets = css.match(/\.rpg-card\.rpg-carte-bouclier > :is\(\s*\.rpg-bouclier-egide([\s\S]*?)\) \{[^}]*\}/);
  assert.ok(regleEffets, 'la règle commune aux effets existe');
  for (const calque of [
    '.rpg-bouclier-egide', '.rpg-bouclier-impact', '.rpg-furie-vignette',
    '.rpg-card__envol', '.rpg-card__brume', '.rpg-card__resonance',
  ]) {
    assert.ok(regleEffets[0].includes(calque), `${calque} est découpé en écu`);
  }
  const corps = regleEffets[0];
  assert.match(corps, /mask-image:\s*var\(--rpg-ecusson-effet-masque\);/, 'masque écu + halo');
  assert.match(corps, /-webkit-mask-image:\s*var\(--rpg-ecusson-effet-masque\);/);
  assert.match(corps, /mask-size:\s*100% 100%;/);
  // Plus aucun contour / rayon / ombre de boîte rectangulaire sur ces calques.
  for (const neutre of [
    /border:\s*0 !important;/, /border-radius:\s*0 !important;/,
    /box-shadow:\s*none !important;/, /outline:\s*none !important;/,
  ]) assert.match(corps, neutre, `rectangle neutralisé : ${neutre}`);

  // L'égide, l'impact et le sonar retrouvent un liseré coloré en forme d'écu.
  const liseres = css.match(/\.rpg-card\.rpg-carte-bouclier > :is\(\.rpg-bouclier-egide, \.rpg-bouclier-impact, \.rpg-card__resonance\)::after \{[^}]*\}/);
  assert.ok(liseres, 'le pseudo-élément du liseré existe');
  assert.match(liseres[0], /background-color:\s*rgba\(var\(--rpg-bouclier-teinte/,
    'teinte violette / dorée de l’égide');
  assert.match(liseres[0], /mask-image:\s*var\(--rpg-ecusson-effet-liseret\);/,
    'le liseré suit exactement le tracé de l’écu, en filet fin');
  assert.match(liseres[0], /filter:\s*drop-shadow\(/, 'halo qui épouse la forme');
  assert.match(liseres[0], /pointer-events:\s*none;/);
  for (const variante of [
    /\.rpg-bouclier-impact::after \{[^}]*rgba\(var\(--rpg-bouclier-teinte, 186, 132, 255\), \.88\)/,
    /\.rpg-bouclier-egide--colore::after \{[^}]*--bouclier-couleur-a/,
    /\.rpg-card__resonance::after \{[^}]*96, 178, 255/,
    /\.rpg-card__resonance--aura::after \{[^}]*250, 205, 90/,
    /\.rpg-card__resonance--malediction::after \{[^}]*178, 146, 245/,
    /\.rpg-card__resonance--garde::after \{[^}]*255, 97, 79/,
  ]) assert.match(css, variante, `variante de liseré : ${variante}`);

  // Le sonar rouge de Défenseur et les autres calques d'origine restent
  // intacts dans `rpg-battle.css` : seul l'écu les redessine.
  assert.match(battleCss, /\.rpg-card__resonance--garde/, 'sonar rouge toujours présent');
  assert.match(battleCss, /\.rpg-bouclier-egide \{/, 'l’égide d’origine reste sur les cartes normales');
  assert.match(battleCss, /\.rpg-furie-vignette \{/, 'la Furie reste sur les cartes normales');
  assert.match(battleCss, /\.rpg-card__brume \{/, 'la brume reste sur les cartes normales');
  assert.doesNotMatch(css, /clip-path\s*:/, 'toujours mask-image, jamais clip-path global');
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

test('main, mulligan, main MOBA et aperçus restent des cartes rectangulaires', () => {
  // Aucun de ces composants ne pose la classe : ce sont les gabarits normaux.
  assert.doesNotMatch(blocApres(duel, "'rpg-mulligan__card'"), /classeBouclier/);
  assert.doesNotMatch(blocApres(duel, "'rpg-hand__card rpg-hand__card--img'"), /classeBouclier/);
  assert.doesNotMatch(lire('RpgMobaBoard.jsx'), /classeBouclier/);
  const ligneApercu = duel.split('\n').find((l) => l.includes('className={`rpg-hover-card-preview__face'));
  assert.ok(ligneApercu);
  assert.doesNotMatch(ligneApercu, /classeBouclier/, 'pas d’écusson sur l’aperçu');
  // La main garde son cadre rectangulaire et ses rayons habituels.
  assert.match(battleCss, /\.rpg-hand__card\s*\{[^}]*border-radius:\s*8px;/s, 'la main garde ses coins de carte');
  assert.match(battleCss, /\.rpg-hand__stats/, 'le gabarit des stats de la main est intact');
  // Le pied de l'aperçu garde sa grille deux colonnes : ATQ à gauche, DÉF à droite.
  assert.match(battleCss, /\.rpg-hover-card-preview__face \.rpg-card__foot,[\s\S]{0,400}?grid-template-columns:\s*repeat\(2,/, 'ATQ à gauche, DÉF à droite');
  assert.match(duel, /rpg-hover-card-preview__face[\s\S]{0,1200}?rpg-card__foot/, 'les statistiques restent sur la face d’aperçu');
});
