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

/* Le filet de couleur : 3 px de la teinte de l'élément, partout où une face de
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

test('le filet fait 3 px, et c’est la seule épaisseur de cadre', () => {
  assert.match(battle, /--rpg-card-filet:\s*3px;/, 'la variable du filet est déclarée sur .rpg-battle');
  for (const [nom, css] of Object.entries({ battle, guide, atelier })) {
    assert.match(
      css,
      /border-width:\s*var\(--rpg-card-filet,\s*3px\)/,
      `${nom} : les faces prennent le filet, pas l'anneau orné`,
    );
  }
});

test('au clavier, plus aucune face ne perd son cadre (fin de l’expérimentation)', () => {
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

test('au doigt, plus aucun cadre : le retrait ne vit que dans la feuille tactile', () => {
  // La décision est inverse de celle du clavier : sur téléphone et dans l'APK,
  // les faces n'ont plus d'anneau du tout. Le duel porte la classe tactile...
  assert.match(
    mobile,
    /\.rpg-battle\.rpg-battle--touch \[class\*="rpg-card--frame-"\]\[class\] \{\s*border-width: 0 !important;/,
    'la coque tactile retire le cadre de toutes les faces qu’elle contient',
  );
  assert.match(
    mobile,
    /\.rpg-battle--touch \.rpg-hand \.rpg-hand__card,\s*\n\.rpg-battle--touch \.card-row \.rpg-card,\s*\n\.rpg-battle--touch \.rpg-terrain \{\s*\n\s*border-width: 0 !important;/,
    'la main, la table et les terrains du doigt partagent le même retrait',
  );
  // ...et le menu (atelier, catalogue), qui n'a pas cette classe, passe par la
  // même condition que celle qui la pose : doigt, stylet ou fenêtre étroite.
  assert.match(
    mobile,
    /@media \(pointer: coarse\), \(max-width: 1100px\) \{[\s\S]*?\.rpg-battle \.rpg-atelier__carte-art\[class\*="rpg-card--frame-"\]\[class\],\s*\n\s*\.rpg-battle \.rpg-card-catalogue__art\[class\*="rpg-card--frame-"\]\[class\] \{\s*\n\s*border-width: 0 !important;/,
    'au doigt, l’atelier et le catalogue perdent aussi leur filet',
  );
  // Le clavier, lui, ne bouge pas : les gabarits et le filet de 3 px restent
  // dans `rpg-battle.css`, et aucune règle tactile ne les redéfinit.
  assert.match(battle, /--rpg-card-filet:\s*3px;/, 'le filet de 3 px reste la mesure du clavier');
  assert.doesNotMatch(
    mobile,
    /border-width:\s*var\(--rpg-card-filet/,
    'la feuille tactile ne redessine plus aucun filet : elle les retire tous',
  );
  // Le retrait ne touche que l'épaisseur : pastilles, coûts et états gardent
  // leurs propres bords.
  assert.match(mobile, /\.rpg-battle--touch \.rpg-hand__card--img \.rpg-card-element-badge \{ width: 16px; border-width: 1\.5px;/,
    'la pastille d’élément garde son bord au doigt');
});

test('la cascade tranche : 0 px au doigt, 3 px au clavier', () => {
  // Les feuilles lues ne disent pas ce que la carte reçoit : jsdom applique la
  // cascade réelle (`!important` et spécificité compris) sur les deux coques.
  const bordure = (coque) => {
    const dom = new JSDOM(
      `<!doctype html><html><head><style>${battle}</style><style>${mobile}</style></head>
       <body><div class="${coque}">
         <div class="rpg-hand"><button class="rpg-hand__card rpg-hand__card--img rpg-card--frame-braise">
           <span class="rpg-card-element-badge"></span></button></div>
         <div class="card-row"><div class="rpg-card rpg-card--img rpg-card--frame-eau"></div></div>
         <div class="rpg-terrain rpg-card--frame-sable"></div>
       </div></body></html>`,
      { pretendToBeVisual: true },
    );
    const lire = (selecteur) => dom.window.getComputedStyle(dom.window.document.querySelector(selecteur));
    const recu = {
      main: lire('.rpg-hand__card').borderTopWidth,
      table: lire('.rpg-card').borderTopWidth,
      terrain: lire('.rpg-terrain').borderTopWidth,
      pastille: lire('.rpg-card-element-badge').borderTopWidth,
    };
    dom.window.close();
    return recu;
  };
  const tactile = bordure('rpg-battle rpg-battle--touch');
  assert.equal(tactile.main, '0px', 'au doigt, la carte en main n’a plus de cadre');
  assert.equal(tactile.table, '0px', 'au doigt, la carte posée n’a plus de cadre');
  assert.equal(tactile.terrain, '0px', 'au doigt, le terrain n’a plus de cadre');
  assert.notEqual(tactile.pastille, '0px', 'le retrait ne mange pas la pastille d’élément, qui garde son bord');

  const clavier = bordure('rpg-battle');
  assert.equal(clavier.main, '3px', 'au clavier, la carte en main garde le filet de 3 px');
  assert.equal(clavier.table, '3px', 'au clavier, la carte posée garde le filet de 3 px');
  assert.equal(clavier.terrain, '3px', 'au clavier, le terrain garde le filet de 3 px');
});

test('le filet garde la couleur et la matière de l’élément, sans le motif', () => {
  for (const [nom, css] of Object.entries({ battle, mobile, guide, atelier })) {
    assert.match(css, /--rpg-frame-motif:\s*none;/, `${nom} : le motif se tait dans 3 px`);
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
  assert.match(battle, /\.rpg-card--frame-hybride-braise-eau\s*\{\s*--rpg-frame-gradient:\s*linear-gradient\(to bottom right, #e0412a 50%, #3f9fe8 50%\);/);
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
  // L'assistant ne dessine plus de vignettes (il ne demande que couleurs et
  // style) : ses cartes de style n'ont pas de face à encadrer, le filet se
  // vérifie donc sur les deux seules grilles de cartes restées dans l'atelier.
  assert.match(
    atelier,
    /\.rpg-atelier__carte-art\[class\*="rpg-card--frame-"\] \{\s*border-width: var\(--rpg-card-filet, 3px\)/,
    'les vignettes de l’atelier gardent le filet de 3 px',
  );
  assert.match(lire('RpgCardGuide.jsx'), /'--rpg-frame-color': cardFrameColor\(carte\)/);
});

test('la diagonale des hybrides passe exactement par les coins', () => {
  const bloc = battle.slice(
    battle.indexOf('.rpg-card--frame-hybride-braise-eau {'),
    battle.indexOf('/* Mythique : le zellige de Bab El'),
  );
  const regles = bloc.match(/\.rpg-card--frame-hybride-[a-z-]+ \{/g) ?? [];
  assert.ok(regles.length >= 20, `le bloc hybride porte ${regles.length} règles`);
  assert.equal(
    (bloc.match(/--rpg-frame-gradient: linear-gradient\(to bottom right,/g) ?? []).length,
    regles.length,
    'chaque hybride passe par les coins, pas par un angle fixe',
  );
  // Un angle fixe ne touche les coins que sur un carré : sur une face 4:5, la
  // séparation tombait à 10 % des bords et la première couleur n'atteignait
  // jamais son coin.
  assert.doesNotMatch(bloc, /135deg/, 'plus aucun angle fixe dans les cadres hybrides');
  // La pastille de coût hybride suit la même diagonale.
  const coût = cardHybridGradient({ colors: ['sable', 'braise'] });
  assert.ok(coût.startsWith('linear-gradient(to bottom right,'), coût);
});


