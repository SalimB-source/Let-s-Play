import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

for (const complet of [false, true]) test(`plateau ${complet ? 'illustré' : 'simplifié'} : Défenseur éloigné ne force pas la cible`, async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {}, ...(complet ? { rendu: RPG_RENDU_MOBA } : {}) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async el => { assert.ok(el, 'bouton présent'); assert.equal(el.disabled, false); await act(async () => el.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    rpgFinDeTour(duel); duel.sorcier.main = ['gardienne-des-portes-de-sable'];
    const garde = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
    const cible = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['ashigaru-des-braises'];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    attaquant.ready = true; attaquant.coupRapide = true; duel.sorcier.main = [];
    await render();
    await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    const bouton = id => document.querySelector(`[data-moba-entity="${id}"] button`);
    assert.equal(bouton(garde.id).disabled, false);
    assert.equal(bouton(cible.id).disabled, false);
    assert.ok([...document.querySelectorAll('.moba__controls button')].find(b => b.textContent.includes('Attaquer directement la voie')));
    cible.defenseur = true;
    await render();
    assert.equal(bouton(garde.id).disabled, true, 'un Défenseur dans la même voie devient prioritaire');
    assert.equal(bouton(cible.id).disabled, false);
    assert.equal([...document.querySelectorAll('.moba__controls button')].some(b => b.textContent.includes('Attaquer directement la voie')), false);
    cible.defenseur = false;
    await render();
    await click(bouton(cible.id));
    assert.equal(duel.combatDeclare?.cibleIndividuelle.cibleId, cible.id);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
