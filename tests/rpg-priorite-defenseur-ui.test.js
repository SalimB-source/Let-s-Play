import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

for (const complet of [false, true]) test(`Conquête ${complet ? 'partagée' : 'autonome'} : repères, exceptions et clics`, async () => {
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
    const click = async el => { assert.ok(el); assert.equal(el.disabled, false); await act(async () => el.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
    const autre = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    rpgFinDeTour(duel); rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
    const garde = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    garde.defenseur = true;
    rpgFinDeTour(duel); duel.joueur.main = ['ashigaru-des-braises'];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    Object.assign(attaquant, { ready: true, malInvocation: false, coupRapide: true }); duel.sorcier.main = [];
    await render();
    const bouton = id => document.querySelector(`[data-moba-entity="${id}"] button`);
    await click(bouton(attaquant.id));
    assert.equal(bouton(garde.id).dataset.defenseurCiblage, 'prioritaire');
    assert.equal(bouton(autre.id).dataset.defenseurCiblage, 'protegee');
    assert.match(bouton(garde.id).getAttribute('aria-description'), /prioritaire/i);
    assert.match(document.querySelector('[data-defenseur-message]').textContent, /choisissez un Défenseur/i);
    assert.ok(document.querySelector('.moba__hint[aria-live]').textContent.includes('Défenseur'));
    assert.equal(bouton(garde.id).disabled, false);
    attaquant.infiltration = true; await render();
    assert.equal(document.querySelector('[data-defenseur-message]'), null);
    assert.equal(bouton(autre.id).disabled, false);
    assert.equal(bouton(garde.id).dataset.defenseurCiblage, undefined);
    attaquant.infiltration = false; await render();
    await click(bouton(garde.id));
    assert.equal(duel.combatDeclare?.cibleIndividuelle.cibleId, garde.id);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('la carte de Duel garde ses clics sous les repères', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let clics = 0;
    root = createRoot(document.getElementById('root'));
    const entite = { id: 'd', carteId: 'ashigaru-des-braises', name: 'Garde', atk: 2, def: 2, pv: 2, pvMax: 2 };
    await act(async () => root.render(React.createElement(TableCard, { entite, cote: 'ennemi', statutDefenseur: 'prioritaire', canTarget: true, onClick: () => clics++ })));
    const carte = document.querySelector('button.rpg-card');
    assert.equal(carte.dataset.defenseurCiblage, 'prioritaire');
    assert.match(carte.getAttribute('aria-description'), /prioritaire/i);
    assert.ok(carte.querySelector('.rpg-priorite-defenseur--prioritaire'));
    await act(async () => carte.click()); assert.equal(clics, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
