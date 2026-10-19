import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mythicArrivals, playMythicImpact } from '../src/games/rpgMythicImpact.js';
const lookup = (id) => ({ rarity: id === 'legend' ? 'mythique' : 'rare' });
const a = { id: 'a', carteId: 'legend' };
const b = { id: 'b', carteId: 'ordinary' };
test('only new mythical entities arrive; stable renders and removal do not replay', () => {
  assert.deepEqual(mythicArrivals([], [a, b], lookup), [a]);
  assert.deepEqual(mythicArrivals([a, b], [{ ...a }, b], lookup), []);
  assert.deepEqual(mythicArrivals([a, b], [b], lookup), []);
  assert.deepEqual(mythicArrivals([a], [a, { ...a, id: 'c' }], lookup), [{ ...a, id: 'c' }]);
});
test('cinematic cleans up its layers and animations; reduced motion never shakes', () => {
  const dom = new JSDOM('<div id="table"><button data-entity-id="a"></button></div>');
  globalThis.document = dom.window.document;
  try {
    const table = document.querySelector('#table');
    const card = table.firstElementChild;
    let cancelled = 0;
    let animated = 0;
    const sounds = [];
    card.animate = () => { animated++; return { cancel() { cancelled++; } }; };
    table.animate = () => { throw new Error('no shake before impact / in reduced mode'); };
    const cancel = playMythicImpact(table, card, (name) => sounds.push(name));
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__cracks path').length, 9);
    assert.equal(table.querySelector('.rpg-mythic-impact').getAttribute('aria-hidden'), 'true');
    cancel();
    assert.equal(table.children.length, 1);
    assert.equal(cancelled, 1);
    assert.deepEqual(sounds, []);
    const stop = playMythicImpact(table, card, (name) => sounds.push(name), true);
    assert.ok(table.querySelector('.is-reduced'));
    assert.deepEqual(sounds, ['mythic_impact']);
    stop();
    assert.equal(animated, 2);
    assert.equal(cancelled, 2);
  } finally { dom.window.close(); delete globalThis.document; }
});
