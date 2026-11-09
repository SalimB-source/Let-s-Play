import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';

test('le plateau propose les deux voies après la conquête centrale et affiche le rattachement choisi', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
    mobaInfliger(duel.moba, 'joueur', 'center', 10);
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser: () => duel })));
    const dialog = document.querySelector('[aria-label="Choisir une voie latérale"]');
    assert.ok(dialog);
    assert.equal(dialog.closest('[inert]'), null, 'le choix est accessible même lorsque le plateau est désactivé');
    assert.equal(dialog.querySelectorAll('button').length, 2);
    const button = [...dialog.querySelectorAll('button')].find((item) => item.textContent.includes('droite'));
    assert.ok(button);
    await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.equal(document.querySelector('[aria-label="Choisir une voie latérale"]'), null);
    assert.deepEqual(duel.moba.centerJoined, { side: 'joueur', laneId: 'right' });
    assert.match(document.querySelectorAll('.moba__lane')[1].textContent, /droite/);
    const lanes = document.querySelector('.moba__lanes');
    assert.equal(lanes.dataset.mobaJoinedLane, 'right');
    assert.equal(lanes.dataset.mobaJoinedSide, 'joueur');
    const [left, center, right] = document.querySelectorAll('.moba__lane');
    assert.equal(center.querySelector('.moba__side--joueur .moba__health'), null, 'la jauge centrale gagnante ne se répète pas');
    assert.ok(center.querySelector('.moba__side--sorcier .moba__health'), 'les PV du centre ennemi restent distincts');
    const shared = right.querySelector('.moba__side--joueur .moba__health');
    assert.equal(right.querySelector('.moba__side--joueur').classList.contains('is-joined-flank'), true);
    assert.match(shared.textContent, /Centre.*droite/);
    assert.equal(shared.querySelector('[role="progressbar"]').getAttribute('aria-valuemax'), '30');
    assert.equal(shared.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '30');
    assert.equal(left.querySelector('.moba__side--joueur .moba__health').textContent.includes('Centre'), false);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

for (const side of ['joueur', 'sorcier']) for (const flank of ['left', 'right']) {
  test(`le plateau fusionne uniquement la jauge centrale de ${side} avec ${flank}`, async () => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const { mobaRattacherCentre } = await import('../src/games/rpgMoba.js');
      const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
      mobaInfliger(duel.moba, side, 'center', 10);
      assert.equal(mobaRattacherCentre(duel.moba, side, flank).ok, true);
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser: () => duel })));
      const group = document.querySelector('.moba__lanes');
      assert.equal(group.dataset.mobaJoinedLane, flank);
      assert.equal(group.dataset.mobaJoinedSide, side);
      const central = group.querySelector('.moba__lane:nth-child(2)');
      assert.equal(central.querySelector(`.moba__side--${side} .moba__health`), null);
      const opponent = side === 'joueur' ? 'sorcier' : 'joueur';
      assert.ok(central.querySelector(`.moba__side--${opponent} .moba__health`));
      const flankNode = group.querySelector(`.moba__lane:${flank === 'left' ? 'first' : 'last'}-child`);
      const joined = flankNode.querySelector(`.moba__side--${side}`);
      assert.ok(joined.classList.contains('is-joined-flank'));
      assert.match(joined.querySelector('[role="progressbar"]').getAttribute('aria-label'), /centrale et voie/);
      assert.equal(joined.querySelector('[role="progressbar"]').getAttribute('aria-valuemax'), '30');
      assert.equal(flankNode.querySelector(`.moba__side--${opponent}`).classList.contains('is-joined-flank'), false);
    } finally {
      if (root) await act(async () => root.unmount());
      await server.close(); dom.window.close();
      globalThis.window = oldWindow; globalThis.document = oldDocument;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}

test('la séparation est effacée seulement pour la moitié rattachée et la barre s’étend sur les deux colonnes', () => {
  const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /\.moba \.moba__lane \+ \.moba__lane \{ border-left: 0; \}/);
  assert.match(css, /data-moba-joined-lane="left"[^\n]*is-joined-center::before/);
  assert.match(css, /data-moba-joined-lane="right"[^\n]*is-joined-flank::before/);
  assert.match(css, /\.moba__side\.is-joined-flank \.moba__health \{[\s\S]*?width: 150%/);
});
