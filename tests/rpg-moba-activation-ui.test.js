import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('Conquête : le joueur sélectionne la Chercheuse, son arme et son porteur', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), joueurCouleurs: ['sable', 'braise'], sorcierCouleurs: ['sable', 'braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['chercheuse-des-armes-ensevelies'];
    for (const color of Object.keys(duel.joueur.mana)) duel.joueur.mana[color] = 20;
    const source = engine.rpgMobaJouerCreature(duel, 'joueur', 'chercheuse-des-armes-ensevelies', 'left', 0).entite;
    assert.ok(source); source.malInvocation = false; duel.joueur.cimetiere.push('javelot-du-beffroi');
    await act(async () => root.render(React.createElement(Board, props)));
    const buttons = () => [...document.querySelectorAll('[aria-label="Capacités des créatures"] button')];
    await click(buttons().find(b => b.textContent.includes('Activer Chercheuse')));
    await click(buttons().find(b => b.textContent.includes('Javelot du beffroi') && b.textContent.includes('Chercheuse')));
    assert.equal(source.arme?.carteId, 'javelot-du-beffroi');
    assert.equal(source.activationUtiliseeMatch, true); assert.ok(engine.rpgMobaPlacementCoherent(duel));
    assert.ok(!buttons().some(b => b.textContent.includes('Activer Chercheuse')));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Conquête : le joueur désigne le champion et la cible du Jarl', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['jarl-au-marteau-de-guerre', 'chien-du-guet'];
    for (const color of Object.keys(duel.joueur.mana)) duel.joueur.mana[color] = 20;
    const jarl = engine.rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0, { retourIds: ['chien-du-guet'] }).entite;
    assert.ok(jarl); jarl.malInvocation = false; jarl.atk = 10;
    duel.tour = 'sorcier'; duel.sorcier.manaChoixEnAttente = false; duel.sorcier.main = ['chien-du-guet'];
    const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'left', 0).entite;
    assert.ok(cible); cible.pv = cible.def = 1; duel.tour = 'joueur'; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const buttons = () => [...document.querySelectorAll('[aria-label="Capacités des créatures"] button')];
    await click(buttons().find(b => b.textContent.includes('Activer Jarl')));
    await click(buttons().find(b => b.textContent.includes('Jarl') && b.textContent.includes('Chien du guet')));
    assert.ok(!duel.sorcier.creatures.some(e => e.id === cible.id));
    assert.equal(jarl.activationUtiliseeMatch, true); assert.ok(engine.rpgMobaPlacementCoherent(duel));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
