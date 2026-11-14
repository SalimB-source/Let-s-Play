import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { RPG_DECKS_PRECONSTRUITS } from '../src/games/rpgCards.js';
import { RPG_DECK_STORAGE_KEY } from '../src/games/rpgDeckChoice.js';

// Smoke test du rendu réel, pas seulement de la source des listes : les anciens
// IDs de campagne ne doivent pas occuper l'étagère à la place des douze thèmes.
test('le Sablier affiche les douze decks, dont les préparations d’Ascension, et garde le choix après rechargement', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true,
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  dom.window.scrollTo = () => {};
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  dom.window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent',
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  });
  let root;
  try {
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    root = createRoot(document.getElementById('root'));
    const afficher = async () => {
      await act(async () => { root.render(React.createElement(RpgDuelPage, { rng: () => 0.999 })); });
      const deckTab = [...document.querySelectorAll('.rpg-mode-menu__switch button')]
        .find((button) => button.textContent.includes('Deck'));
      assert.ok(deckTab, 'onglet Deck disponible');
      await act(async () => deckTab.click());
      const choix = [...document.querySelectorAll('.rpg-deck-choice:not(.rpg-deck-choice--neuf)')];
      assert.deepEqual(choix.map((item) => item.querySelector('strong').textContent),
        RPG_DECKS_PRECONSTRUITS.map((deck) => deck.name));
      assert.ok(choix.every((item) => item.textContent.includes('DECK THÉMATIQUE')));
      assert.ok(choix.every((item) => !item.querySelector('.rpg-deck-choice__select').disabled));
      return choix;
    };
    const choix = await afficher();
    for (const theme of RPG_DECKS_PRECONSTRUITS.filter(d => d.id.startsWith('preconstruit-ascension-'))) {
      const boite = choix.find(n => n.querySelector('strong').textContent === theme.name);
      assert.ok(boite.querySelector('.rpg-deckbox__art').style.backgroundImage.includes(theme.boxArt));
      await act(async () => boite.querySelector('.rpg-deck-choice__select').click());
      assert.equal(JSON.parse(dom.window.localStorage.getItem(RPG_DECK_STORAGE_KEY)).deckId, theme.id);
    }
    await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await afficher();
    assert.match(document.querySelector('.rpg-deck-choice.is-active')?.textContent ?? '',
      new RegExp(RPG_DECKS_PRECONSTRUITS.at(-1).name));

  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
  }
});
