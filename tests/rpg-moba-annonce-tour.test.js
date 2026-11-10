import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

for (const partage of [true, false]) {
  test(`MOBA : annonce du tour et camp actif (${partage ? 'rendu classique' : 'rendu autonome'})`, async () => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    // Control only banner timers; AI and other animation timers remain untouched.
    const originalSet = window.setTimeout.bind(window), originalClear = window.clearTimeout.bind(window);
    const timers = new Map(); const allCallbacks = []; let nextTimer = -1;
    window.setTimeout = (fn, delay, ...args) => {
      if (delay !== 1500) return originalSet(fn, delay, ...args);
      const id = nextTimer--; timers.set(id, fn); allCallbacks.push(fn); return id;
    };
    window.clearTimeout = (id) => { if (id < 0) timers.delete(id); else originalClear(id); };
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
      const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
      let duel;
      const initialiser = () => (duel ??= rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
      const props = { initialiser, onQuitter: () => {}, rendu: partage ? { AnnonceTour: RPG_RENDU_MOBA.AnnonceTour, dureeAnnonceTour: RPG_RENDU_MOBA.dureeAnnonceTour } : null };
      root = createRoot(document.getElementById('root'));
      const render = async () => act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Board, props))));
      const click = async (el) => { assert.ok(el); await act(async () => el.click()); };
      const banner = () => document.querySelector('.rpg-annonce-tour__bandeau');
      const finishTimer = async () => { const [id, fn] = [...timers.entries()].at(-1); timers.delete(id); await act(async () => fn()); };
      await render();
      assert.equal(banner(), null, 'pas d’annonce pendant le mulligan');
      assert.equal(document.querySelector('.moba__player.is-active'), null);
      await click(document.querySelector('.moba__mulligan .moba__primary'));
      assert.equal(banner().textContent, 'Votre tour');
      assert.equal(document.querySelector('.rpg-annonce-tour').getAttribute('aria-live'), 'polite');
      assert.equal(document.querySelector('.rpg-annonce-tour').closest('[inert]'), null);
      assert.ok(document.querySelector('.moba__player--joueur.is-active'));
      assert.match(document.querySelector('.moba__status').textContent, /Tour : Vous/);
      assert.equal(timers.size, 1, 'un seul délai de 1,5 s, y compris en StrictMode');
      await render();
      assert.equal(timers.size, 1, 'un nouveau rendu ne réannonce pas');
      await finishTimer();
      assert.equal(banner(), null);
      await render();
      assert.equal(banner(), null, 'pas de réapparition au même tour');
      await click([...document.querySelectorAll('button')].find((el) => el.textContent.includes('Fin du tour')));
      assert.equal(banner(), null, 'la fenêtre de réponse ne démarre pas un nouveau tour');
      assert.ok(document.querySelector('.moba__player--joueur.is-active'), 'camp actif conservé durant la réponse');
      assert.match(document.querySelector('.moba__status').textContent, /réponse de/);
      // Simulate the engine switching turns and a board redraw, before the IA acts.
      duel.tour = 'sorcier'; await render();
      assert.equal(banner().textContent, 'Tour de l’adversaire');
      assert.ok(document.querySelector('.moba__player--sorcier.is-active'));
      const obsolete = allCallbacks.at(-1);
      duel.tour = 'joueur'; await render();
      assert.equal(banner().textContent, 'Votre tour');
      await act(async () => obsolete());
      assert.equal(banner().textContent, 'Votre tour', 'un ancien délai ne retire pas la nouvelle annonce');
      duel.moba.winner = 'joueur'; await render();
      assert.equal(banner(), null, 'fin de partie silencieuse');
      assert.equal(timers.size, 0, 'délai annulé à la fin');
      duel = null;
      await click([...document.querySelectorAll('button')].find((el) => el.textContent === 'Rejouer'));
      assert.equal(banner(), null, 'rejeu : mulligan silencieux');
      await click(document.querySelector('.moba__mulligan .moba__primary'));
      assert.equal(banner().textContent, 'Votre tour', 'nouvelle partie annoncée même si le premier camp est identique');
      await act(async () => root.unmount()); root = null;
      assert.equal(timers.size, 0, 'nettoyage au démontage');
    } finally {
      if (root) await act(async () => root.unmount());
      await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}

test('le bandeau ne bloque pas les gestes et le repère actif reste visible', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const mobaCss = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-annonce-tour\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(mobaCss, /\.moba > \.rpg-annonce-tour\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(mobaCss, /\.moba \.moba__player\.is-active\s*\{[^}]*border-color:/s);
});

test('le vrai passage de fin de tour déclenche le bandeau adverse après la réponse de l’IA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { initialiser, onQuitter: () => {} })));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    assert.equal(duel.tour, 'joueur');
    await act(async () => [...document.querySelectorAll('button')].find((el) => el.textContent.includes('Fin du tour')).click());
    assert.equal(duel.tour, 'joueur');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.tour, 'sorcier');
    assert.equal(document.querySelector('.rpg-annonce-tour__bandeau')?.textContent, 'Tour de l’adversaire');
    assert.ok(document.querySelector('.moba__player--sorcier.is-active'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
