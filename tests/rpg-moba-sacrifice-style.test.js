import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const css = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const selecteur = '.moba .moba__sacrifice-zone';

function fixture() {
  const cercle = `<div class="rpg-cercle-magique"><span class="rpg-cercle-magique__soleil"></span>
    <svg class="rpg-invocation-sceau"><g class="rpg-invocation-sceau__orbite--interne"></g><g class="rpg-invocation-sceau__coeur"></g></svg></div>`;
  const dom = new JSDOM(`<!doctype html><style></style><div class="moba"><div class="moba__sacrifice-zone">${cercle}</div></div><div class="classique">${cercle}</div>`);
  dom.window.document.querySelector('style').textContent = `${css('rpg-battle.css')}\n${css('rpg-moba.css')}`;
  return dom;
}

test('le sacrifice MOBA est violet sans modifier le cercle doré classique', () => {
  const dom = fixture();
  try {
    const { document, getComputedStyle } = dom.window;
    const propriete = (selector, property) => getComputedStyle(document.querySelector(selector)).getPropertyValue(property);
    assert.equal(propriete('.moba .rpg-invocation-sceau', 'stroke'), 'rgb(200, 139, 245)');
    assert.equal(propriete('.moba .rpg-invocation-sceau__orbite--interne', 'stroke'), 'rgb(230, 195, 255)');
    assert.equal(propriete('.moba .rpg-invocation-sceau__coeur', 'stroke'), 'rgb(244, 229, 255)');
    assert.match(propriete('.moba .rpg-cercle-magique__soleil', 'box-shadow'), /171, 92, 232/);
    assert.equal(propriete('.classique .rpg-invocation-sceau', 'stroke'), 'rgb(232, 200, 120)');
    assert.match(propriete('.classique .rpg-cercle-magique__soleil', 'box-shadow'), /225, 175, 65/);
    assert.equal(propriete('.moba .rpg-invocation-sceau', 'width'), '155%');
    assert.equal(propriete('.classique .rpg-invocation-sceau', 'width'), '155%');
    assert.equal(propriete('.moba .rpg-cercle-magique', 'pointer-events'), 'none');
  } finally { dom.window.close(); }
});

test('sur mobile portrait ou paysage, seul le dessin MOBA est légèrement réduit', () => {
  const dom = fixture();
  try {
    const regles = [...dom.window.document.styleSheets[0].cssRules];
    const media = regles.find((rule) => rule.conditionText?.includes('max-device-width: 700px')
      && [...rule.cssRules].some((inner) => inner.selectorText === `${selecteur} .rpg-invocation-sceau`));
    assert.ok(media, 'la règle couvre les petits écrans et les téléphones tactiles en paysage');
    assert.match(media.conditionText, /max-width: 700px/);
    assert.match(media.conditionText, /pointer: coarse/);
    const sceau = [...media.cssRules].find((rule) => rule.selectorText === `${selecteur} .rpg-invocation-sceau`);
    const halo = [...media.cssRules].find((rule) => rule.selectorText === `${selecteur} .rpg-cercle-magique__soleil`);
    assert.equal(sceau.style.width, '130%');
    assert.equal(halo.style.width, '46%'); assert.equal(halo.style.height, '46%');
    assert.equal(sceau.style.animation, ''); assert.equal(halo.style.animation, '');
    assert.ok(![...media.cssRules].some((rule) => rule.selectorText === `${selecteur} .rpg-cercle-magique`),
      'le calque centré sur la case et son animation ne sont pas modifiés');
  } finally { dom.window.close(); }
});
