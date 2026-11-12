import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MOBA_DECKS, rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaCartesDeDepart, rpgMobaDeployerDepart, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function preparerDuel() {
  const duel = rpgMobaNouveauDuel({ joueurDeck: MOBA_DECKS[0].cardIds, sorcierDeck: MOBA_DECKS[0].cardIds, deploiementInitial: true, rng: () => .5 });
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises', 'papyrus', 'viking-des-neiges', 'jarl-au-marteau-de-guerre'];
  duel.sorcier.main = ['mousse-des-galiotes', 'gardienne-des-portes-de-sable', 'mur-de-boucliers', 'loup-des-neiges', 'anqa-des-braises'];
  return duel;
}
const choix = [
  { index: 0, laneId: 'right', slot: 1 },
  { index: 1, laneId: 'left', slot: 0 },
  { index: 3, laneId: 'center', slot: 0 },
];

test('déploiement initial : deux mains, copies distinctes, cinq cases et aucun coût/effet d’arrivée', () => {
  const duel = preparerDuel();
  assert.deepEqual(rpgMobaCartesDeDepart(duel, 'joueur'), [0, 1, 3]);
  assert.deepEqual(rpgMobaCartesDeDepart(duel, 'sorcier'), [0, 1, 3]);
  assert.equal(rpgMobaDeployerDepart(duel, choix).raison, 'timing', 'pas de pose avant les mulligans');
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  assert.equal(duel.manaEssaiDemarre, false, 'le premier tour attend la validation');
  const avant = JSON.stringify(duel);
  for (const invalide of [choix.slice(1), [choix[0], choix[0], choix[2]],
    [choix[0], { ...choix[1], laneId: 'right', slot: 1 }, choix[2]],
    [choix[0], choix[1], { ...choix[2], slot: 1 }],
    [choix[0], choix[1], { ...choix[2], index: 4 }]]) {
    assert.equal(rpgMobaDeployerDepart(duel, invalide).ok, false);
    assert.equal(JSON.stringify(duel), avant, 'choix refusé sans mutation');
  }
  const result = rpgMobaDeployerDepart(duel, choix);
  assert.equal(result.ok, true, result.raison);
  assert.equal(duel.manaEssaiDemarre, true);
  assert.equal(duel.moba.deploiementInitialFait, true);
  assert.deepEqual(duel.joueur.main, ['papyrus', 'jarl-au-marteau-de-guerre']);
  assert.deepEqual(duel.sorcier.main, ['mur-de-boucliers', 'anqa-des-braises']);
  assert.deepEqual(duel.moba.lanes.map((lane) => lane.slots.joueur.map((id) => duel.joueur.creatures.find((c) => c.id === id)?.carteId)),
    [['ashigaru-des-braises', undefined], ['viking-des-neiges'], [undefined, 'ashigaru-des-braises']]);
  assert.deepEqual(duel.moba.lanes.map((lane) => lane.slots.sorcier.map((id) => duel.sorcier.creatures.find((c) => c.id === id)?.carteId)),
    [['mousse-des-galiotes', undefined], ['loup-des-neiges'], ['gardienne-des-portes-de-sable', undefined]]);
  assert.ok(duel.joueur.creatures.every((c) => c.malInvocation));
  assert.equal(duel.moba.creaturesJouees.joueur, false, 'le quota du tour 1 reste libre');
  assert.equal(duel.moba.creaturesJouees.sorcier, false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaDeployerDepart(duel, choix).ok, false, 'une seule validation possible');
});

test('une carte de combat non auditée ne peut pas entrer par le déploiement', () => {
  const duel = preparerDuel();
  duel.joueur.main[0] = 'boualem';
  rpgMobaMulligan(duel, 'joueur', []);
  rpgMobaMulligan(duel, 'sorcier', []);
  const avant = JSON.stringify(duel);
  const result = rpgMobaDeployerDepart(duel, choix);
  assert.equal(result.raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), avant);
});

test('sans créature à coût 1–4, le bouton de validation apparaît immédiatement et la main reste entière', () => {
  const duel = preparerDuel();
  duel.joueur.main = ['papyrus', 'mur-de-boucliers', 'anqa-des-braises', 'jarl-au-marteau-de-guerre', 'papyrus'];
  duel.sorcier.main = [...duel.joueur.main];
  rpgMobaMulligan(duel, 'joueur', []);
  rpgMobaMulligan(duel, 'sorcier', []);
  assert.deepEqual(rpgMobaCartesDeDepart(duel, 'joueur'), []);
  assert.equal(rpgMobaDeployerDepart(duel, []).ok, true);
  assert.equal(duel.joueur.main.length, 5);
  assert.equal(duel.sorcier.main.length, 5);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('interface : sélectionner, changer une case, puis valider au centre du plateau', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const duel = preparerDuel();
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser: () => duel })));
    const click = async (element) => { assert.ok(element); await act(async () => element.click()); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.ok(document.querySelector('.moba__deploy-hand'));
    assert.equal(document.querySelector('.moba__deploy-confirm'), null);
    assert.equal(duel.manaEssaiDemarre, false);
    const cartes = [...document.querySelectorAll('.moba__deploy-card')];
    assert.equal(cartes.length, 3);
    await click(cartes[0]);
    await click(document.querySelector('[aria-label="Déployer sur Voie droite, emplacement 2"]'));
    assert.equal(document.querySelectorAll('.moba__slot--deploy-preview.is-opponent').length, 3, 'cases de l’IA montrées aussi');
    assert.equal(document.querySelectorAll('[data-moba-side="joueur"] .moba__slot--deploy-preview').length, 1);
    await click(document.querySelector('[data-moba-side="joueur"] .moba__slot--deploy-preview'));
    assert.equal(document.querySelectorAll('[data-moba-side="joueur"] .moba__slot--deploy-preview').length, 0, 'déplacement réversible');
    await click(document.querySelector('[aria-label="Déployer sur Voie gauche, emplacement 1"]'));
    await click(cartes[1]);
    await click(document.querySelector('[aria-label="Déployer sur Voie droite, emplacement 2"]'));
    await click(cartes[2]);
    await click(document.querySelector('[aria-label="Déployer sur Voie centrale, emplacement 1"]'));
    assert.match(document.querySelector('.moba__deploy-confirm').textContent, /Valider le choix/);
    assert.equal(duel.joueur.creatures.length, 0, 'prévisualisation sans mutation du duel');
    await click(document.querySelector('.moba__deploy-confirm'));
    assert.equal(document.querySelector('.moba__deploy-hand'), null);
    assert.equal(duel.joueur.creatures.length, 3);
    assert.equal(duel.sorcier.creatures.length, 3);
    assert.equal(duel.manaEssaiDemarre, true);
    assert.ok(document.querySelector('.moba__controls button'), 'premier tour ouvert');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('le duel libre propose le déploiement après le mulligan, avant les actions du tour', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { decksMaison: [MOBA_DECKS[0]], onQuitter: () => {} })));
    const click = async (element) => { assert.ok(element); await act(async () => element.click()); };
    await click([...document.querySelectorAll('.moba__setup-actions button')].find((button) => button.textContent.includes('Commencer le duel')));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.ok(document.querySelector('.moba__deploy-hand'));
    assert.equal(document.querySelector('.moba__controls'), null, 'aucune action de tour avant la validation');
    for (const card of [...document.querySelectorAll('.moba__deploy-card')]) {
      await click(card);
      await click([...document.querySelectorAll('[data-moba-side="joueur"] .moba__slot--deploy-empty')].find((slot) => !slot.disabled));
    }
    await click(document.querySelector('.moba__deploy-confirm'));
    assert.equal(document.querySelector('.moba__deploy-hand'), null);
    assert.ok(document.querySelector('.moba__controls'), 'le tour commence après validation');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('la campagne passe aussi par le déploiement après son premier master', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { decksMaison: [MOBA_DECKS[0]], onQuitter: () => {} })));
    await act(async () => document.querySelector('.moba__story-start button').click());
    await act(async () => document.querySelector('.moba__interlude .moba__primary').click());
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    assert.ok(document.querySelector('.moba__deploy-hand'));
    assert.match(document.querySelector('.moba__trial').textContent, /CHAPITRE 1\/5/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
