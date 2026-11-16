/**
 * L'écusson des créatures Défenseur — tests/rpg-carte-bouclier.test.js
 * ----------------------------------------------------------------------
 * Vérifie, sans navigateur : qui reçoit l'écusson, que sa silhouette reste
 * intacte sans cadre métallique ni liseré permanent, que les effets pleine
 * face (égide de Bouclier, impact, Furie, Envol, brume, ondes, sang, givre)
 * prennent eux aussi la forme de l'écu, que les Défenseur POSÉS sont 10 % plus
 * grands avec des icônes inchangées et des emplacements plus espacés, que sur
 * le plateau leur pied ATQ/DÉF remonte de quelques pixels SANS agrandissement,
 * que les repères (type, pierres, sonar) ne sont pas touchés, et que MAIN,
 * MULLIGAN, MAIN MOBA et APERÇUS restent des cartes rectangulaires normales
 * avec ATQ à gauche / DÉF à droite.
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

test('la carte garde sa forme d’écusson sans cadre ni liseré permanent', () => {
  const svgDe = (nom) => {
    const ligne = css.split('\n').find((l) => l.includes(`${nom}:`));
    assert.ok(ligne, `${nom} existe`);
    const uri = ligne.match(/url\("([^"]+)"\)/)[1];
    return decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  };
  const aplat = svgDe('--rpg-ecusson-aplat');
  const masque = svgDe('--rpg-ecusson-masque');
  const effetMasque = svgDe('--rpg-ecusson-effet-masque');
  const effetLiseret = svgDe('--rpg-ecusson-effet-liseret');
  for (const [nom, svg] of [
    ['aplat', aplat], ['masque', masque], ['effets', effetMasque], ['filet', effetLiseret],
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

  assert.doesNotMatch(css, /--rpg-ecusson-acier|--rpg-ecusson-cadre-masque/, 'les anciens tracés du cadre sont retirés');

  assert.match(css, /--rpg-ecusson-fond:\s*#211d3b;/, 'marine de la référence');
  assert.match(css, /background-image:\s*var\(--rpg-ecusson-aplat\) !important;/, 'l’aplat remplace le fond des cadres');
  assert.match(css, /mask-image:\s*var\(--rpg-ecusson-masque\);/);
  assert.match(css, /-webkit-mask-image:\s*var\(--rpg-ecusson-masque\);/);
  assert.match(css, /mask-size:\s*100% 100%;/);

  // Aucun cadre n'est recréé par un gabarit plus spécifique.
  assert.match(css, /\.rpg-carte-bouclier::before\s*\{[^}]*content:\s*none !important;[^}]*display:\s*none !important;/s);
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier > \.rpg-card__resonance--garde::after\s*\{[^}]*content:\s*none;[^}]*display:\s*none;/s,
    'le sonar Défenseur ne redessine pas de bord permanent');

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

  // Aucun ancien tracé or n'est conservé sur la silhouette.
  assert.doesNotMatch(css, /--rpg-ecusson-trait/, 'l’ancien tracé contour est retiré');
  assert.doesNotMatch(css, /224,205,138|240, 205, 138|#e0cd8a/, 'plus de filet doré');
  assert.doesNotMatch(css, /clip-path\s*:/, 'mask-image et non clip-path : les repères débordent');
});

test('les effets pleine face prennent la forme de l’écu sans contour permanent de Défenseur', () => {
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

  // L'égide, l'impact et les autres sonars gardent leur liseré d'effet.
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
  ]) assert.match(css, variante, `variante de liseré : ${variante}`);

  // Le sonar rouge de Défenseur et les autres calques d'origine restent
  // intacts dans `rpg-battle.css` : seul l'écu les redessine.
  assert.match(battleCss, /\.rpg-card__resonance--garde/, 'sonar rouge toujours présent');
  assert.match(battleCss, /\.rpg-bouclier-egide \{/, 'l’égide d’origine reste sur les cartes normales');
  assert.match(battleCss, /\.rpg-furie-vignette \{/, 'la Furie reste sur les cartes normales');
  assert.match(battleCss, /\.rpg-card__brume \{/, 'la brume reste sur les cartes normales');
  assert.doesNotMatch(css, /clip-path\s*:/, 'toujours mask-image, jamais clip-path global');
});

test('ATQ/DÉF et les autres repères gardent exactement leur taille et leur gabarit', () => {
  // La feuille de l'écusson ne contient AUCUNE règle de taille sur les repères :
  // c'est `rpg-battle.css` / `rpg-mobile.css` qui font foi. La seule exception
  // est le `translate` de 6 px du pied, testé plus bas : il ne touche à aucun
  // sélecteur de pastille et ne change aucune mesure.
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
  assert.match(battleCss, /\.rpg-card\.has-garde/, 'sonar rouge toujours présent');
});

test('sur le plateau, ATQ et DÉF remontent de quelques pixels, sans agrandissement', () => {
  // « juste un décalage de quelques pixels vers le haut, pas d'agrandissement » :
  // UNE seule règle, UNE seule propriété, sur le pied des seules cartes POSÉES.
  const regles = [...css.matchAll(/\.rpg-card\.rpg-carte-bouclier > \.rpg-card__foot \{([^}]*)\}/g)];
  assert.equal(regles.length, 1, 'une unique règle de remontée du pied');
  const corps = regles[0][1];
  assert.match(corps, /translate:\s*0 -6px;/, 'décalage de 6 px vers le haut');
  assert.equal(corps.trim(), 'translate: 0 -6px;', 'rien d’autre que ce décalage');

  // Aucun agrandissement, aucun déplacement latéral, aucun changement de
  // taille, de police, de marge ou de point d'ancrage.
  for (const interdit of [
    /\bwidth\s*:/, /\bheight\s*:/, /\bmax-width\s*:/, /\bmin-width\s*:/,
    /\bbottom\s*:/, /\btop\s*:/, /\bleft\s*:/, /\bright\s*:/, /\bmargin\s*:/,
    /\bfont-size\s*:/, /\bpadding\s*:/, /\bgap\s*:/,
    /\bscale\s*:/, /\bzoom\s*:/, /\btransform\s*:/, /!important/,
    /--rpg-defenseur-echelle/,
  ]) assert.doesNotMatch(corps, interdit, `ni ${interdit} dans la remontée`);

  // Le `scale` visuel de la carte et le `scale` inverse des enfants restent
  // exactement tels quels : la demande ne porte que sur la hauteur du pied.
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier \{[^}]*--rpg-defenseur-echelle: 1\.1;[^}]*scale: var\(--rpg-defenseur-echelle\);/s,
    'l’échelle 1.1 de la carte n’est pas modifiée');
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier > \* \{\s*scale: calc\(1 \/ var\(--rpg-defenseur-echelle, 1\)\);/,
    'les icônes restent ramenées à l’échelle 1');

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
    ['rpg-battle.css', battleCss], ['rpg-mobile.css', mobileCss], ['rpg-moba.css', lire('rpg-moba.css')],
  ]) assert.doesNotMatch(source, /rpg-card__foot[^{]*\{[^}]*translate\s*:/s,
    `${nom} ne remonte pas le pied des autres cartes`);
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

test('les Défenseur posés sont 10 % plus grands, icônes inchangées, emplacements espacés', () => {
  // Agrandissement VISUEL : la boîte de mise en page ne change pas, donc les
  // mesures en cqw et les polices en px des repères restent identiques sans
  // qu'on ait à compenser quoi que ce soit dans les autres feuilles.
  const regle = css.match(/\.rpg-card\.rpg-carte-bouclier \{([\s\S]*?)\n\}/);
  assert.ok(regle, 'la règle de taille existe');
  assert.match(regle[0], /--rpg-defenseur-echelle: 1\.1;/, 'facteur 1.1');
  assert.match(regle[0], /scale:\s*var\(--rpg-defenseur-echelle\);/, 'scale sur la carte de table');
  assert.doesNotMatch(css, /transform:\s*scale|zoom\s*:/, 'ni transform: scale ni zoom');
  // Seule la `.rpg-card` de la table est visée : vignettes et aperçus exclus.
  assert.doesNotMatch(css, /\.rpg-card-catalogue__art\.rpg-carte-bouclier \{[^}]*scale:/s);
  assert.doesNotMatch(css, /rpg-hover-card-preview__face[^\n]*scale:/);

  // Les ICÔNES reviennent à l'échelle 1 ; les calques pleine face, eux, suivent
  // le cadre pour que leur masque reste aligné avec l'écu.
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier > \* \{\s*scale: calc\(1 \/ var\(--rpg-defenseur-echelle, 1\)\);/,
    'tous les enfants directs ramenés à 1');
  const exceptions = css.match(/\.rpg-card\.rpg-carte-bouclier > :is\(([\s\S]*?)\) \{\s*scale: 1;/);
  assert.ok(exceptions, 'la liste des calques pleine face existe');
  for (const calque of [
    '.rpg-card__img', '.rpg-card__blood', '.rpg-card__frost', '.rpg-card__resonance',
    '.rpg-bouclier-egide', '.rpg-bouclier-impact', '.rpg-furie-vignette',
    '.rpg-card__envol', '.rpg-card__brume',
    '.rpg-card__title', '.rpg-card__type', '.rpg-card__text',
  ]) assert.ok(exceptions[1].includes(calque), `${calque} suit le cadre`);
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier :is\(\.rpg-mana-cost, \.rpg-card-element-badge\) \{\s*scale: calc\(1 \/ var\(--rpg-defenseur-echelle, 1\)\);/,
    'coût et pastille de couleur ramenés à 1');

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

test('la sélection temporaire des Défenseurs dessine un filet en écu, sans cadre au repos', async () => {
  const selection = '.rpg-card.rpg-carte-bouclier:is(.is-active, .is-selected, .is-blocker-selected, .is-blocker-assigned, .is-blocker-target-hover, .is-sacrifice, .is-ascension-chosen)';
  const regle = css.match(/\.rpg-card\.rpg-carte-bouclier:is\(\.is-active,[^}]+\)::before\s*\{[^}]*\}/);
  assert.ok(regle, 'seuls les états sélectionnés ajoutent un contour');
  assert.match(regle[0], /content:\s*''\s*!important;/);
  assert.match(regle[0], /display:\s*block\s*!important;/);
  assert.match(regle[0], /background:\s*#ffdf55;/);
  assert.match(regle[0], /mask-image:\s*var\(--rpg-ecusson-effet-liseret\);/);
  assert.match(regle[0], /-webkit-mask-image:\s*var\(--rpg-ecusson-effet-liseret\);/);
  assert.match(regle[0], /pointer-events:\s*none;/);
  assert.match(css, /\.rpg-battle--touch \.card-row \.rpg-card\.rpg-carte-bouclier\.is-declared-attacker::before\s*\{[^}]*background:\s*#ff534c;/);
  assert.match(css, /\.rpg-battle--touch \.card-row \.rpg-card\.rpg-carte-bouclier\.is-selected::before\s*\{[^}]*background:\s*#ffe082;/);
  assert.match(css, /\.moba \.rpg-card\.rpg-carte-bouclier:is\(\.is-blocking, \.is-target\)::before\s*\{[^}]*background:\s*#9edcf3;/);
  assert.match(css, /\.rpg-carte-bouclier::before\s*\{[^}]*content:\s*none !important;[^}]*display:\s*none !important;/s,
    'aucun cadre ne revient au repos');

  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const e = { id: 'g', carteId: 'gardien-de-la-porte-ardente', name: 'Gardien', atk: 2, def: 4, pv: 4, pvMax: 4, ready: true };
    const rendre = (extra, moba = null, entite = e) => new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite, cote: 'joueur', moba, ...extra }))).window.document.querySelector('.rpg-card');
    for (const moba of [null, { className: 'moba__slot' }]) {
      assert.equal(rendre({}, moba).matches(selection), false, 'aucun contour au repos');
      for (const props of [{ selected: true }, { active: true }, { selectedBlocker: true }, { blocking: true }, { ascensionSelection: { numero: 1 } }]) {
        assert.equal(rendre(props, moba).matches(selection), true, JSON.stringify(props));
      }
      const normal = { ...e, carteId: 'chien-du-guet' };
      assert.equal(rendre({ selected: true }, moba, normal).matches(selection), false, 'une carte rectangulaire conserve sa sélection habituelle');
    }
    assert.equal(rendre({}, { className: 'moba__slot is-sacrifice' }).matches(selection), true, 'sacrifice choisi en MOBA');
  } finally { await vite.close(); }
});
