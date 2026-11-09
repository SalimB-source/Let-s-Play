import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

test('les voies latérales et la main MOBA disposent de plus d’espace', () => {
  const dom = new JSDOM(`<style>${css}</style><div class="moba"><div class="moba__lanes">${[2, 1, 2].map((nombre) => `<section class="moba__lane"><div class="moba__side"><div class="moba__slots">${'<div class="moba__real-slot"></div>'.repeat(nombre)}</div></div></section>`).join('')}</div><div class="moba__hand"><div class="moba__hand-cards">${'<div class="moba__hand-item"></div>'.repeat(6)}</div></div></div>`, { virtualConsole: new VirtualConsole() });
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
    assert.equal(style('.moba__slots').gap, 'clamp(8px, 1.2vw, 18px)');
    assert.equal(style('.moba__lane:first-child .moba__slots').transform, 'translateX(calc(-1 * clamp(4px, 1.6vw, 22px)))');
    assert.equal(style('.moba__lane:nth-child(2) .moba__slots').transform, 'none');
    assert.equal(style('.moba__lane:last-child .moba__slots').transform, 'translateX(clamp(4px, 1.6vw, 22px))');
    assert.equal(style('.moba__hand-cards').gap, 'clamp(12px, 1.5vw, 22px)');
    assert.equal(style('.moba__hand-item').flex, '0 1 min(7.65vw, 12.75vh, 105px)');
    assert.match(style('.moba__hand-item').maxWidth, /^calc\(14\.333% - /);
  } finally { dom.window.close(); }
});

test('le plateau n’est plus assombri et ses cartes grandissent selon le format', () => {
  assert.doesNotMatch(css, /\.moba::(?:before|after)\s*\{/);
  assert.match(css, /--moba-card-size:\s*min\(11vw, 15\.5vh, 145px\)/);
  assert.match(css, /--moba-card-size:\s*min\(14\.3vw, 16\.5vh, 99px\)/);
  assert.match(css, /--moba-card-size:\s*min\(18\.7vw, 12\.1vh, 88px\)/);
});
