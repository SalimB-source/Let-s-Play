import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

/** Les pierres d'effets restent dans la face, sur la table et en main. */
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
      <header class="rpg-card__title"><span class="rpg-mana-cost is-compact is-plaque"><span class="rpg-plaque-forme"><svg></svg></span><b>3</b></span></header>
      <span class="rpg-card-icones rpg-card-icones--colonne">
        <span class="rpg-card-icone"><svg class="rpg-effet-icone" width="18" height="18"></svg></span>
      </span>
    </button>
  </div>`;

const CARTE_MAIN = `
  <div class="rpg-hand">
    <button class="rpg-hand__card rpg-hand__card--img">
      <img class="rpg-hand__img" alt="" />
      <span class="rpg-card-element-badge is-plaque"></span>
      <span class="rpg-hand__title"><span class="rpg-mana-cost is-plaque">3</span></span>
      <span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--main">
        <span class="rpg-card-icone"><svg class="rpg-effet-icone" width="18" height="18"></svg></span>
      </span>
    </button>
  </div>`;

const APERCU = `
  <aside class="rpg-hover-card-preview">
    <div class="rpg-hover-card-preview__empile">
      <div class="rpg-hover-card-preview__face">
        <img alt="" />
        <span class="rpg-card-element-badge is-plaque">
          <svg class="rpg-plaque-forme" viewBox="0 0 32 32"></svg>
          <span class="rpg-card-element-badge__glyphe">✦</span>
        </span>
        <span class="rpg-mana-cost is-plaque">
          <svg class="rpg-plaque-forme" viewBox="0 0 32 32"></svg>
          <b>3</b>
        </span>
        <span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--apercu">
          <span class="rpg-card-icone"><svg class="rpg-effet-icone" width="18" height="18"></svg></span>
        </span>
      </div>
    </div>
  </aside>`;

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
    colonne: lire('.rpg-card-icones', [
      'right', 'left', 'top', 'transform', 'width', '--rpg-plaque-bord', '--rpg-plaque-taille',
    ]),
    carte: lire('.rpg-card, .rpg-hand__card', ['overflow', 'overflow-clip-margin', 'border-radius']),
    illustration: lire('.rpg-card__img, .rpg-hand__img', ['border-radius']),
    volet: lire('.rpg-hover-card-preview', ['overflow', 'padding-left', 'padding-right', 'column-gap', 'box-sizing']),
    face: lire('.rpg-hover-card-preview__face', ['overflow', 'overflow-clip-margin', 'border-radius']),
    cout: lire('.rpg-mana-cost', [
      'display', 'position', 'place-items',
      'top', 'left', 'right', 'transform', 'width', 'height', 'font-size',
    ]),
    plaque: lire('.rpg-hover-card-preview__face .rpg-plaque-forme', [
      'position', 'width', 'height', 'grid-area',
    ]),
    fondCout: lire('.rpg-mana-cost > .rpg-plaque-forme', ['grid-area']),
    chiffreCout: lire('.rpg-mana-cost > b', ['grid-area']),
    plaqueCout: lire('.rpg-hover-card-preview__face .rpg-plaque-forme', ['position']),
    badge: lire('.rpg-hover-card-preview__face .rpg-card-element-badge', [
      'top',
      'transform', 'width', 'height', 'border', 'border-radius', 'background', '--rpg-plaque-taille',
    ]),
    faceImage: lire('.rpg-hover-card-preview__face > img', ['border-radius']),
    catalogue: lire('.rpg-card-icones--catalogue', [
      'right', 'left', 'bottom', '--rpg-plaque-bord', '--rpg-plaque-taille',
    ]),
  };
  dom.window.close();
  return resultat;
}

test('la colonne reste à l’intérieur du bord sur les différentes faces', () => {
  for (const [touch, face] of [[false, CARTE_TABLE], [false, CARTE_MAIN], [true, CARTE_MAIN], [false, APERCU]]) {
    const { colonne } = mesurer(touch, face);
    assert.equal(colonne.right, '0px');
    assert.equal(colonne.transform, 'translateX(var(--rpg-plaque-bord))');
    assert.equal(colonne['--rpg-plaque-bord'], '0%', 'aucune pierre ne sort du cadre');
    assert.equal(colonne['--rpg-plaque-taille'], 'clamp(24px,26cqw,52px)', 'taille normale avant ajustement');
  }
});

test('l’illustration conserve les coins de son cadre', () => {
  const { carte, illustration } = mesurer(false, CARTE_MAIN);
  const { face, faceImage } = mesurer(false, APERCU);
  assert.equal(illustration['border-radius'], carte['border-radius']);
  assert.equal(faceImage['border-radius'], face['border-radius']);
});

test('l’aperçu aligne le coût avec les effets et range la couleur en dessous', () => {
  const { cout, badge, colonne } = mesurer(false, APERCU);
  assert.equal(cout.right, 'auto', 'le coût quitte le coin haut droit');
  assert.equal(cout.left, '0px', 'il s’aligne sur le bord gauche');
  assert.equal(cout.transform, 'translateX(-36%)', 'le coût chevauche le bord');
  assert.equal(badge.transform, 'translateX(-36%)', 'la couleur reste sur le bord gauche');
  assert.equal(badge.top, 'calc(var(--rpg-card-element-marker-top, 5%) + var(--rpg-cout-taille, 26.88px) + 6px)');
  // Le coût s’aligne sur les effets, et la couleur se range en dessous.
  assert.equal(
    cout.top,
    'var(--rpg-card-element-marker-top, 5%)',
    'il commence au niveau des effets',
  );
  // Seul le coût grandit ; couleurs et effets gardent leur mesure commune.
  assert.equal(cout.width, 'var(--rpg-cout-taille, 26.88px)', 'le coût gagne 12 %');
  assert.equal(cout.height, cout.width, 'le losange est carré');
  assert.equal(badge.width, 'var(--rpg-plaque-taille, 24px)', 'la couleur ne grandit pas');
  assert.equal(badge['--rpg-plaque-taille'], 'clamp(24px,26cqw,52px)', 'la mesure commune, celle des pierres');
  assert.equal(colonne['--rpg-plaque-taille'], badge['--rpg-plaque-taille'], 'les pierres d’effets aussi');
  assert.equal(cout['font-size'], 'calc(var(--rpg-cout-taille, 26.88px) * .52)', 'le chiffre suit la pierre');
  // Plus de pastille ronde : c'est la pierre qui borde et qui porte la couleur.
  assert.match(badge.border, /^0px( none)?/, 'la couleur n’a plus de bordure claire');
  assert.equal(badge['border-radius'], '0px', 'ni de rayon : elle est taillée');
  assert.match(badge.background, /\bnone\b/, 'la pierre fournit le fond, pas la feuille');
});

test('les rangées hors du jeu gardent leur place dans l’illustration', () => {
  const { catalogue } = mesurer(false, RANGEE_CATALOGUE);
  assert.equal(catalogue.left, '6px', 'le catalogue garde sa rangée');

  // Les pierres ne débordent que sur les faces de cartes en jeu (`--colonne`) :
  // une rangée qui n'est pas une colonne n'emprunte ni le bord ni le débord.
  assert.equal(catalogue['--rpg-plaque-bord'], '', 'hors colonne, aucun débord n’est défini');
  assert.equal(catalogue['--rpg-plaque-taille'], '', 'hors colonne, la taille d’attribut du glyphe suffit');
});

test('la pierre nue habille le repère dans le flux, sans sortir de sa case', () => {
  const { plaque } = mesurer(false, APERCU);
  // Un `position: absolute` serait un piège : le coût de la main vit dans le flux
  // du titre, et la pierre prendrait alors la taille de toute la carte.
  assert.equal(plaque.position, 'static', 'la pierre reste dans le flux du repère');
  assert.equal(plaque.width, '100%', 'elle remplit la largeur du repère');
  assert.equal(plaque.height, '100%', 'et sa hauteur');
  assert.match(css, /\.rpg-battle \.rpg-card-element-badge\.is-plaque > \*,[\s\S]*?grid-area: 1 \/ 1;/,        'pierre et glyphe partagent une seule case de grille');
});


test('le coût reste affiché sur le plateau, au doigt comme à la souris', () => {
  for (const touch of [false, true]) {
    const { cout, fondCout, chiffreCout } = mesurer(touch, CARTE_TABLE);
    assert.equal(cout.display, 'grid', 'le coût n’aligne pas le chiffre à côté de la pierre');
    assert.equal(cout['place-items'], 'center');
    assert.equal(fondCout['grid-area'], '1 / 1');
    assert.equal(chiffreCout['grid-area'], fondCout['grid-area'], 'le chiffre se superpose au losange');
    assert.equal(cout.position, 'absolute', 'top déplace réellement le coût sous la couleur');
    assert.equal(cout.left, '0px');
    assert.equal(cout.transform, 'translateX(-36%)');
  }
});

test('les effets de la main commencent en haut sur les deux formats', () => {
  for (const touch of [false, true]) {
    const { colonne } = mesurer(touch, CARTE_MAIN);
    assert.equal(colonne.top, 'var(--rpg-card-element-marker-top, 5%)');
  }
});


test('l’aperçu réserve le débord à l’intérieur du panneau défilant', () => {
  const { volet } = mesurer(false, APERCU);
  const debordMax = 52 * .45 + 2;
  assert.ok(parseFloat(volet['padding-left']) >= debordMax);
  assert.ok(parseFloat(volet['padding-right']) >= debordMax);
  assert.ok(parseFloat(volet['column-gap']) >= debordMax);
  assert.equal(volet['box-sizing'], 'border-box');
});


test('le coût en main commence au niveau des effets sur PC et mobile', () => {
  for (const touch of [false, true]) {
    const { cout } = mesurer(touch, CARTE_MAIN);
    assert.equal(cout.position, 'absolute');
    assert.equal(cout.top, 'var(--rpg-card-element-marker-top, 5%)');
    assert.equal(cout.left, '0px');
  }
});


test('pendant le vol main-plateau, les pastilles ne sont pas rognées', () => {
  const enVol = CARTE_MAIN.replace('rpg-hand__card--img', 'rpg-hand__card--img rpg-card-flight is-flying');
  for (const touch of [false, true]) {
    const { carte, illustration, colonne, cout } = mesurer(touch, enVol);
    assert.equal(carte.overflow, 'visible', 'aucun rognage pendant le vol');
    assert.equal(illustration['border-radius'], carte['border-radius'], 'les coins de l’image restent arrondis');
    assert.equal(colonne.transform, 'translateX(var(--rpg-plaque-bord))', 'les effets gardent leur chevauchement');
    assert.equal(cout.transform, 'translateX(-36%)', 'le coût garde son chevauchement');
  }
});
