/** Les Défenseurs restent rectangulaires sans perdre leurs repères. */
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

test('seules les créatures et les héros Défenseur reçoivent le repère', () => {
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
    assert.equal(classeBouclier(carte, { defenseur: true }), '', `${id} ne porte pas ce repère`);
  }
  assert.equal(classeBouclier(null, { defenseur: true }), '', 'sans définition de carte, pas de repère');

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

test('TableCard distingue les Défenseurs sans changer leurs règles', async () => {
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
    // Le sonar orange et la pierre Défenseur restent en place : le repère s’ajoute,
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

test('les Défenseurs posés restent rectangulaires sans cadre décoratif', () => {
  assert.doesNotMatch(css, /--rpg-ecusson|mask-image|clip-path/);
  assert.match(css, /box-shadow: 0 10px 12px/);
  assert.match(css, /data-effet='defenseur'][^{}]*\{[^}]*animation: rpg-defenseur-pierre/s);
  const cadre = lire('rpg-cadre-carte.css');
  assert.doesNotMatch(cadre, /--rpg-ecusson|:not\(\.rpg-carte-bouclier\)/);
});

test('ATQ/DÉF et les autres repères gardent exactement leur taille et leur gabarit', () => {
  // La feuille Défenseur ne contient AUCUNE règle de taille sur les repères :
  // c'est `rpg-battle.css` / `rpg-mobile.css` qui font foi. La seule exception
  // est le `translate` du pied, testé plus bas : il ne touche à aucun sélecteur
  // de pastille et ne change aucune mesure.
  for (const selectors of [
    'rpg-card__stat--atk', 'rpg-card__pt', 'rpg-hand__stats',
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
  assert.match(battleCss, /\.rpg-card\.has-garde/, 'sonar orange toujours présent');
});

test('sur le plateau, ATQ et DÉF remontent vers le milieu, sans agrandissement', () => {
  // « remonte plus vers le milieu de la carte » : 20cqw, soit 20 % de la
  // LARGEUR de la carte (≈ 16 % de sa hauteur en 4:5). UNE seule règle, UNE
  // seule propriété, sur le pied des seules cartes POSÉES. La valeur est
  // proportionnelle : elle suit toutes les tailles de carte sans media query.
  const regles = [...css.matchAll(/\.rpg-card\.rpg-carte-bouclier > \.rpg-card__foot \{([^}]*)\}/g)];
  assert.equal(regles.length, 1, 'une unique règle de remontée du pied');
  const corps = regles[0][1];
  assert.match(corps, /translate:\s*0 -20cqw;/, 'décalage de 20cqw vers le haut');
  assert.equal(corps.trim(), 'translate: 0 -20cqw;', 'rien d’autre que ce décalage');
  assert.match(battleCss, /\.rpg-card--img,\s*[\s\S]{0,200}?container-type: inline-size;/,
    'la carte est bien son propre conteneur : cqw se résout sur sa largeur');
  assert.doesNotMatch(corps, /\d+px/, 'pas de valeur fixe en px : la mesure suit la carte');

  // Aucun agrandissement, aucun déplacement latéral, aucun changement de
  // taille, de police, de marge ou de point d'ancrage.
  for (const interdit of [
    /\bwidth\s*:/, /\bheight\s*:/, /\bmax-width\s*:/, /\bmin-width\s*:/,
    /\bbottom\s*:/, /\btop\s*:/, /\bleft\s*:/, /\bright\s*:/, /\bmargin\s*:/,
    /\bfont-size\s*:/, /\bpadding\s*:/, /\bgap\s*:/,
    /\bscale\s*:/, /\bzoom\s*:/, /\btransform\s*:/, /!important/,
    /--rpg-defenseur-echelle/,
  ]) assert.doesNotMatch(corps, interdit, `ni ${interdit} dans la remontée`);

  // La carte Défenseur reprend la même taille que les autres cartes.
  assert.doesNotMatch(css, /--rpg-defenseur-echelle|scale:\s*calc\(1 \/ var\(--rpg-defenseur-echelle/);

  // Ciblage étroit : pas de main, mulligan, aperçu, vignette ni variante mobile.
  for (const exclu of [
    'rpg-hand__card', 'rpg-mulligan__card', 'rpg-hover-card-preview__face',
    'rpg-card-catalogue__art', 'rpg-atelier__carte-art', 'rpg-card-guide__example',
    'rpg-souk__carte', '.card-row', '.moba__',
  ]) assert.doesNotMatch(regles[0][0], new RegExp(exclu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${exclu} n’est pas visé`);
  assert.doesNotMatch(css, /@media[^{]*\{[^}]*rpg-card__foot/, 'aucune variante par écran');

  // Les gabarits d'origine des autres feuilles restent intacts : le pied d'une
  // carte normale (et celui des aperçus / mulligan) ne bouge pas d'un pixel.
  assert.match(battleCss, /\.rpg-card--img \.rpg-card__foot \{[\s\S]{0,300}?bottom: 4%;/,
    'bottom: 4 % des cartes normales inchangé');
  assert.match(mobileCss, /bottom: var\(--rpg-field-foot, 3%\)/, 'bottom du tactile inchangé');
  for (const [nom, source] of [
    ['rpg-battle.css', battleCss.replace(/\.rpg-hover-card-preview \.rpg-hover-card-preview__face\.rpg-carte-bouclier > \.rpg-card__foot \{[^}]*\}/, '')], ['rpg-mobile.css', mobileCss], ['rpg-moba.css', lire('rpg-moba.css')],
  ]) assert.doesNotMatch(source, /rpg-card__foot[^{]*\{[^}]*translate\s*:/s,
    `${nom} ne remonte pas le pied des autres cartes`);
});

test('aperçu : attaque au-dessus de défense comme sur la table', () => {
  assert.match(battleCss, /\.rpg-hover-card-preview \.rpg-hover-card-preview__face > \.rpg-card__foot \{[^}]*left: 5%; right: auto; bottom: 4%;[^}]*grid-template-columns: max-content; grid-template-rows: auto auto/s);
  assert.match(battleCss, /\.rpg-hover-card-preview \.rpg-hover-card-preview__face\.rpg-carte-bouclier > \.rpg-card__foot \{\s*translate: 0 -20cqw/);
  assert.match(duel, /entite\?\.atk \?\?/);
  assert.match(duel, /entite\?\.pv \?\?/);
});

test('les Défenseurs posés ont la même taille que les autres créatures', () => {
  assert.doesNotMatch(css, /--rpg-defenseur-echelle|transform:\s*scale|zoom\s*:/);
  assert.doesNotMatch(css, /\.rpg-card\.rpg-carte-bouclier(?: > \*)? \{[^}]*scale:/s);

  // AUCUNE largeur de carte ni mesure en cqw n'a été retouchée : c'est la
  // garantie que les icônes gardent exactement leur taille en pixels.
  assert.match(battleCss, /\.rpg-card, \.rpg-card-prison \{ width: clamp\(138px, 11\.5vw, 168px\); \}/,
    'largeur de base inchangée');
  assert.match(battleCss, /--rpg-plaque-taille: clamp\(24px, 26cqw, 52px\);/,
    'mesure commune des pierres inchangée');
  assert.match(mobileCss, /--rpg-card-marker-size: 27cqw;/, 'marqueur mobile inchangé');
  assert.match(battleCss, /font: 900 9px\/1\.25 Georgia, serif;/, 'police px des repères intacte');
  assert.equal((battleCss.match(/--rpg-defenseur-echelle/g) ?? []).length, 0,
    'aucun facteur injecté dans les gabarits de cartes');
  assert.equal((mobileCss.match(/--rpg-defenseur-echelle/g) ?? []).length, 0,
    'aucun facteur injecté dans la feuille mobile');

  // Un peu plus d'espacement entre les emplacements (la grille des cinq cases
  // hérite de `gap` : `rpg-creature-slots { gap: inherit; }`).
  const rangee = battleCss.match(/\.card-row \{([\s\S]*?)\n\}/);
  assert.ok(rangee, 'la règle de la rangée existe');
  assert.match(rangee[0], /gap: 18px;/, 'gouttière de base 12 → 18 px');
  assert.match(battleCss, /\.card-row \{ gap: 12px; \}/, '900 px : 8 → 12 px');
  assert.match(battleCss, /\.card-row \{ gap: 6px; \}/, '540 px : 4 → 6 px');
  assert.match(battleCss, /height: 20%; gap: 5px;/, 'petit écran : 3 → 5 px');
  assert.match(battleCss, /gap: clamp\(10px, 1\.4vw, 19px\);/, 'gouttière intermédiaire élargie');
  assert.match(mobileCss, /--rpg-field-gap: max\(8px, calc\(var\(--duel-card\) \* \.22\)\);/,
    'gouttière au doigt : 16 % → 22 %');
  assert.match(lire('rpg-mana-essai.css'), /gap: inherit;/, 'les cinq emplacements héritent de la gouttière');
});
