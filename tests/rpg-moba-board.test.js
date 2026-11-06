import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('local board renders six health values and can pass a turn', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    let left = false;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => { left = true; } })));
    assert.equal(document.querySelectorAll('.moba__health strong').length, 6);
    assert.equal(document.querySelectorAll('.moba__lane').length, 3);
    assert.equal(document.querySelectorAll('.moba__slot').length, 10);
    const click = async (button) => act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 1/i);
    const firstCard = document.querySelector('.moba__mulligan-card');
    await click(firstCard);
    assert.equal(firstCard.getAttribute('aria-pressed'), 'true');
    await click(document.querySelector('.moba__mulligan > .moba__primary'));
    assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 2/);
    assert.equal(document.querySelector('.moba__mulligan'), null);
    await click(document.querySelector('[role=dialog] button'));
    assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 2/i);
    await click(document.querySelector('.moba__mulligan > .moba__primary'));
    assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 1/);
    await click(document.querySelector('[role=dialog] button'));
    await click([...document.querySelectorAll('.moba__choice button')].find((b) => b.textContent.includes('neige')));
    assert.match(document.querySelector('.moba__status').textContent, /neige 1/);
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Fin du tour')));
    assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 2/);
    await click(document.querySelector('[role=dialog] button'));
    assert.match(document.querySelector('.moba__status').textContent, /Joueur 2/);
    await click(document.querySelector('.moba__header button'));
    assert.equal(left, true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('two local players can summon, pass the device and conquer two lanes through the UI', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const initialiser = () => {
      const deck = Array(30).fill('jarl-au-marteau-de-guerre');
      const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, joueurCouleurs: ['neige', 'sable', 'braise'], sorcierCouleurs: ['neige', 'sable', 'braise'], rng: () => .5 });
      duel.joueur.mana.neige = 10; // Controlled combat fixture; the printed creature stats remain unchanged.
      return duel;
    };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    const click = async (button) => {
      assert.ok(button, 'button is present');
      assert.equal(button.disabled, false, `button is enabled: ${button.textContent || button.getAttribute('aria-label')}`);
      await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };
    const primary = () => document.querySelector('[role=dialog] .moba__primary');
    const buttonWith = (selector, text) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(text));
    await click(primary()); // first player keeps their cards
    await click(primary()); // handoff
    await click(primary()); // second player keeps their cards
    await click(primary()); // first player's turn
    await click(buttonWith('.moba__choice button', 'neige'));
    for (const lane of ['Voie gauche', 'Voie centrale']) {
      await click(buttonWith('.moba__card', 'Jarl'));
      await click([...document.querySelectorAll('.moba__slot')].find((b) => b.getAttribute('aria-label').startsWith(`${lane}, Joueur 1`) && !b.disabled));
    }
    const fin = async () => {
      await click(buttonWith('.moba__controls button', 'Fin du tour'));
      while (!document.querySelector('[role=dialog]') && /à défausser/.test(document.querySelector('.moba__hint').textContent)) {
        await click(document.querySelector('.moba__card'));
      }
    };
    const pass = async () => click(primary());
    const mana = async () => click(buttonWith('.moba__choice button', 'neige'));
    await fin(); await pass(); await mana(); // second player's turn
    for (let turn = 0; turn < 4; turn++) {
      await fin(); await pass(); await mana(); // back to player one
      const attackers = [...document.querySelectorAll('.moba__slot.has-creature')].filter((b) => !b.disabled);
      assert.equal(attackers.length, 2);
      for (const attacker of attackers) await click(attacker);
      await click(buttonWith('.moba__controls button', 'Déclarer'));
      assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 2/);
      assert.equal(document.querySelector('.moba__hand'), null); // attacking hand stays hidden during defence
      await pass();
      await click(buttonWith('.moba__controls button', 'Résoudre'));
      if (turn < 3) {
        assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 1/);
        await pass(); await fin(); await pass(); await mana();
      }
    }
    assert.match(document.querySelector('[role=dialog]').textContent, /Victoire de Joueur 1/);
    assert.equal(document.querySelectorAll('.moba__lane.is-conquered').length, 2);
    await click(buttonWith('[role=dialog] button', 'Rejouer'));
    assert.match(document.querySelector('[role=dialog]').textContent, /main de départ/i);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
