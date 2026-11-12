import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { rpgMobaMouvementsCartes, rpgMobaTrajetCarte } from '../src/games/rpgMobaCartesFx.js';
import { rpgConsommerPresentations, rpgDefausserCarte, rpgPiocher } from '../src/games/rpgDuel.js';

test('le moteur annonce les deux mouvements sans confondre une carte jouée avec une défausse', () => {
  const duel = { joueur: { deck: ['ashigaru-des-braises'], main: ['ghul-des-cendres'], cimetiere: [] }, log: [] };
  assert.equal(rpgPiocher(duel, 'joueur'), 'ashigaru-des-braises');
  assert.equal(rpgDefausserCarte(duel, 'joueur', 0).ok, true);
  assert.deepEqual(rpgConsommerPresentations(duel), [
    { type: 'pioche', cote: 'joueur', carteId: 'ashigaru-des-braises' },
    { type: 'defausse', cote: 'joueur', carteId: 'ghul-des-cendres' },
  ]);
  assert.deepEqual(rpgConsommerPresentations(duel), []);
});

test('les pioches et défausses multiples gardent leur ordre, et les trajets sont centrés', () => {
  assert.deepEqual(rpgMobaMouvementsCartes([
    { type: 'defausse', cote: 'joueur', carteId: 'a' },
    { type: 'defausse', cote: 'joueur', carteId: 'b' },
    { type: 'defausse', cote: 'sorcier', carteId: 'secret' },
    { type: 'pioche', cote: 'joueur', carteId: 'c' },
    { type: 'effet', cote: 'joueur', carteId: 'd' },
  ]), [
    { type: 'defausse', cote: 'joueur', carteId: 'b', nombre: 2 },
    { type: 'defausse', cote: 'sorcier', carteId: 'secret', nombre: 1 },
    { type: 'pioche', cote: 'joueur', carteId: 'c', nombre: 1 },
  ]);
  assert.deepEqual(rpgMobaTrajetCarte({ left: 10, top: 20, width: 40, height: 60 }, { left: 100, top: 120, width: 80, height: 40 }), { x: 10, y: 22, dx: 110, dy: 90 });
  assert.equal(rpgMobaTrajetCarte(null, { width: 10 }), null);
});

test('le plateau MOBA anime les deux camps, masque les cartes adverses et conserve les actions accessibles', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom ne calcule pas les boîtes ; mesurer des zones réelles simulées.
  const oldRect = dom.window.Element.prototype.getBoundingClientRect;
  dom.window.Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 20, width: 80, height: 60, right: 90, bottom: 80 };
  };
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const core = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const props = { onQuitter: () => {}, initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    let refresh = 0;
    const render = () => act(async () => root.render(React.createElement(Board, { ...props, refresh: ++refresh })));
    await render();
    assert.equal(document.querySelector('.moba__card-flight'), null, 'pas de distribution initiale animée');
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    core.rpgConsommerPresentations(duel); // ignorées au mulligan
    core.rpgPiocher(duel, 'joueur');
    core.rpgPiocher(duel, 'sorcier');
    await render();
    assert.equal(document.querySelectorAll('[data-moba-card-move$="-pioche"]').length, 2);
    assert.equal(document.querySelector('[data-moba-card-move="sorcier-pioche"] .moba__card-flight-face').style.backgroundImage, '', 'dos seul pour l’IA');
    core.rpgDefausserCarte(duel, 'joueur', 0);
    core.rpgDefausserCarte(duel, 'sorcier', 0);
    await render();
    assert.equal(document.querySelectorAll('[data-moba-card-move$="-defausse"]').length, 2);
    assert.match(document.querySelector('[data-moba-card-move="joueur-defausse"] .moba__card-flight-face').style.backgroundImage, /url/);
    assert.equal(document.querySelector('[data-moba-card-move="sorcier-defausse"] .moba__card-flight-face').style.backgroundImage, '');
    assert.ok(document.querySelector('.moba__hand button'));
    assert.match(document.querySelector('.moba__sr-only[aria-live="polite"]').textContent, /défausse/);
    duel.defausseEnAttente = { cote: 'joueur', restant: 1, motif: 'effet' };
    await render();
    const avant = duel.joueur.main.length;
    await act(async () => document.querySelector('.moba__hand-cards button').click());
    assert.equal(duel.joueur.main.length, avant - 1, 'défausse déclenchée en cliquant sur la main');
    assert.ok(document.querySelector('[data-moba-card-move="joueur-defausse"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.Element.prototype.getBoundingClientRect = oldRect;
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
