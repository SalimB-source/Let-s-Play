import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('each player can edit an audited deck, with live size, colour and copy validation', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {} })));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const byText = (selector, text) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(text));
    await click(byText('.moba__deck-choice button', 'du joueur'));
    assert.match(document.querySelector('[role=dialog]').getAttribute('aria-label'), /Vous/);
    assert.match(document.querySelector('.moba__editor-summary').textContent, /30 \/ 30 cartes.*Deck valide/);
    const save = () => byText('.moba__editor-actions button', 'Utiliser');
    assert.equal(document.querySelector('[aria-label="Ajouter Ashigaru des braises"]').disabled, true, 'copy limit reached');
    const filter = document.querySelector('.moba__editor-filters select');
    await act(async () => { filter.value = 'tenebres'; filter.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.ok(document.querySelectorAll('.moba__editor-card').length > 1);
    assert.ok(document.querySelector('[aria-label="Ajouter Papyrus"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Les feuillets"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Voile de la lune noire"]'));
    await act(async () => { filter.value = 'tous'; filter.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.ok(document.querySelector('[aria-label="Ajouter Veilleuse des citernes"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Djinn de la flamme mourante"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter TAREK"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Orochi"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Momie de lin"]'));
    assert.equal(document.querySelector('[aria-label="Ajouter Chien de sable"]'), null, 'tokens cannot be placed in decks');
    await click(document.querySelector('[aria-label="Retirer Viking des neiges"]'));
    assert.match(document.querySelector('.moba__editor-summary').textContent, /29 \/ 30 cartes.*30 cartes exigées/);
    assert.equal(document.querySelector('[aria-label="Ajouter Ashigaru des braises"]').disabled, true, 'copy limit still applies with space available');
    assert.equal(save().disabled, true);
    await click(document.querySelector('[aria-label="Ajouter Papyrus"]'));
    assert.match(document.querySelector('.moba__editor-summary').textContent, /1 à 3 couleurs/);
    assert.equal(save().disabled, true);
    await click(document.querySelector('[aria-label="Retirer Papyrus"]'));
    await click(document.querySelector('[aria-label="Ajouter Guerrier au bouclier rond"]'));
    assert.equal(save().disabled, false);
    assert.match(document.querySelector('.moba__editor-summary').textContent, /Deck valide/);
    await click(save());
    assert.match(document.querySelector('.moba__deck-choice').textContent, /Deck personnalisé/);
    await click(byText('.moba__deck-choice button', 'de l’IA'));
    await click(document.querySelector('[aria-label="Retirer Viking des neiges"]'));
    await click(byText('.moba__editor-actions button', 'Annuler'));
    assert.equal(document.querySelectorAll('.moba__deck-choice')[1].textContent.includes('Deck personnalisé'), false);
    await click(byText('[role=dialog] button', 'Commencer'));
    assert.match(document.querySelector('[role=dialog]').getAttribute('aria-label'), /Votre main de départ/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});


test('classic destruction ghost keeps its measured pixel geometry and end callback', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { FantomeCarteDetruite } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const effet = { cardId: 'ashigaru-des-braises', entityId: 'test', effectId: 'test-fx', name: 'Ashigaru', left: 37, top: 62, width: 90, height: 120, angle: .2 };
    let fini = null;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(FantomeCarteDetruite, { effet, onTermine: (id) => { fini = id; } })));
    const ghost = document.querySelector('.rpg-card-destruction-fx');
    for (const element of [ghost, document.querySelector('.rpg-carte-delitee')]) {
      assert.equal(element.style.left, '37px'); assert.equal(element.style.top, '62px');
      assert.equal(element.style.width, '90px'); assert.equal(element.style.height, '120px');
    }
    assert.equal(ghost.style.getPropertyValue('--rpg-fx-rotation'), '0.2rad');
    await act(async () => ghost.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })));
    assert.equal(fini, 'test-fx');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});


test('solo game keeps the AI hand private and allows human responses', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 });
      return duel;
    };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const byText = (selector, text) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(text));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.equal(document.querySelector('[role=dialog]'), null, 'no handoff and no AI mulligan screen');
    assert.equal(duel.mulliganFait.sorcier, true);
    await click(byText('.moba__choice button', 'braise'));
    await click(byText('.moba__controls button', 'Fin du tour'));
    assert.equal(document.querySelector('.moba__hand'), null, 'AI hand is not rendered in response window');
    assert.match(document.querySelector('.moba__hint').textContent, /IA réfléchit/);
    const tick = async () => act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
    for (let i = 0; i < 15 && !(duel.tour === 'sorcier' && duel.finDeTour); i++) {
      await tick();
      if (duel.tour === 'sorcier' && !duel.finDeTour && !duel.combatDeclare && !duel.effetCreatureEnAttente) {
        assert.equal(document.querySelector('.moba__hand'), null, 'AI hand remains absent during its turn');
      }
    }
    assert.ok(duel.sorcier.creatures.length, 'AI has summoned a creature');
    assert.equal(duel.tour, 'sorcier');
    assert.ok(duel.finDeTour, 'AI opens the human end-of-turn response');
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
    assert.ok(byText('.moba__controls button', 'Passer et commencer mon tour'));
    await click(byText('.moba__controls button', 'Passer et commencer mon tour'));
    assert.equal(duel.tour, 'joueur');
    assert.ok(document.querySelector('.moba__choice button'), 'human chooses their own mana');
    await click(byText('.moba__choice button', 'braise'));
    await click(byText('.moba__controls button', 'Fin du tour'));
    for (let i = 0; i < 20 && !duel.combatDeclare; i++) await tick();
    assert.ok(duel.combatDeclare, 'AI declares an attack rather than resolving it without the human');
    assert.equal(duel.combatDeclare.cote, 'sorcier');
    assert.ok(document.querySelector('[aria-label="Votre main"]'), 'human may play an instant');
    assert.ok(byText('.moba__controls button', 'Résoudre le combat'), 'human controls blocking and resolution');
    // Give the human a real instant to exercise the response interface.
    duel.joueur.main.push('poigne-de-givre'); duel.joueur.mana.neige = 10;
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    await click(byText('.moba__card', 'Poigne de givre'));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').includes('cible de magie')));
    assert.equal(duel.combatDeclare, null, 'the instant removes the attacker and ends the combat');
    assert.equal(document.querySelector('[role=dialog]'), null, 'no pass-device overlay after combat');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI responds to a human declaration and assigns mandatory blocks automatically', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => {
      duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('jarl-au-marteau-de-guerre'), sorcierDeck: Array(30).fill('loup-des-neiges'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 });
      return duel;
    };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
    duel.joueur.mana.neige = 10;
    const attacker = engine.rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0); ok(attacker);
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
    duel.sorcier.mana.neige = 10;
    const blocker = engine.rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'left', 0); ok(blocker);
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Jarl')));
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Déclarer')));
    assert.ok(duel.combatDeclare);
    assert.equal(document.querySelector('.moba__hand'), null, 'no access to AI hand');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.combatDeclare, null, 'AI finished its defense');
    assert.ok(!duel.sorcier.creatures.some((e) => e.id === blocker.entite.id), 'AI satisfied provocation and blocked');
    assert.equal(duel.moba.lanes[0].hp.sorcier, 9, 'only Overkill excess reaches the lane');
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human chooses the Veilleuse shield target through the solo board', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('veilleuse-des-citernes'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['eau', 'braise'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 });
      duel.joueur.mana.eau = 5;
      return duel;
    };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const byText = (selector, text) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(text));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    await click(byText('.moba__choice button', 'eau'));
    duel.joueur.main = ['ashigaru-des-braises', 'veilleuse-des-citernes'];
    duel.joueur.mana.braise = 5;
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    await click(byText('.moba__card', 'Ashigaru'));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    await click(byText('.moba__card', 'Veilleuse'));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie centrale, Vous') && !b.disabled));
    assert.equal(duel.arriveeEnAttente?.carteId, 'veilleuse-des-citernes', document.querySelector('.moba__error')?.textContent || JSON.stringify(duel.joueur.mana));
    assert.match(document.querySelector('.moba__hint').textContent, /bouclier/);
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').includes('cible de bouclier')));
    assert.equal(duel.arriveeEnAttente, null);
    assert.equal(duel.joueur.creatures.find((e) => e.carteId === 'ashigaru-des-braises').bouclier, 1);
    assert.equal(duel.joueur.creatures.find((e) => e.carteId === 'veilleuse-des-citernes').bouclier ?? 0, 0);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Ténèbres targeted spell exposes only creatures within its printed cost range', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'tenebres', 'braise'], sorcierCouleurs: ['braise'], rng: () => .5 });
      return duel;
    };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const byText = (selector, text) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(text));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    await click(byText('.moba__choice button', 'neige'));
    duel.joueur.main = ['ashigaru-des-braises', 'jarl-au-marteau-de-guerre', 'effacement-des-faibles'];
    duel.joueur.mana.neige = 10; duel.joueur.mana.tenebres = 10; duel.joueur.mana.braise = 10;
    assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).ok, true);
    assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).ok, true);
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    await click(byText('.moba__card', 'Effacement des faibles'));
    const small = [...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Ashigaru'));
    const large = [...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Jarl'));
    assert.equal(small.disabled, false); assert.equal(large.disabled, true);
    await click(small);
    assert.equal(duel.joueur.creatures.length, 1);
    assert.equal(duel.joueur.creatures[0].carteId, 'jarl-au-marteau-de-guerre');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('a human selects a targeted attacker and an enemy only in its own lane', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => {
      duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('feriel'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 });
      return duel;
    };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    ok(rpgChoisirCouleurMana(duel, 'sorcier', 'braise'));
    duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises', 'ashigaru-des-braises'];
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    const other = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
    duel.joueur.mana.braise = 10; duel.joueur.main.push('feriel');
    const attacker = engine.rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('FÉRIEL')));
    assert.match(document.querySelector('.moba__hint').textContent, /attaque ciblée/);
    await click(document.querySelector('.moba__cancel-choice'));
    assert.equal(document.querySelector('.moba__slot.is-attacking'), null, 'cancel clears the uncommitted attacker');
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('FÉRIEL')));
    const enemySlots = [...document.querySelectorAll('.moba__slot.has-creature')].filter((b) => b.getAttribute('aria-label').startsWith('Ashigaru'));
    assert.equal(enemySlots.length, 2);
    assert.equal(enemySlots.filter((b) => !b.disabled).length, 1, 'only same-lane target is selectable');
    await click(enemySlots.find((b) => !b.disabled));
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Déclarer')));
    assert.equal(duel.combatDeclare.ciblesAttaque[attacker.id], target.id);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.combatDeclare, null);
    assert.equal(duel.sorcier.creatures.includes(target), false);
    assert.equal(duel.sorcier.creatures.includes(other), true);
    assert.equal(duel.moba.lanes[0].hp.sorcier, 10);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI discard effect pauses its turn for the human to choose a card, then resumes', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('nom-efface'), joueurCouleurs: ['braise'], sorcierCouleurs: ['tenebres'], rng: () => .5 });
      return duel;
    };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    duel.joueur.main = ['verglas', 'trait-de-braise'];
    duel.sorcier.main = ['nom-efface']; duel.sorcier.mana.tenebres = 10;
    ok(engine.rpgMobaLancerMagie(duel, 'sorcier', 'nom-efface'));
    await act(async () => root.render(React.createElement(Board, props)));
    assert.match(document.querySelector('.moba__hint').textContent, /défausser/);
    assert.equal(document.querySelectorAll('.moba__hand .moba__card').length, 2);
    assert.ok(!document.querySelector('.moba__hand').textContent.includes('Nom effacé'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.tour, 'sorcier'); assert.equal(duel.defausseEnAttente.cote, 'joueur');
    await click([...document.querySelectorAll('.moba__hand .moba__card')].find((b) => b.textContent.includes('Verglas')));
    assert.equal(duel.defausseEnAttente, null); assert.deepEqual(duel.joueur.main, ['trait-de-braise']);
    assert.equal(duel.tour, 'sorcier', 'effect discard must not end the AI turn');
    assert.match(document.querySelector('.moba__ai-status').textContent, /réfléchit/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('drawing then discarding from an arrival leaves the human in the main phase', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ibis-des-comptes'), sorcierDeck: Array(30).fill('ibis-des-comptes'), joueurCouleurs: ['tenebres'], sorcierCouleurs: ['tenebres'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ibis-des-comptes', 'verglas']; duel.joueur.mana.tenebres = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Ibis')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    assert.equal(duel.defausseEnAttente.cote, 'joueur');
    assert.match(document.querySelector('.moba__hint').textContent, /défausser/);
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Verglas')));
    assert.equal(duel.defausseEnAttente, null); assert.equal(duel.tour, 'joueur');
    assert.equal(duel.phase, 'principale'); assert.ok(duel.joueur.cimetiere.includes('verglas'));
    assert.match(document.querySelector('.moba__hint').textContent, /Jouez une carte/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

for (const [id, name] of [['valkyrie-des-neuf-nuits', 'Valkyrie des neuf nuits'], ['maitre-des-corbeaux', 'LE MAÎTRE DES CORBEAUX']]) test(`${id} exile highlights legal creatures in both camps and rejects expensive targets`, async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'tenebres', 'braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
    duel.joueur.mana.braise = 15; duel.joueur.mana.neige = 15;
    duel.joueur.main.push('jarl-au-marteau-de-guerre');
    const ally = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    const expensive = engine.rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises'];
    const enemy = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
    duel.joueur.mana.neige = 15; duel.joueur.mana.tenebres = 15; duel.joueur.main = [id];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes(name)));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie centrale, Vous') && !b.disabled));
    assert.match(document.querySelector('.moba__hint').textContent, /alliée ou adverse/);
    const targets = [...document.querySelectorAll('.moba__slot.has-creature')];
    assert.equal(targets.filter((b) => b.getAttribute('aria-label').startsWith('Ashigaru') && !b.disabled).length, 2);
    assert.equal(targets.find((b) => b.getAttribute('aria-label').startsWith('Jarl')).disabled, true);
    await click(targets.find((b) => b.getAttribute('aria-label').startsWith('Ashigaru') && b.closest('.moba__side')?.textContent.includes('IA')));
    assert.ok(duel.joueur.creatures.includes(ally)); assert.ok(duel.joueur.creatures.includes(expensive));
    assert.equal(duel.sorcier.creatures.includes(enemy), false);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Appât displays its forced blocker and the AI obeys during combat', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
    duel.joueur.mana.braise = 10;
    const attacker = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises'];
    const blocker = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
    duel.joueur.mana.neige = 10; duel.joueur.main = ['appat-de-la-meute']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector('.moba__hand .moba__card'));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').includes('cible de magie')));
    assert.ok(document.querySelector('[aria-label*="Doit bloquer si possible"]'));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.closest('.moba__side')?.textContent.includes('Vous') && b.getAttribute('aria-label').startsWith('Ashigaru')));
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Déclarer')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.combatDeclare, null); assert.equal(duel.sorcier.creatures.includes(blocker), false);
    assert.equal(duel.joueur.creatures.includes(attacker), false);
    assert.equal(duel.moba.lanes[0].hp.sorcier, 10);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Kraken highlights only enemy ships for its arrival', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['eau', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
    duel.sorcier.mana.neige = 10; duel.sorcier.mana.braise = 10; duel.sorcier.main = ['drakkar-a-tete-de-dragon', 'ashigaru-des-braises'];
    const ship = engine.rpgMobaJouerCreature(duel, 'sorcier', 'drakkar-a-tete-de-dragon', 'left', 0).entite;
    const other = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'eau')); duel.joueur.mana.eau = 15; duel.joueur.main = ['kraken'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector('.moba__hand .moba__card'));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie centrale, Vous') && !b.disabled));
    assert.match(document.querySelector('.moba__hint').textContent, /navire adverse/);
    const shipSlot = [...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Drakkar'));
    const otherSlot = [...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Ashigaru'));
    assert.equal(shipSlot.disabled, false); assert.equal(otherSlot.disabled, true);
    await click(shipSlot);
    assert.equal(duel.sorcier.creatures.includes(ship), false); assert.ok(duel.sorcier.creatures.includes(other));
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Butin after human combat opens a discard choice and does not end the turn', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('fennec-des-decombres'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['fennec-des-decombres', 'verglas']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Fennec')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Fennec')));
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Déclarer')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[0].hp.sorcier, 7);
    assert.equal(duel.defausseEnAttente?.cote, 'joueur');
    assert.match(document.querySelector('.moba__hint').textContent, /défausser/);
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Verglas')));
    assert.equal(duel.defausseEnAttente, null); assert.equal(duel.tour, 'joueur');
    assert.equal(duel.phase, 'principale2'); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human deck search shows eligible cards and transfers the selected spell', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['tiziri-du-djurdjura']; duel.joueur.deck = ['ressac', 'verglas', 'gardienne-des-portes-de-sable'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Tiziri')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    const dialog = document.querySelector('[aria-label="Recherche dans votre deck"]');
    assert.ok(dialog); assert.match(dialog.textContent, /Ressac/); assert.match(dialog.textContent, /Verglas/);
    assert.doesNotMatch(dialog.textContent, /Gardienne/);
    await click([...dialog.querySelectorAll('button')].find((b) => b.textContent.includes('Verglas')));
    assert.ok(!document.querySelector('[aria-label="Recherche dans votre deck"]'));
    assert.ok(duel.joueur.main.includes('verglas')); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI search resolves privately, without rendering its deck contents', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    duel.tour = 'sorcier'; duel.sorcier.mana.sable = 10; duel.sorcier.main = ['tiziri-du-djurdjura']; duel.sorcier.deck = ['ressac', 'verglas'];
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaRechercheEnAttente?.cote, 'sorcier');
    assert.ok(!document.querySelector('[aria-label="Recherche dans votre deck"]'));
    assert.doesNotMatch(document.body.textContent, /Ressac|Verglas/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaRechercheEnAttente, null); assert.ok(duel.sorcier.main.includes('ressac'));
    assert.doesNotMatch(document.body.textContent, /Ressac|Verglas/);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human can trigger a Harakiri lane conquest and see the victory screen', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.braise = 20; duel.joueur.mana.tenebres = 20;
    duel.joueur.main = ['hatamoto-des-cendres', 'effacement-des-faibles'];
    mobaInfliger(duel.moba, 'joueur', 'right', 10); mobaInfliger(duel.moba, 'joueur', 'left', 9);
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Hatamoto')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Effacement')));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Hatamoto')));
    assert.equal(duel.moba.winner, 'joueur');
    assert.match(document.querySelector('[role="dialog"][aria-label="Victoire"]').textContent, /Victoire !/);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Le Poids lets the player choose a lane and updates both HP counters', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.tenebres = 10; duel.joueur.main = ['le-poids'];
    mobaInfliger(duel.moba, 'sorcier', 'center', 4);
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Le Poids')));
    assert.match(document.querySelector('.moba__hint').textContent, /voie active/);
    assert.equal(document.querySelectorAll('.moba__lane-target').length, 3);
    await click(document.querySelector('[aria-label="Transférer les PV de Voie centrale"]'));
    assert.equal(duel.moba.lanes[1].hp.joueur, 8); assert.equal(duel.moba.lanes[1].hp.sorcier, 8);
    assert.equal(document.querySelector('[role="progressbar"][aria-label="Voie centrale, Vous"]').getAttribute('aria-valuenow'), '8');
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('La Grande Pesée asks for a payment lane before a separate transfer lane', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.tenebres = 20; duel.joueur.main = ['la-grande-pesee'];
    mobaInfliger(duel.moba, 'sorcier', 'right', 5);
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('La Grande Pesée')));
    assert.match(document.querySelector('.moba__hint').textContent, /payer le prix/);
    await click(document.querySelector('[aria-label="Payer 1 PV de Voie gauche de Vous"]'));
    assert.equal(duel.moba.lanes[0].hp.joueur, 10, 'choice does not charge before resolution');
    assert.match(document.querySelector('.moba__hint').textContent, /transf|perd des PV/);
    await click(document.querySelector('.moba__cancel-choice'));
    assert.equal(duel.joueur.mana.tenebres, 20, 'cancellation spends no mana');
    assert.equal(duel.moba.lanes[0].hp.joueur, 10, 'cancellation spends no life');
    assert.ok(duel.joueur.main.includes('la-grande-pesee'));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('La Grande Pesée')));
    assert.match(document.querySelector('.moba__hint').textContent, /payer le prix/, 'payment choice was cleared');
    await click(document.querySelector('[aria-label="Payer 1 PV de Voie gauche de Vous"]'));
    await click(document.querySelector('[aria-label="Transférer les PV de Voie droite"]'));
    assert.equal(duel.moba.lanes[0].hp.joueur, 9); assert.equal(duel.moba.lanes[2].hp.joueur, 8);
    assert.equal(duel.moba.lanes[2].hp.sorcier, 7); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Tarek summons dogs into visible lane slots and the player can select them to attack', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('tarek'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['tarek'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('TAREK')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie droite, Vous') && !b.disabled));
    const dogs = [...document.querySelectorAll('.moba__slot.has-creature')].filter((b) => b.getAttribute('aria-label').startsWith('Chien de sable'));
    assert.equal(dogs.length, 2);
    assert.ok(dogs.some((b) => b.getAttribute('aria-label').includes('attaque 2')));
    assert.ok(dogs.some((b) => b.getAttribute('aria-label').includes('attaque 1')));
    await click(dogs[0]);
    assert.ok(document.querySelector('.moba__slot.is-attacking'));
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Guetteur shows its Hour counters on the MOBA board', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('guetteur-du-beffroi'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['guetteur-du-beffroi'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Guetteur')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie droite, Vous') && !b.disabled));
    const slot = [...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Guetteur du beffroi'));
    assert.ok(slot); assert.match(slot.getAttribute('aria-label'), /2 Heures/); assert.match(slot.textContent, /2 Heures/);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('board explains lane rules, identifies card location and confirms leaving an unsaved duel', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel, exited = 0;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => { exited += 1; }, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.match(document.querySelector('.moba__rules').textContent, /ne provoque pas de fatigue/);
    assert.match(document.querySelector('.moba__rules').textContent, /Attaque ciblée vise une créature de sa voie/);
    assert.equal(document.querySelector('[role="region"][aria-label="Plateau des trois voies"]').getAttribute('tabindex'), '0');
    duel.joueur.mana.braise = 10;
    const entity = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(entity);
    await act(async () => root.render(React.createElement(Board, props)));
    const card = [...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Ashigaru'));
    assert.match(card.getAttribute('aria-label'), /Vous, Voie droite/);
    await click([...document.querySelectorAll('.moba__header button')].find((b) => b.textContent.includes('Quitter')));
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="moba-quitter-title"]');
    assert.ok(dialog); assert.match(dialog.textContent, /ne sera pas sauvegardée/); assert.equal(exited, 0);
    assert.ok(document.querySelector('.moba > div[inert]'), 'the board is inert behind the dialog');
    assert.equal(document.activeElement.textContent, 'Continuer le duel');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert.equal(document.activeElement.textContent, 'Quitter sans sauvegarder', 'focus wraps inside the dialog');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[aria-labelledby="moba-quitter-title"]'), null); assert.equal(exited, 0);
    assert.match(document.activeElement.textContent, /Quitter la partie/, 'focus returns to the triggering button');
    await click([...document.querySelectorAll('.moba__header button')].find((b) => b.textContent.includes('Quitter')));
    await click([...document.querySelectorAll('[aria-labelledby="moba-quitter-title"] button')].find((b) => b.textContent.includes('Quitter sans')));
    assert.equal(exited, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('exit confirmation pauses the AI without rendering its hidden hand', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Fin du tour')));
    await click([...document.querySelectorAll('.moba__header button')].find((b) => b.textContent.includes('Quitter')));
    const before = JSON.stringify(duel);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
    assert.equal(JSON.stringify(duel), before, 'AI must not play while confirmation is open');
    assert.equal(document.querySelector('.moba__hand'), null);
    assert.ok(document.querySelector('[aria-label="Main de l’IA masquée"]'));
    await click([...document.querySelectorAll('[aria-labelledby="moba-quitter-title"] button')].find((b) => b.textContent.includes('Continuer')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
    assert.notEqual(JSON.stringify(duel), before, 'AI resumes after the dialog closes');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
