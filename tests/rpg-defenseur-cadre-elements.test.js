import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { CARD_FRAME_COLORS, cardById, cardFrameClass, cardFrameColor } from '../src/games/rpgCards.js';

const exemples = [
  ['gardien-de-la-porte-ardente', 'braise'],
  ['guetteuse-des-marees', 'eau'],
  ['gardienne-des-portes-de-sable', 'sable'],
  ['gardien-viking-du-fjord', 'neige'],
  ['garde-du-voile', 'tenebres'],
];

test('les Défenseurs gardent la couleur de leur carte, sans aucun cadre', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const rendre = (id, extras = {}, moba = null, cote = 'joueur') => {
      const entite = { id: 'def', carteId: id, atk: 2, def: 4, pv: 4, pvMax: 4, ready: true, ...extras };
      return new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite, cote, moba }))).window.document;
    };
    for (const [id, element] of exemples) for (const moba of [null, { className: 'moba__slot' }]) for (const cote of ['joueur', 'ennemi']) {
      const carte = cardById(id);
      assert.ok(carte.defenseur || carte.prioriteAttaqueRapide, id);
      assert.equal(cardFrameColor(carte), CARD_FRAME_COLORS[element].color, `${id} conserve sa couleur`);
      assert.doesNotMatch(cardFrameClass(carte), /rpg-card--frame-/, `${id} ne reçoit aucune classe de cadre`);

      const face = rendre(id, {}, moba, cote).querySelector('.rpg-card');
      assert.ok(face.classList.contains('rpg-carte-bouclier'), `${id} garde son repère d’état`);
      assert.equal(face.querySelector('.rpg-cadre-carte'), null, `${id} sans cadre SVG`);
      assert.equal(face.querySelector('.rpg-card__liseret-garde'), null, `${id} sans liseré de contour`);
      assert.equal(face.querySelector('.rpg-card__ombre-garde'), null, `${id} sans ombre d’écu`);
      assert.equal(face.querySelector('.rpg-card__resonance--garde') !== null, true, 'sonar conservé');
    }

    for (const id of ['chevaliere-du-baton-sacre', 'le-cavalier-du-ressac-gele', 'veilleur-du-dernier-crepuscule']) {
      const carte = cardById(id);
      assert.ok(cardFrameColor(carte), `${id} conserve sa couleur hybride`);
      assert.doesNotMatch(cardFrameClass(carte), /rpg-card--frame-/);
      assert.equal(rendre(id).querySelector('.rpg-card__liseret-garde'), null, `${id} sans liseré`);
    }
    const allie = 'chercheuse-des-armes-ensevelies';
    assert.equal(rendre(allie).querySelector('.rpg-card__resonance--garde'), null);
    assert.equal(rendre(allie, { defenseurAccorde: true }).querySelector('.rpg-card__liseret-garde'), null,
      'Défenseur acquis sans ajouter de cadre');
    assert.equal(rendre('source-de-bimini', { defenseur: true }).querySelector('.rpg-card__liseret-garde'), null,
      'un site ne reçoit pas de contour Défenseur');
  } finally { await vite.close(); }
});

test('les styles Défenseur ne dessinent aucune forme de cadre', () => {
  const css = readFileSync(new URL('../src/games/rpg-bouclier.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /--rpg-ecusson|mask-image|clip-path|background-image|border\s*:/);
  assert.doesNotMatch(css, /rpg-card__liseret-garde|rpg-card__ombre-garde/);
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier \{[^}]*scale: var\(--rpg-defenseur-echelle\);/s,
    'l’agrandissement posé reste indépendant du cadre');
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier > \.rpg-card__foot \{\s*translate: 0 -20cqw;/,
    'la position des statistiques reste inchangée');
});
