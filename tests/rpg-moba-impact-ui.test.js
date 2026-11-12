import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('une attaque individuelle résolue affiche un impact non interactif et annonce les dégâts', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // JSDOM n'a pas de moteur de placement ; fournir des dimensions non nulles.
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 };
  };
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const props = { onQuitter: () => {}, initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    attaquant.ready = true; attaquant.atk = 3;
    await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    assert.ok(duel.combatDeclare);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });
    const svg = document.querySelector('.moba__impact-cinema');
    assert.ok(svg); assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.ok(svg.querySelector('.moba__impact-trail'));
    assert.equal(svg.querySelector('.moba__impact-number').textContent, '−3');
    assert.match(document.querySelector('.moba__combat-result').textContent, /voie gauche : 3 dégâts/);
    assert.equal(duel.combatDeclare, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('deux attaques rapides conservent chacune leur impact et leur délai de disparition', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '2');
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 };
  };
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const props = { onQuitter: () => {}, initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.sorcier.main = [];
    const premier = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    duel.moba.creaturesJouees.joueur = false;
    const second = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
    premier.ready = second.ready = true; premier.atk = 3; second.atk = 2;
    await render(); await click(document.querySelector(`[data-moba-entity="${premier.id}"] button`));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
    assert.equal(document.querySelectorAll('.moba__impact-cinema').length, 1);
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'left').hp.sorcier, 17);
    await click(document.querySelector(`[data-moba-entity="${second.id}"] button`));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'left').hp.sorcier, 15);
    const impacts = [...document.querySelectorAll('.moba__impact-cinema')];
    assert.equal(impacts.length, 2, 'le second impact ne remplace pas le premier');
    assert.deepEqual(impacts.map(svg => svg.querySelector('.moba__impact-number')?.textContent), ['−3', '−2']);
    const annonces = document.querySelector('.moba__combat-result').textContent;
    assert.match(annonces, /voie gauche : 3 dégâts/); assert.match(annonces, /voie gauche : 2 dégâts/);
    assert.equal(impacts[1].querySelector('.moba__impact-number').getAttribute('x'), '48', 'les chiffres de la même cible restent lisibles');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1850)); });
    assert.deepEqual([...document.querySelectorAll('.moba__impact-number')].map(el => el.textContent), ['−2'], 'le premier disparaît sans couper le second');
    assert.equal(document.querySelector('.moba__impact-number').getAttribute('x'), '48', 'le chiffre restant ne saute pas');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });
    assert.equal(document.querySelectorAll('.moba__impact-cinema').length, 0);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('les chiffres restent annoncés en mouvement réduit et Rejouer nettoie les impacts', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '2');
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 });
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const props = { onQuitter: () => {}, initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement('div', { className: 'rpg-battle--moba is-reduced' }, React.createElement(Board, props))));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.ok(mobaInfliger(duel.moba, 'joueur', 'right', 20).conquered);
    mobaInfliger(duel.moba, 'joueur', 'left', 18);
    duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    attaquant.ready = true; attaquant.atk = 3;
    await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
    assert.equal(duel.moba.winner, 'joueur');
    assert.ok(document.querySelector('.rpg-battle--moba.is-reduced .moba__impact-number'));
    assert.match(document.querySelector('.moba__combat-result').textContent, /voie gauche : 2 dégâts/);
    await click([...document.querySelectorAll('.moba__end-actions button')].find(button => button.textContent.includes('Rejouer')));
    assert.equal(document.querySelectorAll('.moba__impact-cinema').length, 0);
    assert.equal(duel.moba.winner, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
