import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('le bouton Retour de l’APK remonte les écrans du Sablier et reste au menu', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://let-s-play-nu.vercel.app/jeu/sablier-de-bab-el', pretendToBeVisual: true,
  });
  const ancienneFenetre = globalThis.window;
  const ancienDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.LetsPlayAndroid = { setPaysageSablier() {} };
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  dom.window.scrollTo = () => {};
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  let root;
  try {
    const { default: Page } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page)));
    assert.equal(typeof dom.window.letsPlayGameBack, 'function');
    assert.ok(document.querySelector('.rpg-battle.is-immersive'));
    assert.equal(document.querySelector('[aria-label="Quitter le plein écran"]'), null);
    assert.equal(document.querySelector('[aria-label="Jouer en plein écran"]'), null);
    const bouton = document.querySelector('button[aria-label="Catalogue"]');
    assert.ok(bouton, 'l’onglet Catalogue est présent');
    await act(async () => bouton.click());
    assert.ok(document.querySelector('.rpg-mode-menu--catalogue'));
    await act(async () => document.querySelector('button[aria-label="Deck"]').click());
    assert.ok(document.querySelector('.rpg-mode-menu--decks'));
    await act(async () => dom.window.letsPlayGameBack());
    assert.ok(document.querySelector('.rpg-mode-menu--catalogue'), 'Retour conserve l’écran précédent');
    await act(async () => dom.window.letsPlayGameBack());
    assert.ok(document.querySelector('.rpg-mode-menu--jouer'));
    await act(async () => dom.window.letsPlayGameBack());
    assert.ok(document.querySelector('.rpg-mode-menu--jouer'), 'Retour au menu ne quitte pas le jeu');
    assert.ok(document.querySelector('.rpg-battle.is-immersive'));
    const lancerMoba = document.querySelector('[aria-label="Jouer à MOBA — contre l’IA (BETA)"]');
    assert.ok(lancerMoba);
    await act(async () => lancerMoba.click());
    assert.ok(document.querySelector('.rpg-battle--moba'));
    const commencer = [...document.querySelectorAll('.moba__setup-actions button')]
      .find((element) => element.textContent.includes('Commencer le duel'));
    assert.ok(commencer);
    await act(async () => commencer.click());
    assert.ok(document.querySelector('.moba__mulligan-overlay'));
    await act(async () => dom.window.letsPlayGameBack());
    assert.ok(document.querySelector('.moba__quit-modal'), 'Retour demande confirmation pendant une partie');
    await act(async () => dom.window.letsPlayGameBack());
    assert.equal(document.querySelector('.moba__quit-modal'), null, 'Retour ferme la confirmation');
    await act(async () => dom.window.letsPlayGameBack());
    const quitter = [...document.querySelectorAll('.moba__quit-modal button')]
      .find((element) => element.textContent.includes('Quitter sans sauvegarder'));
    assert.ok(quitter);
    await act(async () => quitter.click());
    assert.ok(document.querySelector('.rpg-mode-menu--jouer'), 'Quitter le MOBA revient au menu du jeu');
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    globalThis.window = ancienneFenetre;
    globalThis.document = ancienDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete globalThis.ResizeObserver;
  }
});
