import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('plateau : sélection d’une cible, réponse, échange, puis seconde attaque', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    root = createRoot(document.getElementById('root'));
    const props = { initialiser, onQuitter: () => {} };
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (el) => { assert.ok(el, 'bouton présent'); assert.equal(el.disabled, false, el.outerHTML); await act(async () => el.click()); };
    const cmd = (texte) => [...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes(texte));
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
    const c = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); a.ready = true;
    duel.joueur.main = ['ashigaru-des-braises'];
    const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite; b.ready = true;
    duel.sorcier.main = ['trait-de-braise']; duel.joueur.main = [];
    await render();
    await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));
    assert.ok(!duel.combatDeclare, 'le choix de cible reste annulable');
    assert.equal(cmd('Déclarer l’attaque'), undefined);
    await click(document.querySelector('.moba__cancel-choice'));
    assert.equal(a.attaquee, false);
    await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));
    await click(document.querySelector(`[data-moba-entity="${c.id}"] button`));
    assert.equal(duel.combatDeclare?.cibleIndividuelle.cibleId, c.id, 'la cible choisie annonce immédiatement l’attaque');
    assert.equal(cmd('Passer et résoudre'), undefined, 'seul le défenseur peut passer la fenêtre de réponse');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.sorcier.main.length, 0, 'l’IA a eu l’occasion de jouer une Magie Rapide');
    assert.ok(duel.combatDeclare, 'la réponse précède la résolution');
    assert.equal(cmd('Passer et résoudre'), undefined, 'l’attaquant ne peut pas passer à la place de l’IA');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.combatDeclare, null); assert.equal(duel.phase, 'principale');
    await click(document.querySelector(`[data-moba-entity="${b.id}"] button`));
    assert.equal(duel.combatDeclare?.cibleIndividuelle.cibleId, null, 'une attaque forcément directe est annoncée immédiatement');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.combatDeclare, null); assert.equal(b.attaquee, true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('plateau : Attaque ciblée peut choisir la voie même avec une créature adverse', async () => {
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
    root = createRoot(document.getElementById('root'));
    const props = { initialiser, rendu: RPG_RENDU_MOBA, onQuitter: () => {} };
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (el) => { assert.ok(el); assert.equal(el.disabled, false); await act(async () => el.click()); };
    const cmd = (texte) => [...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes(texte));
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
    const cible = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); a.ready = true; a.coupRapide = true; duel.sorcier.main = [];
    await render(); await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));
    await click(cmd('Attaquer directement la voie'));
    assert.equal(duel.combatDeclare.cibleIndividuelle.cibleId, null, 'le choix de la voie annonce immédiatement l’attaque');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.combatDeclare, null);
    assert.equal(duel.sorcier.creatures.some((e) => e.id === cible.id), true);
    assert.equal(duel.moba.lanes.find((l) => l.id === 'left').hp.sorcier, 19);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
