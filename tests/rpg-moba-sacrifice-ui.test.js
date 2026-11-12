import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

for (const mode of ['clic', 'glisser']) test(`un seul geste de ${mode} sacrifie et remplace une créature dans le centre conquis`, async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => {
      duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 });
      return duel;
    };
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.braise = 20;
    const victim = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
    assert.ok(victim);
    assert.ok(mobaInfliger(duel.moba, 'joueur', 'center', 15).conquered);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
    duel.joueur.main = ['anqa-des-braises'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Anqa')));
    assert.match(document.querySelector('.moba__sacrifice-hint').textContent, /0\/1/);
    const voieCentrale = document.querySelector('.moba__lane[aria-label="Voie centrale"]');
    assert.ok(document.querySelector('[data-moba-ruin="center"]'));
    assert.equal(voieCentrale.querySelector('.moba__conquest'), null);
    assert.ok(voieCentrale.querySelector('.moba__side--sorcier').hasAttribute('inert'));
    assert.equal(voieCentrale.querySelector('.moba__side--joueur').hasAttribute('inert'), false);
    const center = voieCentrale.querySelector('.moba__side--joueur');
    assert.equal(center.hasAttribute('inert'), false);
    if (mode === 'clic') await click(center.querySelector('.moba__slot.has-creature'));
    else {
      const drag = (element, type) => { const event = new dom.window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'dataTransfer', { value: { setData() {}, effectAllowed: '', dropEffect: '' } }); return act(async () => element.dispatchEvent(event)); };
      await drag([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Anqa')), 'dragstart');
      await drag(center.querySelector('[data-moba-position]'), 'drop');
    }
    assert.equal(document.querySelector('.moba__sacrifice-hint'), null, 'la carte est annoncée dès le premier geste');
    assert.deepEqual(duel.mobaCreatureEnAttente?.sacrificeIds, [victim.id]);
    assert.equal(duel.mobaCreatureEnAttente?.laneId, 'center');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
