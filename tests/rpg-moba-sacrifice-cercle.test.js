import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { victimesSacrificeSurVoies } from '../src/games/rpgSacrificeAnimation.js';

test('une invocation à deux sacrifices garde la voie et la case de chaque victime', () => {
  const avant = { cartes: [
    { entityId: 'a', laneId: 'left', side: 'sorcier', slot: 0 },
    { entityId: 'b', laneId: 'right', side: 'sorcier', slot: 1 },
    { entityId: 'c', laneId: 'center', side: 'joueur', slot: 0 },
  ] };
  assert.deepEqual(victimesSacrificeSurVoies(avant, ['b', 'a']), avant.cartes.slice(0, 2));
  assert.deepEqual(victimesSacrificeSurVoies(avant, ['c']), [avant.cartes[2]]);
  assert.deepEqual(victimesSacrificeSurVoies(avant, []), []);
});

// Covers the real board path: the AI announces a creature, the player passes,
// and only then do the paid sacrifices turn into circles on the AI's slots.
test('le sacrifice de l’IA affiche le cercle sur sa victime après la réponse', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => {
      duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
      return duel;
    };
    const FantomeCarteDetruite = ({ effet }) => React.createElement('div', { 'data-ghost-id': effet.entityId });
    const props = { initialiser, onQuitter: () => {}, rendu: { CercleMagique: RPG_RENDU_MOBA.CercleMagique, FantomeCarteDetruite } };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => {
      assert.ok(button, 'commande présente');
      await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    rpgFinDeTour(duel);
    duel.sorcier.mana.braise = 30;
    duel.sorcier.main = ['ashigaru-des-braises'];
    const victim = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(victim);
    // Une créature immobile déjà présente au début du tour justifie le
    // sacrifice et ne consomme pas l'invocation normale de ce tour.
    victim.atk = 0; victim.nePeutPasAttaquer = true;
    duel.moba.creaturesJouees.sorcier = false;
    duel.sorcier.main = ['anqa-des-braises'];
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.mobaCreatureEnAttente?.cote, 'sorcier');
    assert.deepEqual(duel.mobaCreatureEnAttente?.sacrificeIds, [victim.id]);
    assert.equal(document.querySelector('[data-rpg-sacrifice-id]'), null, 'rien avant la résolution');
    await click([...document.querySelectorAll('.moba__primary')].find((button) => button.textContent.includes('laisser entrer')));
    const circle = document.querySelector(`.moba__side--sorcier [data-rpg-sacrifice-id="${victim.id}"]`);
    assert.ok(circle, 'le cercle est visible sur le camp adverse');
    assert.ok(circle.closest('.moba__sacrifice-zone'), 'le style violet cible bien le cercle du plateau');
    assert.match(circle.getAttribute('style'), /width: 100%; height: 100%/);
    assert.ok(circle.querySelector('.rpg-invocation-sceau__orbite'), 'les runes du véritable cercle sont rendues');
    assert.equal(circle.closest('[data-moba-lane]').dataset.mobaLane, 'left');
    assert.equal(circle.closest('[data-moba-slot]').dataset.mobaSlot, '0');
    assert.ok(document.querySelector('.moba__side--sorcier .moba__slot.is-invoking'), 'la nouvelle créature attend la fin du rituel');
    assert.equal(document.querySelector(`[data-ghost-id="${victim.id}"]`), null, 'pas de fantôme de mort en double');
    await act(async () => circle.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })));
    assert.equal(document.querySelector(`[data-rpg-sacrifice-id="${victim.id}"]`), null, 'le cercle disparaît à la fin');
    assert.equal(document.querySelector('.moba__slot.is-invoking'), null, 'la créature apparaît après le cercle');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
