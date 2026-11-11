import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css']
  .map(f => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8')).join('\n');

test('le gel ne rogne ni le coût dans le coin ni les couleurs et effets sur les bords', () => {
  const cas = [];
  for (const touch of [false, true]) for (const arme of [false, true]) for (const hybride of [false, true]) {
    const id = `gel-${cas.length}`;
    cas.push({ id, touch, arme, hybride });
  }
  const html = cas.map(({id, touch, arme, hybride}) => `<div class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}" data-mode-mana="essai"><div class="card-table"><div class="card-row"><button id="${id}" class="rpg-card rpg-card--img is-frozen ${arme ? 'has-arme' : ''}">
    <img class="rpg-card__img"><span class="rpg-card__frost"><span class="rpg-card__frost-cracks"></span></span>
    <span class="rpg-card-element-badge is-plaque ${hybride ? 'rpg-card-element-badge--hybride' : ''}"></span>
    <header class="rpg-card__title"><span class="rpg-mana-cost is-compact is-plaque"><b>3</b></span></header>
    <span class="rpg-card-icones rpg-card-icones--colonne"><span class="rpg-card-icone"></span></span>
  </button></div></div></div>`).join('');
  const dom = new JSDOM(`<style>${css}</style>${html}`, {virtualConsole: new VirtualConsole()});
  const style = e => dom.window.getComputedStyle(e);
  for (const {id} of cas) {
    const carte = dom.window.document.getElementById(id);
    assert.notEqual(style(carte).overflow, 'hidden', id);
    if (style(carte).overflow === 'clip') assert.ok(parseFloat(style(carte).getPropertyValue('overflow-clip-margin')) >= 22);
    assert.equal(style(carte.querySelector('.rpg-card__frost')).overflow, 'hidden', 'le givre ne sort pas de la face');
    assert.equal(style(carte.querySelector('.rpg-card__frost-cracks')).overflow, 'hidden');
    assert.equal(style(carte.querySelector('.rpg-card__img')).borderRadius, style(carte).borderRadius);
    const cout = style(carte.querySelector('.rpg-mana-cost'));
    assert.equal(cout.top, 'var(--rpg-card-element-marker-top, 5%)');
    assert.equal(cout.transform, 'translateX(-36%)');
    const effets = style(carte.querySelector('.rpg-card-icones'));
    assert.equal(effets.right, '0px');
    assert.equal(style(carte.querySelector('.rpg-card__img')).animation, 'none');
  }
  dom.window.close();
});
