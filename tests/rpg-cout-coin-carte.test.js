import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const css = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css']
  .map(nom => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')).join('\n');

test('coût aligné sur les effets, couleurs et compteurs dessous sur chaque surface, PC et tactile', () => {
  const surfaces = ['rpg-card--img', 'rpg-hand__card--img', 'rpg-mulligan__card', 'rpg-hover-card-preview__face', 'rpg-card-catalogue__art', 'rpg-atelier__carte-art'];
  const fixtures = [];
  for (const touch of [false, true]) for (const surface of surfaces) for (const hybride of [false, true]) {
    const id = `carte-${fixtures.length}`;
    fixtures.push({ id, touch, surface, hybride });
  }
  const html = fixtures.map(({ id, touch, surface, hybride }) => `<div class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}"><div class="card-row"><div id="${id}" class="${surface} rpg-card rpg-hand__card">
    <span class="rpg-card-element-badge is-plaque ${hybride ? 'rpg-card-element-badge--hybride' : ''}"></span>
    <header class="rpg-card__title rpg-hand__title"><span class="rpg-mana-cost is-compact is-plaque"><b>7</b></span></header>
    <span class="rpg-card__compteurs"></span>
  </div></div></div>`).join('');
  const dom = new JSDOM(`<style>${css}</style>${html}<div class="rpg-battle"><div id="terrain" class="rpg-card-catalogue__art"><span class="rpg-card-element-badge is-plaque"></span></div></div>`, { virtualConsole: new VirtualConsole() });
  const style = el => dom.window.getComputedStyle(el);
  for (const { id, surface, hybride } of fixtures) {
    const carte = dom.window.document.getElementById(id);
    const cout = style(carte.querySelector('.rpg-mana-cost'));
    const couleur = style(carte.querySelector('.rpg-card-element-badge'));
    const compteur = style(carte.querySelector('.rpg-card__compteurs'));
    assert.equal(cout.top, 'var(--rpg-card-element-marker-top, 5%)', surface);
    assert.equal(cout.left, '0px', surface);
    assert.equal(cout.position, 'absolute');
    assert.equal(cout.transform, 'translateX(-36%)');
    assert.equal(cout.width, 'var(--rpg-cout-taille, 26.88px)');
    assert.equal(cout.height, cout.width);
    assert.equal(couleur.top, 'calc(var(--rpg-card-element-marker-top, 5%) + var(--rpg-cout-taille, 26.88px) + 6px)');
    assert.match(couleur.width, /^var\(--rpg-plaque-taille,/);
    assert.equal(compteur.top, hybride
      ? 'calc(var(--rpg-card-element-marker-top, 5%) + var(--rpg-cout-taille, 26.88px) + 2 * var(--rpg-plaque-taille, 24px) + 14px + var(--rpg-card-counter-size) * .21)'
      : 'calc(var(--rpg-card-element-marker-top, 5%) + var(--rpg-cout-taille, 26.88px) + var(--rpg-plaque-taille, 24px) + 12px + var(--rpg-card-counter-size) * .21)');
  }
  assert.equal(style(dom.window.document.querySelector('#terrain .rpg-card-element-badge')).top, 'var(--rpg-card-element-marker-top, 5%)');
  assert.match(css, /--rpg-cout-taille: calc\(var\(--rpg-plaque-taille, 24px\) \* 1.12\)/);
  assert.ok(52 * 1.12 * .36 < 22, 'le coût agrandi tient dans la marge de débord de l’aperçu');
  dom.window.close();
});
