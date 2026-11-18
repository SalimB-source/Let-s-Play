import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { RPG_DUEL_CARDS, cardColors } from '../src/games/rpgCards.js';

test('fantômes élémentaires : prises et combustion gardent leur mise en scène', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { FantomeCarteDetruite } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { RpgAdieuAutonome } = await server.ssrLoadModule('/src/games/RpgAdieuAutonome.jsx');
    const effet = { effectId: 'test', entityId: 'mort', name: 'Test', left: 0, top: 0, width: 100, height: 125 };
    for (const element of ['braise', 'eau', 'sable', 'neige', 'tenebres']) {
      const carte = RPG_DUEL_CARDS.find(c => cardColors(c).length === 1 && cardColors(c)[0] === element);
      assert.ok(carte, element);
      const rendu = renderToStaticMarkup(React.createElement(FantomeCarteDetruite, { effet: { ...effet, cardId: carte.id } }));
      assert.equal((rendu.match(new RegExp(`data-element="${element}"`, 'g')) ?? []).length, 12);
      const autonome = renderToStaticMarkup(React.createElement(RpgAdieuAutonome, { effet: { ...effet, cardId: carte.id } }));
      assert.equal((autonome.match(new RegExp(`data-element="${element}"`, 'g')) ?? []).length, 8);
    }
    const carte = RPG_DUEL_CARDS.find(c => cardColors(c).length > 1);
    assert.ok(carte);
    const hybride = renderToStaticMarkup(React.createElement(FantomeCarteDetruite, { effet: { ...effet, cardId: carte.id } }));
    for (const couleur of cardColors(carte)) assert.match(hybride, new RegExp(`data-element="${couleur}"`));
    const eau = RPG_DUEL_CARDS.find(c => cardColors(c).length === 1 && cardColors(c)[0] === 'eau');
    const eauBrulee = renderToStaticMarkup(React.createElement(FantomeCarteDetruite, { effet: { ...effet, cardId: eau.id, bruleeParBraise: true } }));
    assert.match(eauBrulee, /is-burning/);
    assert.equal((eauBrulee.match(/data-element="eau"/g) ?? []).length, 12, 'la victime conserve son élément même face à une source Braise');
    for (const special of [{ bruleeParBraise: true }, { capteurId: 'pirate' }]) {
      const html = renderToStaticMarkup(React.createElement(FantomeCarteDetruite, { effet: { ...effet, cardId: carte.id, ...special } }));
      assert.doesNotMatch(html, /class="rpg-carte-delitee"/, 'le calque ordinaire ne remplace ni la capture ni la combustion spéciale');
      if (special.capteurId) assert.doesNotMatch(html, /rpg-adieu-complement|rpg-carte-delitee__grain/, 'la capture ne produit aucune particule de mort');
    }
  } finally { await server.close(); }
});

test('une mort réelle en Conquête crée puis nettoie le fantôme autonome, sauf en mouvement réduit', async () => {
  const { JSDOM } = await import('jsdom');
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 });
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const core = await server.ssrLoadModule('/src/games/rpgDuel.js');
    for (const reduit of [false, true]) {
      dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', reduit ? 'on' : 'off');
      let duel;
      const props = { onQuitter() {}, initialiser: () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
      root = createRoot(document.getElementById('root'));
      const render = () => act(async () => root.render(React.createElement(Board, props)));
      const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.click()); };
      await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
      core.rpgFinDeTour(duel); duel.sorcier.manaChoixEnAttente = null;
      duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
      const defenseur = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
      core.rpgFinDeTour(duel); duel.joueur.manaChoixEnAttente = null;
      duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
      const attaquant = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
      for (const e of [attaquant, defenseur]) { e.atk = 3; e.pv = e.def = e.pvMax = 1; e.ready = true; e.malInvocation = false; }
      duel.sorcier.main = []; core.rpgReglerHasard(duel, () => .9);
      await render();
      await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
      await click(document.querySelector(`[data-moba-entity="${defenseur.id}"] button`));
      await act(async () => new Promise(resolve => setTimeout(resolve, 550)));
      assert.equal(duel.joueur.creatures.some(e => e.id === attaquant.id), false);
      assert.equal(duel.sorcier.creatures.some(e => e.id === defenseur.id), false);
      const fantomes = [...document.querySelectorAll('.rpg-adieu-autonome')];
      assert.equal(fantomes.length, reduit ? 0 : 2);
      if (!reduit) {
        assert.equal(fantomes[0].querySelectorAll('i[data-element="braise"]').length, 8);
        await act(async () => { for (const fantome of fantomes) fantome.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })); });
        assert.equal(document.querySelectorAll('.rpg-adieu-autonome').length, 0);
      }
      await act(async () => root.unmount()); root = null;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
