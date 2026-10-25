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

test('au doigt, les icônes d’effets de la main restent des badges de 12 px', () => {
  const { colonne, badge, glyphe } = mesurerMain(true);
  assert.equal(colonne.width, '14px', 'la colonne ne prend plus les 22 px du disque de coût');
  assert.equal(colonne.gap, '2px', 'les badges se serrent sans se coller');
  assert.equal(badge.minWidth, '12px', 'le badge ne revient pas à 20 px');
  assert.equal(badge.minHeight, '12px', 'le badge reste rond, pas ovale');
  assert.equal(badge.padding, '1px', 'le contour garde une respiration minimale');
  assert.equal(badge.border, '1px', 'le liseré suit la taille du badge');
  assert.equal(glyphe.width, '8px', 'le glyphe rentre dans le badge');
  assert.equal(glyphe.height, '8px', 'le glyphe reste carré');
});

test('sur bureau, les badges de la main gardent leur taille de lecture', () => {
  const { badge } = mesurerMain(false);
  assert.equal(badge.minWidth, '20px', 'le correctif mobile ne rétrécit pas le plateau PC');
  assert.equal(badge.minHeight, '20px', 'la hauteur suit');
  assert.equal(badge.padding, '3px', 'le contour du bureau reste inchangé');
});
