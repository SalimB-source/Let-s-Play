import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * Les badges d'effets de la main sur mobile — `tests/rpg-icones-main-mobile.test.js`
 *
 * `rpg-mana-essai.css` arrivait après `rpg-mobile.css` avec les mêmes 20 px que
 * le bureau : ses règles de main étaient des doublons de `effet-icons.css`, mais
 * avec une spécificité égale aux règles mobiles, donc elles les écrasaient. On
 * charge ici les feuilles dans l'ordre du duel et on mesure le résultat — pas
 * seulement la présence d'une règle dans un fichier.
 *
 * jsdom n'évalue pas les media queries : on passe par la classe
 * `.rpg-battle--touch`, qui porte les mêmes mesures sur l'APK et la WebView.
 */
const FEUILLES = [
  'rpg-battle.css',
  'rpg-mobile.css',
  'rpg-story.css',
  'rpg-deckbox.css',
  'rpg-mana-essai.css',
  'rpg-soins.css',
  'rpg-vie-compteurs.css',
  'effet-icons.css',
];

const css = FEUILLES
  .map((nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8'))
  .join('\n');

function mesurerMain(touch) {
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body>
    <div class="rpg-battle${touch ? ' rpg-battle--touch' : ''}">
      <div class="rpg-hand">
        <div class="rpg-hand__card rpg-hand__card--img">
          <span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--main">
            <span class="rpg-card-icone">
              <svg class="rpg-effet-icone" width="12" height="12"></svg>
            </span>
          </span>
        </div>
      </div>
    </div>
  </body></html>`, { pretendToBeVisual: true, virtualConsole: new VirtualConsole() });

  const { getComputedStyle, document } = dom.window;
  const colonne = getComputedStyle(document.querySelector('.rpg-card-icones'));
  const badge = getComputedStyle(document.querySelector('.rpg-card-icone'));
  const glyphe = getComputedStyle(document.querySelector('.rpg-effet-icone'));
  const resultat = {
    colonne: { width: colonne.width, gap: colonne.gap },
    badge: {
      minWidth: badge.minWidth,
      minHeight: badge.minHeight,
      padding: badge.padding,
      border: badge.borderTopWidth,
    },
    glyphe: { width: glyphe.width, height: glyphe.height },
  };
  dom.window.close();
  return resultat;
}

test('au doigt, les pierres d’effets de la main restent lisibles : 18 px', () => {
  const { colonne, badge, glyphe } = mesurerMain(true);
  assert.equal(colonne.width, 'var(--rpg-plaque-taille)', 'la colonne épouse la pierre');
  assert.equal(colonne.gap, '2px', 'les badges se serrent sans se coller');
  // La pierre d'emblème occupe tout le badge : plus de pastille ronde ni de
  // liseré CSS (la pierre porte son propre contour), et un pictogramme de 18 px
  // — un cinquième d'une carte mobile de 83 px, lisible sans coller l'écran.
  assert.equal(badge.minWidth, 'var(--rpg-plaque-taille)', 'la pierre remplit le badge');
  assert.equal(badge.minHeight, 'var(--rpg-plaque-taille)', 'la pierre reste carrée, pas ovale');
  assert.equal(badge.padding, '0px', 'plus de respiration : la pierre est le badge');
  assert.equal(badge.border, '0px', 'le contour est dessiné dans la pierre');
  assert.equal(glyphe.width, 'var(--rpg-plaque-taille)', 'le pictogramme remplit la pierre');
  assert.equal(glyphe.height, 'var(--rpg-plaque-taille)', 'le pictogramme reste carré');
});

test('sur bureau, les badges de la main passent à 24 px', () => {
  const { colonne, badge } = mesurerMain(false);
  assert.equal(colonne.width, 'var(--rpg-plaque-taille)', 'la colonne épouse la pierre');
  assert.equal(badge.minWidth, 'var(--rpg-plaque-taille)', 'la pierre prend un cinquième de la carte');
  assert.equal(badge.minHeight, 'var(--rpg-plaque-taille)', 'la hauteur suit');
  assert.equal(badge.padding, '0px', 'sur bureau aussi, la pierre est le badge');
});
