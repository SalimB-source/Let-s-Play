import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

// Le plateau à deux lignes, tel que la page le dessine : dix cases, deux
// rangées, et chaque carte dans la rangée de sa classe. La règle est testée
// dans `rpg-lignes-duel.test.js` ; ici, c'est le dessin qui est vérifié.
test('le plateau dessine les deux lignes : dix cases, le fond derrière', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const previous = {};
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { default: Page } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgJouerCreature } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { RPG_MODE_MANA_ESSAI } = await server.ssrLoadModule('/src/games/rpgManaEssai.js');
    const { RPG_ELEMENTS } = await server.ssrLoadModule('/src/games/rpgCards.js');
    const duel = rpgNouveauDuel({
      joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
      joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, pvp: true,
      lignes: true,
    });
    assert.equal(duel.lignes, true, 'la fabrique garde le drapeau des lignes');
    duel.mulliganFait = { joueur: true, sorcier: true };
    duel.manaEssaiDemarre = true;
    for (const camp of ['joueur', 'sorcier']) duel[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    duel.tour = 'joueur';
    duel.joueur.main = ['viking-des-neiges'];
    const melee = rpgJouerCreature(duel, 'joueur', 'viking-des-neiges');
    assert.equal(melee.ok, true, JSON.stringify(melee));
    duel.joueur.invocationNormaleJouee = false;
    duel.joueur.main = ['archere-viking-du-givre'];
    const archiere = rpgJouerCreature(duel, 'joueur', 'archere-viking-du-givre');
    assert.equal(archiere.ok, true, JSON.stringify(archiere));

    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, {
      pvp: { vue: duel, seq: 1, onIntention: async () => ({ ok: true }), onQuitter() {}, onAbandon() {} },
    })));

    const rangees = [...document.querySelectorAll('.card-row')];
    const joueur = document.querySelector('.card-row--equipe');
    const ennemi = document.querySelector('.card-row--ennemi');
    assert.ok(joueur && ennemi, 'les deux champs sont dessinés');
    assert.equal(joueur.dataset.lignes, 'true', 'le drapeau des lignes est porté par la rangée');
    assert.equal(joueur.dataset.frontTient, 'true', 'le front tient : le fond est protégé');

    const cases = joueur.querySelectorAll('.rpg-creature-slot');
    assert.equal(cases.length, 10, 'dix cases, cinq devant et cinq derrière');
    assert.equal([...cases].filter((c) => c.dataset.ligne === 'front').length, 5);
    assert.equal([...cases].filter((c) => c.dataset.ligne === 'fond').length, 5);
    // La colonne est la même d'une ligne à l'autre : la case 6 est sous la 1.
    assert.equal(cases[0].dataset.creatureSlotCol, '1');
    assert.equal(cases[5].dataset.creatureSlotCol, '1');

    const carteMelee = joueur.querySelector(`.rpg-card[data-entity-id="${melee.entite.id}"]`);
    const carteArchiere = joueur.querySelector(`.rpg-card[data-entity-id="${archiere.entite.id}"]`);
    assert.ok(carteMelee && carteArchiere, 'les deux créatures sont sur la table');
    assert.equal(carteMelee.dataset.ligne, 'front', 'le corps à corps est devant');
    assert.equal(carteArchiere.dataset.ligne, 'fond', 'l’archère est derrière');
    assert.equal(carteArchiere.style.getPropertyValue('--case-col'), '1');
    assert.ok(rangees.length >= 2);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    for (const key of Object.keys(previous)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key].value === undefined ? { value: undefined } : previous[key]);
    }
  }
});
