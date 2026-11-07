/**
 * Les pierres d'effets — `tests/rpg-effets-pierres.test.js`
 *
 * La grammaire validée par la revue : une forme par famille d'action, une
 * pierre par registre, le pictogramme blanc par-dessus. Ce fichier vérifie
 * qu'aucun effet ne se retrouve sans pierre, que les silhouettes restent des
 * polygones clos et symétriques (la moitié haute et la moitié basse se
 * découpent sur l'horizontale du milieu), et que les feuilles posent la pierre
 * — et non plus la pastille ronde — à la place du badge.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EFFETS_SPRITE,
  EFFET_ICONE,
  MOTS_CLES_PASTILLES,
  couleurProtection,
} from '../src/games/effetIcons.js';
import {
  PLAQUE_COTE,
  PLAQUE_FAMILLES,
  PLAQUE_FAMILLE_EFFET,
  PLAQUE_FORMES,
  PLAQUE_PIERRES,
  EPAISSEUR_SYMBOLE,
  moitie,
  pierreEffet,
  plaqueEffet,
  plaqueSvg,
  pointsSvg,
  reduire,
} from '../src/games/effetPlaques.js';

const css = readFileSync(new URL('../src/games/effet-icons.css', import.meta.url), 'utf8');
const cssMobile = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
const jsx = readFileSync(new URL('../src/games/effetIcons.jsx', import.meta.url), 'utf8');

test('chaque effet du Sablier a sa pierre, aucune clé n’est orpheline', () => {
  const cles = Object.keys(EFFET_ICONE);
  assert.ok(cles.length >= 60, `le vocabulaire d’effets est couvert (${cles.length} clés)`);
  for (const cle of cles) {
    assert.ok(PLAQUE_FAMILLE_EFFET[cle], `${cle} appartient à une famille`);
    const plaque = plaqueEffet(cle);
    assert.ok(PLAQUE_FAMILLES[plaque.famille], `${cle} : famille connue`);
    assert.equal(plaque.symbole, EFFET_ICONE[cle], `${cle} : la pierre porte son symbole`);
    assert.ok(EFFETS_SPRITE.includes(`id="${plaque.symbole}"`), `${cle} : le symbole existe dans le sprite`);
  }
  // Les mots-clés imprimés sur les faces ont tous une pierre choisie à la main :
  // aucun ne doit dépendre du repli par symbole.
  for (const cle of MOTS_CLES_PASTILLES) {
    assert.ok(PLAQUE_FAMILLE_EFFET[cle], `${cle} a une famille explicite`);
  }
});

test('un symbole inconnu retombe sur la pierre de son symbole, jamais sur du vide', () => {
  assert.equal(plaqueEffet('i-bouclier').famille, 'garde', 'un id de symbole se résout aussi');
  assert.equal(plaqueEffet('cle-inconnue').symbole, 'i-degats', 'une clé inconnue montre les dégâts');
  assert.equal(plaqueEffet('cle-inconnue').famille, 'assaut', 'et prend la pierre de ce symbole');
  assert.equal(plaqueEffet('i-symbole-inexistant').famille, 'garde',
    'un symbole inconnu tombe sur la garde — l’or, l’encre la plus neutre');
});

test('les silhouettes sont closes, centrées et symétriques', () => {
  for (const [nom, points] of Object.entries(PLAQUE_FORMES)) {
    assert.ok([4, 6, 8].includes(points.length), `${nom} est un polygone de 4, 6 ou 8 sommets`);
    for (const [x, y] of points) {
      assert.ok(x > 0 && x < PLAQUE_COTE && y > 0 && y < PLAQUE_COTE, `${nom} : sommet dans le carré`);
      assert.ok(Math.abs(x - PLAQUE_COTE / 2) <= PLAQUE_COTE / 2 && Math.abs(y - PLAQUE_COTE / 2) <= PLAQUE_COTE / 2,
        `${nom} : sommet dans le carré`);
    }
    // Symétrie de la silhouette : chaque sommet a son miroir horizontal.
    for (const [x, y] of points) {
      assert.ok(points.some(([mx, my]) => Math.abs(mx + x - PLAQUE_COTE) < 0.01 && Math.abs(my - y) < 0.01),
        `${nom} : (${x}, ${y}) a son reflet`);
    }
    const haut = moitie(points, { cote: 'haut' });
    const bas = moitie(points, { cote: 'bas' });
    assert.ok(haut.length >= 3 && bas.length >= 3, `${nom} : les deux moitiés sont des polygones`);
    for (const [, y] of [...haut, ...bas]) {
      assert.ok(y >= 0 && y <= PLAQUE_COTE, `${nom} : la coupe reste dans le carré`);
    }
    assert.ok(haut.every(([, y]) => y <= PLAQUE_COTE / 2 + 0.01), `${nom} : la moitié haute est au-dessus du milieu`);
    assert.ok(bas.every(([, y]) => y >= PLAQUE_COTE / 2 - 0.01), `${nom} : la moitié basse est en dessous`);
  }
});

test('le pictogramme garde la même épaisseur apparente sur toutes les formes', () => {
  for (const [forme] of Object.entries(PLAQUE_FORMES)) {
    const epaisseur = EPAISSEUR_SYMBOLE[forme];
    assert.ok(epaisseur > 1.5 && epaisseur < 5, `${forme} : trait plausible`);
    const symbole = Number(pierreEffet(plaqueCleDeForme(forme)).match(/width="([\d.]+)" height="[\d.]+"/)?.[1]);
    assert.ok(symbole > 0, `${forme} : le symbole a une taille`);
    // trait effectif = épaisseur × taille / 24 : identique d'une forme à l'autre.
    assert.ok(Math.abs((epaisseur * symbole) / 24 - 2) < 0.02, `${forme} : trait effectif de 2 unités de symbole`);
  }
});

/** Une clé dont la pierre prend la forme demandée. */
function plaqueCleDeForme(forme) {
  return Object.keys(PLAQUE_FAMILLE_EFFET)
    .find((cle) => PLAQUE_FAMILLES[PLAQUE_FAMILLE_EFFET[cle]].forme === forme);
}

test('la pierre se dessine en couches : contour, anneau, champ, biseau, symbole blanc', () => {
  const pierre = pierreEffet('furie');
  const pierres = PLAQUE_PIERRES[PLAQUE_FAMILLES.assaut.pierre];
  assert.match(pierre, new RegExp(`fill="${pierres.encre}"`), 'le contour sombre est peint');
  assert.match(pierre, new RegExp(`fill="${pierres.creux}"`), 'l’anneau du biseau est peint');
  assert.match(pierre, new RegExp(`fill="${pierres.fond}"`), 'le champ est peint');
  assert.match(pierre, new RegExp(`fill="${pierres.lueur}" fill-opacity`), 'la lumière du dessus est peinte');
  assert.match(pierre, /<use href="#i-furie"[^>]*stroke="#ffffff"/, 'le symbole est blanc');
  assert.match(pierre, /stroke-linecap="round" stroke-linejoin="round"/, 'le symbole garde ses bouts ronds');
  assert.equal(pierre.includes('currentColor'), false, 'la pierre ne dépend plus de l’encre du texte');
  // contour, anneau, champ, lumière, ombre et filet clair : six polygones.
  assert.equal((pierre.match(/<polygon/g) ?? []).length, 6, 'six couches de pierre pour une furie');
});

test('la Protection élémentaire teinte sa pierre, le Sable garde la sienne', () => {
  const braise = pierreEffet('protection', { protectionContre: 'braise' });
  assert.match(braise, new RegExp(`fill="${couleurProtection('braise')}" fill-opacity=".5"`),
    'la pierre prend la couleur de l’élément repoussé');
  const sable = pierreEffet('protection', { protectionContre: 'sable' });
  assert.doesNotMatch(sable, new RegExp(`fill="${couleurProtection('braise')}"`));
  assert.equal((sable.match(/<polygon/g) ?? []).length, 6, 'sans teinte, la pierre garde ses six couches');
  assert.equal(plaqueEffet('protection').famille, 'garde', 'une Protection est une garde');
});

test('le balisage complet porte sa famille, sa forme et sa pierre', () => {
  const svg = plaqueSvg('butin', { size: 20, titre: 'Butin' });
  assert.match(svg, /^<svg class="rpg-effet-icone" width="20" height="20" viewBox="0 0 32 32"/);
  assert.match(svg, /data-plaque="flux" data-forme="hexagone" data-pierre="emeraude" data-symbole="i-butin"/);
  assert.match(svg, /role="img" aria-label="Butin"/, 'un titre explicite devient un rôle d’image');
  assert.match(plaqueSvg('butin'), /aria-hidden="true"/, 'sans titre, l’icône reste muette');
  const teinte = plaqueSvg('protection', { protectionContre: 'eau' });
  assert.match(teinte, /data-protection-contre="eau"/, 'l’élément repoussé reste lisible dans le DOM');
});

test('une clé dessinée garde la même pierre d’un rendu à l’autre', () => {
  assert.equal(pierreEffet('tenacite'), pierreEffet('tenacite'));
  assert.deepEqual(reduire([[0, 0], [32, 32]], 0.5), [[8, 8], [24, 24]]);
  assert.equal(pointsSvg([[16, 1.666]]), '16,1.67');
});

test('la feuille pose la pierre comme badge et laisse le glyphe respirer', () => {
  assert.match(css, /\.rpg-pastille \.rpg-effet-icone\s*\{[^}]*width: 20px;[^}]*height: 20px;/s,
    'dans une pastille, la pierre fait 20 px');
  assert.match(css, /\.rpg-card-icone\s*\{[^}]*padding: 0;[^}]*border: 0;[^}]*background: none;/s,
    'sur une face, la pierre est le badge : plus de pastille ronde');
  assert.match(css, /\.rpg-card-icone small\s*\{[^}]*background: rgba\(5, 8, 11, \.92\);/s,
    'le chiffre de l’effet garde sa pastille sombre');
  assert.match(css, /\.rpg-effet-icone\s*\{[^}]*filter: drop-shadow\(0 1px 1\.5px/s,
    'la pierre se décolle du fond de la carte');
  assert.match(css, /\.rpg-card-icone\.is-epuisee\s*\{[^}]*filter: grayscale\(1\);/s,
    'une pierre dépensée s’éteint');
  assert.match(cssMobile, /--rpg-plaque-taille: 18px;/,
    'dans une main mobile, la pierre passe à 18 px — lisible sans coller l’écran');
  assert.match(cssMobile, /\.rpg-card-icone \.rpg-effet-icone\s*\{[^}]*width: var\(--rpg-plaque-taille\);[^}]*height: var\(--rpg-plaque-taille\);/s,
    'le glyphe suit la taille de la colonne, il ne la fixe plus');
  assert.match(jsx, /data-plaque=\{plaque\.famille\}/, 'le composant React expose la famille de la pierre');
  assert.match(jsx, /dangerouslySetInnerHTML=\{\{ __html: pierreDessinee\(cle, protectionContre\) \}\}/,
    'le composant React dessine la pierre du module, pas une copie');
});
