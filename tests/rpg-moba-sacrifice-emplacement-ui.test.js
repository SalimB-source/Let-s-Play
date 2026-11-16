import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

for (const mode of ['clic', 'glisser', 'mouvement réduit', 'invalidation']) test(`deux victimes : la dernière choisie devient la case d'arrivée par ${mode}`, async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = () => ({ matches: mode === 'mouvement réduit', addEventListener() {}, removeEventListener() {} });
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }); return duel; };
    const CercleMagique = ({ effet, onTermine }) => React.createElement('div', { 'data-test-cercle': effet.entityId, onAnimationEnd: () => onTermine(effet.effectId) });
    const props = { initialiser, onQuitter: () => {}, ...(mode !== 'glisser' ? { rendu: { CercleMagique } } : {}) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => {
      assert.ok(button, 'bouton présent'); assert.equal(button.disabled, false, 'bouton actif');
      await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); rpgFinDeTour(duel); duel.joueur.main = ['ashigaru-des-braises'];
    const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
    assert.ok(a && b); rpgFinDeTour(duel); rpgFinDeTour(duel); duel.joueur.main = ['orochi']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const carte = () => [...document.querySelectorAll('.moba__card')].find((node) => node.textContent.includes('Orochi'));
    const slot = (lane, position) => document.querySelector(`[data-moba-lane="${lane}"][data-moba-side="joueur"][data-moba-slot="${position}"]`);
    await click(carte()); await click(slot('left', 0).querySelector('button'));
    assert.match(document.querySelector('.moba__sacrifice-hint').textContent, /1\/2/);
    assert.equal(slot('center', 0).querySelector('button').disabled, true, 'une case libre ne peut être choisie');
    if (mode !== 'glisser') await click(slot('right', 1).querySelector('button'));
    else {
      const drag = (element, type) => { const event = new dom.window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'dataTransfer', { value: { setData() {}, effectAllowed: '', dropEffect: '' } }); return act(async () => element.dispatchEvent(event)); };
      await drag(carte(), 'dragstart');
      await drag(slot('center', 0), 'drop'); assert.ok(!duel.mobaCreatureEnAttente, 'pas de dépôt sur une case vide');
      await drag(carte(), 'dragstart'); await drag(slot('right', 1), 'drop');
    }
    assert.equal(document.querySelector('.moba__sacrifice-hint'), null, 'aucun troisième geste nécessaire');
    assert.deepEqual(duel.mobaCreatureEnAttente?.sacrificeIds, [a.id, b.id]);
    assert.equal(duel.mobaCreatureEnAttente?.laneId, 'right'); assert.equal(duel.mobaCreatureEnAttente?.slot, 1);
    if (mode === 'invalidation') {
      duel.joueur.creatures = duel.joueur.creatures.filter(e => e.id !== a.id);
      duel.moba.lanes.find(l => l.id === 'left').slots.joueur[0] = null;
    }
    if (mode === 'clic') {
      await act(async () => new Promise(resolve => setTimeout(resolve, 650)));
      const cercleA = document.querySelector(`[data-test-cercle="${a.id}"]`);
      const cercleB = document.querySelector(`[data-test-cercle="${b.id}"]`);
      assert.ok(cercleA && cercleB, 'les deux victimes ont leur cercle après la réponse');
      assert.equal(duel.joueur.creatures.length, 2, 'les victimes restent présentes');
      assert.ok(!duel.joueur.creatures.some(e => e.carteId === 'orochi'));
      await act(async () => cercleA.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })));
      assert.equal(duel.joueur.creatures.length, 2, 'un seul cercle terminé ne suffit pas');
      await act(async () => cercleB.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })));
      assert.deepEqual(duel.joueur.creatures.map(e => e.carteId), ['orochi']);
      assert.equal(duel.mobaCreatureEnAttente, null);
    } else {
      await act(async () => new Promise(resolve => setTimeout(resolve, 650)));
      assert.equal(document.querySelector('[data-test-cercle]'), null, 'aucun cercle sans animation ou si le sacrifice est invalide');
      if (mode === 'invalidation') {
        assert.equal(duel.mobaCreatureEnAttente, null);
        assert.ok(!duel.joueur.creatures.some(e => e.carteId === 'orochi'), 'invocation invalidée');
        assert.ok(duel.joueur.cimetiere.includes('orochi'));
      } else assert.deepEqual(duel.joueur.creatures.map(e => e.carteId), ['orochi'], 'la résolution ne reste pas bloquée');
    }
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
