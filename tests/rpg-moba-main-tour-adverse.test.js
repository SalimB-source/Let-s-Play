import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('la main du joueur reste visible mais injouable pendant le tour de l’IA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      const deck = Array(30).fill('ashigaru-des-braises');
      duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
      duel.joueur.main = ['ghul-des-cendres', 'ashigaru-des-braises', 'ashigaru-des-braises', 'ashigaru-des-braises', 'ashigaru-des-braises'];
      return duel;
    };
    const rendu = {
      ManaCost: ({ carte }) => React.createElement('span', null, carte.cost),
      CardStatIcon: () => React.createElement('span', null, '◆'),
    };
    const props = { initialiser, rendu, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => {
      assert.ok(button && !button.disabled, 'commande disponible');
      await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    const cartes = () => [...document.querySelectorAll('.moba__hand .moba__real-hand')];
    assert.equal(cartes().length, 5);
    assert.equal(cartes()[0].dataset.cardId, 'ghul-des-cendres');
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
    assert.ok(duel.finDeTour, 'l’IA répond à la fin du tour du joueur');
    assert.ok(cartes().every((card) => card.disabled), 'main visible, sans action pendant la réponse de l’IA');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.tour, 'sorcier');
    assert.equal(document.querySelector('.moba__hand').getAttribute('aria-label'), 'Votre main');
    assert.deepEqual(cartes().map((card) => card.dataset.cardId), duel.joueur.main.slice(0, 6));
    assert.ok(cartes().every((card) => card.disabled), 'aucune pose normale pendant l’action de l’IA');
    assert.ok(document.querySelector('.moba__hidden-hand'), 'la main adverse reste cachée');
    assert.equal(document.querySelector('.moba__opponent-hand'), null, 'le bandeau ne remplace plus nos cartes');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
