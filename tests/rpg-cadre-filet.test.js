import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { CARD_FRAME_COLORS, RPG_ELEMENTS, cardFrameColor } from '../src/games/rpgCards.js';

/* Le filet de couleur : 2 px de la teinte de l'élément, partout où une face de
   carte est dessinée. Ces tests lisent les feuilles de style : ils ne prouvent
   pas le rendu, ils empêchent seulement le retour des deux réglages qui
   avaient effacé la couleur d'élément — l'anneau orné de 7 à 10 px et
   l'expérimentation « plus aucun cadre » (`border-width: 0`). */

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games');
const lire = (nom) => readFileSync(join(racine, nom), 'utf8');

const battle = lire('rpg-battle.css');
const mobile = lire('rpg-mobile.css');
const guide = lire('rpg-card-guide.css');
const atelier = lire('rpg-deck-atelier.css');
const duel = lire('RpgDuelPage.jsx');

/** Toutes les déclarations `border-width: 0` encore présentes dans une feuille. */
function borduresNulles(css) {
  return css.match(/border-width:\s*0\s*(?:!important)?;/g) ?? [];
}

test('le filet fait 2 px, et c’est la seule épaisseur de cadre', () => {
  assert.match(battle, /--rpg-card-filet:\s*2px;/, 'la variable du filet est déclarée sur .rpg-battle');
  for (const [nom, css] of Object.entries({ battle, guide, atelier })) {
    assert.match(
      css,
      /border-width:\s*var\(--rpg-card-filet,\s*2px\)/,
      `${nom} : les faces prennent le filet, pas l'anneau orné`,
    );
  }
});

test('plus aucune face ne perd son cadre (fin de l’expérimentation)', () => {
  assert.doesNotMatch(battle, /EXPÉRIMENTATION — PLUS AUCUN CADRE DE CARTE/);
  assert.equal(borduresNulles(guide).length, 0, 'rpg-card-guide.css : aucun bord à zéro sur les faces');
  assert.equal(borduresNulles(atelier).length, 0, 'rpg-deck-atelier.css : aucun bord à zéro sur les faces');
  assert.equal(
    (battle.match(/border-width:\s*0\s*!important;/g) ?? []).length,
    0,
    'rpg-battle.css : plus aucun bord à zéro forcé sur les faces',
  );
  // La seule face volontairement sans bord reste la Furie, dont la peinture
  // occupe toute la carte : elle ne porte aucune classe de cadre.
  assert.match(battle, /\.rpg-hover-card-preview__face\.is-furie\s*\{[^}]*border-width:\s*0;/s);
  assert.equal(borduresNulles(battle).length, 1, 'rpg-battle.css : le seul bord à zéro est celui de la Furie');
});

test('le filet garde la couleur et la matière de l’élément, sans le motif', () => {
  for (const [nom, css] of Object.entries({ battle, mobile, guide, atelier })) {
    assert.match(css, /--rpg-frame-motif:\s*none;/, `${nom} : le motif se tait dans 2 px`);
  }
  // La pile de fonds qui peint l'anneau est intacte : face, motif, matière.
  assert.match(battle, /background-image:\s*\n?\s*linear-gradient\(var\(--rpg-frame-fill/);
  assert.match(battle, /var\(--rpg-frame-gradient, linear-gradient\(var\(--rpg-frame-color/);
  // Une couleur par élément, et une diagonale par combinaison hybride.
  for (const element of RPG_ELEMENTS) {
    assert.match(
      battle,
      new RegExp(`\\.rpg-card--frame-${element}\\b`),
      `la feuille porte une règle pour ${element}`,
    );
  }
  assert.match(battle, /\.rpg-card--frame-hybride-braise-eau\s*\{\s*--rpg-frame-gradient:\s*linear-gradient\(135deg, #e0412a 50%, #3f9fe8 50%\);/);
  for (const element of RPG_ELEMENTS) {
    assert.equal(cardFrameColor({ element }), CARD_FRAME_COLORS[element].color, element);
  }
});

test('chaque face dessinée reçoit la couleur de son élément', () => {
  // Le duel : `cardFrameStyle` pose `--rpg-frame-color` sur la face.
  assert.match(duel, /function cardFrameStyle\(carte\) \{\s*return \{ '--rpg-frame-color': cardFrameColor\(carte\) \};/);
  // Le catalogue n'avait pas cette couleur : il serait resté au repli clair.
  assert.match(
    duel,
    /className=\{`rpg-card-catalogue__art \$\{cardFrameClass\(carte\)\} \$\{cardMotifClass\(carte\)\}`\}\s*style=\{cardFrameStyle\(carte\)\}/,
    'l’art du catalogue porte la couleur de son élément',
  );
  // L'atelier et le guide la posent aussi, en style en ligne.
  assert.match(lire('RpgDeckAtelier.jsx'), /'--rpg-frame-color': cardFrameColor\(carte\)/);
  // La vignette de l'assistant de deck ferme la liste : elle n'avait aucun cadre.
  assert.match(
    atelier,
    /\.rpg-assistant__carte-art \{[^}]*border: var\(--rpg-card-filet, 2px\) solid transparent;[^}]*var\(--rpg-frame-gradient, linear-gradient\(var\(--rpg-frame-color/,
    'l’assistant de deck porte le filet et la matière de l’élément',
  );
  assert.match(lire('RpgCardGuide.jsx'), /'--rpg-frame-color': cardFrameColor\(carte\)/);
  assert.match(lire('RpgDeckAssistant.jsx'), /'--rpg-frame-color': cardFrameColor\(carte\)/);
});

test('au doigt, le filet reste — la feuille tactile ne le retire plus', () => {
  assert.match(
    mobile,
    /\.rpg-battle\.rpg-battle--touch \[class\*="rpg-card--frame-"\]\[class\] \{\s*border-width: var\(--rpg-card-filet, 2px\);/,
  );
  assert.match(
    mobile,
    /\.rpg-battle--touch \.rpg-hand \.rpg-hand__card,\s*\n\.rpg-battle--touch \.card-row \.rpg-card,\s*\n\.rpg-battle--touch \.rpg-terrain \{\s*\n\s*border-width: var\(--rpg-card-filet, 2px\);/,
  );
  assert.doesNotMatch(mobile, /background-image:\s*none;/, 'la feuille tactile ne coupe plus la matière');
});
