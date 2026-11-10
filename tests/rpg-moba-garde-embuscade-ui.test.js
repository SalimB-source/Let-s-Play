import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('le plateau rend la priorité à l’attaquant humain quand l’IA annonce le Garde', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'eau'], sorcierCouleurs: ['braise', 'neige', 'tenebres'], rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false, button.outerHTML); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const text = (selector, value) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(value));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    await click(text('.moba__choice button', 'braise'));
    duel.joueur.mana.braise = 20;
    const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(a); a.ready = true;
    duel.joueur.main = ['ecueil']; duel.joueur.mana.eau = 10;
    duel.sorcier.main = ['garde-du-trone-givre']; Object.assign(duel.sorcier.mana, { neige: 10, tenebres: 10 });
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));
    await click(text('.moba__controls button', 'Déclarer'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.mobaCreatureEnAttente?.carteId, 'garde-du-trone-givre');
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
    await click(text('.moba__card', 'Écueil'));
    assert.equal(duel.mobaCreatureEnAttente, null);
    assert.ok(duel.combatDeclare); assert.equal(duel.fenetreReponse, true);
    assert.ok(text('.moba__controls button', 'Résoudre le combat'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('le joueur invoque le Garde en défense, puis choisit son blocage après la réponse IA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour, rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige', 'tenebres'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false, button.outerHTML); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const text = (selector, value) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(value));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    await click(text('.moba__choice button', 'braise'));
    rpgFinDeTour(duel);
    if (duel.sorcier.manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(duel, 'sorcier', 'braise').ok);
    duel.sorcier.mana.braise = 20; duel.sorcier.main = ['ashigaru-des-braises'];
    const a = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(a); a.ready = true; duel.sorcier.main = [];
    duel.joueur.main = ['garde-du-trone-givre']; Object.assign(duel.joueur.mana, { neige: 10, tenebres: 10 });
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.ok(duel.combatDeclare);
    await click(text('.moba__card', 'Garde du trône givré'));
    await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
    assert.equal(duel.mobaCreatureEnAttente?.cote, 'joueur');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.mobaCreatureEnAttente, null);
    const guard = duel.joueur.creatures.find((e) => e.carteId === 'garde-du-trone-givre'); assert.ok(guard);
    await click(document.querySelector(`[data-moba-entity="${guard.id}"] button`));
    await click(text('.moba__controls button', 'Résoudre le combat'));
    assert.equal(duel.combatDeclare, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
