import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * Les pierres d'effets montées sur le bord de la carte —
 * `tests/rpg-icones-bord-carte.test.js`
 *
 * Sur les cartes en jeu, la colonne d'effets n'est plus posée *dans*
 * l'illustration : elle est chevillée au bord droit, à cheval sur le cadre,
 * moitié pierre / moitié table (`effet-icons.css`, « Les emblèmes montés sur le
 * bord »). Deux règles doivent tenir ensemble, et c'est ce que l'on mesure ici :
 *
 * - la colonne s'aligne sur le bord (`right: 0`) et glisse vers l'extérieur
 *   d'une part d'elle-même, variable selon la place disponible autour de la
 *   carte (table, main de bureau, main au doigt) ;
 * - la carte ouvre son rognage juste ce qu'il faut pour laisser passer ce
 *   débord, sans déborder elle-même : `overflow: clip` (jamais de zone de
 *   défilement) et une marge de 14 px, que le contour d'aucune carte ne
 *   dépasse aujourd'hui (le plus large est de 8 px, main de bureau).
 *
 * jsdom n'évalue pas les media queries : on passe par `.rpg-battle--touch`, qui
 * porte les mêmes mesures sur l'APK et la WebView.
 */
const FEUILLES = [
  'rpg-battle.css',
  'rpg-mobile.css',
  'rpg-mana-essai.css',
  'effet-icons.css',
];

const css = FEUILLES
  .map((nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8'))
  .join('\n');

const CARTE_TABLE = `
  <div class="card-row">
    <button class="rpg-card rpg-card--img">
      <img class="rpg-card__img" alt="" />
      <span class="rpg-card-icones rpg-card-icones--colonne">
        <span class="rpg-card-icone"><svg class="rpg-effet-icone" width="18" height="18"></svg></span>
      </span>
    </button>
  </div>`;

const CARTE_MAIN = `
  <div class="rpg-hand">
    <button class="rpg-hand__card rpg-hand__card--img">
      <img class="rpg-hand__img" alt="" />
      <span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--main">
        <span class="rpg-card-icone"><svg class="rpg-effet-icone" width="18" height="18"></svg></span>
      </span>
    </button>
  </div>`;

const RANGEE_CATALOGUE = `
  <button class="rpg-card-catalogue">
    <span class="rpg-card-icones rpg-card-icones--catalogue">
      <span class="rpg-card-icone"><svg class="rpg-effet-icone" width="18" height="18"></svg></span>
    </span>
  </button>`;

function mesurer(touch, corps) {
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body>
    <div class="rpg-battle${touch ? ' rpg-battle--touch' : ''}">${corps}</div>
  </body></html>`, { pretendToBeVisual: true, virtualConsole: new VirtualConsole() });

  const { getComputedStyle, document } = dom.window;
  // Un même corps ne porte pas toutes les faces : l'élément absent se lit vide.
  const lire = (selecteur, proprietees) => {
    const element = document.querySelector(selecteur);
    const s = element ? getComputedStyle(element) : null;
    return Object.fromEntries(proprietees.map((p) => [p, s ? s.getPropertyValue(p) : '']));
  };
  const resultat = {
    colonne: lire('.rpg-card-icones', ['right', 'left', 'transform', '--rpg-plaque-bord', 'width']),
    carte: lire('.rpg-card, .rpg-hand__card', ['overflow', 'overflow-clip-margin', 'border-radius']),
    illustration: lire('.rpg-card__img, .rpg-hand__img', ['border-radius']),
    catalogue: lire('.rpg-card-icones--catalogue', ['right', 'left', 'bottom', '--rpg-plaque-bord']),
  };
  dom.window.close();
  return resultat;
}

test('sur la table, la colonne d’effets est chevillée au bord droit de la carte', () => {
  const { colonne, carte } = mesurer(false, CARTE_TABLE);
  assert.equal(colonne.right, '0px', 'la colonne s’aligne sur le bord, plus dans l’illustration');
  assert.equal(colonne.transform, 'translateX(var(--rpg-plaque-bord))', 'elle glisse vers l’extérieur');
  assert.equal(colonne['--rpg-plaque-bord'], '42%', 'la table a de l’interstice : le débord peut être franc');
  // Débord utile : la pierre de 18 px dans une colonne de 30 px (--rpg-card-marker-size)
  // avance de 42 % de 30 px, son axe reste à 2,4 px dans le cadre.
  const avance = 0.42 * 30;
  const axe = 30 / 2 - avance;
  assert.ok(axe > 0 && axe < 4, `l’axe de la pierre reste dans le cadre (${axe} px)`);
  assert.ok(9 - axe >= 5, 'et la pierre en déborde de plus de 5 px');
  assert.equal(carte.overflow, 'clip', 'la carte laisse passer le débord sans zone de défilement');
  assert.equal(carte['overflow-clip-margin'], '14px', 'la marge couvre le débord de la pierre');
});

test('dans la main, le débord reste plus discret que sur la table', () => {
  const { colonne, carte, illustration } = mesurer(false, CARTE_MAIN);
  assert.equal(colonne.right, '0px', 'même bord que sur la table');
  assert.equal(colonne['--rpg-plaque-bord'], '34%', 'les cartes de la main se touchent presque');
  assert.equal(carte.overflow, 'clip', 'la main ouvre son rognage comme la table');
  assert.equal(carte['overflow-clip-margin'], '14px');
  // L'illustration reprend le rayon du cadre : le rognage ne coupe plus ses coins.
  assert.equal(
    illustration['border-radius'],
    carte['border-radius'],
    'l’illustration garde exactement les coins du cadre',
  );
});

test('au doigt, la pierre de 14 px ne mord que le quart de sa largeur', () => {
  const { colonne, carte } = mesurer(true, CARTE_MAIN);
  assert.equal(colonne.width, '14px', 'la colonne mobile garde sa mesure');
  assert.equal(colonne['--rpg-plaque-bord'], '25%', 'l’interstice de 4 px ne laisse pas plus de débord');
  const avance = 0.25 * 14;
  assert.equal(avance, 3.5, '3,5 px de pierre sur le cadre, 3,5 px sur la table');
  assert.equal(carte['overflow-clip-margin'], '14px', 'la marge n’a pas à suivre la taille de la pierre');
});

test('les rangées hors du jeu gardent leur place dans l’illustration', () => {
  const { catalogue } = mesurer(false, RANGEE_CATALOGUE);
  assert.equal(catalogue.left, '6px', 'le catalogue garde sa rangée');

  // Les pierres ne débordent que sur les faces de cartes en jeu (`--colonne`) :
  // une rangée qui n'est pas une colonne n'emprunte ni le bord ni le débord.
  assert.equal(catalogue['--rpg-plaque-bord'], '', 'hors colonne, aucun débord n’est défini');
});
