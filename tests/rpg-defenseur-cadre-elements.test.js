import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { CARD_FRAME_COLORS, cardById, cardFrameColor, cardHybridGradient } from '../src/games/rpgCards.js';

const exemples = [
  ['gardien-de-la-porte-ardente', 'braise'],
  ['guetteuse-des-marees', 'eau'],
  ['gardienne-des-portes-de-sable', 'sable'],
  ['gardien-viking-du-fjord', 'neige'],
  ['garde-du-voile', 'tenebres'],
];

test('le contour des Défenseurs suit les éléments sur les deux plateaux et dans les deux camps', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const rendre = (id, extras = {}, moba = null, cote = 'joueur') => {
      const entite = { id:'def', carteId:id, atk:2, def:4, pv:4, pvMax:4, ready:true, ...extras };
      return new JSDOM(renderToStaticMarkup(React.createElement(TableCard, {entite, cote, moba}))).window.document;
    };
    for (const [id, element] of exemples) for (const moba of [null, {className:'moba__slot'}]) for (const cote of ['joueur','ennemi']) {
      const c = cardById(id); assert.ok(c.defenseur || c.prioriteAttaqueRapide, id);
      const doc = rendre(id, {}, moba, cote);
      const face = doc.querySelector('.rpg-card.rpg-carte-bouclier'); assert.ok(face, id);
      const filet = face.querySelector('.rpg-card__liseret-garde'); assert.ok(filet, id);
      assert.match(filet.getAttribute('style'), new RegExp(CARD_FRAME_COLORS[element].color, 'i'), id);
      assert.equal(cardFrameColor(c), CARD_FRAME_COLORS[element].color);
      assert.ok(face.querySelector('.rpg-card__resonance--garde'), 'sonar conservé');
    }
    for (const id of ['chevaliere-du-baton-sacre', 'le-cavalier-du-ressac-gele', 'veilleur-du-dernier-crepuscule']) {
      const c = cardById(id), filet = rendre(id).querySelector('.rpg-card__liseret-garde');
      assert.equal(filet.getAttribute('style'), `background:${cardHybridGradient(c)}`);
    }
    const allie = 'chercheuse-des-armes-ensevelies';
    assert.equal(rendre(allie).querySelector('.rpg-card__liseret-garde'), null);
    const acquise = rendre(allie, { defenseurAccorde:true }).querySelector('.rpg-card__liseret-garde');
    assert.equal(acquise.getAttribute('style'), `background:${cardHybridGradient(cardById(allie)) ?? cardFrameColor(cardById(allie))}`);
    const furie = rendre('gardien-viking-du-fjord', { furieDeclenchee:true }).querySelector('.rpg-card__liseret-garde');
    assert.match(furie.getAttribute('style'), new RegExp(CARD_FRAME_COLORS.neige.color, 'i'));
    assert.equal(rendre('source-de-bimini', { defenseur:true }).querySelector('.rpg-card__liseret-garde'), null);
  } finally { await vite.close(); }
});

test('le filet coloré suit uniquement le contour de l’écu, sans teinter l’illustration', () => {
  const css = readFileSync(new URL('../src/games/rpg-bouclier.css', import.meta.url), 'utf8');
  const bloc = css.match(/\.rpg-card\.rpg-carte-bouclier > \.rpg-card__liseret-garde \{([^}]*)\}/)?.[1];
  assert.ok(bloc); assert.match(bloc, /background:\s*var\(--rpg-frame-color/);
  assert.match(bloc, /mask-image:\s*var\(--rpg-ecusson-defenseur-liseret\)/);
  assert.match(bloc, /pointer-events:\s*none/);
});
