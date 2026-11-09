import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

test('les emblèmes des cartes posées en MOBA seuls sont réduits', () => {
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle--moba"><main class="moba">
    <div class="moba__slots"><button class="rpg-card rpg-card--img"><span class="rpg-card-icones rpg-card-icones--colonne"><span class="rpg-card-icone"><svg class="rpg-effet-icone"></svg></span></span><span class="rpg-card-element"></span></button></div>
    <div class="moba__hand"><button class="rpg-hand__card--img"><span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--main"></span></button></div>
    <div class="moba__preview-layer"><span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--apercu"></span></div>
  </main></div><div class="rpg-battle"><div class="moba__slots"><button class="rpg-card rpg-card--img"><span class="rpg-card-icones rpg-card-icones--colonne"></span></button></div></div>`);
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector)).getPropertyValue('--rpg-plaque-taille').replaceAll(/\s+/g, '');
    assert.equal(style('.rpg-battle--moba .moba__slots .rpg-card-icones'), 'clamp(11px,12cqw,19px)');
    assert.notEqual(style('.moba__hand .rpg-card-icones'), 'clamp(11px,12cqw,19px)');
    assert.notEqual(style('.moba__preview-layer .rpg-card-icones'), 'clamp(11px,12cqw,19px)');
    assert.notEqual(style('.rpg-battle:not(.rpg-battle--moba) .rpg-card-icones'), 'clamp(11px,12cqw,19px)');
  } finally { dom.window.close(); }
});
