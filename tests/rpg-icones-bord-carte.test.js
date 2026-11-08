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
 * bord »). Trois choses doivent tenir ensemble, et c'est ce que l'on mesure ici :
 *
 * - la colonne s'aligne sur le bord (`right: 0`), sa largeur **est** la taille
 *   de la pierre (`--rpg-plaque-taille`), et elle glisse vers l'extérieur d'une
 *   part d'elle-même (`--rpg-plaque-bord`) : le débord vaut donc exactement
 *   `bord × taille`, la part qui reste dans le cadre `(1 − bord) × taille` ;
 * - la taille de lecture est **la même partout** : 21 % de la largeur de la
 *   carte, entre 18 et 40 px (`--rpg-plaque-taille`, posée par les enfants de
 *   la face) — la table, la main, le mulligan et l'aperçu ne diffèrent plus ;
 * - la carte ouvre son rognage juste ce qu'il faut pour laisser passer ce
 *   débord, sans déborder elle-même : `overflow: clip` (jamais de zone de
 *   défilement) et une marge qui couvre le plus grand débord de la surface.
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

/** Le débord d'une pierre : `bord` pour cent de sa taille (voir la feuille). */
const debord = (taille, bord) => taille * (bord / 100);
/** La part qui reste dans le cadre, du même calcul. */
const dedans = (taille, bord) => taille * (1 - bord / 100);

test('sur la table, la pierre est chevillée au bord et grandit avec la carte', () => {
  const { colonne, carte } = mesurer(false, CARTE_TABLE);
  assert.equal(colonne.right, '0px', 'la colonne s’aligne sur le bord, plus dans l’illustration');
  assert.equal(colonne.transform, 'translateX(var(--rpg-plaque-bord))', 'elle glisse vers l’extérieur');
  assert.equal(colonne['--rpg-plaque-bord'], '36%', 'la table a de l’interstice : le débord peut être franc');
  assert.equal(
    colonne['--rpg-plaque-taille'],
    'clamp(24px,26cqw,52px)',
    'la mesure commune : 26 % de la carte, entre 24 et 52 px',
  );
  assert.equal(colonne.width, 'var(--rpg-plaque-taille, 20px)', 'la colonne épouse la pierre');
  // Le cadre de la carte fait 104 à 198 px : 21 % donnent 22 à 40 px — la
  // pierre a pris un tiers de plus que les 17 % d'hier.
  for (const largeur of [104, 130, 198]) {
    const taille = Math.min(52, Math.max(24, 0.26 * largeur));
    assert.ok(debord(taille, 36) <= 24, `le débord de ${debord(taille, 36).toFixed(1)} px tient dans le rognage`);
    assert.ok(dedans(taille, 36) >= 10, 'et la pierre mord vraiment sur le cadre');
  }
  assert.equal(carte.overflow, 'clip', 'la carte laisse passer le débord sans zone de défilement');
  assert.equal(carte['overflow-clip-margin'], '24px', 'la marge couvre le plus grand débord');
});

test('dans la main, la pierre prend la même part de la carte que sur la table', () => {
  const { colonne, carte, illustration } = mesurer(false, CARTE_MAIN);
  assert.equal(colonne.right, '0px', 'même bord que sur la table');
  assert.equal(colonne['--rpg-plaque-taille'], 'clamp(24px,26cqw,52px)', 'exactement la mesure de la table');
  assert.equal(colonne['--rpg-plaque-bord'], '30%', 'les cartes de la main se touchent presque');
  // Une carte de main fait 94 à 136 px : 21 % donnent 20 à 28 px (contre 24 px
  // fixes hier, et 18 px au doigt).
  for (const largeur of [94, 118, 136]) {
    const taille = Math.min(52, Math.max(24, 0.26 * largeur));
    assert.ok(debord(taille, 30) <= 11, `le débord de ${debord(taille, 30).toFixed(1)} px tient dans l’interstice`);
  }
  assert.equal(carte.overflow, 'clip', 'la main ouvre son rognage comme la table');
  assert.equal(carte['overflow-clip-margin'], '20px');
  // L'illustration reprend le rayon du cadre : le rognage ne coupe plus ses coins.
  assert.equal(
    illustration['border-radius'],
    carte['border-radius'],
    'l’illustration garde exactement les coins du cadre',
  );
});

test('au doigt, la pierre de 18 px ne mord que sur 4 px du cadre', () => {
  const { colonne, carte } = mesurer(true, CARTE_MAIN);
  // Une carte mobile fait moins de 90 px : 21 % tombent sous le plancher, la
  // pierre garde donc ses 18 px — la même mesure qu’hier, mais posée par la
  // règle commune au lieu d’une exception de la feuille mobile.
  assert.equal(colonne['--rpg-plaque-taille'], 'clamp(24px,26cqw,52px)', 'la mesure commune');
  assert.equal(colonne.width, 'var(--rpg-plaque-taille, 18px)', 'la colonne épouse la pierre');
  assert.equal(colonne['--rpg-plaque-bord'], '22%', 'l’interstice de 4 px ne laisse pas plus de débord');
  assert.ok(debord(18, 22) <= 4, 'le débord de 4 px tient dans l’interstice');
  assert.equal(carte['overflow-clip-margin'], '20px', 'la marge n’a pas à suivre la taille de la pierre');
});

test('l’aperçu porte les mêmes pierres, en 40 px, sur le bord de sa face', () => {
  const { colonne, face, faceImage } = mesurer(false, APERCU);
  // Une face de 190 à 232 px : 21 % dépassent le plafond, la pierre prend donc
  // les 40 px — un sixième de la face, et le plus grand repère du jeu.
  assert.equal(colonne['--rpg-plaque-taille'], 'clamp(24px,26cqw,52px)', 'la mesure commune');
  assert.equal(colonne['--rpg-plaque-bord'], '45%', 'presque la moitié de la pierre sur le cadre');
  assert.equal(colonne.right, '0px', 'la colonne est chevillée au bord de la face');
  assert.equal(
    colonne.top,
    'var(--rpg-card-element-marker-top, 5%)',
    'elle part du coin haut droit, libre depuis que le coût a rejoint la couleur',
  );
  assert.ok(debord(40, 45) <= 22, 'le débord de 18 px tient dans le rognage de la face');
  assert.equal(face.overflow, 'visible', 'la face laisse passer le débord sans zone de défilement');
  assert.equal(face['overflow-clip-margin'], '22px');
  assert.equal(faceImage['border-radius'], face['border-radius'], 'l’illustration garde les coins du cadre');
});

test('l’aperçu range le coût sous la pastille de couleur et les fait de même taille', () => {
  const { cout, badge, colonne } = mesurer(false, APERCU);
  assert.equal(cout.right, 'auto', 'le coût quitte le coin haut droit');
  assert.equal(cout.left, '0px', 'il s’aligne sur le bord gauche');
  assert.equal(cout.transform, 'translateX(-36%)', 'le coût chevauche le bord');
  assert.equal(badge.transform, cout.transform, 'la couleur chevauche le même bord');
  // Le coût se pose sous l'hexagone de couleur, à 6 px de lui — un peu moins
  // qu'hier : la pierre de couleur a perdu son anneau clair, elle est plus
  // serrée dans le coin.
  assert.equal(
    cout.top,
    'calc(var(--rpg-card-element-marker-top, 5%) + var(--rpg-plaque-taille, 24px) + 6px)',
    'il se pose sous la pastille de couleur',
  );
  // Les trois repères d'une face — hexagone de couleur, losange de coût,
  // pierres d'effets — lisent la même mesure : ils font exactement la même
  // taille, et cette taille est celle de la carte (32 px sur une face d'aperçu).
  assert.equal(cout.width, 'var(--rpg-plaque-taille, 24px)', 'le losange prend la taille des pierres');
  assert.equal(cout.height, cout.width, 'le losange est carré');
  assert.equal(badge.width, cout.width, 'l’hexagone de couleur fait la même taille que le losange');
  assert.equal(badge['--rpg-plaque-taille'], 'clamp(24px,26cqw,52px)', 'la mesure commune, celle des pierres');
  assert.equal(colonne['--rpg-plaque-taille'], badge['--rpg-plaque-taille'], 'les pierres d’effets aussi');
  assert.equal(cout['font-size'], 'calc(var(--rpg-plaque-taille, 24px) * .52)', 'le chiffre suit la pierre');
  // Plus de pastille ronde : c'est la pierre qui borde et qui porte la couleur.
  assert.match(badge.border, /^0px( none)?/, 'la couleur n’a plus de bordure claire');
  assert.equal(badge['border-radius'], '0px', 'ni de rayon : elle est taillée');
  assert.equal(badge.background, 'none', 'la pierre fournit le fond, pas la feuille');
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


test('le coût en main est positionné sous la couleur sur PC et mobile', () => {
  for (const touch of [false, true]) {
    const { cout } = mesurer(touch, CARTE_MAIN);
    assert.equal(cout.position, 'absolute');
    assert.equal(cout.top, 'calc(var(--rpg-card-element-marker-top, 5%) + var(--rpg-plaque-taille, 24px) + 6px)');
    assert.equal(cout.left, '0px');
  }
});
