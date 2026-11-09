import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

for (const flank of ['left', 'right']) for (const owner of ['joueur', 'sorcier']) {
  test(`PV du joueur sous les cartes, y compris quand ${owner} relie le centre à ${flank}`, () => {
    const lanes = ['left', 'center', 'right'].map((lane) => `<section class="moba__lane">${['sorcier', 'joueur'].map((side) => `<div class="moba__side moba__side--${side}${lane === flank && side === owner ? ' is-joined-flank' : ''}"><div class="moba__health"></div><div class="moba__slots"></div></div>`).join('')}</section>`).join('');
    const dom = new JSDOM(`<style>${css}</style><main class="moba"><div class="moba__lanes" data-moba-joined-lane="${flank}" data-moba-joined-side="${owner}">${lanes}</div></main>`, { virtualConsole: new VirtualConsole() });
    try {
      const style = (element) => dom.window.getComputedStyle(element);
      for (const lane of dom.window.document.querySelectorAll('.moba__lane')) {
        const player = lane.querySelector('.moba__side--joueur');
        const opponent = lane.querySelector('.moba__side--sorcier');
        assert.equal(style(player.querySelector('.moba__slots')).order, '1');
        assert.equal(style(player.querySelector('.moba__health')).order, '2');
        assert.equal(style(player.querySelector('.moba__health')).marginTop, '4px');
        assert.notEqual(style(opponent.querySelector('.moba__health')).order, '2');
        if (player.classList.contains('is-joined-flank')) {
          assert.equal(style(player.querySelector('.moba__health')).position, 'absolute');
          assert.equal(style(player.querySelector('.moba__health')).top, 'auto');
          assert.equal(style(player.querySelector('.moba__health')).bottom, '0px');
        }
        if (opponent.classList.contains('is-joined-flank')) {
          assert.equal(style(opponent.querySelector('.moba__health')).top, '0px');
        }
      }
    } finally { dom.window.close(); }
  });
}
