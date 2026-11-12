import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgMobaCartePourApercu } from '../src/games/rpgMobaPresentation.js';

test('le mulligan MOBA montre les pierres d’effets en marge sans changer la carte classique', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const main = ['tojiro-le-pourfendeur', 'faiseur-de-passage', 'ghul-des-cendres', 'ashigaru-des-braises', 'viking-des-neiges'];
    const initialiser = () => {
      const deck = Array(30).fill('ashigaru-des-braises');
      const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
      duel.joueur.main = [...main];
      return duel;
    };
    const rendu = { CarteMulligan: ({ carte, onBasculer, selectionnee }) =>
      React.createElement('button', { type: 'button', className: 'rpg-mulligan__card', 'data-card-id': carte.id,
        'aria-pressed': selectionnee, onClick: onBasculer }, carte.name) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { initialiser, rendu, onQuitter: () => {} })));
    const items = [...document.querySelectorAll('.moba__mulligan-item')];
    assert.equal(items.length, 5);
    for (const [index, id] of main.entries()) {
      const badges = items[index].querySelector('.rpg-card-icones--mulligan-moba');
      const effects = pastillesPourCarte(rpgMobaCartePourApercu(cardById(id)));
      if (!effects.length) {
        assert.equal(badges, null, `${id} : aucune pierre vide`);
        continue;
      }
      assert.ok(badges, `${id} : colonne visible hors du bouton`);
      assert.equal(badges.closest('button'), null);
      assert.equal(badges.querySelectorAll('.rpg-card-icone').length, effects.length);
    }
    assert.match(items[1].querySelector('.rpg-card-icones--mulligan-moba').getAttribute('aria-label'), /Embuscade/);
    assert.equal(cardById('faiseur-de-passage').reactionTourAdverse, undefined,
      'le mulligan ne modifie pas les règles ni les faces hors MOBA');
    assert.equal(items[0].querySelectorAll('.rpg-card-icone').length, 4,
      'les quatre effets de Tojiro restent représentés');
    await act(async () => items[0].querySelector('button').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.equal(items[0].querySelector('button').getAttribute('aria-pressed'), 'true',
      'les badges ne bloquent pas la sélection de la carte');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
