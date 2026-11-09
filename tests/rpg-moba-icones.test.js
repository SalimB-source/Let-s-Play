import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css', 'rpg-moba.css']
  .map((nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')).join('\n');

test('les pierres MOBA reprennent celles du duel classique sans être rognées', () => {
  const face = (classe, icones = '') => `<button class="${classe}"><span class="rpg-card-icones rpg-card-icones--colonne ${icones}"><span class="rpg-card-icone"><svg class="rpg-effet-icone"></svg></span></span></button>`;
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle rpg-battle--moba"><div class="moba"><div class="moba__slots"><div class="moba__real-slot">${face('rpg-card rpg-card--img moba__slot')}</div></div><div class="moba__hand-item">${face('rpg-hand__card rpg-hand__card--img moba__real-hand', 'rpg-card-icones--main')}</div></div></div><div class="rpg-battle"><div class="card-row">${face('rpg-card rpg-card--img')}</div><div class="rpg-hand">${face('rpg-hand__card rpg-hand__card--img', 'rpg-card-icones--main')}</div></div>`, {virtualConsole: new VirtualConsole()});
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
    for (const [moba, classique] of [['.moba__real-slot', '.card-row'], ['.moba__hand-item', '.rpg-hand']]) {
      const colonne = style(`${moba} .rpg-card-icones`);
      const originale = style(`${classique} .rpg-card-icones`);
      assert.equal(colonne.getPropertyValue('--rpg-plaque-taille'), originale.getPropertyValue('--rpg-plaque-taille'));
      assert.equal(colonne.getPropertyValue('--rpg-plaque-bord'), originale.getPropertyValue('--rpg-plaque-bord'));
      assert.equal(colonne.transform, originale.transform);
    }
    for (const [selector, marge] of [['.moba__real-slot .rpg-card', '64px'], ['.moba__hand-item .rpg-hand__card', '40px']]) {
      assert.equal(style(selector).overflow, 'clip');
      assert.equal(style(selector).getPropertyValue('overflow-clip-margin'), marge);
    }
  } finally { dom.window.close(); }
});
