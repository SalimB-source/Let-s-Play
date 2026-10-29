import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

import {
  CARD_FRAME_COLORS,
  RPG_ELEMENTS,
  cardFrameColor,
  cardHybridGradient,
} from '../src/games/rpgCards.js';

/* Plus aucun cadre sur les faces de cartes.
 *
 * Décision d'octobre 2026 : l'anneau coloré (le « filet » de 3 px qui a suivi
 * l'anneau orné) disparaît partout — main, table, terrains, aperçu, annonce,
 * mulligan, piles, catalogue, guide, atelier. La peinture va d'un bord à
 * l'autre, comme sur une face de Furie ; l'élément se lit à la pastille de mana
 * et au fond, pas à une bordure.
 *
 * Ces tests lisent les feuilles et laissent jsdom appliquer la cascade réelle
 * (`!important` et spécificité compris) : ils n'affirment pas un rendu, ils
 * empêchent le retour d'un cadre sur une face.
 */

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games');
const lire = (nom) => readFileSync(join(racine, nom), 'utf8');

const battle = lire('rpg-battle.css');
const mobile = lire('rpg-mobile.css');
const guide = lire('rpg-card-guide.css');
const atelier = lire('rpg-deck-atelier.css');
const duel = lire('RpgDuelPage.jsx');

/** Les largeurs de bordure encore déclarées à la main sur une face. */
function largeursDeCadre(css) {
  return css.match(/border-width:\s*(?!0)\d*\.?\d+px/g) ?? [];
}

test('les trois feuilles écrivent la largeur nulle, en clair', () => {
  // Pas de variable de largeur : une épaisseur nulle n'a rien à configurer, et
  // un `var(--…, 3px)` mal replié ramènerait le cadre en silence.
  for (const [nom, css] of Object.entries({ battle, guide, atelier })) {
    assert.match(css, /border-width:\s*0(?:\s*!important)?;/, `${nom} : aucune bordure sur les faces`);
    assert.doesNotMatch(css, /--rpg-card-filet:\s*[1-9]/, `${nom} : plus aucune largeur de filet`);
    assert.doesNotMatch(
      css,
      /border-width:\s*var\(--rpg-card-filet/,
      `${nom} : les faces ne mesurent plus un filet`,
    );
  }
});

test('les quatre gabarits de cadre sont à zéro, clavier comme doigt', () => {
  // Ces variables portent le `border` de toutes les faces, y compris celles qui
  // n'ont pas de classe de cadre (une carte en Furie, l'atelier) : les laisser
  // à 7–13 px ramènerait un anneau coloré sur ces faces-là.
  for (const gabarit of ['', '-large', '-small', '-strong']) {
    assert.match(
      battle,
      new RegExp(`--rpg-card-border${gabarit}:\\s*0px;`),
      `--rpg-card-border${gabarit} vaut zéro`,
    );
  }
  for (const gabarit of ['', '-strong']) {
    assert.match(
      mobile,
      new RegExp(`--rpg-card-border${gabarit}:\\s*0px;`),
      `au doigt, --rpg-card-border${gabarit} vaut zéro`,
    );
  }
  assert.doesNotMatch(battle, /--rpg-card-border[\w-]*:\s*clamp\(/, 'aucun gabarit ne mesure un cadre');
  assert.doesNotMatch(mobile, /--rpg-card-border[\w-]*:\s*clamp\(/, 'aucun gabarit tactile ne mesure un cadre');
});

test('le retrait vaut pour toutes les faces, clavier comme doigt', () => {
  const dom = new JSDOM(
    `<!doctype html><html><head><style>${battle}</style><style>${guide}</style><style>${atelier}</style><style>${mobile}</style></head>
     <body>
       <div class="rpg-battle" id="clavier">
         <div class="rpg-hand"><button class="rpg-hand__card rpg-hand__card--img rpg-card--frame-braise">
           <span class="rpg-card-element-badge"></span></button></div>
         <div class="card-row"><div class="rpg-card rpg-card--img rpg-card--frame-eau"></div></div>
         <div class="rpg-terrain rpg-card--frame-sable"></div>
         <div class="rpg-hover-card-preview__face rpg-card--frame-neige"></div>
         <div class="rpg-card-catalogue__art rpg-card--frame-tenebres"></div>
         <div class="rpg-atelier__carte-art rpg-card--frame-hybride-braise-eau"></div>
         <div class="rpg-card-guide__example rpg-card--frame-braise"></div>
       </div>
       <div class="rpg-battle rpg-battle--touch" id="tactile">
         <div class="rpg-hand"><button class="rpg-hand__card rpg-hand__card--img rpg-card--frame-braise">
           <span class="rpg-card-element-badge"></span></button></div>
         <div class="card-row"><div class="rpg-card rpg-card--img rpg-card--frame-eau"></div></div>
         <div class="rpg-terrain rpg-card--frame-sable"></div>
       </div>
     </body></html>`,
    { pretendToBeVisual: true },
  );
  const bordure = (racineId, selecteur) => dom.window.getComputedStyle(
    dom.window.document.querySelector(`${racineId} ${selecteur}`),
  ).borderTopWidth;

  for (const [racineId, nom] of [['#clavier', 'au clavier'], ['#tactile', 'au doigt']]) {
    assert.equal(bordure(racineId, '.rpg-hand__card'), '0px', `${nom} : la carte en main est nue`);
    assert.equal(bordure(racineId, '.rpg-card'), '0px', `${nom} : la carte posée est nue`);
    assert.equal(bordure(racineId, '.rpg-terrain'), '0px', `${nom} : le terrain est nu`);
  }
  // Les autres faces peintes suivent la même règle : l'aperçu, le catalogue,
  // la vignette de l'atelier et l'exemple du guide.
  for (const selecteur of [
    '.rpg-hover-card-preview__face',
    '.rpg-card-catalogue__art',
    '.rpg-atelier__carte-art',
    '.rpg-card-guide__example',
  ]) {
    assert.equal(bordure('#clavier', selecteur), '0px', `${selecteur} est nu`);
  }
  // Le retrait ne mange pas la pastille d'élément, qui garde son propre bord.
  assert.notEqual(
    dom.window.getComputedStyle(dom.window.document.querySelector('#tactile .rpg-card-element-badge')).borderTopWidth,
    '0px',
    'la pastille d’élément garde son bord',
  );
  dom.window.close();
});

test('la règle du retrait est la dernière et se tait sur tout le reste', () => {
  // On part du bloc de fin (« PLUS AUCUN CADRE ») : la règle des « cadres
  // ornés » du milieu de feuille vise presque les mêmes sélecteurs, et c'est
  // bien le dernier mot qui décide de la largeur.
  const bloc = battle.slice(battle.lastIndexOf('PLUS AUCUN CADRE'));
  const regle = bloc.slice(bloc.indexOf('.rpg-card[class*="rpg-card--frame-"]'));
  const finDeRegle = regle.indexOf('}');
  assert.ok(finDeRegle > 0, 'la règle finale existe');
  const corps = regle.slice(0, finDeRegle);
  assert.match(corps, /border-width:\s*0 !important/);
  // Sans bordure, la matière de l'ancien cadre n'a plus d'anneau où se peindre :
  // le motif et la matière se replient à une taille nulle, le fond de la face
  // reste (première couche, aux dimensions de la carte).
  assert.match(corps, /background-size:\s*100% 100%, 0 0, 0 0 !important/);
  assert.doesNotMatch(corps, /background-image:\s*none/, 'le fond de la face reste peint');
  // Aucune face ne perd son animation (arrivée, attaque, blocage, Envol).
  assert.doesNotMatch(corps, /animation:\s*none/);
});

test('plus aucun liseré coloré ne subsiste sur les cartes', () => {
  // Le liseré crème des légendaires était la dernière bordure intérieure
  // colorée d'une face : elle tombe avec l'anneau.
  assert.doesNotMatch(
    battle,
    /\.rpg-card--legendaire \.rpg-card__art \{ border-color: var\(--rpg-frame-color/,
    'l’illustration d’une légendaire garde le bord noir commun',
  );
  // Les ombres décalées des piles reprenaient la couleur du cadre : le cadre en
  // double, un cran plus loin. La feuille tactile n'en peint plus aucune.
  const ombresTactiles = mobile.match(/box-shadow:[^;]*var\(--rpg-frame-color[^;]*;/g) ?? [];
  assert.deepEqual(ombresTactiles, [], 'aucune ombre tactile ne repeint le cadre');
  // Reste le halo des héros : ce n'est pas un cadre, il est flou et déborde de
  // la face. Il ne doit jamais devenir un anneau net (blur 0) autour d'elle.
  const ombresColorees = battle.match(/box-shadow:[^;]*var\(--rpg-frame-color[^;]*;/g) ?? [];
  for (const ombre of ombresColorees) {
    assert.doesNotMatch(
      ombre,
      /(?:^|[\s,])0 0 0 [\d.]+px[^,;]*var\(--rpg-frame-color/,
      'aucun anneau net de la couleur du cadre',
    );
  }
  assert.match(battle, /\.rpg-card-stack,\s*\n\.rpg-terrain\.rpg-terrain-stack\.is-stacked \{\s*\n\s*box-shadow: none !important;/,
    'les piles n’ont plus de double bord');
});

test('la couleur d’élément reste une donnée : pastilles, coûts, fiches', () => {
  // Retirer le cadre ne retire pas la couleur : elle nomme encore l'élément
  // dans la pastille de mana, la diagonale du coût hybride et la ligne de
  // couleur de la fiche.
  for (const element of RPG_ELEMENTS) {
    assert.equal(cardFrameColor({ element }), CARD_FRAME_COLORS[element].color, element);
  }
  const cout = cardHybridGradient({ colors: ['sable', 'braise'] });
  assert.ok(cout.startsWith('linear-gradient(to bottom right,'), cout);
  // Les faces reçoivent toujours leur variable : elle sert d'encre aux badges.
  assert.match(duel, /function cardFrameStyle\(carte\) \{\s*return \{ '--rpg-frame-color': cardFrameColor\(carte\) \};/);
  assert.equal(largeursDeCadre(guide).length, 0, 'le guide ne redéclare aucune largeur de cadre');
});
