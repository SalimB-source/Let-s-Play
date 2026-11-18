import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { rpgNouveauDuel, rpgJouerCreature, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi, rpgConsommerPresentations } from '../src/games/rpgDuel.js';

function duelPret(main, deck) {
  const duel = rpgNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp: true, rng: () => .5 });
  duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
  duel.tour = 'joueur'; duel.joueur.manaChoixEnAttente = null;
  duel.joueur.main = main; duel.joueur.deck = deck;
  rpgConsommerPresentations(duel);
  return duel;
}

test('les recherches confirmées portent un signal privé, jamais les choix refusés', () => {
  const duel = duelPret(['dune-marchante'], ['chien-du-guet', 'poigne-de-givre']);
  assert.ok(rpgJouerCreature(duel, 'joueur', 'dune-marchante').ok);
  rpgConsommerPresentations(duel);
  assert.equal(rpgResoudreRenfortChoisi(duel, 'joueur', 0).ok, false);
  assert.deepEqual(rpgConsommerPresentations(duel), []);
  const choix = rpgCartesRenfortChoisi(duel, 'joueur').find(c => c.id === 'poigne-de-givre');
  assert.ok(rpgResoudreRenfortChoisi(duel, 'joueur', choix.index).ok);
  assert.deepEqual(rpgConsommerPresentations(duel), [{ type: 'recherche', cote: 'joueur', carteId: 'poigne-de-givre' }]);
  assert.ok(!JSON.stringify(duel).includes('"type":"recherche"'), 'le signal reste hors de l’état sérialisé');
});

test('recherche automatique de Navire : un événement distinct de la pioche', () => {
  const duel = duelPret(['pilote-de-la-carreira'], ['galion-de-la-flotte']);
  assert.ok(rpgJouerCreature(duel, 'joueur', 'pilote-de-la-carreira').ok);
  assert.ok(rpgConsommerPresentations(duel).some(e => e.type === 'recherche' && e.carteId === 'galion-de-la-flotte'));
  assert.ok(duel.joueur.main.includes('galion-de-la-flotte'));
});

test('les calques décoratifs restent non accessibles, et les éclats ne jouent pas pour une égide encore active', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { RpgFissureImpact, RpgVagueTour, RpgEclatsBouclier } = await server.ssrLoadModule('/src/games/RpgEffetsComplementaires.jsx');
    assert.match(renderToStaticMarkup(React.createElement(RpgFissureImpact)), /aria-hidden="true"/);
    for (const camp of ['joueur', 'sorcier']) assert.match(renderToStaticMarkup(React.createElement(RpgVagueTour, { annonce: { camp, token: 1 } })), new RegExp(`is-${camp}`));
    assert.equal(renderToStaticMarkup(React.createElement(RpgVagueTour, { annonce: null })), '');
    const rendu = (effet, entite) => renderToStaticMarkup(React.createElement(RpgEclatsBouclier, { effet, entite }));
    assert.equal(rendu(null, {}), '');
    assert.equal(rendu({ token: 1 }, { bouclier: 1 }), '');
    assert.equal(rendu({ token: 1 }, { bouclierLumiere: true }), '');
    assert.equal(rendu({ token: 1 }, { protection: { contre: 'eau' } }), '');
    assert.match(rendu({ token: 1 }, { bouclier: 0 }), /rpg-eclats-bouclier-autonome/);
    const { PlaqueVie } = await server.ssrLoadModule('/src/games/RpgVieCompteurs.jsx');
    const vie = renderToStaticMarkup(React.createElement(PlaqueVie, { pv: 4, pvMax: 20, danger: true }));
    assert.match(vie, /is-danger/); assert.match(vie, />4</);
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(PlaqueVie, { pv: 10, pvMax: 20, danger: false })), /is-danger/);
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const entite = { id: 'carte-test', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true };
    const carte = (actionFx) => renderToStaticMarkup(React.createElement(TableCard, { entite, cote: 'joueur', actionFx }));
    assert.doesNotMatch(carte({ type: 'hit', token: 1, impactVerifie: false }), /rpg-fissure-impact/, 'un malus ou une parade ne devient pas une blessure');
    assert.match(carte({ type: 'hit', token: 2, impactVerifie: true }), /rpg-fissure-impact/);
    assert.doesNotMatch(carte(null), /rpg-fissure-impact/);

  } finally { await server.close(); }
});
