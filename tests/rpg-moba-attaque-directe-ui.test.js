import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

for (const complet of [false, true]) for (const capacite of ['envol', 'infiltration']) {
  test(`${complet ? 'plateau illustré' : 'plateau simplifié'} : ${capacite} attaque depuis la jauge adverse`, async () => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const { RPG_RENDU_MOBA } = complet ? await server.ssrLoadModule('/src/games/RpgDuelPage.jsx') : {};
      const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
      const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
      let duel;
      const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
      const props = { initialiser, onQuitter: () => {}, ...(complet ? { rendu: RPG_RENDU_MOBA } : {}) };
      root = createRoot(document.getElementById('root'));
      const render = () => act(async () => root.render(React.createElement(Board, props)));
      const click = async (element) => { assert.ok(element, 'bouton présent'); assert.equal(element.disabled, false); await act(async () => element.click()); };
      await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
      duel.joueur.main = ['ashigaru-des-braises'];
      const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
      rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
      const ennemi = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
      rpgFinDeTour(duel); assert.ok(attaquant && ennemi);
      attaquant.ready = true; attaquant.malInvocation = false; attaquant[capacite] = true; duel.sorcier.main = []; duel.joueur.main = [];
      await render();
      assert.equal(document.querySelector('.moba__attack-direct'), null, 'aucun bouton avant la sélection');
      await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
      const health = document.querySelector('[data-moba-lane-hp="@moba:left:sorcier"]');
      if (capacite === 'infiltration') {
        assert.equal(health.querySelector('.moba__attack-direct'), null, 'Infiltration ne contourne pas la présence d’une créature');
        attaquant.envol = true; await render();
      }
      const cible = health.querySelector('.moba__attack-direct');
      assert.ok(cible, 'Envol rend la jauge adverse cliquable');
      assert.match(cible.getAttribute('aria-label'), /Attaquer directement.*gauche/i);
      assert.equal(document.querySelectorAll('.moba__attack-direct').length, 1, 'seule la voie accessible est proposée');
      assert.equal(document.querySelector(`[data-moba-entity="${ennemi.id}"] button`).disabled, false, 'la cible créature reste possible');
      ennemi.defenseur = true; await render();
      assert.equal(health.querySelector('.moba__attack-direct'), null, 'un Défenseur bloque aussi Envol et Infiltration');
      ennemi.defenseur = false; ennemi.envol = true; await render();
      assert.equal(health.querySelector('.moba__attack-direct'), null, 'une créature volante interdit la frappe directe');
      ennemi.envol = false;
      await render();
      await click(document.querySelector('.moba__cancel-choice'));
      assert.equal(document.querySelector('.moba__attack-direct'), null, 'annuler retire la cible');
      await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
      await click(health.querySelector('.moba__attack-direct'));
      assert.equal(duel.combatDeclare?.cibleIndividuelle.cibleId, null);
      assert.equal(duel.combatDeclare?.cibleIndividuelle.voie, 'left');
      assert.ok(!document.querySelector('.moba__attack-direct'), 'le choix disparaît pendant la réponse');
      await act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
      assert.equal(duel.moba.lanes.find((lane) => lane.id === 'left').hp.sorcier, 19);
      assert.ok(duel.sorcier.creatures.some(e => e.id === ennemi.id));
    } finally {
      if (root) await act(async () => root.unmount());
      await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}

test('depuis le centre conquis, chaque jauge légale permet de choisir son flanc', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {} }; root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async element => { assert.ok(element); await act(async () => element.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
    attaquant.ready = true; attaquant.malInvocation = false; attaquant.infiltration = true;
    assert.ok(mobaInfliger(duel.moba, 'joueur', 'center', 15).conquered); duel.sorcier.main = [];
    await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:left:sorcier"] .moba__attack-direct'));
    await click(document.querySelector('[data-moba-lane-hp="@moba:right:sorcier"] .moba__attack-direct'));
    assert.equal(duel.combatDeclare?.cibleIndividuelle.voie, 'right');
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

for (const complet of [false, true]) {
  test(`${complet ? 'plateau illustré' : 'plateau simplifié'} : cible directe proposée contre une unique infiltration`, async () => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const { RPG_RENDU_MOBA } = complet ? await server.ssrLoadModule('/src/games/RpgDuelPage.jsx') : {};
      const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
      const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
      let duel;
      const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
      const props = { initialiser, onQuitter: () => {}, ...(complet ? { rendu: RPG_RENDU_MOBA } : {}) };
      root = createRoot(document.getElementById('root'));
      const render = () => act(async () => root.render(React.createElement(Board, props)));
      const click = async (el) => { assert.ok(el); assert.equal(el.disabled, false); await act(async () => el.click()); };
      await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
      duel.joueur.main = ['ashigaru-des-braises'];
      const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
      rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
      const c = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
      rpgFinDeTour(duel); a.ready = true; a.malInvocation = false; a.coupRapide = true;
      duel.sorcier.main = []; duel.joueur.main = [];
      await render(); await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));
      const health = document.querySelector('[data-moba-lane-hp="@moba:left:sorcier"]');
      assert.equal(health.querySelector('.moba__attack-direct'), null);
      c.infiltration = true; await render();
      assert.ok(health.querySelector('.moba__attack-direct'), 'Infiltration de la seule créature ouvre la voie');
      c.defenseurAccorde = true; await render();
      assert.ok(health.querySelector('.moba__attack-direct'), 'l’exception reste valable si elle est Défenseur');
      assert.equal(document.querySelector(`[data-moba-entity="${c.id}"] button`).disabled, false, 'Attaque ciblée peut aussi choisir cette créature');
      await click(health.querySelector('.moba__attack-direct'));
      assert.equal(duel.combatDeclare?.cibleIndividuelle.cibleId, null);
      assert.equal(duel.combatDeclare?.cibleIndividuelle.voie, 'left');
      await act(async () => new Promise(resolve => setTimeout(resolve, 650)));
      assert.equal(duel.moba.lanes.find(lane => lane.id === 'left').hp.sorcier, 19);
      assert.ok(duel.sorcier.creatures.some(e => e.id === c.id));
    } finally {
      if (root) await act(async () => root.unmount());
      await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}
