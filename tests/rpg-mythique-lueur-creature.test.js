import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

test('les créatures et héros mythiques ne reçoivent plus le halo de rareté', () => {
  assert.match(page, /const estCreature = carte\.kind === 'creature' \|\| carte\.kind === 'hero';/);
  assert.match(page, /const mythiqueJouable = baseJouable && estMythique && !estCreature;/);
  assert.match(page, /embuscadeJouable \? 'is-special-ambush' : ''/);
  const dom = new JSDOM(`<style>${css}</style>
    <button class="rpg-hand__card is-playable rpg-card--mythique" id="creature"></button>
    <button class="rpg-hand__card is-playable is-mythique-jouable" id="sort"></button>
    <button class="rpg-hand__card is-playable rpg-card--mythique is-special-ambush" id="speciale"></button>`);
  try {
    const halo = id => dom.window.getComputedStyle(dom.window.document.getElementById(id)).getPropertyValue('--rpg-play-halo').replaceAll(' ', '');
    assert.equal(halo('creature'), '0,180,255');
    assert.equal(halo('sort'), '255,152,14');
    assert.equal(halo('speciale'), '255,152,14');
  } finally { dom.window.close(); }
});
