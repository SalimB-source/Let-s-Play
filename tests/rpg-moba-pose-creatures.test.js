import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

test('la pose MOBA vient de la main de chaque camp, sans animer les autres cartes', () => {
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle--moba"><main class="moba">
    <div class="moba__side moba__side--sorcier"><div class="moba__real-slot"><button class="rpg-card fx-enter"></button></div></div>
    <div class="moba__side moba__side--joueur"><div class="moba__real-slot"><button class="rpg-card fx-enter"></button></div></div>
    <div class="moba__hand"><button class="rpg-card fx-enter"></button></div>
    <div class="moba__preview-layer"><button class="rpg-card fx-enter"></button></div>
  </main></div><div class="rpg-battle"><div class="rpg-card fx-enter"></div></div>`, { virtualConsole: new VirtualConsole() });
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
    assert.equal(style('.moba__side--sorcier').getPropertyValue('--moba-pose-depart'), '-64px');
    assert.equal(style('.moba__side--joueur').getPropertyValue('--moba-pose-depart'), '64px');
    for (const side of ['sorcier', 'joueur']) {
      assert.match(style(`.moba__side--${side} .rpg-card`).animation, /moba-creature-pose/);
    }
    for (const selector of ['.moba__hand .rpg-card', '.moba__preview-layer .rpg-card', '.rpg-battle:not(.rpg-battle--moba) .rpg-card']) {
      assert.doesNotMatch(style(selector).animation, /moba-creature-pose/, selector);
    }
  } finally { dom.window.close(); }
  assert.match(css, /@keyframes moba-creature-pose\s*\{[\s\S]*?0%\s*\{[^}]*var\(--moba-pose-depart\)/);
  assert.match(css, /@keyframes moba-creature-pose\s*\{[\s\S]*?100%\s*\{[^}]*var\(--rpg-envol-repos, 0px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-battle--moba \.moba \*/);
});

test('le remplacement dans une même case relance la pose sans redémarrer à chaque rendu', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
    let montages = 0;
    const TableCard = ({ entite }) => {
      const [montage] = React.useState(() => ++montages);
      return React.createElement('button', { className: 'rpg-card fx-enter', 'data-montage': montage, 'data-entity-id': entite.id });
    };
    const props = { onQuitter: () => {}, initialiser: () => duel, rendu: { TableCard } };
    root = createRoot(document.getElementById('root'));
    const render = async () => act(async () => root.render(React.createElement(Board, props)));
    const face = () => document.querySelector('.moba__lane:first-child .moba__side--joueur .moba__real-slot .rpg-card');
    await render();
    const mulligan = document.querySelector('.moba__mulligan .moba__primary');
    assert.ok(mulligan);
    await act(async () => mulligan.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    duel.joueur.main = ['ashigaru-des-braises'];
    duel.joueur.mana.braise = 30;
    const result = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0);
    assert.equal(result.ok, true, JSON.stringify(result));
    await render();
    const initial = face();
    assert.ok(initial);
    await render();
    assert.equal(face(), initial, 'un simple rafraîchissement ne rejoue pas la pose');
    const autre = { ...result.entite, id: `nouvelle-${result.entite.id}` };
    duel.joueur.creatures[duel.joueur.creatures.indexOf(result.entite)] = autre;
    duel.moba.lanes[0].slots.joueur[0] = autre.id;
    await render();
    assert.notEqual(face(), initial, 'une nouvelle entité remonte une face et relance son entrée');
    assert.notEqual(face().dataset.montage, initial.dataset.montage);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
