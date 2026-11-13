import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

test('la carte montre le sablier et explique le mal pour les deux camps et modes', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const base = { id: 'a', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true, malInvocation: true };
    for (const cote of ['joueur', 'ennemi']) for (const moba of [null, { ariaLabel: 'Chien, mal d’invocation' }]) {
      const html = renderToStaticMarkup(React.createElement(TableCard, { entite: base, cote, moba }));
      const dom = new JSDOM(html); const card = dom.window.document.querySelector('.rpg-card');
      assert.ok(card.classList.contains('is-summoning-sick'));
      assert.ok(card.querySelector('.rpg-card__summoning-sick'));
      assert.match(card.getAttribute('aria-label'), /mal d’invocation/i);
      assert.match(card.querySelector('.rpg-card__summoning-sick').title, /peut défendre/);
      dom.window.close();
    }
    for (const extra of [{ rapidite: true }, { rapiditeAccordee: true }, { malInvocation: false }]) {
      const html = renderToStaticMarkup(React.createElement(TableCard, { entite: { ...base, ...extra }, cote: 'joueur' }));
      assert.doesNotMatch(html, /is-summoning-sick|rpg-card__summoning-sick/);
    }
  } finally { await vite.close(); }
});
