import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('guide et annonces : cibles signalées uniquement, annulation, nouveaux faits et fin', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.dataset.rect === 'source') return { left: 30, top: 200, width: 40, height: 60 };
    if (this.dataset.rect === 'target') return { left: 150, top: 80, width: 40, height: 60 };
    if (this.dataset.rect === 'other') return { left: 300, top: 80, width: 40, height: 60 };
    return { left: 0, top: 0, width: 600, height: 400 };
  };
  let root;
  try {
    const { RpgGuideCibles, RpgTempsForts, RpgVerdictScene, RpgEntreeLegendaire, rpgEstLegendaire } = await server.ssrLoadModule('/src/games/RpgMiseEnScene.jsx');
    assert.equal(rpgEstLegendaire({ kind: 'hero' }), true);
    assert.equal(rpgEstLegendaire({ kind: 'creature' }), false);
    assert.match(renderToStaticMarkup(React.createElement(RpgEntreeLegendaire)), /aria-hidden="true"/);
    for (const [vainqueur, classe] of [['joueur', 'victoire'], ['sorcier', 'defaite'], ['egalite', 'nul'], ['nul', 'nul']]) {
      assert.match(renderToStaticMarkup(React.createElement(RpgVerdictScene, { vainqueur })), new RegExp(`is-${classe}`));
    }
    const e = React.createElement;
    function Fixture({ actif, events, moba = false }) {
      const surfaceRef = useRef(null);
      return e('div', { ref: surfaceRef },
        e('button', { className: moba ? 'moba__card is-selected' : 'rpg-hand__card is-targeting', 'data-rect': 'source' }),
        e('div', { className: 'card-row' }, e('button', { className: 'rpg-card is-ciblable', 'data-rect': 'target', 'data-rpg-guide-cible': 'true' }),
          e('button', { className: 'rpg-card', 'data-rect': 'other' })),
        e(RpgGuideCibles, { surfaceRef, actif, moba }), e(RpgTempsForts, { evenements: events }));
    }
    root = createRoot(document.getElementById('root'));
    const ancien = { id: 'mort:1', type: 'mort', texte: 'Ancienne destruction' };
    const render = (props) => act(async () => root.render(e(Fixture, props)));
    await render({ actif: true, events: [ancien] });
    assert.equal(document.querySelectorAll('.rpg-guide-cibles line').length, 1);
    assert.equal(document.querySelector('.rpg-guide-cibles').getAttribute('aria-hidden'), 'true');
    assert.equal(document.querySelector('.rpg-temps-forts'), null, 'aucune annonce historique au montage');
    await render({ actif: false, events: [ancien, { id: 'critique:a:1', type: 'critique', texte: 'Garde : coup critique ×2' }] });
    assert.equal(document.querySelector('.rpg-guide-cibles'), null);
    assert.match(document.querySelector('.rpg-temps-forts').textContent, /coup critique ×2/);
    await render({ actif: true, moba: true, events: [ancien] });
    assert.equal(document.querySelectorAll('.rpg-guide-cibles line').length, 1);
    await render({ actif: false, moba: true, events: [ancien] });
    assert.equal(document.querySelector('.rpg-guide-cibles'), null);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 2450)));
    assert.equal(document.querySelector('.rpg-temps-forts'), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
