import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Les scénarios d’interface historiques partent avec les côtés à mi-vie.
// Les PV initiaux réels sont vérifiés dans rpg-moba-decks-choix.test.js.
function voiesLateralesBlessees(duel) {
  for (const lane of duel.moba.lanes) if (lane.id !== 'center') lane.hp = { joueur: 10, sorcier: 10 };
  return duel;
}

test('the player can edit an audited deck, with live size, colour and copy validation', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
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
    assert.match(document.querySelector('[aria-label="Ajouter Guetteuse des marées"]').closest('.moba__editor-card').textContent, /voie d’origine.*attend.*conquise/);
    assert.ok(document.querySelector('[aria-label="Ajouter Djinn de la flamme mourante"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter TAREK"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Orochi"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter SALEM"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Le roi Kusayla"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter La Dame aux ailes d’or"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Ghul des cendres"]'));
    for (const nom of ['Scorpion du seuil', 'Scarabée des sceaux', 'Novice des cendres', 'Danseuse des ombres de dune', 'Archonte du sablier noir', 'Veilleur du dernier crépuscule', 'Djinn des cendres vengeresses', 'Scarabée du natron', 'Lecteur du dernier nom', 'Général du croissant noir', 'Fléau de la lune noire', 'Souverain de la lune noire']) assert.ok(document.querySelector(`[aria-label="Ajouter ${nom}"]`), nom);
    assert.match(document.querySelector('[aria-label="Ajouter Sphère de rotation"]').closest('.moba__editor-card').textContent, /après deux attaques ou défenses.*renvoi.*défense.*Attaque ciblée/);
    const chercheuse = document.querySelector('[aria-label="Ajouter Chercheuse des armes ensevelies"]');
    assert.ok(chercheuse);
    assert.match(chercheuse.closest('.moba__editor-card').textContent, /armes imprimées auditées.*Sabre maudit est une magie/);
    assert.match(document.querySelector('[aria-label="Ajouter Javelot du beffroi"]').closest('.moba__editor-card').textContent, /se brise après une attaque ou une défense/);
    assert.match(document.querySelector('[aria-label="Ajouter Cuirasse de sel"]').closest('.moba__editor-card').textContent, /après deux attaques ou défenses/);
    assert.ok(document.querySelector('[aria-label="Ajouter Braise et sable"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Masque du guetteur"]'));
    assert.match(document.querySelector('[aria-label="Ajouter Le Passeur au masque de chacal"]').closest('.moba__editor-card').textContent, /sa voie.*autre voie active/);
    assert.ok(document.querySelector('[aria-label="Ajouter Jitte d’Amayas"]'));
    assert.match(document.querySelector('[aria-label="Ajouter Takouba de Tin Hinan"]').closest('.moba__editor-card').textContent, /voie adverse.*Chien.*voie du porteur/);
    for (const nom of ['Takouba des pistes', 'Armure de cendres', 'Sabre du croissant noir']) assert.ok(document.querySelector(`[aria-label="Ajouter ${nom}"]`));
    assert.match(document.querySelector('[aria-label="Ajouter Sabre du croissant noir"]').closest('.moba__editor-card').textContent, /pas après une défense/);
    assert.ok(document.querySelector('[aria-label="Ajouter Eirik du Premier Serment"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter Pourfendeur des djinns"]'));
    assert.ok(document.querySelector('[aria-label="Ajouter La Barbe-Rousse, amiral des deux mers"]'));
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
    assert.match(document.querySelectorAll('.moba__deck-choice')[1].textContent, /deck de tour.*aléatoire/i);
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
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
      duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 }));
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
      if (duel.mobaCreatureEnAttente) await click(byText('.moba__controls button', 'Passer et laisser entrer'));
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
    for (let i = 0; i < 20 && !duel.combatDeclare; i++) { await tick(); if (duel.mobaCreatureEnAttente) await click(byText('.moba__controls button', 'Passer et laisser entrer')); }
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
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
      duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('jarl-au-marteau-de-guerre'), sorcierDeck: Array(30).fill('loup-des-neiges'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 }));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('veilleuse-des-citernes'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['eau', 'braise'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 }));
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    await click(byText('.moba__card', 'Veilleuse'));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie centrale, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'tenebres', 'braise'], sorcierCouleurs: ['braise'], rng: () => .5 }));
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
    assert.equal(duel.mobaSortEnAttente?.cibleId, duel.joueur.creatures.find((e) => e.carteId === 'ashigaru-des-braises').id);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.creatures.length, 1);
    assert.equal(duel.joueur.creatures[0].carteId, 'jarl-au-marteau-de-guerre');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('a human selects a targeted attacker and an enemy only in its own lane', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
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
      duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('feriel'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 }));
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
    assert.match(document.querySelector('.moba__sr-only[aria-live]').textContent, /FÉRIEL vise Ashigaru des braises, voie gauche/);
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => {
      duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('nom-efface'), joueurCouleurs: ['braise'], sorcierCouleurs: ['tenebres'], rng: () => .5 }));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ibis-des-comptes'), sorcierDeck: Array(30).fill('ibis-des-comptes'), joueurCouleurs: ['tenebres'], sorcierCouleurs: ['tenebres'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ibis-des-comptes', 'verglas']; duel.joueur.mana.tenebres = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Ibis')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'tenebres', 'braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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
    assert.equal(duel.mobaSortEnAttente?.carteId, 'appat-de-la-meute');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null);
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['eau', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 })); return duel; };
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('fennec-des-decombres'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['fennec-des-decombres', 'verglas']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Fennec')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser, rendu: { ApercuCarteAppuiLong: RPG_RENDU_MOBA.ApercuCarteAppuiLong } };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['tiziri-du-djurdjura']; duel.joueur.deck = ['ressac', 'verglas', 'gardienne-des-portes-de-sable'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Tiziri')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie gauche, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    const dialog = document.querySelector('[aria-label="Recherche dans votre deck"]');
    assert.ok(dialog); assert.match(dialog.textContent, /Ressac/); assert.match(dialog.textContent, /Verglas/);
    assert.doesNotMatch(dialog.textContent, /Gardienne/);
    const verglas = [...dialog.querySelectorAll('.moba__mulligan-card')].find((b) => b.textContent.includes('Verglas'));
    await act(async () => verglas.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
    assert.ok(document.querySelector('[role="dialog"][aria-label="Aperçu de Verglas"]'));
    assert.equal(dialog.hasAttribute('inert'), true);
    assert.ok(duel.joueur.deck.includes('verglas'), 'preview does not select the card');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await click(verglas);
    assert.ok(!document.querySelector('[aria-label="Recherche dans votre deck"]'));
    assert.ok(duel.joueur.main.includes('verglas')); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI search resolves privately, without rendering its deck contents', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    duel.tour = 'sorcier'; duel.sorcier.mana.sable = 10; duel.sorcier.main = ['tiziri-du-djurdjura']; duel.sorcier.deck = ['ressac', 'verglas'];
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaCreatureEnAttente?.carteId, 'tiziri-du-djurdjura');
    await act(async () => [...document.querySelectorAll('.moba__controls button')].find(b => b.textContent.includes('Passer et laisser entrer')).click());
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Effacement')));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((b) => b.getAttribute('aria-label').startsWith('Hatamoto')));
    assert.equal(duel.moba.winner, null, 'the opposing side receives priority');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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
    assert.equal(duel.moba.lanes[1].hp.joueur, 6); assert.equal(duel.moba.lanes[1].hp.sorcier, 10);
    assert.equal(duel.mobaSortEnAttente?.carteId, 'le-poids');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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
    assert.equal(duel.moba.lanes[0].hp.joueur, 9); assert.equal(duel.moba.lanes[2].hp.joueur, 5);
    assert.equal(duel.mobaSortEnAttente?.carteId, 'la-grande-pesee');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[0].hp.joueur, 9); assert.equal(duel.moba.lanes[2].hp.joueur, 8);
    assert.equal(duel.moba.lanes[2].hp.sorcier, 7); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Tarek summons dogs into visible lane slots and the player can select them to attack', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('tarek'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['tarek'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('TAREK')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie droite, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('guetteur-du-beffroi'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.main = ['guetteur-du-beffroi'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Guetteur')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie droite, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel, exited = 0;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
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

test('Braisier can be played from the hand and shows its lane damage', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('braisier-du-souk'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.braise = 10; duel.joueur.main = ['braisier-du-souk'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Braisier du souk')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie droite, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(document.querySelector('[role="progressbar"][aria-label="Voie droite, IA"]').getAttribute('aria-valuenow'), '9');
    assert.ok(sounds.includes('degats_sorcier')); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Valkyrie des glaces can be played and its global arrival updates the board', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('valkyrie-des-glaces'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10; duel.joueur.mana.neige = 10;
    duel.joueur.main = ['gardienne-des-portes-de-sable', 'valkyrie-des-glaces'];
    assert.equal(engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).ok, true);
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((b) => b.textContent.includes('Valkyrie des glaces')));
    await click([...document.querySelectorAll('.moba__slot.is-empty')].find((b) => b.getAttribute('aria-label').startsWith('Voie droite, Vous') && !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    const labels = [...document.querySelectorAll('.moba__slot.has-creature')].map((b) => b.getAttribute('aria-label'));
    assert.ok(labels.some((label) => label.includes('Valkyrie des glaces') && label.includes('Voie droite')));
    assert.ok(labels.some((label) => label.includes('Gardienne des portes de sable') && label.includes('défense 3 sur 4')));
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('hand pagination preserves the real index when discarding a card on the next page', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = [...Array(6).fill('ashigaru-des-braises'), 'trait-de-braise'];
    await act(async () => root.render(React.createElement(Board, props)));
    assert.equal(document.querySelectorAll('.moba__hand .moba__card').length, 6);
    await click(document.querySelector('[aria-label="Page suivante de la main"]'));
    duel.joueur.main.pop();
    await act(async () => root.render(React.createElement(Board, props)));
    duel.joueur.main.push('trait-de-braise');
    await act(async () => root.render(React.createElement(Board, props)));
    assert.equal(document.querySelector('[aria-label="Page précédente de la main"]').disabled, true, 'a vanished page does not reappear when drawing again');
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Fin du tour')));
    assert.match(document.querySelector('.moba__hint').textContent, /défausser/);
    await click(document.querySelector('[aria-label="Page suivante de la main"]'));
    assert.equal(document.querySelectorAll('.moba__hand .moba__card').length, 1);
    await click(document.querySelector('.moba__hand .moba__card'));
    assert.deepEqual(duel.joueur.main, Array(6).fill('ashigaru-des-braises'));
    assert.equal(duel.joueur.cimetiere.at(-1), 'trait-de-braise');
    assert.equal(document.querySelector('.moba__hand-pages'), null, 'page clamps after the discard');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('the journal exposes older events with buttons rather than a scrolling panel', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => { duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 })); return duel; };
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    duel.log = ['Premier', 'Deuxième', 'Troisième', 'Quatrième'];
    await act(async () => root.render(React.createElement(Board, props)));
    assert.deepEqual([...document.querySelectorAll('.moba__journal p')].map((p) => p.textContent), ['Quatrième', 'Troisième']);
    await act(async () => document.querySelector('[aria-label="Page suivante du journal"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.deepEqual([...document.querySelectorAll('.moba__journal p')].map((p) => p.textContent), ['Deuxième', 'Premier']);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('classic zones expose public graveyards and both mana tracks without revealing the AI deck; consultation pauses the AI', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel, toggles = 0;
    const initialiser = () => (duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 })));
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA, onToggleFullscreen: () => { toggles++; } })));
    const click = async (element) => { assert.ok(element); await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.cimetiere.push('viking-des-neiges');
    duel.sorcier.cimetiere.push('viking-des-neiges');
    await click(document.querySelector('.rpg-flux-choix__option--braise'));
    const tracks = document.querySelectorAll('.moba__flux .rpg-flux-track');
    assert.equal(tracks.length, 2);
    assert.equal(tracks[1].getAttribute('data-mana-disponible'), '1');
    assert.equal(tracks[1].querySelectorAll('[data-mana-slot]').length, 10);
    assert.equal(tracks[1].querySelector('[data-mana-slot="1"]').getAttribute('data-mana-etat'), 'disponible');
    assert.equal(document.querySelectorAll('.moba__piles').length, 2);
    assert.equal(document.querySelector('.moba__piles--sorcier .rpg-card-pile--deck').getAttribute('aria-label'), `Paquet : ${duel.sorcier.deck.length} cartes`);
    assert.equal(document.querySelector('.moba__piles--sorcier .rpg-card-pile--deck [data-card-id]'), null);
    assert.equal(document.querySelector('.rpg-hidden-hand [data-card-id]'), null);
    await click(document.querySelector('.moba__fullscreen')); assert.equal(toggles, 1);
    const grave = document.querySelector('.moba__piles--joueur .rpg-card-pile--graveyard');
    grave.focus();
    await click(grave);
    const dialog = document.querySelector('.rpg-graveyard-carousel');
    assert.equal(dialog.getAttribute('aria-label'), 'Cimetière de votre camp');
    assert.ok(dialog.querySelector('[data-card-id="viking-des-neiges"]'));
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Fermer le cimetière');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Voir Viking des neiges', 'focus wraps within the dialog');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Fermer le cimetière');
    assert.equal(document.querySelector('.moba > div[inert]').hasAttribute('inert'), true);
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('.rpg-graveyard-carousel'), null);
    assert.equal(document.activeElement, grave, 'focus returns to the public pile');

    await click([...document.querySelectorAll('.moba__controls button')].find((el) => el.textContent.includes('Fin du tour')));
    await click(document.querySelector('.moba__piles--sorcier .rpg-card-pile--graveyard'));
    const snapshot = JSON.stringify(duel);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1000)));
    assert.equal(JSON.stringify(duel), snapshot, 'AI does not advance under the graveyard dialog');
    await click(document.querySelector('.rpg-graveyard-carousel__close'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1000)));
    assert.notEqual(JSON.stringify(duel), snapshot, 'AI resumes after closing the graveyard');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('classic previews work on mulligan, hand and placed cards without playing them', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('djinn-des-braises-voilees'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 })));
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA })));
    const click = async (element) => { assert.ok(element); await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))); };
    const mouse = async (element, type) => act(async () => element.dispatchEvent(new dom.window.MouseEvent(type, { bubbles: true, cancelable: true })));
    const mulligan = document.querySelector('.moba__mulligan-item');
    await mouse(mulligan, 'mouseover');
    assert.equal(document.querySelector('.moba > .rpg-hover-card-preview'), null, 'hover does not open a preview');
    assert.equal(document.querySelector('.moba__preview-layer'), null);
    await mouse(mulligan, 'contextmenu');
    assert.ok(document.querySelector('[role="dialog"][aria-label="Aperçu de Djinn des braises voilées"]'));
    assert.equal(mulligan.querySelector('.rpg-mulligan__card').getAttribute('aria-pressed'), 'false', 'inspection does not change the mulligan');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.braise = 1; duel.joueur.manaMax.braise = 1; duel.joueur.manaSources.push('braise');
    await click(document.querySelector('.rpg-flux-choix__option--braise'));
    const hand = document.querySelector('.moba__hand-item');
    const card = hand.querySelector('.rpg-hand__card');
    const before = JSON.stringify(duel);
    await mouse(hand, 'mouseover');
    assert.equal(document.querySelector('.moba > .rpg-hover-card-preview'), null, 'hover does not open a preview');
    assert.equal(document.querySelector('.moba__preview-layer'), null);
    await mouse(card, 'contextmenu');
    assert.equal(document.querySelector('.moba > .rpg-hover-card-preview'), null);
    assert.ok(document.querySelector('[role="dialog"][aria-label="Aperçu de Djinn des braises voilées"]'));
    assert.equal(JSON.stringify(duel), before, 'right click only inspects the card');
    assert.equal(document.activeElement.textContent, 'Fermer l’aperçu');
    const firstKeyword = document.querySelector('.moba__preview-layer [tabindex="0"]');
    assert.ok(firstKeyword); firstKeyword.focus();
    await act(async () => firstKeyword.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    assert.equal(document.activeElement.textContent, 'Fermer l’aperçu', 'focus stays in the preview');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('.moba__preview-layer'), null);
    assert.equal(document.activeElement, hand.querySelector('.moba__inspect'));

    // A long touch opens the preview and consumes the ensuing synthetic click.
    const down = new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 });
    Object.defineProperties(down, { pointerType: { value: 'touch' }, pointerId: { value: 7 }, isPrimary: { value: true } });
    await act(async () => { card.dispatchEvent(down); await new Promise((resolve) => setTimeout(resolve, 350)); });
    assert.ok(document.querySelector('.moba__preview-layer'));
    const up = new dom.window.MouseEvent('pointerup', { bubbles: true });
    Object.defineProperty(up, 'pointerId', { value: 7 });
    await act(async () => dom.window.dispatchEvent(up));
    await click(card);
    assert.equal(JSON.stringify(duel), before, 'long press never plays the card');
    assert.ok(document.querySelector('.moba__preview-layer'), 'the synthetic click cannot close the preview');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 420)));
    await click(document.querySelector('.rpg-card-peek__close'));
    await click(card);
    await click(document.querySelector('.moba__side--joueur .moba__slot.is-empty:not(:disabled)'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.creatures.length, 1);
    const placed = document.querySelector('.moba__real-slot');
    assert.ok(placed.querySelector('.rpg-card-icone'), 'classic effect icons appear on the field card');
    await mouse(placed, 'mouseover');
    assert.equal(document.querySelector('.moba > .rpg-hover-card-preview'), null);
    await mouse(placed, 'contextmenu');
    assert.ok(document.querySelector('.moba__preview-layer'));
    assert.equal(duel.joueur.creatures.length, 1, 'previewing a placed creature does not act');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('classic combat arrows follow lane HP and live blocking assignments on the solo board', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA, onPlaySfx: (name) => sounds.push(name) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise')); duel.joueur.mana.braise = 10; duel.joueur.main = ['ashigaru-des-braises'];
    ok(engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0));
    ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    ok(rpgChoisirCouleurMana(duel, 'sorcier', 'braise')); duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises'];
    ok(engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0));
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur')); ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
    Object.assign(duel.sorcier.creatures[0], { atk: 10, pv: 10, pvMax: 10 }); duel.sorcier.main = []; duel.sorcier.deck = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const human = () => document.querySelector('.moba__side--joueur .moba__slot.has-creature');
    await click(human());
    assert.equal(document.querySelector('.rpg-attack-arrows')?.getAttribute('data-arrow-count'), '1');
    assert.match(document.querySelector('.moba__sr-only[aria-live]').textContent, /PV de voie gauche de l’IA/);
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:left:sorcier"]'));
    await click(human());
    assert.equal(document.querySelector('.rpg-attack-arrows'), null);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
    for (let i = 0; i < 20 && !duel.combatDeclare; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
    assert.equal(duel.combatDeclare?.cote, 'sorcier');
    assert.match(document.querySelector('.moba__sr-only[aria-live]').textContent, /PV de voie gauche de votre camp/);
    assert.equal(document.querySelector('.moba__phase-track [aria-current=step]')?.dataset.phase, 'blocage');
    const attackerId = duel.combatDeclare.attaquants[0];
    const ciblesOriginales = duel.combatDeclare.ciblesAttaque;
    duel.combatDeclare.ciblesAttaque = { ...ciblesOriginales, [attackerId]: duel.joueur.creatures[0].id };
    await act(async () => root.render(React.createElement(Board, props)));
    assert.equal(human().draggable, false, 'a targeted attack cannot be blocked');
    duel.combatDeclare.ciblesAttaque = ciblesOriginales;
    await act(async () => root.render(React.createElement(Board, props)));
    assert.equal(human().draggable, true, 'a blocker can be dragged without choosing an attacker');
    const drag = async (target) => {
      const dataTransfer = { setData() {}, effectAllowed: '', dropEffect: '' };
      const emit = async (node, type) => act(async () => { const e = new dom.window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'dataTransfer', { value: dataTransfer }); node.dispatchEvent(e); });
      await emit(human(), 'dragstart');
      await emit(target, 'dragover'); await emit(target, 'drop');
    };
    await drag(document.querySelector('[data-moba-lane="right"][data-moba-side="sorcier"][data-moba-slot="0"]'));
    assert.equal(document.querySelector('.rpg-blocker-arrows'), null, 'another lane is not a legal target');
    await drag(document.querySelector('[data-moba-lane="left"][data-moba-side="sorcier"][data-moba-slot="0"]'));
    assert.ok(human().classList.contains('fx-block'));
    assert.ok(sounds.includes('block_impact'));
    assert.equal(document.querySelector('.rpg-attack-arrows'), null, 'a blocked attack is no longer shown as direct');
    assert.equal(document.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), '1');
    assert.match(document.querySelector('.moba__sr-only[aria-live]').textContent, /bloque .*voie gauche/);
    await click(human());
    assert.ok(human().classList.contains('fx-unblock'));
    assert.equal(sounds.at(-1), 'annuler');
    assert.equal(document.querySelector('.rpg-blocker-arrows'), null);
    assert.equal(document.querySelector('.rpg-attack-arrows')?.getAttribute('data-arrow-count'), '1');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('classic mana chooser and tracks work across solo turns without bypassing previews or payment', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'sable', 'braise'], sorcierCouleurs: ['neige', 'sable', 'braise'], rng: () => .5 }));
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA, onPlaySfx: (sound) => sounds.push(sound) })));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const track = () => document.querySelector('.moba__flux--joueur .rpg-flux-track');
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.equal(document.querySelectorAll('.rpg-flux-choix__option').length, 3);
    assert.match(document.querySelector('.rpg-flux-choix').getAttribute('aria-labelledby'), /rpg-flux-choix-titre/);
    assert.equal(document.querySelector('.moba__controls .moba__primary').disabled, true);
    assert.equal(track().getAttribute('data-mana-capacite'), '0');
    await act(async () => document.querySelector('.moba__hand-item').dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
    assert.ok(document.querySelector('.moba__preview-layer'));
    assert.equal(track().getAttribute('data-mana-deficit-cout'), '1', 'inspection previews missing mana without selecting or playing the card');
    await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: '"', code: 'Digit3' })));
    assert.equal(duel.joueur.manaSources.length, 0, 'shortcuts are inactive while inspecting');
    await act(async () => document.querySelector('.moba__preview-layer').dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })));
    assert.equal(document.querySelector('.moba__preview-layer'), null);
    await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: '"', code: 'Digit3' })));
    assert.deepEqual(duel.joueur.manaSources, ['braise']);
    assert.equal(track().getAttribute('data-mana-disponible'), '1');
    assert.equal(document.querySelector('.rpg-flux-choix'), null);
    assert.ok(sounds.includes('select'));
    await click(document.querySelector('.moba__hand-item .moba__card'));
    assert.equal(track().getAttribute('data-mana-apercu-cout'), '1');
    await click([...document.querySelectorAll('.moba__side--joueur .moba__slot.is-empty')].find((button) => !button.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(track().getAttribute('data-mana-disponible'), '0');
    assert.equal(track().querySelectorAll('.is-spent').length, 1);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
    for (let i = 0; i < 20 && !(duel.tour === 'sorcier' && duel.finDeTour); i++) { await act(async () => new Promise((resolve) => setTimeout(resolve, 500))); if (duel.mobaCreatureEnAttente) await click([...document.querySelectorAll('.moba__controls button')].find(b => b.textContent.includes('Passer et laisser entrer'))); }
    assert.equal(duel.tour, 'sorcier'); assert.ok(duel.finDeTour);
    assert.equal(duel.sorcier.manaSources.length, 1, 'the AI made its own automatic choice');
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et commencer')));
    assert.equal(track().getAttribute('data-mana-disponible'), '1', 'previously spent source refills');
    assert.equal(document.querySelector('.rpg-flux-choix__option--braise').getAttribute('data-mana-acquis'), '1');
    await click(document.querySelector('.rpg-flux-choix__option--neige'));
    assert.deepEqual(duel.joueur.manaSources, ['braise', 'neige']);
    assert.equal(track().getAttribute('data-mana-disponible'), '2');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('classic audio settings pause the solo AI, preserve state and play arrival journals once', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  // React's legacy input polyfill expects these IE methods when jsdom is installed after React.
  dom.window.HTMLElement.prototype.attachEvent = () => {}; dom.window.HTMLElement.prototype.detachEvent = () => {};
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const arrivals = [], preloads = [], changes = [];
    const initialiser = () => duel = voiesLateralesBlessees(rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 }));
    function Harness() {
      const [sound, setSound] = React.useState(true);
      const [sfx, setSfx] = React.useState(.8), [voice, setVoice] = React.useState(.6), [music, setMusic] = React.useState(.4);
      const change = (setter, name) => (value) => { changes.push([name, value]); setter(value); if (value > 0) setSound(true); };
      return React.createElement(Board, { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA,
        onArriveesAudio: (events) => arrivals.push(events), onPreloadVoice: (id) => preloads.push(id),
        sonActif: sound, onToggleSound: () => setSound((v) => !v), volumeSfx: sfx, volumeVoix: voice, volumeMusique: music,
        onChangeVolumeSfx: change(setSfx, 'sfx'), onChangeVolumeVoix: change(setVoice, 'voice'), onChangeVolumeMusique: change(setMusic, 'music') });
    }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Harness)));
    const click = async (el) => { assert.ok(el); assert.equal(el.disabled, false); await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.ok(preloads.length && preloads.every((id) => id === 'ashigaru-des-braises'));
    const settingsButton = document.querySelector('.moba__settings-button');
    await click(settingsButton);
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="moba-settings-title"]');
    assert.ok(dialog); assert.equal(document.activeElement.textContent, 'Fermer');
    assert.equal(document.querySelector('.moba > div[inert]').hasAttribute('inert'), true);
    assert.deepEqual([...dialog.querySelectorAll('input')].map((el) => el.value), ['80', '60', '40']);
    const first = dialog.querySelector('input');
    first.focus(); await act(async () => first.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert.equal(document.activeElement.textContent, 'Fermer', 'focus wraps backwards');
    await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', code: 'Digit1', bubbles: true })));
    assert.equal(duel.joueur.manaSources.length, 0, 'mana shortcut cannot act behind the dialog');
    const setRange = async (el, value) => { const props = el[Object.keys(el).find((key) => key.startsWith('__reactProps$'))]; await act(async () => props.onChange({ target: { value: String(value) } })); };
    await setRange(dialog.querySelector('[aria-label="Volume des sons du jeu"]'), 25);
    await setRange(dialog.querySelector('[aria-label="Volume des voix des personnages"]'), 35);
    await setRange(dialog.querySelector('[aria-label="Volume des musiques"]'), 45);
    assert.deepEqual(changes, [['sfx', .25], ['voice', .35], ['music', .45]]);
    await click([...dialog.querySelectorAll('button')].find((el) => el.textContent.includes('Couper')));
    assert.deepEqual([...dialog.querySelectorAll('input')].map((el) => el.value), ['0', '0', '0']);
    await setRange(dialog.querySelector('[aria-label="Volume des voix des personnages"]'), 50);
    assert.deepEqual([...dialog.querySelectorAll('input')].map((el) => el.value), ['25', '50', '45'], 'changing a channel unmutes without losing other values');
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[aria-labelledby="moba-settings-title"]'), null); assert.equal(document.activeElement, settingsButton);
    await click(document.querySelector('.rpg-flux-choix__option--braise'));
    await click(document.querySelector('.moba__hand-item .moba__card'));
    await click([...document.querySelectorAll('.moba__side--joueur .moba__slot.is-empty')].find((b) => !b.disabled));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(arrivals.flatMap((batch) => batch.arrivees).filter((entry) => entry.carteId === 'ashigaru-des-braises').length, 1);
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Fin du tour')));
    await click(settingsButton);
    const snapshot = JSON.stringify(duel);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 700)));
    assert.equal(JSON.stringify(duel), snapshot, 'AI does not move while settings are open');
    await click(document.querySelector('.moba__settings-modal .moba__primary'));
    for (let i = 0; i < 15 && !duel.sorcier.creatures.length; i++) { await act(async () => new Promise((resolve) => setTimeout(resolve, 500))); if (duel.mobaCreatureEnAttente) await click([...document.querySelectorAll('.moba__controls button')].find(b => b.textContent.includes('Passer et laisser entrer'))); }
    assert.ok(duel.sorcier.creatures.length, 'AI resumes');
    assert.equal(arrivals.flatMap((batch) => batch.arrivees).filter((entry) => entry.carteId === 'viking-des-neiges').length, 1, 'AI arrival is played once');
    assert.ok(preloads.every((id) => id === 'ashigaru-des-braises'), 'AI hand is never preloaded');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('creatures can be dragged to legal slots without losing click, cancellation or long-press preview', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (node) => act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.equal(rpgChoisirCouleurMana(duel, 'joueur', 'braise').ok, true); duel.joueur.mana.braise = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    const hand = () => document.querySelector('.moba__hand .moba__card');
    const slot = (lane, side, index = 0) => document.querySelector(`[data-moba-lane="${lane}"][data-moba-side="${side}"][data-moba-slot="${index}"]`);
    const emitDrag = async (node, type) => act(async () => { const e = new dom.window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'dataTransfer', { value: { setData() {}, effectAllowed: '', dropEffect: '' } }); node.dispatchEvent(e); });
    await click(hand()); assert.equal(hand().getAttribute('aria-pressed'), 'true');
    await emitDrag(hand(), 'dragstart');
    assert.ok(slot('left', 'joueur').classList.contains('is-moba-drop'));
    assert.ok(!slot('left', 'sorcier').classList.contains('is-moba-drop'));
    await emitDrag(slot('left', 'sorcier'), 'drop');
    assert.equal(duel.joueur.creatures.length, 0); assert.equal(hand().getAttribute('aria-pressed'), 'true', 'invalid drop does not change selection');
    await emitDrag(hand(), 'dragstart'); await emitDrag(slot('left', 'joueur'), 'drop');
    assert.ok(duel.mobaCreatureEnAttente);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.creatures.length, 1); assert.equal(duel.moba.lanes[0].slots.joueur[0], duel.joueur.creatures[0].id);
    assert.equal(hand().getAttribute('aria-pressed'), 'false');
    // A touch gesture ending with pointercancel never plays a card.
    const pointer = async (node, type, x, y) => act(async () => { const e = new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); Object.defineProperties(e, { pointerType: { value: 'touch' }, pointerId: { value: 7 }, isPrimary: { value: true } }); node.dispatchEvent(e); });
    document.elementFromPoint = () => slot('middle', 'joueur');
    await pointer(hand(), 'pointerdown', 50, 100); await pointer(window, 'pointermove', 50, 70); await pointer(window, 'pointercancel', 50, 70);
    assert.equal(duel.joueur.creatures.length, 1); assert.equal(document.querySelector('.rpg-touch-drag-ghost'), null);
    // Wait out click suppression, then a long press must inspect rather than drag or play.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 370)));
    document.elementFromPoint = () => slot('center', 'joueur');
    await pointer(hand(), 'pointerdown', 50, 100); await pointer(window, 'pointermove', 50, 70); await pointer(window, 'pointerup', 50, 60);
    assert.ok(duel.mobaCreatureEnAttente);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.creatures.length, 2, 'touch drop commits to a free lane slot');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 370)));
    await pointer(hand(), 'pointerdown', 50, 100); await act(async () => new Promise((resolve) => setTimeout(resolve, 360)));
    assert.ok(document.querySelector('.moba__preview-layer')); assert.equal(duel.joueur.creatures.length, 2); assert.equal(document.querySelector('.rpg-touch-drag-ghost'), null);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('missed targeted attacks show the classic miss and do not announce melee steel', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('feriel'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['neige', 'braise'], sorcierCouleurs: ['neige', 'braise'], rng: () => 0 }));
    const props = { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA, onPlaySfx: (name) => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise')); ok(engine.rpgMobaTerminerTour(duel, 'joueur')); ok(engine.rpgMobaPasserFinDeTour(duel, 'sorcier'));
    ok(rpgChoisirCouleurMana(duel, 'sorcier', 'braise')); duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises'];
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    ok(engine.rpgMobaTerminerTour(duel, 'sorcier')); ok(engine.rpgMobaPasserFinDeTour(duel, 'joueur')); ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
    duel.joueur.mana.braise = 10; duel.joueur.main.push('feriel'); const attacker = engine.rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
    duel.sorcier.main = []; duel.sorcier.deck = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector(`[data-entity-id="${attacker.id}"]`)); await click(document.querySelector(`[data-entity-id="${target.id}"]`));
    sounds.length = 0; await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Déclarer')));
    assert.ok(!sounds.includes('attackers_confirm'), 'a wave of targeted shots has no steel announcement');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.combatDeclare, null); assert.ok(duel.sorcier.creatures.includes(target));
    assert.equal(document.querySelector(`[data-entity-id="${attacker.id}"]`)?.getAttribute('data-miss'), 'true');
    assert.match(document.querySelector('.moba__combat-result').textContent, /FÉRIEL : attaque ciblée manquée/);
    assert.ok(sounds.includes('fleche_ratee'));
    assert.ok(!sounds.includes('player_attack_hit'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1550)));
    assert.equal(document.querySelector(`[data-entity-id="${attacker.id}"]`)?.getAttribute('data-miss'), null);
    assert.equal(document.querySelector('.moba__combat-result').textContent, '');
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Kagutsuchi critical shows its classic glyph after the actual combat result', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('kagutsuchi-flamme-originelle'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], rng: () => 0 }));
    const props = { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); assert.equal(rpgChoisirCouleurMana(duel, 'joueur', 'braise').ok, true);
    duel.joueur.mana.braise = 10; const result = engine.rpgMobaJouerCreature(duel, 'joueur', 'kagutsuchi-flamme-originelle', 'left', 0); assert.equal(result.ok, true);
    Object.assign(result.entite, { ready: true, atk: 1 }); duel.sorcier.main = []; duel.sorcier.deck = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector(`[data-entity-id="${result.entite.id}"]`));
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Déclarer')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[0].hp.sorcier, 6);
    const card = document.querySelector(`[data-entity-id="${result.entite.id}"]`);
    assert.equal(card.querySelector('.rpg-card__critique')?.textContent.trim(), '×4');
    assert.ok(card.classList.contains('is-moba-critique'));
    assert.match(document.querySelector('.moba__combat-result').textContent, /Kagutsuchi, Flamme originelle : coup critique ×4/);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('combat journal reuses classic public event cards and paginates without exposing the AI hand', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('feriel'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.sorcier.main = ['feriel']; duel.log = ['Un événement public'];
    const combatant = (id, name) => ({ id, name, carteId: 'ashigaru-des-braises', cote: 'joueur' });
    duel.combatFeed = [
      { id: '1', type: 'hit', amount: 1, victim: combatant('a', 'Victime ancienne'), killers: [] },
      { id: '2', type: 'death', victim: combatant('b', 'Victime récente'), killers: [combatant('k', 'Source visible')] },
      { id: '3', type: 'hit', amount: 2, victim: combatant('c', 'Victime nouvelle'), killers: [combatant('k', 'Source visible')] },
    ];
    await act(async () => root.render(React.createElement(Board, props)));
    const journal = document.querySelector('.moba__journal'); journal.open = true;
    await click([...journal.querySelectorAll('.moba__journal-tabs button')].find((b) => b.textContent === 'Combats'));
    assert.equal(journal.querySelectorAll('.rpg-combat-feed__event').length, 2);
    assert.match(journal.textContent, /Victime nouvelle/); assert.match(journal.textContent, /Victime récente/);
    assert.match(journal.textContent, /Source visible/); assert.doesNotMatch(journal.textContent, /FÉRIEL/);
    assert.ok(journal.querySelector('[aria-label="2 dégâts"]')); assert.ok(journal.querySelector('[aria-label="détruite"]'));
    await click(journal.querySelector('[aria-label="Page suivante du journal"]'));
    assert.match(journal.textContent, /Victime ancienne/); assert.doesNotMatch(journal.textContent, /Victime nouvelle/);
    await click([...journal.querySelectorAll('.moba__journal-tabs button')].find((b) => b.textContent === 'Événements'));
    assert.match(journal.textContent, /Un événement public/);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('end screen reports lane result, plays one result sound, traps focus and replay resets the local game', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel, sorties = 0; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('feriel'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }));
    const props = { onQuitter: () => { sorties++; }, initialiser, onPlaySfx: (name) => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'right', 10);
    await act(async () => root.render(React.createElement(Board, props)));
    const modal = document.querySelector('[role=dialog][aria-label="Victoire"]'); assert.ok(modal);
    assert.match(modal.textContent, /Vous avez conquis deux voies/); assert.match(modal.textContent, /vous 2 · IA 0/);
    assert.match(modal.textContent, /Voie gauche : conquise par Vous/); assert.match(modal.textContent, /Voie centrale : vous 10 PV · IA 10 PV/);
    assert.equal(sounds.filter((name) => name === 'victoire').length, 1);
    await act(async () => root.render(React.createElement(Board, props))); assert.equal(sounds.filter((name) => name === 'victoire').length, 1);
    const last = [...modal.querySelectorAll('button')].at(-1); last.focus();
    const tab = new dom.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' });
    await act(async () => last.dispatchEvent(tab)); assert.equal(tab.defaultPrevented, true); assert.equal(document.activeElement, modal.querySelector('summary'));
    const ancien = duel; await click([...modal.querySelectorAll('button')].find((b) => b.textContent === 'Rejouer'));
    assert.notEqual(duel, ancien); assert.equal(duel.moba.winner, null); assert.ok(document.querySelector('.moba__mulligan')); assert.equal(sorties, 0);
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'sorcier', 'left', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 10);
    await act(async () => root.render(React.createElement(Board, props)));
    const loss = document.querySelector('[role=dialog][aria-label="Défaite"]'); assert.ok(loss);
    assert.match(loss.textContent, /L’IA a conquis deux voies/); assert.match(loss.textContent, /vous 0 · IA 2/);
    assert.equal(sounds.filter((name) => name === 'defaite').length, 1);
    await click([...loss.querySelectorAll('button')].find((b) => b.textContent === 'Rejouer'));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.fin = { nul: true }; await act(async () => root.render(React.createElement(Board, props)));
    const draw = document.querySelector('[role=dialog][aria-label="Match nul"]'); assert.ok(draw);
    assert.doesNotMatch(draw.textContent, /conquis deux voies/); assert.equal(sounds.filter((name) => name === 'victoire' || name === 'defaite').length, 2);
    await click([...draw.querySelectorAll('button')].find((b) => b.textContent === 'Retour au menu')); assert.equal(sorties, 1);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces a targeted spell; the player sees its target and can shield before passing', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour, rpgChoisirCouleurMana } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('jarl-au-marteau-de-guerre'), sorcierDeck: Array(30).fill('loup-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const ApercuCarteAppuiLong = ({ carte, onFermer }) => React.createElement('div', { role: 'dialog', 'aria-label': 'Fiche de carte' }, carte.name, React.createElement('button', { onClick: onFermer }, 'Fermer'));
    const props = { onQuitter: () => {}, initialiser, rendu: { ApercuCarteAppuiLong } };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.neige = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
    assert.ok(target); target.pv = 2;
    rpgFinDeTour(duel);
    if (duel.sorcier.manaChoixEnAttente) rpgChoisirCouleurMana(duel, 'sorcier', 'neige');
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    duel.joueur.main = ['parade-du-verre']; duel.joueur.mana.eau = 10;
    const pv = target.pv;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.cibleId, target.id);
    assert.equal(target.pv, pv);
    assert.match(document.querySelector('.moba__hint').textContent, /Éclair du marteau.*Jarl/);
    const pending = document.querySelector('.moba__pending-spell--sorcier');
    assert.ok(pending);
    assert.match(pending.textContent, /SORT ADVERSE · EN ATTENTE.*Éclair du marteau.*Jarl.*Voie gauche/);
    assert.match(pending.getAttribute('aria-label'), /Sort adverse, en attente : Éclair du marteau.*Jarl/);
    assert.match(pending.querySelector('img').getAttribute('src'), /eclair-du-marteau/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 2500)));
    assert.ok(document.querySelector('.moba__pending-spell--sorcier'), 'l’annonce reste lisible après la fin de l’animation');
    const inspect = document.querySelector('.moba__pending-art');
    await click(inspect);
    assert.match(document.querySelector('[role="dialog"][aria-label="Fiche de carte"]').textContent, /Éclair du marteau/);
    await click(document.querySelector('[role="dialog"][aria-label="Fiche de carte"] button'));
    assert.ok(document.activeElement === inspect, 'le focus revient sur la carte annoncée');
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Parade de verre')));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((slot) => slot.getAttribute('aria-label').includes('cible de magie')));
    assert.equal(target.bouclier, 1);
    assert.match(document.querySelector('.moba__pending-spell--sorcier').textContent, /Éclair du marteau/, 'la réponse ne remplace pas la carte adverse en attente');
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(target.pv, pv);
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(document.querySelector('.moba__pending-spell'), null);
    assert.equal(duel.sorcier.cimetiere.includes('eclair-du-marteau'), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human targeted spell gives the AI an automatic response without revealing its hand', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    rpgFinDeTour(duel);
    duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(target); target.pv = 2;
    rpgFinDeTour(duel);
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
    duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Éclair du marteau')));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((slot) => slot.getAttribute('aria-label').includes('cible de magie')));
    assert.equal(duel.mobaSortEnAttente?.cibleId, target.id);
    assert.equal(target.pv, 2);
    assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Parade/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.bouclier, 1, 'AI shielded the threatened creature');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(target.pv, 2);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('a sorcery announces its target; passing resolves the return and its delayed draw sound', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('jarl-au-marteau-de-guerre'), sorcierDeck: Array(30).fill('loup-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, onPlaySfx: (sound) => sounds.push(sound), initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.neige = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
    assert.ok(target);
    rpgFinDeTour(duel);
    duel.sorcier.main = ['courant-de-retour']; duel.sorcier.mana.eau = 10;
    const deck = duel.sorcier.deck.length;
    sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.cibleId, target.id);
    assert.equal(duel.sorcier.deck.length, deck, 'draw is delayed');
    assert.match(document.querySelector('.moba__hint').textContent, /Courant de retour.*Jarl/);
    assert.equal(sounds.includes('card_draw'), false);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(duel.sorcier.deck.length, deck - 1);
    assert.equal(duel.joueur.creatures.some((entity) => entity.id === target.id), false);
    assert.ok(duel.joueur.main.includes('jarl-au-marteau-de-guerre'));
    assert.ok(sounds.includes('card_draw'));
    assert.ok(sounds.includes('creature_return'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI lane spell is announced; player can transfer life before passing and sees the delayed hit', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'sorcier', 'center', 7);
    rpgFinDeTour(duel);
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    duel.joueur.main = ['le-poids']; duel.joueur.mana.tenebres = 10;
    sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.laneId, 'center');
    assert.match(document.querySelector('.moba__hint').textContent, /Éclair du marteau.*Voie centrale.*Vous/);
    assert.equal(duel.moba.lanes[1].hp.joueur, 3);
    assert.equal(sounds.includes('degats_sorcier'), false, 'the delayed hit has not happened yet');
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Le Poids')));
    await click(document.querySelector('[aria-label="Transférer les PV de Voie centrale"]'));
    assert.equal(duel.moba.lanes[1].hp.joueur, 5);
    assert.equal(duel.moba.lanes[1].hp.sorcier, 8);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(duel.moba.lanes[1].hp.joueur, 2);
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(document.querySelector('[role="progressbar"][aria-label="Voie centrale, Vous"]').getAttribute('aria-valuenow'), '2');
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:center:joueur"] .is-damaged'));
    assert.ok(sounds.includes('degats_sorcier'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human lane spell waits for the hidden AI response before showing damage', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'joueur', 'left', 10);
    mobaInfliger(duel.moba, 'joueur', 'center', 7);
    duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['le-poids']; duel.sorcier.mana.tenebres = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Éclair du marteau')));
    await click(document.querySelector('[aria-label="Cibler Voie centrale de IA"]'));
    assert.equal(duel.mobaSortEnAttente?.laneId, 'center');
    assert.equal(duel.moba.lanes[1].hp.sorcier, 3);
    assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Le Poids/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[1].hp.sorcier, 5, 'AI heals before the pending spell');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[1].hp.sorcier, 2);
    assert.equal(duel.moba.winner, null);
    assert.equal(duel.mobaSortEnAttente, null);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces a friendly shield and the player can bounce its target in response', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(target);
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
    duel.joueur.main = ['ressac']; duel.joueur.mana.eau = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.cibleId, target.id);
    assert.equal(duel.mobaSortEnAttente.cibleCote, 'sorcier');
    assert.match(document.querySelector('.moba__hint').textContent, /Parade de verre.*Gardienne.*IA/);
    assert.equal(target.bouclier, 0);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Ressac')));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((slot) => slot.getAttribute('aria-label').includes('cible de magie')));
    assert.ok(!duel.sorcier.creatures.includes(target));
    assert.ok(duel.sorcier.main.includes('gardienne-des-portes-de-sable'));
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Gardienne/);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(duel.mobaSortEnAttente, null);
    assert.ok(duel.sorcier.cimetiere.includes('parade-du-verre'));
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('player shield announcement lets AI remove the friendly target before the shield resolves', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(target); target.pv = 2;
    duel.joueur.main = ['parade-du-verre']; duel.joueur.mana.eau = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Parade de verre')));
    await click([...document.querySelectorAll('.moba__slot.has-creature')].find((slot) => slot.getAttribute('aria-label').includes('cible de magie')));
    assert.equal(duel.mobaSortEnAttente?.cibleId, target.id);
    assert.match(document.querySelector('.moba__hint').textContent, /Parade de verre.*Gardienne.*Vous/);
    assert.equal(target.bouclier, 0);
    assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(!duel.joueur.creatures.includes(target), 'AI kills the target before the shield');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null);
    assert.ok(duel.joueur.cimetiere.includes('parade-du-verre'));
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces a lane heal and the human can conquer that lane before it resolves', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'joueur', 'center', 8); rpgFinDeTour(duel);
    duel.sorcier.main = ['eau-de-la-source']; duel.sorcier.mana.eau = 10;
    duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 10;
    sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.laneId, 'center');
    assert.match(document.querySelector('.moba__hint').textContent, /Eau de la source.*Voie centrale.*IA/);
    assert.match(document.querySelector('.moba__pending-spell--sorcier').textContent, /Eau de la source.*Voie centrale.*IA/);
    assert.equal(duel.moba.lanes[1].hp.sorcier, 2);
    assert.equal(sounds.includes('soin_vie'), false);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Éclair du marteau')));
    await click(document.querySelector('[aria-label="Cibler Voie centrale de IA"]'));
    assert.equal(duel.moba.lanes[1].conqueredBy, 'joueur');
    const voieConquise = document.querySelector('[aria-label="Voie centrale"].is-conquered--joueur');
    assert.ok(voieConquise); assert.match(voieConquise.querySelector('.moba__conquest').textContent, /Voie conquise.*VOUS.*Voie fermée/);
    assert.match(document.querySelector('.moba__sr-only[role=status]:not(.moba__combat-result)').textContent, /Voie centrale conquise par Vous/);
    assert.equal(duel.mobaSortEnAttente?.carteId, 'eau-de-la-source', 'no nested response');
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(duel.sorcier.cimetiere.filter((id) => id === 'eau-de-la-source').length, 1);
    assert.equal(sounds.includes('soin_vie'), false);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human lane heal is announced, then shows its animation and sound only after AI passes', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'sorcier', 'right', 6);
    duel.joueur.main = ['eau-de-la-source']; duel.joueur.mana.eau = 10;
    duel.sorcier.main = [];
    sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Eau de la source')));
    await click(document.querySelector('[aria-label="Soigner Voie droite de Vous"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Eau de la source.*Voie droite.*Vous/);
    assert.equal(duel.moba.lanes[2].hp.joueur, 4);
    assert.equal(sounds.includes('soin_vie'), false);
    assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[2].hp.joueur, 8);
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(document.querySelector('[role="progressbar"][aria-label="Voie droite, Vous"]').getAttribute('aria-valuenow'), '8');
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:right:joueur"] .is-healed'));
    assert.equal(sounds.filter((sound) => sound === 'soin_vie').length, 1);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI responds to the human lane heal before it resolves and hidden cards stay private', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = ['eau-de-la-source']; duel.joueur.mana.eau = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Eau de la source')));
    await click(document.querySelector('[aria-label="Soigner Voie centrale de Vous"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Eau de la source.*Voie centrale.*Vous/);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Éclair/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[1].conqueredBy, 'sorcier');
    const voieConquise = document.querySelector('[aria-label="Voie centrale"].is-conquered--sorcier');
    assert.ok(voieConquise); assert.match(voieConquise.querySelector('.moba__conquest').textContent, /Voie conquise.*L’IA.*Voie fermée/);
    assert.equal(duel.mobaSortEnAttente?.carteId, 'eau-de-la-source');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === 'eau-de-la-source').length, 1);
    assert.equal(sounds.includes('soin_vie'), false);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces La Grande Pesée and human can transfer life before its delayed effects and draw', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'joueur', 'center', 5); mobaInfliger(duel.moba, 'sorcier', 'center', 6);
    rpgFinDeTour(duel); duel.sorcier.main = ['la-grande-pesee']; duel.sorcier.mana.tenebres = 20;
    duel.joueur.main = ['le-poids']; duel.joueur.mana.tenebres = 10;
    const deck = duel.sorcier.deck.length; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.laneId, 'center');
    assert.match(document.querySelector('.moba__hint').textContent, /La Grande Pesée.*Voie centrale.*Vous/);
    assert.equal(duel.moba.lanes[1].hp.joueur, 4); assert.equal(duel.sorcier.deck.length, deck);
    assert.equal(sounds.includes('card_draw'), false);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /La Grande Pesée/);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Le Poids')));
    await click(document.querySelector('[aria-label="Transférer les PV de Voie centrale"]'));
    assert.equal(duel.moba.lanes[1].hp.joueur, 6);
    assert.equal(duel.mobaSortEnAttente?.carteId, 'la-grande-pesee');
    const beforeAI = duel.moba.lanes[1].hp.sorcier; sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(duel.moba.lanes[1].hp.joueur, 3); assert.equal(duel.moba.lanes[1].hp.sorcier, beforeAI + 3);
    assert.equal(duel.sorcier.deck.length, deck - 2); assert.equal(duel.mobaSortEnAttente, null);
    assert.ok(sounds.includes('card_draw')); assert.ok(sounds.includes('soin_vie')); assert.ok(sounds.includes('degats_sorcier'));
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:center:joueur"] .is-damaged'));
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:center:sorcier"] .is-healed'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human La Grande Pesée pays its chosen lane before AI passes and only then draws and transfers', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'sorcier', 'center', 5);
    duel.joueur.main = ['la-grande-pesee']; duel.joueur.mana.tenebres = 20;
    duel.sorcier.main = []; const deck = duel.joueur.deck.length; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('La Grande Pesée')));
    await click(document.querySelector('[aria-label="Payer 1 PV de Voie droite de Vous"]'));
    assert.equal(duel.moba.lanes[2].hp.joueur, 10, 'choosing the price does not pay before announcement');
    await click(document.querySelector('[aria-label="Transférer les PV de Voie centrale"]'));
    assert.equal(duel.moba.lanes[2].hp.joueur, 9);
    assert.equal(duel.moba.lanes[1].hp.joueur, 5); assert.equal(duel.moba.lanes[1].hp.sorcier, 10);
    assert.equal(duel.joueur.deck.length, deck); assert.equal(sounds.includes('card_draw'), false);
    assert.match(document.querySelector('.moba__hint').textContent, /La Grande Pesée.*Voie centrale.*IA/);
    assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes[1].hp.joueur, 8); assert.equal(duel.moba.lanes[1].hp.sorcier, 7);
    assert.equal(duel.moba.lanes[2].hp.joueur, 9, 'price not paid a second time');
    assert.equal(duel.joueur.deck.length, deck - 2); assert.equal(duel.mobaSortEnAttente, null);
    assert.ok(sounds.includes('card_draw')); assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Festin announces global healing and animates injured allies only after the AI passes', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const TableCard = ({ entite, soin, moba }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, 'data-entity': entite.id, 'data-soin': soin?.montant ?? 0 }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable = 10;
    const a = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const b = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    a.pv -= 1; a.def -= 1; b.pv -= 2; b.def -= 2;
    duel.joueur.main = ['festin-des-vaillants']; duel.joueur.mana.neige = 10; duel.sorcier.main = []; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Festin des vaillants')));
    await click(document.querySelector('[aria-label="Soigner Voie centrale de Vous"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Festin des vaillants.*Alliés.*Voie centrale.*Vous/);
    assert.equal(a.pv, a.pvMax - 1); assert.equal(b.pv, b.pvMax - 2);
    assert.equal(document.querySelector(`[data-entity="${a.id}"]`).getAttribute('data-soin'), '0');
    assert.equal(sounds.includes('soin_vie'), false);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(a.pv, a.pvMax); assert.equal(b.pv, b.pvMax);
    assert.equal(document.querySelector(`[data-entity="${a.id}"]`).getAttribute('data-soin'), '1');
    assert.equal(document.querySelector(`[data-entity="${b.id}"]`).getAttribute('data-soin'), '2');
    assert.equal(sounds.filter((sound) => sound === 'soin_vie').length, 1, 'creature healing sounds even with full lane HP');
    assert.equal(duel.mobaSortEnAttente, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI Festin still heals surviving creatures after the player conquers its announced lane', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const TableCard = ({ entite, soin, moba }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, 'data-entity': entite.id, 'data-soin': soin?.montant ?? 0 }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const lost = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const survivor = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    lost.pv -= 2; lost.def -= 2; survivor.pv -= 2; survivor.def -= 2;
    mobaInfliger(duel.moba, 'joueur', 'left', 8);
    duel.sorcier.main = ['festin-des-vaillants']; duel.sorcier.mana.neige = 10;
    duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.laneId, 'left');
    assert.match(document.querySelector('.moba__hint').textContent, /Festin des vaillants.*Alliés.*Voie gauche.*IA/);
    assert.equal(survivor.pv, survivor.pvMax - 2); assert.equal(sounds.includes('soin_vie'), false);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Éclair du marteau')));
    await click(document.querySelector('[aria-label="Cibler Voie gauche de IA"]'));
    assert.equal(duel.moba.lanes[0].conqueredBy, 'joueur'); assert.ok(!duel.sorcier.creatures.includes(lost));
    assert.equal(duel.mobaSortEnAttente?.carteId, 'festin-des-vaillants');
    sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(survivor.pv, survivor.pvMax);
    assert.equal(document.querySelector(`[data-entity="${survivor.id}"]`).getAttribute('data-soin'), '2');
    assert.ok(sounds.includes('soin_vie')); assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI can remove an injured ally before the human Festin heals', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    target.pv = 2; target.def = 2;
    duel.joueur.main = ['festin-des-vaillants']; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Festin des vaillants')));
    await click(document.querySelector('[aria-label="Soigner Voie gauche de Vous"]'));
    assert.equal(target.pv, 2); assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Éclair/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(!duel.joueur.creatures.includes(target));
    assert.equal(duel.mobaSortEnAttente?.carteId, 'festin-des-vaillants');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.ok(duel.joueur.cimetiere.includes('festin-des-vaillants'));
    assert.equal(sounds.includes('soin_vie'), false, 'no heal sound if nothing was restored');
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces Rapport and the human may play Papyrus before the private AI draw', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel);
    duel.sorcier.main = ['rapport-du-greffier']; duel.sorcier.mana.sable = 10;
    duel.sorcier.deck = ['loup-des-neiges', 'gardienne-des-portes-de-sable', 'ashigaru-des-braises'];
    duel.joueur.main = ['papyrus']; duel.joueur.mana.tenebres = 10; duel.joueur.deck = ['viking-des-neiges'];
    sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.carteId, 'rapport-du-greffier');
    assert.match(document.querySelector('.moba__hint').textContent, /Rapport du greffier.*Pioche.*IA/);
    assert.equal(duel.sorcier.deck.length, 3); assert.equal(sounds.includes('card_draw'), false);
    assert.doesNotMatch(document.body.textContent, /Gardienne des portes de sable|Ashigaru des braises/);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Papyrus')));
    await click(document.querySelector('[aria-label="Payer 2 PV de Voie centrale de Vous"]'));
    assert.equal(duel.joueur.deck.length, 0); assert.equal(duel.moba.lanes[1].hp.joueur, 8);
    assert.equal(duel.mobaSortEnAttente?.carteId, 'rapport-du-greffier');
    sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(duel.sorcier.deck.length, 1); assert.equal(duel.sorcier.main.length, 2);
    assert.ok(sounds.includes('card_draw')); assert.equal(duel.mobaSortEnAttente, null);
    assert.doesNotMatch(document.body.textContent, /Gardienne des portes de sable|Ashigaru des braises/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Les feuillets announces the AI deck, then mills only after AI passes', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['les-feuillets']; duel.joueur.mana.tenebres = 10;
    duel.sorcier.main = []; duel.sorcier.deck = ['viking-des-neiges', 'loup-des-neiges', 'ashigaru-des-braises', 'gardienne-des-portes-de-sable']; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Les feuillets')));
    assert.match(document.querySelector('.moba__hint').textContent, /Les feuillets.*Pioche.*IA/);
    assert.equal(duel.sorcier.deck.length, 4); assert.equal(duel.sorcier.cimetiere.length, 0);
    assert.doesNotMatch(document.body.textContent, /Gardienne des portes de sable|Ashigaru des braises/);
    assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.deepEqual(duel.sorcier.deck, ['viking-des-neiges']);
    assert.deepEqual(duel.sorcier.cimetiere, ['loup-des-neiges', 'ashigaru-des-braises', 'gardienne-des-portes-de-sable']);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(sounds.includes('card_draw'), false);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Rapport reveals only the public deck target and plays draw audio after AI passes', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['rapport-du-greffier']; duel.joueur.mana.sable = 10;
    duel.joueur.deck = ['viking-des-neiges', 'loup-des-neiges', 'ashigaru-des-braises']; duel.sorcier.main = []; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Rapport du greffier')));
    assert.match(document.querySelector('.moba__hint').textContent, /Rapport du greffier.*Pioche.*Vous/);
    assert.equal(duel.joueur.deck.length, 3); assert.equal(sounds.includes('card_draw'), false);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.deck.length, 1); assert.deepEqual(duel.joueur.main, ['ashigaru-des-braises', 'loup-des-neiges']);
    assert.equal(duel.mobaSortEnAttente, null); assert.ok(sounds.includes('card_draw'));
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces a hostile wave, human shields one ally and sees the wave effects only on pass', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const TableCard = ({ entite, bouclierFx, actionFx, moba, onClick }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, onClick, 'data-entity': entite.id, 'data-shield-break': bouclierFx?.montant ?? 0, 'data-hit': actionFx?.type ?? '' }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const left = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const right = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.main = ['tempete-de-sable']; duel.sorcier.mana.sable = 10;
    duel.joueur.main = ['parade-du-verre']; duel.joueur.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.carteId, 'tempete-de-sable');
    assert.match(document.querySelector('.moba__hint').textContent, /Tempête de sable.*Créatures.*Vous/);
    assert.equal(left.pv, 4); assert.equal(right.pv, 4); assert.equal(sounds.includes('weapon_break'), false);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Tempête/);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Parade de verre')));
    await click(document.querySelector(`[data-entity="${left.id}"]`));
    assert.ok(left.bouclier > 0); assert.equal(duel.mobaSortEnAttente?.carteId, 'tempete-de-sable');
    sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(left.pv, 4); assert.equal(left.bouclier, 0); assert.equal(right.pv, 1);
    assert.equal(document.querySelector(`[data-entity="${left.id}"]`).getAttribute('data-shield-break'), '1');
    assert.equal(document.querySelector(`[data-entity="${right.id}"]`).getAttribute('data-hit'), 'hit');
    assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI shields its injured ally in response to the human hostile wave', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    target.pv = 3; target.def = 3; rpgFinDeTour(duel);
    duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Tempête de sable')));
    assert.match(document.querySelector('.moba__hint').textContent, /Tempête de sable.*Créatures.*IA/);
    assert.equal(target.pv, 3); assert.equal(document.querySelector('[aria-label="Votre main"]'), null);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Parade/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(target.bouclier > 0); assert.equal(duel.mobaSortEnAttente?.carteId, 'tempete-de-sable');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.pv, 3); assert.equal(target.bouclier, 0); assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
    assert.ok(document.querySelector('[aria-label="Votre main"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces Verglas: human shield blocks damage and freeze on one creature only', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const TableCard = ({ entite, bouclierFx, actionFx, moba, onClick }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, onClick, 'data-entity': entite.id, 'data-shield-break': bouclierFx?.montant ?? 0, 'data-hit': actionFx?.type ?? '', 'data-frozen': Boolean(entite.gelToursRestants) }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const left = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const right = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.main = ['verglas']; duel.sorcier.mana.neige = 10;
    duel.joueur.main = ['parade-du-verre']; duel.joueur.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /Verglas.*Créatures.*Vous/);
    assert.equal(left.pv, 4); assert.equal(right.pv, 4); assert.ok(!right.gelToursRestants); assert.equal(sounds.includes('weapon_break'), false);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Parade de verre')));
    await click(document.querySelector(`[data-entity="${left.id}"]`)); sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.equal(left.pv, 4); assert.ok(!left.gelToursRestants); assert.equal(left.bouclier, 0);
    assert.equal(right.pv, 2); assert.ok(right.gelToursRestants > 0);
    assert.equal(document.querySelector(`[data-entity="${left.id}"]`).getAttribute('data-shield-break'), '1');
    assert.equal(document.querySelector(`[data-entity="${right.id}"]`).getAttribute('data-hit'), 'hit');
    assert.equal(document.querySelector(`[data-entity="${right.id}"]`).getAttribute('data-frozen'), 'true');
    assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human announces Nuage: AI shields before the first wave and echo is only scheduled on pass', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    target.pv = 2; rpgFinDeTour(duel);
    duel.joueur.main = ['nuage-de-cendres']; duel.joueur.mana.braise = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Nuage de cendres')));
    assert.match(document.querySelector('.moba__hint').textContent, /Nuage de cendres.*Créatures.*IA/);
    assert.equal(duel.sorcier.degatsEchos.length, 0); assert.equal(target.pv, 2);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Parade/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(target.bouclier > 0); assert.equal(duel.sorcier.degatsEchos.length, 0);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.pv, 2); assert.equal(target.bouclier, 0); assert.equal(duel.sorcier.degatsEchos.length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces a symmetric lightning wave; the human shields one creature and both camps show damage', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const TableCard = ({ entite, bouclierFx, actionFx, moba, onClick }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, onClick, 'data-entity': entite.id, 'data-shield-break': bouclierFx?.montant ?? 0, 'data-hit': actionFx?.type ?? '' }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const left = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const right = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const ally = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    duel.sorcier.main = ['tempete-de-foudre-et-de-givre']; duel.sorcier.mana.neige = 10; duel.sorcier.mana.braise = 10;
    duel.joueur.main = ['parade-du-verre']; duel.joueur.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /Tempête de foudre et de givre.*Créatures.*Vous \+ IA/);
    assert.deepEqual([left.pv, right.pv, ally.pv], [4, 4, 4]); assert.equal(sounds.includes('weapon_break'), false);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Parade de verre')));
    await click(document.querySelector(`[data-entity="${left.id}"]`)); sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.deepEqual([left.pv, right.pv, ally.pv], [4, 1, 1]);
    assert.equal(document.querySelector(`[data-entity="${left.id}"]`).getAttribute('data-shield-break'), '1');
    assert.equal(document.querySelector(`[data-entity="${right.id}"]`).getAttribute('data-hit'), 'foudre');
    assert.equal(document.querySelector(`[data-entity="${ally.id}"]`).getAttribute('data-hit'), 'foudre');
    assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human announces Grand Hiver to both camps and AI shields its injured creature', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const ally = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite; target.pv = 1;
    rpgFinDeTour(duel); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Grand Hiver')));
    assert.match(document.querySelector('.moba__hint').textContent, /Grand Hiver.*Créatures.*Vous \+ IA/);
    assert.equal(ally.pv, 4); assert.equal(target.pv, 1); assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Parade/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(target.bouclier > 0); assert.equal(ally.pv, 4);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.pv, 1); assert.equal(target.bouclier, 0); assert.equal(ally.pv, 3);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces La Dernière Pesée; human shields one ally before global destruction feedback', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const TableCard = ({ entite, bouclierFx, moba, onClick }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, onClick, 'data-entity': entite.id, 'data-shield-break': bouclierFx?.montant ?? 0 }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const left = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const right = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.main = ['la-derniere-pesee']; duel.sorcier.mana.tenebres = 10;
    duel.joueur.main = ['parade-du-verre']; duel.joueur.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /Dernière Pesée.*Créatures.*Vous \+ IA/);
    assert.ok(duel.joueur.creatures.includes(right)); assert.equal(sounds.includes('destruction_hit'), false); assert.equal(sounds.includes('weapon_break'), false);
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Parade de verre')));
    await click(document.querySelector(`[data-entity="${left.id}"]`)); sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.ok(duel.joueur.creatures.includes(left)); assert.ok(!duel.joueur.creatures.includes(right)); assert.equal(left.bouclier, 0);
    assert.equal(document.querySelector(`[data-entity="${left.id}"]`).getAttribute('data-shield-break'), '1');
    assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1); assert.equal(sounds.filter((sound) => sound === 'destruction_hit').length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human announces Ressac global; AI shields and return audio waits for actual resolution', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const ally = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['ressac-de-la-lune-noire']; duel.joueur.mana.eau = 10; duel.joueur.mana.tenebres = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Ressac de la lune noire')));
    assert.match(document.querySelector('.moba__hint').textContent, /Ressac de la lune noire.*Créatures.*Vous \+ IA/);
    assert.ok(duel.joueur.creatures.includes(ally)); assert.equal(sounds.includes('creature_return'), false);
    assert.doesNotMatch(document.querySelector('.moba__hidden-hand').textContent, /Parade/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(target.bouclier > 0); assert.ok(duel.joueur.creatures.includes(ally)); assert.equal(sounds.includes('creature_return'), false);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(target.bouclier, 0); assert.ok(!duel.joueur.creatures.includes(ally));
    assert.equal(sounds.filter((sound) => sound === 'creature_return').length, 1); assert.equal(sounds.filter((sound) => sound === 'weapon_break').length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('an empty global Ressac resolves without a spurious return sound', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ressac-de-la-lune-noire']; duel.joueur.mana.eau = 10; duel.joueur.mana.tenebres = 10; duel.sorcier.main = []; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find((card) => card.textContent.includes('Ressac de la lune noire')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(sounds.includes('creature_return'), false);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces Serment on its creatures; human returns one before the buff resolves', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const TableCard = ({ entite, moba, onClick }) => React.createElement('button', { className: moba.className, disabled: moba.disabled, 'aria-label': moba.ariaLabel, onClick, 'data-entity': entite.id }, entite.name);
    const props = { onQuitter: () => {}, initialiser, rendu: { TableCard }, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const first = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const second = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    first.ready = true; second.ready = true;
    duel.sorcier.main = ['serment-de-la-forge']; duel.sorcier.mana.braise = 10;
    duel.joueur.main = ['ressac']; duel.joueur.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /Serment de la forge.*Créatures.*IA/);
    assert.equal(second.atk, 1); assert.equal(second.pv, 4); assert.equal(sounds.includes('soin_vie'), false);
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Ressac')));
    await click(document.querySelector(`[data-entity="${first.id}"]`)); sounds.length = 0;
    await click([...document.querySelectorAll('.moba__controls button')].find(button => button.textContent.includes('Passer et résoudre le sort')));
    assert.ok(!duel.sorcier.creatures.includes(first)); assert.equal(second.atk, 3); assert.equal(second.pv, 5); assert.equal(second.coupRapide, true);
    assert.equal(sounds.includes('soin_vie'), false, 'temporary maximum-HP buff is not a heal');
    assert.equal(duel.mobaSortEnAttente, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Offrande pays its selected lane before AI passes on the allied group buff', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const ally = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    duel.joueur.main = ['offrande-de-lin']; duel.joueur.mana.tenebres = 10; duel.sorcier.main = []; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Offrande de lin')));
    await click(document.querySelector('[aria-label="Payer 1 PV de Voie gauche de Vous"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Offrande de lin.*Créatures.*Vous/);
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'left').hp.joueur, 9); assert.equal(ally.atk, 1);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(ally.atk, 2); assert.equal(ally.tribut, 1);
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'left').hp.joueur, 9);
    assert.equal(sounds.includes('soin_vie'), false);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Embuscade is announced and AI can shield against the debuff', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('jarl-au-marteau-de-guerre'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.neige = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['embuscade']; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Embuscade')));
    assert.match(document.querySelector('.moba__hint').textContent, /Embuscade.*Créatures.*IA/);
    assert.equal(target.atk, 3); assert.equal(target.pv, 5);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(target.bouclier > 0); assert.ok(!target.blocageForce);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.atk, 3); assert.equal(target.pv, 5); assert.ok(!target.blocageForce); assert.equal(target.bouclier, 0);
    assert.equal(sounds.filter(sound => sound === 'weapon_break').length, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI uses Rempart in response to Tempête without playing a healing sound', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (sound) => sounds.push(sound) };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite; target.pv = 2;
    rpgFinDeTour(duel); duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
    duel.sorcier.main = ['rempart-de-dunes']; duel.sorcier.mana.sable = 10; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Tempête de sable')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.pv, 5); assert.equal(duel.mobaSortEnAttente?.carteId, 'tempete-de-sable'); assert.equal(sounds.includes('soin_vie'), false);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(target.pv, 2); assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(sounds.includes('soin_vie'), false);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI announces Nom effacé without revealing hands; human responds then privately discards', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('papyrus'), sorcierDeck: Array(30).fill('nom-efface'), joueurCouleurs: ['tenebres'], sorcierCouleurs: ['tenebres'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel);
    duel.sorcier.main = ['nom-efface']; duel.sorcier.mana.tenebres = 10;
    duel.joueur.main = ['papyrus','verglas']; duel.joueur.deck = ['trait-de-braise']; duel.joueur.mana.tenebres = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /Nom effacé.*Main.*Vous/);
    assert.ok(!duel.defausseEnAttente); assert.deepEqual(duel.joueur.main, ['papyrus','verglas']);
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Papyrus')));
    await click(document.querySelector('[aria-label="Payer 2 PV de Voie gauche de Vous"]'));
    assert.ok(duel.joueur.main.includes('trait-de-braise')); assert.equal(duel.mobaSortEnAttente?.carteId, 'nom-efface');
    await click([...document.querySelectorAll('.moba__controls button')].find(button => button.textContent.includes('Passer et résoudre le sort')));
    assert.match(document.querySelector('.moba__hint').textContent, /défausser/); assert.equal(duel.defausseEnAttente?.cote, 'joueur');
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Trait de braise')));
    assert.deepEqual(duel.joueur.main, ['verglas']); assert.equal(duel.defausseEnAttente, null); assert.equal(duel.tour, 'sorcier');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Le Routier draws only after the AI passes and then prompts the human discard', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds=[];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('le-routier'), sorcierDeck: Array(30).fill('verglas'), joueurCouleurs: ['eau'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: sound => sounds.push(sound) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['le-routier','verglas']; duel.joueur.deck = ['trait-de-braise','ressac']; duel.joueur.mana.eau = 10; duel.sorcier.main = []; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Le Routier')));
    assert.match(document.querySelector('.moba__hint').textContent, /Le Routier.*Pioche.*Vous/); assert.equal(duel.joueur.deck.length, 2); assert.equal(sounds.includes('card_draw'), false);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.deck.length, 0); assert.ok(sounds.includes('card_draw')); assert.match(document.querySelector('.moba__hint').textContent, /défausser/);
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Verglas')));
    assert.deepEqual(duel.joueur.main, ['ressac','trait-de-braise']); assert.equal(duel.defausseEnAttente, null); assert.equal(duel.tour, 'joueur');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Neige noire pays first, announces both camps and AI shields before destruction', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds=[];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: sound => sounds.push(sound) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.manaChoixEnAttente = false; duel.joueur.main = ['neige-noire']; duel.joueur.mana.neige = 10; duel.joueur.mana.tenebres = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10; sounds.length=0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Neige noire')));
    await click(document.querySelector('[aria-label="Payer 3 PV de Voie droite de Vous"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Neige noire.*Créatures.*Vous \+ IA/);
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'right').hp.joueur, 7); assert.ok(duel.sorcier.creatures.includes(target));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(target.bouclier > 0); assert.ok(duel.sorcier.creatures.includes(target));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(target.bouclier, 0); assert.ok(!target.gelToursRestants);
    assert.equal(sounds.filter(sound => sound === 'weapon_break').length, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Nom effacé announces the AI hand without exposing its cards while the AI resolves the discard', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('nom-efface'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['tenebres'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['nom-efface']; duel.joueur.mana.tenebres = 10; duel.sorcier.main = ['jarl-au-marteau-de-guerre'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Nom effacé')));
    assert.match(document.querySelector('.moba__hint').textContent, /Nom effacé.*Main.*IA/);
    assert.equal(duel.sorcier.main.length, 1); assert.doesNotMatch(document.body.textContent, /Jarl au marteau de guerre/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.sorcier.main.length, 0); assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.tour, 'joueur');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Papyrus announces the deck after paying, then plays draw feedback only on resolution', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('papyrus'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['tenebres'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: sound => sounds.push(sound) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['papyrus']; duel.joueur.deck = ['verglas']; duel.joueur.mana.tenebres = 10; duel.sorcier.main = []; sounds.length=0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Papyrus')));
    await click(document.querySelector('[aria-label="Payer 2 PV de Voie droite de Vous"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Papyrus.*Pioche.*Vous/);
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'right').hp.joueur, 8); assert.equal(duel.joueur.deck.length, 1);
    assert.equal(sounds.includes('card_draw'), false);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.deepEqual(duel.joueur.main, ['verglas']); assert.equal(sounds.filter(s => s === 'card_draw').length, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human Grand Voile announces both camps before fog begins and AI passes', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('grand-voile-blanc'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.main = ['grand-voile-blanc']; duel.joueur.mana.neige = 10; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Grand Voile blanc')));
    assert.match(document.querySelector('.moba__hint').textContent, /Grand Voile blanc.*Combat.*Vous \+ IA/); assert.ok(!duel.brouillardCombat); assert.equal(document.querySelector('.moba__fog'), null);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.brouillardCombat, true); assert.equal(duel.tour, 'joueur');
    assert.match(document.querySelector('.moba__fog').getAttribute('aria-label'), /ne peuvent pas infliger de dégâts de combat/);
    await click([...document.querySelectorAll('.moba__controls button')].find(button => button.textContent.includes('Fin du tour')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.brouillardCombat, false); assert.equal(document.querySelector('.moba__fog'), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('human counters an AI spell, with sound and without letting its effect resolve', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds=[];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['sable'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: sound => sounds.push(sound) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); duel.joueur.mana.sable = 10;
    const target = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    duel.joueur.main = ['silence-decume']; duel.joueur.mana.eau = 10;
    await act(async () => root.render(React.createElement(Board, props)));
    assert.equal([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Silence')).disabled, true);
    rpgFinDeTour(duel); duel.sorcier.main = ['tempete-de-sable']; duel.sorcier.mana.sable = 10; sounds.length=0;
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /Tempête de sable/); assert.equal(target.pv, 4);
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Silence')));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(target.pv, 4); assert.equal(duel.sorcier.cimetiere.filter(id=>id==='tempete-de-sable').length, 1);
    assert.equal(duel.joueur.cimetiere.filter(id=>id==='silence-decume').length, 1); assert.equal(sounds.filter(sound=>sound==='card_countered').length, 1);
    assert.doesNotMatch(document.querySelector('.moba__hint').textContent, /Passer et résoudre/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('AI counters a lethal announced lane spell and the human turn resumes', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds=[];
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: sound => sounds.push(sound) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'center', 8);
    duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['silence-decume']; duel.sorcier.mana.eau = 10; sounds.length=0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Éclair du marteau')));
    await click(document.querySelector('[aria-label="Cibler Voie centrale de IA"]'));
    assert.match(document.querySelector('.moba__hint').textContent, /Éclair du marteau/);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.moba.winner, null); assert.equal(duel.moba.lanes.find(lane=>lane.id==='center').hp.sorcier, 2);
    assert.ok(sounds.includes('card_countered')); assert.equal(duel.tour, 'joueur'); assert.match(document.querySelector('.moba__hint').textContent, /Jouez une carte/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Feux de kitsune : selection reversible et annonce de deux cibles', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const classic = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['braise'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles:true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    classic.rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const a = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const b = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    classic.rpgFinDeTour(duel); a.pv = a.pvMax = b.pv = b.pvMax = 10;
    duel.joueur.main = ['feux-de-kitsune']; duel.joueur.mana.braise = 20; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const spell = () => [...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Feux de kitsune'));
    const target = id => document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`) ?? document.querySelector(`button[data-moba-entity="${id}"]`);
    await click(spell()); await click(target(a.id));
    assert.match(document.querySelector('.moba__hint').textContent, /autre créature.*même/);
    assert.match(target(a.id).getAttribute('aria-label'), /première cible sélectionnée/);
    await click(document.querySelector('.moba__cancel-choice'));
    assert.equal(duel.joueur.main.includes('feux-de-kitsune'), true); assert.equal(a.pv, 10);
    await click(spell()); await click(target(a.id)); await click(target(b.id));
    assert.equal(duel.mobaSortEnAttente.cibleId, a.id); assert.equal(duel.mobaSortEnAttente.cibleSecondaireId, b.id);
    assert.match(duel.mobaSortEnAttente.cibleNom, /gauche.*droite/i);
    assert.match(document.querySelector('.moba__pending-spell--joueur').textContent, /Feux de kitsune.*gauche.*droite/i);
    assert.equal(a.pv, 10); assert.equal(b.pv, 10); assert.match(document.querySelector('.moba__hint').textContent, /Feux de kitsune/);
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(a.pv, 8); assert.equal(b.pv, 8);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Défi du Jarl : champion allié puis adversaire, annulation et annonce des deux voies', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const classic = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['neige'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles:true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.neige = 20;
    const ally = engine.rpgMobaJouerCreature(duel, 'joueur', 'viking-des-neiges', 'left', 0).entite;
    classic.rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const target = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    classic.rpgFinDeTour(duel); ally.atk = 3; target.atk = 2; ally.pv = ally.pvMax = target.pv = target.pvMax = 8;
    duel.joueur.main = ['defi-du-jarl']; duel.joueur.mana.neige = 20; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const spell = () => [...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Défi du Jarl'));
    const slot = id => document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`) ?? document.querySelector(`button[data-moba-entity="${id}"]`);
    await click(spell()); assert.match(document.querySelector('.moba__hint').textContent, /alliée.*champion/);
    assert.equal(slot(target.id).disabled, true); await click(slot(ally.id));
    assert.match(document.querySelector('.moba__hint').textContent, /adverse.*champion/);
    assert.match(slot(ally.id).getAttribute('aria-label'), /première cible sélectionnée/);
    await click(document.querySelector('.moba__cancel-choice')); assert.ok(duel.joueur.main.includes('defi-du-jarl'));
    await click(spell()); await click(slot(ally.id)); await click(slot(target.id));
    assert.equal(duel.mobaSortEnAttente.cibleId, target.id); assert.equal(duel.mobaSortEnAttente.cibleSecondaireId, ally.id);
    assert.match(duel.mobaSortEnAttente.cibleNom, /droite.*gauche/i); assert.equal(ally.pv, 8); assert.equal(target.pv, 8);
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(ally.pv, 6); assert.equal(target.pv, 5);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Réanimation : choix de case, annonce du cimetière puis retour dans la voie', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles:true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['reanimation']; duel.joueur.mana.sable = 20; duel.joueur.cimetiere = ['gardienne-des-portes-de-sable']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const spell = () => [...document.querySelectorAll('.moba__card')].find(card => card.textContent.includes('Réanimation'));
    await click(spell()); assert.match(document.querySelector('.moba__hint').textContent, /où réanimer.*cimetière/);
    const slot = document.querySelector('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="1"] button.moba__slot');
    assert.match(slot.getAttribute('aria-label'), /réanimer ici/); await click(slot);
    assert.equal(duel.mobaSortEnAttente?.reanimationMoba.slot, 1); assert.equal(duel.joueur.creatures.length, 0);
    assert.match(document.querySelector('.moba__hint').textContent, /Réanimation.*Cimetière.*droite/i);
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.joueur.creatures[0].mobaLane, 'right');
    assert.equal(duel.moba.lanes.find(lane => lane.id === 'right').slots.joueur[1], duel.joueur.creatures[0].id);
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('IA annonce Réanimation puis le joueur passe et voit la créature revenir', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const classic = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button, 'button exists'); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles:true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); classic.rpgFinDeTour(duel);
    duel.sorcier.main = ['reanimation']; duel.sorcier.cimetiere = ['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 20; duel.joueur.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.mobaSortEnAttente?.carteId, 'reanimation'); assert.equal(duel.sorcier.creatures.length, 0);
    assert.match(document.querySelector('.moba__hint').textContent, /Réanimation.*Cimetière.*IA/);
    assert.match(document.querySelector('.moba__pending-spell--sorcier').textContent, /Réanimation.*Cimetière.*IA/);
    await click([...document.querySelectorAll('.moba__controls button')].find(button => button.textContent.includes('Passer')));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.sorcier.creatures[0].carteId, 'gardienne-des-portes-de-sable');
    assert.equal(engine.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Annonce de créature du joueur : IA contre avec Écueil avant la pose', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js'); let duel;
    const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
    const props = { onQuitter: () => {}, initialiser }; root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles:true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 20;
    duel.sorcier.main = ['ecueil']; duel.sorcier.mana.eau = 20;
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector('.moba__card'));
    await click(document.querySelector('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="1"] button.moba__slot'));
    assert.equal(duel.mobaCreatureEnAttente?.carteId,'gardienne-des-portes-de-sable'); assert.equal(duel.joueur.creatures.length,0);
    assert.match(document.querySelector('.moba__hint').textContent,/Gardienne.*droite.*emplacement 2/i);
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.mobaCreatureEnAttente,null); assert.equal(duel.joueur.creatures.length,0); assert.ok(duel.sorcier.cimetiere.includes('ecueil'));
    assert.equal(engine.rpgMobaPlacementCoherent(duel),true);
  } finally { if (root) await act(async () => root.unmount()); await server.close(); dom.window.close(); globalThis.window=oldWindow; globalThis.document=oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

test('Annonce de créature IA : le joueur voit la voie et peut contrer ou passer', async () => {
  for (const counter of [true, false]) {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
      const classic = await server.ssrLoadModule('/src/games/rpgDuel.js'); let duel;
      const initialiser = () => (duel = voiesLateralesBlessees(engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 })));
      const props = { onQuitter: () => {}, initialiser }; root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, props)));
      const click = async button => { assert.ok(button); assert.equal(button.disabled,false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles:true }))); };
      await click(document.querySelector('.moba__mulligan .moba__primary')); classic.rpgFinDeTour(duel);
      duel.sorcier.main = ['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 20;
      duel.joueur.main = counter ? ['ecueil','silence-decume'] : []; duel.joueur.mana.eau = 20;
      await act(async () => root.render(React.createElement(Board, props)));
      await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
      assert.equal(duel.mobaCreatureEnAttente?.carteId,'gardienne-des-portes-de-sable'); assert.equal(duel.sorcier.creatures.length,0);
      assert.match(document.querySelector('.moba__hint').textContent,/Gardienne.*IA.*emplacement/i);
      if (counter) {
        const cards = [...document.querySelectorAll('.moba__card')];
        assert.equal(cards.find(c=>c.textContent.includes('Silence d’écume')).disabled,true);
        await click(cards.find(c=>c.textContent.includes('Écueil')));
        assert.equal(duel.sorcier.creatures.length,0); assert.ok(duel.joueur.cimetiere.includes('ecueil'));
      } else {
        await click([...document.querySelectorAll('.moba__controls button')].find(button=>button.textContent.includes('Passer')));
        assert.equal(duel.sorcier.creatures[0]?.carteId,'gardienne-des-portes-de-sable');
      }
      assert.equal(duel.mobaCreatureEnAttente,null); assert.equal(engine.rpgMobaPlacementCoherent(duel),true);
    } finally { if (root) await act(async () => root.unmount()); await server.close(); dom.window.close(); globalThis.window=oldWindow; globalThis.document=oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
  }
});

test('Sabre et Mémoire : ciblage allié, annonce, équipement visible et récupération au cimetière', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document; globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true; let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const initialiser=()=>duel=voiesLateralesBlessees(engine.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));
    const props={onQuitter:()=>{},initialiser}; root=createRoot(document.getElementById('root')); await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const spell=name=>[...document.querySelectorAll('.moba__card')].find(card=>card.textContent.includes(name));
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.mana.sable=20; const ally=engine.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    duel.joueur.main=['sabre-maudit']; duel.joueur.mana.braise=20; duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));
    const slot=()=>document.querySelector(`[data-moba-entity="${ally.id}"] button.moba__slot`) ?? document.querySelector(`button[data-moba-entity="${ally.id}"]`);
    await click(spell('Sabre maudit')); await click(slot());
    assert.equal(duel.mobaSortEnAttente?.carteId,'sabre-maudit'); assert.ok(!ally.volDeVie); assert.match(document.querySelector('.moba__hint').textContent,/Sabre maudit.*Gardienne/);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(ally.volDeVie,true); assert.match(slot().getAttribute('aria-label'),/Équipée : Sabre maudit.*Vol de vie/);
    duel.joueur.main=['memoire-de-l-armurerie']; duel.joueur.cimetiere=['sabre-maudit']; duel.joueur.mana.sable=20;
    await act(async()=>root.render(React.createElement(Board,props)));
    await click(spell('Mémoire de l’armurerie')); assert.match(document.querySelector('.moba__hint').textContent,/Sabre maudit.*cimetière/);
    await click(slot()); assert.equal(duel.mobaSortEnAttente?.cibleSecondaireId,'sabre-maudit');
    assert.match(document.querySelector('.moba__hint').textContent,/Mémoire.*Sabre maudit au cimetière/);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.deepEqual(ally.armes,['sabre-maudit','sabre-maudit']); assert.ok(duel.joueur.cimetiere.includes('memoire-de-l-armurerie'));
    assert.equal(engine.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Brise-lame : seule une créature adverse équipée est ciblable sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document; globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true; let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx'); const engine=await server.ssrLoadModule('/src/games/rpgMobaLocal.js'); const classic=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const initialiser=()=>duel=voiesLateralesBlessees(engine.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));
    const props={onQuitter:()=>{},initialiser};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));classic.rpgFinDeTour(duel);duel.sorcier.mana.sable=20;
    const armed=engine.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
    const unarmed=engine.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
    duel.sorcier.main=['sabre-maudit'];duel.sorcier.mana.braise=20;assert.equal(engine.rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',armed.id).ok,true);classic.rpgFinDeTour(duel);
    duel.joueur.main=['brise-lame'];duel.joueur.mana.braise=20;duel.joueur.deck=['verglas'];duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));
    const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`) ?? document.querySelector(`button[data-moba-entity="${id}"]`);
    await click([...document.querySelectorAll('.moba__card')].find(card=>card.textContent.includes('Brise-lame')));
    assert.equal(slot(unarmed.id).disabled,true);assert.equal(slot(armed.id).disabled,false);
    await click(slot(armed.id));assert.equal(duel.mobaSortEnAttente?.carteId,'brise-lame');assert.equal(armed.volDeVie,true);assert.equal(duel.joueur.deck.length,1);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(armed.volDeVie,false);assert.deepEqual(armed.armes,[]);assert.equal(duel.joueur.deck.length,0);assert.equal(engine.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('IA annonce Sabre maudit et le joueur peut contrer avant son attachement', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document; globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true; let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx'); const engine=await server.ssrLoadModule('/src/games/rpgMobaLocal.js'); const classic=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(engine.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));
    const props={onQuitter:()=>{},initialiser};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary')); classic.rpgFinDeTour(duel);duel.sorcier.mana.sable=20;
    const target=engine.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
    duel.sorcier.main=['sabre-maudit'];duel.sorcier.mana.braise=20;duel.joueur.main=['silence-decume'];duel.joueur.mana.eau=20;
    await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.mobaSortEnAttente?.carteId,'sabre-maudit');assert.equal(duel.mobaSortEnAttente.cibleId,target.id);assert.equal(target.volDeVie,false);
    assert.match(document.querySelector('.moba__hint').textContent,/Sabre maudit.*Gardienne/);
    assert.match(document.querySelector('.moba__pending-spell--sorcier').textContent, /SORT ADVERSE.*Sabre maudit.*Gardienne.*Voie droite/);
    await click([...document.querySelectorAll('.moba__card')].find(card=>card.textContent.includes('Silence d’écume')));
    assert.equal(duel.mobaSortEnAttente,null);assert.equal(document.querySelector('.moba__pending-spell'),null);assert.equal(target.volDeVie,false);assert.ok(duel.sorcier.cimetiere.includes('sabre-maudit'));assert.equal(engine.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Lettre et Débarquement : le joueur choisit la prise, voit la cale et annonce le renfort', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const card=name=>[...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes(name));const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`);
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.sable=20;
    const victime=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['lettre-de-marque','gardien-de-la-porte-ardente','le-grand-debarquement'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;duel.joueur.mana.braise=20;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click(card('Lettre de marque'));
    assert.equal(duel.mobaSortEnAttente?.carteId,'lettre-de-marque');assert.match(document.querySelector('.moba__hint').textContent,/Lettre de marque.*Abordage/);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.joueur.prochaineArriveeAbordage,true);assert.match(document.querySelector('.moba__boarding').getAttribute('aria-label'),/prochaine créature.*Abordage/);
    await click(card('Gardien de la porte ardente'));await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    assert.equal(duel.mobaCreatureEnAttente?.carteId,'gardien-de-la-porte-ardente');await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(document.querySelector('.moba__boarding'),null);
    assert.ok(duel.arriveeEnAttente);assert.match(document.querySelector('.moba__hint').textContent,/prendre en cale.*2/);assert.equal(slot(victime.id).disabled,false);
    await click(slot(victime.id));const capteur=duel.joueur.creatures.find(x=>x.enCale);assert.ok(capteur);assert.match(slot(capteur.id).getAttribute('aria-label'),/En cale : Gardienne/);
    const before=capteur.atk;await click(card('Le Grand Débarquement'));assert.equal(duel.mobaSortEnAttente?.carteId,'le-grand-debarquement');assert.match(document.querySelector('.moba__hint').textContent,/Débarquement.*prise en cale/);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(capteur.atk,before+2);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Arrivée ciblée après Abordage : choix successifs sans bloquer le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`);
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.sable=20;
    const prise=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
    const cible=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['sonneur-fele'];duel.joueur.mana.eau=20;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Sonneur fêlé')));
    await click(document.querySelector('[data-moba-lane="center"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.match(document.querySelector('.moba__hint').textContent,/prendre en cale/);await click(slot(prise.id));
    assert.ok(duel.arriveeEnAttente);assert.match(document.querySelector('.moba__hint').textContent,/capacité d’arrivée/);assert.equal(slot(cible.id).disabled,false);
    await click(slot(cible.id));if(duel.effetCreatureEnAttente)await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.arriveeEnAttente,null);assert.ok(duel.sorcier.main.includes(cible.carteId));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('IA annonce la Lettre, accoste puis choisit une prise après les réponses humaines', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const pass=()=>[...document.querySelectorAll('.moba__controls button')].find(x=>x.textContent.includes('Passer'));
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.mana.sable=20;
    const victime=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);
    duel.sorcier.main=['lettre-de-marque','gardien-de-la-porte-ardente'];duel.sorcier.deck=[];duel.sorcier.mana.sable=20;duel.sorcier.mana.eau=20;duel.sorcier.mana.braise=20;duel.joueur.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.mobaSortEnAttente?.carteId,'lettre-de-marque');await click(pass());
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.mobaCreatureEnAttente?.carteId,'gardien-de-la-porte-ardente');await click(pass());
    assert.ok(duel.arriveeEnAttente);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.arriveeEnAttente,null);assert.ok(duel.sorcier.creatures.some(x=>x.enCale?.entite.id===victime.id));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Abordage imprimé : le plateau demande et affiche la prise du navire', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const card=name=>[...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes(name));const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`);
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.sable=20;
    const victime=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['cotre-de-course'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click(card('Cotre de course'));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    assert.equal(duel.mobaCreatureEnAttente?.carteId,'cotre-de-course');await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.match(document.querySelector('.moba__hint').textContent,/prendre en cale.*2/);assert.equal(slot(victime.id).disabled,false);
    await click(slot(victime.id));const capteur=duel.joueur.creatures.find(x=>x.enCale);assert.equal(capteur.carteId,'cotre-de-course');assert.match(slot(capteur.id).getAttribute('aria-label'),/En cale : Gardienne/);
    assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Cavalier sans nom : seules les cibles de coût 4 ou moins sont disponibles', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    const sounds=[];let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser,onPlaySfx:(sound)=>sounds.push(sound)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const card=name=>[...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes(name));const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`);
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.sable=20;duel.sorcier.mana.neige=20;
    duel.sorcier.main=['gardienne-des-portes-de-sable','jarl-au-marteau-de-guerre'];const target=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
    const cher=e.rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','center',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['le-cavalier-sans-nom'];duel.joueur.deck=['verglas'];duel.joueur.mana.eau=20;duel.joueur.mana.tenebres=20;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click(card('Le cavalier sans nom'));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.match(document.querySelector('.moba__hint').textContent,/coût 4 ou moins/);assert.equal(slot(target.id).disabled,false);assert.equal(slot(cher.id).disabled,true);
    const beforeSounds=sounds.length;await click(slot(target.id));assert.ok(sounds.slice(beforeSounds).includes('creature_return'));assert.ok(sounds.slice(beforeSounds).includes('card_draw'));assert.ok(duel.sorcier.main.includes('gardienne-des-portes-de-sable'));assert.ok(duel.joueur.main.includes('verglas'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Oni : deux cibles distinctes et premier choix réversible sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const card=name=>[...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes(name));const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`);
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.sable=30;duel.sorcier.main=Array(3).fill('gardienne-des-portes-de-sable');
    const a=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
    const b=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;
    const d=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['oni-de-la-fournaise'];duel.joueur.mana.braise=30;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click(card('Oni de la fournaise'));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.match(document.querySelector('.moba__hint').textContent,/deux créatures adverses/);await click(slot(a.id));
    assert.match(document.querySelector('.moba__hint').textContent,/seconde créature/);assert.match(slot(a.id).getAttribute('aria-label'),/première cible sélectionnée/);assert.equal(a.pv,4);
    await click(slot(a.id));assert.equal(duel.arriveeEnAttente.cibleOni,undefined);await click(slot(b.id));await click(slot(d.id));
    assert.equal(a.pv,4);assert.equal(b.pv,1);assert.equal(d.pv,1);assert.equal(duel.arriveeEnAttente,null);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('IA : Oni choisit deux cibles après la réponse à sa créature', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const pass=()=>[...document.querySelectorAll('.moba__controls button')].find(x=>x.textContent.includes('Passer'));
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=Array(2).fill('gardienne-des-portes-de-sable');duel.joueur.mana.sable=30;
    const a=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const b=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;c.rpgFinDeTour(duel);
    duel.sorcier.main=['oni-de-la-fournaise'];duel.sorcier.mana.braise=30;duel.joueur.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.mobaCreatureEnAttente?.carteId,'oni-de-la-fournaise');await click(pass());
    assert.ok(duel.arriveeEnAttente);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.ok(duel.arriveeEnAttente?.cibleOni);assert.equal(a.pv,4);assert.equal(b.pv,4);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.arriveeEnAttente,null);assert.equal(a.pv,1);assert.equal(b.pv,1);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Cavalier de vapeur : un blocage adverse renvoie la carte et joue le son après combat', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    const sounds=[];let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('jarl-au-marteau-de-guerre'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['neige'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser,onPlaySfx:(sound)=>sounds.push(sound)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.mana.neige=30;duel.joueur.main=['jarl-au-marteau-de-guerre'];
    const jarl=e.rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','left',0).entite;c.rpgFinDeTour(duel);
    duel.sorcier.main=['le-cavalier-de-vapeur'];duel.sorcier.mana.braise=30;duel.sorcier.mana.eau=30;
    const rider=e.rpgMobaJouerCreature(duel,'sorcier','le-cavalier-de-vapeur','left',0).entite;assert.equal(e.rpgMobaResoudreArrivee(duel,'sorcier',jarl.id).ok,true);c.rpgFinDeTour(duel);jarl.ready=true;jarl.pv=jarl.pvMax=10;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click(document.querySelector(`[data-moba-entity="${jarl.id}"] button.moba__slot`));
    const before=sounds.length;await click([...document.querySelectorAll('.moba__controls button')].find(x=>x.textContent.includes('Déclarer')));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.ok(!duel.sorcier.creatures.includes(rider));assert.ok(duel.joueur.main.includes(jarl.carteId));
    assert.ok(sounds.slice(before).includes('creature_return'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Bakunawa : le plateau permet de choisir le combat sur une autre voie', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.neige=30;duel.sorcier.main=['jarl-au-marteau-de-guerre'];
    const target=e.rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['bakunawa'];duel.joueur.mana.eau=30;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Bakunawa')));await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.match(document.querySelector('.moba__hint').textContent,/simultan/);
    await click(document.querySelector(`[data-moba-entity="${target.id}"] button.moba__slot`));assert.equal(target.pv,2);assert.equal(duel.joueur.creatures.find(x=>x.carteId==='bakunawa').pv,3);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('IA : Cavalier amazigh choisit un duel après la réponse à sa créature', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;
    const target=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);duel.sorcier.main=['cavalier-amazigh-du-desert'];duel.sorcier.mana.sable=30;duel.joueur.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.mobaCreatureEnAttente?.carteId,'cavalier-amazigh-du-desert');
    await click([...document.querySelectorAll('.moba__controls button')].find(x=>x.textContent.includes('Passer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.ok(!duel.joueur.creatures.includes(target));assert.equal(duel.sorcier.creatures.find(x=>x.carteId==='cavalier-amazigh-du-desert').pv,3);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Barbe Noire et Le Poids : prise, malédiction et cible du Lien sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const slot=id=>document.querySelector(`[data-moba-entity="${id}"] button.moba__slot`);
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.sable=30;duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];
    const prise=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;
    const cible=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);duel.joueur.main=['la-barbe-noire'];duel.joueur.mana.tenebres=30;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('La Barbe Noire')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.match(document.querySelector('.moba__hint').textContent,/prendre en cale/);assert.match(slot(cible.id).getAttribute('aria-label'),/Malédiction/);await click(slot(prise.id));
    duel.joueur.main=['le-poids'];await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Le Poids')));
    assert.match(document.querySelector('.moba__hint').textContent,/créature adverse ciblée/);await click(slot(cible.id));assert.match(document.querySelector('.moba__hint').textContent,/voie active/);
    await click(document.querySelector('[aria-label="Transférer les PV de Voie droite"]'));assert.equal(duel.mobaSortEnAttente.cibleId,cible.id);assert.match(document.querySelector('.moba__hint').textContent,/Gardienne/);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(cible.pv,2);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('IA : Barbe Noire arrive, maudit et choisit sa prise', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async button=>{assert.ok(button);assert.equal(button.disabled,false);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['gardienne-des-portes-de-sable','jarl-au-marteau-de-guerre'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;
    const prise=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;
    const temoin=e.rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','right',0).entite;c.rpgFinDeTour(duel);duel.sorcier.main=['la-barbe-noire'];duel.sorcier.mana.tenebres=30;duel.joueur.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.mobaCreatureEnAttente?.carteId,'la-barbe-noire');
    await click([...document.querySelectorAll('.moba__controls button')].find(x=>x.textContent.includes('Passer')));assert.equal(temoin.atk,1);
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));const noire=duel.sorcier.creatures.find(x=>x.carteId==='la-barbe-noire');assert.equal(noire.enCale.entite.id,prise.id);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Brûlot : dégâts de mort et son affichés après une arrivée ciblée', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const sounds=[];const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser,onPlaySfx:s=>sounds.push(s)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['le-brulot'];duel.sorcier.mana.braise=30;
    const brulot=e.rpgMobaJouerCreature(duel,'sorcier','le-brulot','right',0).entite;c.rpgFinDeTour(duel);duel.sorcier.main=[];duel.joueur.main=['maitre-du-marteau'];duel.joueur.mana.neige=30;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('MAÎTRE DU MARTEAU')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    await click(document.querySelector(`[data-moba-entity="${brulot.id}"] button.moba__slot`));
    const health=document.querySelector('[data-moba-lane-hp="@moba:right:joueur"] strong');assert.match(health.textContent,/8/);assert.ok(health.classList.contains('is-damaged'));assert.ok(sounds.includes('degats_sorcier'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Barbe-Rousse : la Contre-attaque d’un sort annoncé est affichée dans sa voie', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const sounds=[];const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser,onPlaySfx:s=>sounds.push(s)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['la-barbe-rousse'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;
    const rousse=e.rpgMobaJouerCreature(duel,'sorcier','la-barbe-rousse','right',0).entite;c.rpgFinDeTour(duel);duel.sorcier.main=[];duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=30;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Trait de braise')));
    await click(document.querySelector(`[data-moba-entity="${rousse.id}"] button.moba__slot`));assert.equal(duel.mobaSortEnAttente?.carteId,'trait-de-braise');
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));const health=document.querySelector('[data-moba-lane-hp="@moba:right:joueur"] strong');
    assert.match(health.textContent,/6/);assert.ok(health.classList.contains('is-damaged'));assert.ok(sounds.includes('degats_sorcier'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Barbe-Rousse : annonce, Corsaire, prise et Lien du Débarquement au plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.mana.neige=30;duel.sorcier.main=['jarl-au-marteau-de-guerre'];const prise=e.rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;
    c.rpgFinDeTour(duel);duel.sorcier.main=[];duel.joueur.main=['la-barbe-rousse'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('La Barbe-Rousse')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.match(document.querySelector('.moba__hint').textContent,/prendre en cale/);assert.ok(duel.joueur.creatures.some(e=>e.carteId==='corsaire'));
    await click(document.querySelector(`[data-moba-entity="${prise.id}"] button.moba__slot`));const rousse=duel.joueur.creatures.find(e=>e.carteId==='la-barbe-rousse');assert.equal(rousse.enCale.entite.id,prise.id);
    duel.joueur.main=['le-grand-debarquement'];await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Le Grand Débarquement')));
    assert.equal(duel.mobaSortEnAttente?.carteId,'le-grand-debarquement');await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(rousse.atk,7);assert.equal(rousse.pv,7);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Eirik : Compagnie et Contre-attaque sont visibles dans la bonne voie', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['eirik-du-premier-serment','viking-des-neiges'];duel.sorcier.mana.neige=30;
    const eirik=e.rpgMobaJouerCreature(duel,'sorcier','eirik-du-premier-serment','center',0).entite;e.rpgMobaJouerCreature(duel,'sorcier','viking-des-neiges','right',0);assert.equal(eirik.atk,2);c.rpgFinDeTour(duel);
    duel.sorcier.main=[];duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=30;await act(async()=>root.render(React.createElement(Board,props)));
    assert.match(document.querySelector(`[data-moba-entity="${eirik.id}"]`).textContent,/Eirik/);await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Trait de braise')));
    await click(document.querySelector(`[data-moba-entity="${eirik.id}"] button.moba__slot`));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const health=document.querySelector('[data-moba-lane-hp="@moba:center:joueur"] strong');assert.match(health.textContent,/8/);assert.ok(health.classList.contains('is-damaged'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Kusayla : annonce, Guépard prêt et attaque depuis la voie sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['kusayla-roi-des-imazighen'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Le roi Kusayla')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const guepard=duel.joueur.creatures.find(e=>e.carteId==='guepard');assert.ok(guepard?.ready);assert.match(document.querySelector(`[data-moba-entity="${guepard.id}"]`).textContent,/Guépard/);
    await click(document.querySelector(`[data-moba-entity="${guepard.id}"] button.moba__slot`));
    await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.moba.lanes.find(l=>l.id==='left').hp.sorcier,8);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Festin : Lien Eirik soigne les alliés et la voie sélectionnée sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const {mobaInfliger}=await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['eirik-du-premier-serment','gardienne-des-portes-de-sable'];duel.joueur.mana.neige=30;duel.joueur.mana.sable=30;
    e.rpgMobaJouerCreature(duel,'joueur','eirik-du-premier-serment','left',0);const allie=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;allie.pv=1;allie.def=1;mobaInfliger(duel.moba,'sorcier','right',5);
    duel.joueur.main=['festin-des-vaillants'];duel.joueur.mana.neige=30;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Festin des vaillants')));await click(document.querySelector('[aria-label="Soigner Voie droite de Vous"]'));
    assert.equal(duel.mobaSortEnAttente?.carteId,'festin-des-vaillants');await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const health=document.querySelector('[data-moba-lane-hp="@moba:right:joueur"] strong');assert.match(health.textContent,/8/);assert.ok(health.classList.contains('is-healed'));assert.equal(allie.pv,4);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Salem : annonce, parade visible et cible immédiate dans sa voie', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes'];duel.sorcier.mana.sable=30;
    const cible=e.rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;c.rpgFinDeTour(duel);duel.sorcier.main=[];duel.joueur.main=['salem'];duel.joueur.mana.sable=30;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('SALEM')));
    await click(document.querySelector('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const salem=duel.joueur.creatures.find(e=>e.carteId==='salem');assert.equal(salem.bouclier,1);assert.ok(salem.ready);assert.match(document.querySelector(`[data-moba-entity="${salem.id}"] button.moba__slot`).getAttribute('aria-label'),/Bouclier/);await click(document.querySelector(`[data-moba-entity="${salem.id}"] button.moba__slot`));
    assert.match(document.querySelector('.moba__hint').textContent,/attaque ciblée/i);await click(document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`));
    await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.ok(!duel.sorcier.creatures.includes(cible));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Dame : bouclier de lumière et Lien du Rempart visibles, soin de mort dans sa voie', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const {mobaInfliger}=await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];const props={onQuitter:()=>{},initialiser,onPlaySfx:(name)=>sounds.push(name)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['gardienne-des-portes-de-sable','dame-aux-ailes-d-or'];duel.joueur.mana.sable=30;
    const allie=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;duel.joueur.main=['dame-aux-ailes-d-or'];duel.sorcier.main=[];
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('La Dame aux ailes d’or')));
    await click(document.querySelector('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="0"] button'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const dame=duel.joueur.creatures.find(e=>e.carteId==='dame-aux-ailes-d-or');const dameSlot=()=>document.querySelector(`[data-moba-entity="${dame.id}"] button.moba__slot`);assert.match(dameSlot().getAttribute('aria-label'),/Bouclier de lumière/);
    duel.joueur.main=['rempart-de-dunes'];duel.joueur.mana.sable=30;await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Rempart de dunes')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(allie.bouclier,1);assert.equal(dame.bouclier,1);assert.match(dameSlot().getAttribute('aria-label'),/Bouclier de lumière/);
    mobaInfliger(duel.moba,'sorcier','right',6);duel.joueur.main=['le-jugement-des-colosses'];duel.joueur.mana.tenebres=30;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Le Jugement des colosses')));await click(dameSlot());await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const health=document.querySelector('[data-moba-lane-hp="@moba:right:joueur"] strong');assert.match(health.textContent,/9/);assert.ok(health.classList.contains('is-healed'));assert.ok(sounds.includes('soin_vie'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Dame : la magie annoncée brise la lumière au moment de sa résolution', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];
    const TableCard=({entite,bouclierFx,moba,onClick})=>React.createElement('button',{className:moba.className,disabled:moba.disabled,'aria-label':moba.ariaLabel,'data-shield-break':bouclierFx?.montant??0,onClick},entite.name);const props={onQuitter:()=>{},initialiser,onPlaySfx:(name)=>sounds.push(name),rendu:{TableCard}};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['dame-aux-ailes-d-or'];duel.sorcier.mana.sable=30;const dame=e.rpgMobaJouerCreature(duel,'sorcier','dame-aux-ailes-d-or','right',0).entite;c.rpgFinDeTour(duel);
    duel.sorcier.main=[];duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=30;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Trait de braise')));const slot=()=>document.querySelector(`[data-moba-entity="${dame.id}"] button.moba__slot`);await click(slot());
    assert.equal(dame.bouclierLumiere,true);assert.ok(!sounds.includes('weapon_break'));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(dame.bouclierLumiere,false);assert.equal(dame.pv,5);assert.equal(slot().getAttribute('data-shield-break'),'1');assert.ok(sounds.includes('weapon_break'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Dame : le combat brise la lumière et déclenche le retour visuel et sonore', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];
    const TableCard=({entite,bouclierFx,moba,onClick})=>React.createElement('button',{className:moba.className,disabled:moba.disabled,'aria-label':moba.ariaLabel,'data-shield-break':bouclierFx?.montant??0,onClick},entite.name);const props={onQuitter:()=>{},initialiser,onPlaySfx:(name)=>sounds.push(name),rendu:{TableCard}};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['dame-aux-ailes-d-or'];duel.sorcier.mana.sable=30;const dame=e.rpgMobaJouerCreature(duel,'sorcier','dame-aux-ailes-d-or','right',0).entite;c.rpgFinDeTour(duel);
    duel.sorcier.main=[];duel.joueur.main=['feriel'];duel.joueur.mana.braise=30;const feriel=e.rpgMobaJouerCreature(duel,'joueur','feriel','right',0).entite;await act(async()=>root.render(React.createElement(Board,props)));
    await click(document.querySelector(`[data-moba-entity="${feriel.id}"] button.moba__slot`));const slot=()=>document.querySelector(`[data-moba-entity="${dame.id}"] button.moba__slot`);await click(slot());await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(dame.bouclierLumiere,false);assert.equal(dame.pv,5);assert.equal(slot().getAttribute('data-shield-break'),'1');assert.ok(sounds.includes('weapon_break'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Dame : une magie jouée en réponse brise immédiatement sa lumière', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');const {mobaInfliger}=await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];
    const TableCard=({entite,bouclierFx,moba,onClick})=>React.createElement('button',{className:moba.className,disabled:moba.disabled,'aria-label':moba.ariaLabel,'data-shield-break':bouclierFx?.montant??0,onClick},entite.name);const props={onQuitter:()=>{},initialiser,onPlaySfx:(name)=>sounds.push(name),rendu:{TableCard}};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));mobaInfliger(duel.moba,'joueur','center',8);c.rpgFinDeTour(duel);duel.sorcier.main=['dame-aux-ailes-d-or'];duel.sorcier.mana.sable=30;
    const dame=e.rpgMobaJouerCreature(duel,'sorcier','dame-aux-ailes-d-or','right',0).entite;duel.sorcier.main=['eau-de-la-source'];duel.sorcier.mana.eau=30;duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=30;
    await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.mobaSortEnAttente?.carteId,'eau-de-la-source');
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Trait de braise')));const slot=document.querySelector(`[data-moba-entity="${dame.id}"] button.moba__slot`);await click(slot);
    assert.equal(dame.bouclierLumiere,false);assert.equal(dame.pv,5);assert.equal(slot.getAttribute('data-shield-break'),'1');assert.ok(sounds.includes('weapon_break'));assert.equal(duel.mobaSortEnAttente?.carteId,'eau-de-la-source');assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Dame : l’écho brise la lumière au passage du tour avec feedback', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];
    const TableCard=({entite,bouclierFx,moba,onClick})=>React.createElement('button',{className:moba.className,disabled:moba.disabled,'aria-label':moba.ariaLabel,'data-shield-break':bouclierFx?.montant??0,onClick},entite.name);const props={onQuitter:()=>{},initialiser,onPlaySfx:(name)=>sounds.push(name),rendu:{TableCard}};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['nuage-de-cendres'];duel.sorcier.mana.braise=30;assert.equal(e.rpgMobaLancerMagie(duel,'sorcier','nuage-de-cendres').ok,true);c.rpgFinDeTour(duel);
    duel.joueur.main=['dame-aux-ailes-d-or'];duel.joueur.mana.sable=30;const dame=e.rpgMobaJouerCreature(duel,'joueur','dame-aux-ailes-d-or','right',0).entite;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Fin du tour')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const slot=document.querySelector(`[data-moba-entity="${dame.id}"] button.moba__slot`);assert.equal(dame.bouclierLumiere,false);assert.equal(dame.pv,5);assert.equal(slot.getAttribute('data-shield-break'),'1');assert.ok(sounds.includes('weapon_break'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Ghul : après une vague, le plateau impose une cible adverse dans une autre voie', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);
    duel.sorcier.main=[];duel.joueur.main=['ghul-des-cendres','grand-hiver'];duel.joueur.mana.braise=30;duel.joueur.mana.neige=30;const ghul=e.rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Grand Hiver')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.ok(!duel.joueur.creatures.includes(ghul));assert.match(document.querySelector('.moba__hint').textContent,/Ghul des cendres.*choisissez/i);assert.ok(!document.querySelector('.moba__controls button'));
    const slot=document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`);assert.match(slot.getAttribute('aria-label'),/cible de la destruction du Ghul/);assert.equal(cible.pv,3);await click(slot);
    assert.equal(cible.pv,2);assert.ok(!duel.destructionsEnAttente.length);assert.ok([...document.querySelectorAll('.moba__controls button')].some(b=>b.textContent.includes('Fin du tour')));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Ghul : une mort en réponse interrompt la fenêtre jusqu’au choix puis laisse reprendre', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['ghul-des-cendres','parade-du-verre'];duel.joueur.mana.braise=30;duel.joueur.mana.eau=30;const ghul=e.rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;ghul.atk=6;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Parade de verre')));await click(document.querySelector(`[data-moba-entity="${ghul.id}"] button.moba__slot`));
    assert.equal(duel.mobaSortEnAttente?.carteId,'parade-du-verre');await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.ok(!duel.joueur.creatures.includes(ghul));assert.match(document.querySelector('.moba__hint').textContent,/Ghul des cendres.*choisissez/i);
    const avant=JSON.stringify(duel);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(JSON.stringify(duel),avant,'AI waits for the mandatory target');
    await click(document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`));assert.equal(cible.pv,3);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.mobaSortEnAttente,null);assert.ok(duel.joueur.cimetiere.includes('parade-du-verre'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Ghul : l’écho de début de tour suspend l’IA avant ses décisions', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['nuage-de-cendres','gardienne-des-portes-de-sable'];duel.sorcier.mana.braise=30;duel.sorcier.mana.sable=30;const cible=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;assert.equal(e.rpgMobaLancerMagie(duel,'sorcier','nuage-de-cendres').ok,true);c.rpgFinDeTour(duel);
    duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;const ghul=e.rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Fin du tour')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.ok(!duel.joueur.creatures.includes(ghul));assert.equal(duel.tour,'sorcier');assert.match(document.querySelector('.moba__hint').textContent,/Ghul des cendres.*choisissez/i);
    const avant=JSON.stringify(duel);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(JSON.stringify(duel),avant);await click(document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`));assert.equal(cible.pv,3);assert.ok(!duel.destructionsEnAttente.length);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Chercheuse : annonce et arrivée au plateau sans choix d’arme indisponible', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['chercheuse-des-armes-ensevelies'];duel.joueur.deck=['sabre-maudit'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Chercheuse des armes ensevelies')));await click(document.querySelector('button[aria-label="Voie droite, Vous, emplacement 1, invoquer"]'));
    assert.equal(duel.mobaCreatureEnAttente?.carteId,'chercheuse-des-armes-ensevelies');await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const chercheuse=duel.joueur.creatures.find(entity=>entity.carteId==='chercheuse-des-armes-ensevelies');assert.ok(chercheuse);assert.ok(document.querySelector(`[data-moba-entity="${chercheuse.id}"]`));assert.deepEqual(duel.joueur.deck,['sabre-maudit']);assert.ok(!duel.mobaRechercheEnAttente);assert.ok(!duel.arriveeEnAttente);assert.ok([...document.querySelectorAll('.moba__controls button')].some(b=>b.textContent.includes('Fin du tour')));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Javelot : choisir le porteur, annoncer, cibler dans sa voie et perdre l’arme au combat', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];const props={onQuitter:()=>{},initialiser,onPlaySfx:(sound)=>sounds.push(sound)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;c.rpgFinDeTour(duel);
    duel.joueur.main=['gardienne-des-portes-de-sable','javelot-du-beffroi'];duel.joueur.mana.sable=30;duel.sorcier.main=[];const porteur=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;porteur.ready=true;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes('Javelot du beffroi')));assert.match(document.querySelector('.moba__hint').textContent,/attacher votre arme/);
    await click(document.querySelector(`[data-moba-entity="${porteur.id}"] button.moba__slot`));assert.equal(duel.mobaSortEnAttente?.armeMoba,true);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(porteur.arme?.carteId,'javelot-du-beffroi');assert.match(document.querySelector(`[data-moba-entity="${porteur.id}"] button.moba__slot`).getAttribute('aria-label'),/Équipée : Javelot du beffroi.*Durabilité : 1/);
    await click(document.querySelector(`[data-moba-entity="${porteur.id}"] button.moba__slot`));await click(document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`));await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(porteur.arme,null);assert.ok(sounds.includes('weapon_break'));assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Javelot : l’IA annonce son arme et seul le contre de carte est disponible', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const SpellAnnouncement=({annonce,camp})=>React.createElement('div',{'data-test-annonce':annonce.carteId,'data-contre':String(annonce.contre),'data-camp':camp},annonce.cible.nom);const props={onQuitter:()=>{},initialiser,rendu:{SpellAnnouncement}};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','javelot-du-beffroi'];duel.sorcier.mana.sable=30;const porteur=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
    duel.joueur.main=['silence-decume','ecueil','contresort-des-abimes'];duel.joueur.mana.eau=30;await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.mobaSortEnAttente?.armeMoba,true);assert.match(document.querySelector('.moba__hint').textContent,/Javelot du beffroi/);
    assert.match(document.querySelector('.moba__pending-spell--sorcier').textContent, /ARME ADVERSE · EN ATTENTE.*Javelot du beffroi.*Gardienne.*Voie gauche/);
    const card=name=>[...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes(name));
    assert.equal(card('Silence d’écume').disabled,true);assert.equal(card('Écueil').disabled,true);assert.equal(card('Contresort des abîmes').disabled,false);assert.ok([...document.querySelectorAll('.moba__controls button')].some(b=>b.textContent.includes('attacher l’arme')));
    await click(card('Contresort des abîmes'));assert.equal(porteur.arme,null);assert.ok(duel.sorcier.cimetiere.includes('javelot-du-beffroi'));assert.equal(duel.mobaSortEnAttente,null);assert.equal(document.querySelector('.moba__pending-spell'),null);
    const contre=document.querySelector('[data-test-annonce="contresort-des-abimes"]');assert.ok(contre);assert.equal(contre.getAttribute('data-contre'),'true');assert.equal(contre.getAttribute('data-camp'),'joueur');assert.match(contre.textContent,/Javelot du beffroi/);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Cuirasse et Braise : liens intervoies, armure visible et remplacement au plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['gardienne-des-portes-de-sable','bouchra-guerriere-des-cretes','cavalier-des-deux-sabres','cuirasse-de-sel','braise-et-sable'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;duel.sorcier.main=[];
    const porteur=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.ok(e.rpgMobaJouerCreature(duel,'joueur','bouchra-guerriere-des-cretes','right',0).entite);assert.ok(e.rpgMobaJouerCreature(duel,'joueur','cavalier-des-deux-sabres','center',0).entite);await act(async()=>root.render(React.createElement(Board,props)));
    const card=name=>[...document.querySelectorAll('.moba__card')].find(x=>x.textContent.includes(name));const slot=()=>document.querySelector(`[data-moba-entity="${porteur.id}"] button.moba__slot`);
    await click(card('Cuirasse de sel'));await click(slot());await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(porteur.arme.carteId,'cuirasse-de-sel');assert.equal(porteur.pvMax,8);assert.match(slot().getAttribute('aria-label'),/Esquive.*Équipée : Cuirasse de sel.*Durabilité : 2.*Armure : 4\/4/);
    await click(card('Braise et sable'));await click(slot());await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(porteur.arme.carteId,'braise-et-sable');assert.equal(porteur.atk,3);assert.equal(porteur.pvMax,4);assert.ok(duel.joueur.cimetiere.includes('cuirasse-de-sel'));assert.match(slot().getAttribute('aria-label'),/Équipée : Braise et sable.*Durabilité : 1/);assert.ok(!slot().getAttribute('aria-label').includes('Esquive'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Harnais : le flux annonce aussi le mana temporaire sans source acquise', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { FluxManaTrack } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const camp = { manaMax: { braise: 0, eau: 0, sable: 0, neige: 1, tenebres: 0 }, mana: { braise: 0, eau: 0, sable: 1, neige: 1, tenebres: 0 }, manaSources: ['neige'] };
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(FluxManaTrack, { camp, cote: 'joueur' })));
    const label = dom.window.document.querySelector('[role=status]').getAttribute('aria-label');
    assert.match(label, /2 disponible sur 1 acquis/);assert.match(label, /Sable 1 sur 0/i);
    dom.window.close();
  } finally { await server.close(); }
});

test('Licou : la pioche déclenchée en combat est audible sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];const props={onQuitter:()=>{},initialiser,onPlaySfx:sound=>sounds.push(sound)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0);c.rpgFinDeTour(duel);
    duel.joueur.main=['chien-du-guet','licou-du-chien-de-sable'];duel.joueur.mana.sable=30;duel.sorcier.main=[];const porteur=e.rpgMobaJouerCreature(duel,'joueur','chien-du-guet','left',0).entite;assert.equal(e.rpgMobaJouerArme(duel,'joueur','licou-du-chien-de-sable',porteur.id).ok,true);porteur.ready=true;duel.joueur.deck=['gardienne-des-portes-de-sable'];sounds.length=0;await act(async()=>root.render(React.createElement(Board,props)));
    await click(document.querySelector(`[data-moba-entity="${porteur.id}"] button.moba__slot`));await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.ok(!duel.joueur.creatures.includes(porteur));assert.ok(duel.joueur.main.includes('gardienne-des-portes-de-sable'));assert.ok(sounds.includes('card_draw'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Masque : deux défausses après contact avec un porteur Butin', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];const props={onQuitter:()=>{},initialiser,onPlaySfx:s=>sounds.push(s)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['chien-du-guet','masque-du-guetteur','verglas'];duel.joueur.deck=['mousse-des-galiotes','gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;duel.sorcier.main=[];const p=e.rpgMobaJouerCreature(duel,'joueur','chien-du-guet','left',0).entite;assert.equal(e.rpgMobaJouerArme(duel,'joueur','masque-du-guetteur',p.id).ok,true);p.ready=true;await act(async()=>root.render(React.createElement(Board,props)));
    await click(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`));await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(duel.defausseEnAttente?.restant,2);assert.match(document.querySelector('.moba__hint').textContent,/Choisissez 2 cartes à défausser/);assert.ok(sounds.includes('card_draw'));
    await click(document.querySelector('.moba__card'));assert.equal(duel.defausseEnAttente?.restant,1);await click(document.querySelector('.moba__card'));assert.equal(duel.defausseEnAttente,null);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Jitte : parade Ténèbres annoncée au porteur sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main=['gardienne-des-portes-de-sable','jitte-d-amayas'];duel.joueur.mana.sable=30;duel.sorcier.main=[];const p=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(b=>b.textContent.includes('Jitte d’Amayas')));await click(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.equal(p.arme.carteId,'jitte-d-amayas');assert.match(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`).getAttribute('aria-label'),/Bouclier contre les sorts : tenebres.*Équipée : Jitte d’Amayas/);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Lance et Sandales : édition, équipement et indications accessibles', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;
    const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,{onQuitter:()=>{}})));
    const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__deck-choice button'));for(const nom of ['Lance de la lune givrée','Sandales de Tislit'])assert.ok(document.querySelector(`[aria-label="Ajouter ${nom}"]`));
    await act(async()=>root.render(React.createElement(Board,{...props,key:'partie'})));await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main=['gardienne-des-portes-de-sable','sandales-de-tislit','lance-de-la-lune-givree'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;duel.joueur.mana.tenebres=30;
    const p=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(e.rpgMobaJouerArme(duel,'joueur','sandales-de-tislit',p.id).ok,true);
    await act(async()=>root.render(React.createElement(Board,{...props,key:'partie'})));let slot=document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`);assert.match(slot.getAttribute('aria-label'),/Rapidité.*Équipée : Sandales de Tislit/);assert.equal(slot.disabled,false);
    assert.equal(e.rpgMobaJouerArme(duel,'joueur','lance-de-la-lune-givree',p.id).ok,true);await act(async()=>root.render(React.createElement(Board,{...props,key:'partie'})));
    slot=document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`);assert.match(slot.getAttribute('aria-label'),/Attaque ciblée.*Coup critique : 15 % ×2.*Équipée : Lance de la lune givrée/);assert.equal(slot.disabled,true);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Grappin : après réponse, le plateau demande la prise et éclaire les cibles légales', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const d=await server.ssrLoadModule('/src/games/rpgDuel.js');let duel;
    const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('mousse-des-galiotes'),sorcierDeck:Array(30).fill('mousse-des-galiotes'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));d.rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
    const victime=e.rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;const cher=e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;d.rpgFinDeTour(duel);
    duel.joueur.main=['mousse-des-galiotes','grappin-d-abordage'];duel.joueur.mana.sable=30;duel.sorcier.main=[];const p=e.rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','left',0).entite;
    await act(async()=>root.render(React.createElement(Board,props)));await click([...document.querySelectorAll('.moba__card')].find(b=>b.textContent.includes('Grappin d’abordage')));await click(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.match(document.querySelector('.moba__hint').textContent,/prendre en cale.*coût maximal 1/i);
    const cible=document.querySelector(`[data-moba-entity="${victime.id}"] button.moba__slot`);assert.equal(cible.disabled,false);assert.match(cible.getAttribute('aria-label'),/cible de prise en cale/);
    assert.equal(document.querySelector(`[data-moba-entity="${cher.id}"] button.moba__slot`).disabled,true);await click(cible);assert.equal(p.enCale.entite,victime);assert.equal(duel.arriveeEnAttente,null);assert.match(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`).getAttribute('aria-label'),/En cale/);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Tours : atelier, bouclier sur soi et règles de Mur annoncées', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;dom.window.HTMLElement.prototype.attachEvent=()=>{};dom.window.HTMLElement.prototype.detachEvent=()=>{};globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;
    const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,{onQuitter:()=>{}})));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__deck-choice button'));for(const nom of ['Tour de Braise','Tour des Flots','Tour de Sable','Tour de Neige','Tour des Ténèbres'])assert.ok(document.querySelector(`[aria-label="Ajouter ${nom}"]`));
    await act(async()=>root.render(React.createElement(Board,{...props,key:'partie'})));await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main=['tour-de-sable'];duel.joueur.mana.sable=30;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,{...props,key:'partie'})));
    await click([...document.querySelectorAll('.moba__card')].find(b=>b.textContent.includes('Tour de Sable')));await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button.moba__slot'));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));assert.match(document.querySelector('.moba__hint').textContent,/y compris la Tour/);
    const tour=duel.joueur.creatures.find(x=>x.carteId==='tour-de-sable');let slot=document.querySelector(`[data-moba-entity="${tour.id}"] button.moba__slot`);assert.match(slot.getAttribute('aria-label'),/Mur : ne peut pas attaquer ni être équipé.*Doit bloquer si possible/);await click(slot);assert.ok(tour.bouclier);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Bâton : équipement annoncé puis serpents placés sur les voies disponibles', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;
    const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['gardienne-des-portes-de-sable','baton-des-citernes'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;duel.sorcier.main=[];
    const p=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(b=>b.textContent.includes('Bâton des citernes')));await click(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const serpents=duel.joueur.creatures.filter(x=>x.carteId==='serpent-des-citernes');assert.equal(serpents.length,4);for(const serpent of serpents)assert.ok(document.querySelector(`[data-moba-entity="${serpent.id}"]`));assert.match(document.querySelector(`[data-moba-entity="${p.id}"] button.moba__slot`).getAttribute('aria-label'),/Équipée : Bâton des citernes/);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Lame des ergs : choix visible entre un porteur et une case pour créer le Chien', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;
    const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));duel.joueur.main=['gardienne-des-portes-de-sable','lame-des-ergs'];duel.joueur.mana.sable=30;duel.sorcier.main=[];
    const allié=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(b=>b.textContent.includes('Lame des ergs')));assert.match(document.querySelector('.moba__hint').textContent,/créature alliée ou une case libre/);
    const existing=document.querySelector(`[data-moba-entity="${allié.id}"] button.moba__slot`);assert.equal(existing.disabled,false);assert.match(existing.getAttribute('aria-label'),/porteur de l’arme/);
    const slot=document.querySelector('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="1"] button');assert.equal(slot.disabled,false);assert.match(slot.getAttribute('aria-label'),/créer le Chien porteur ici/);await click(slot);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const chien=duel.joueur.creatures.find(x=>x.carteId==='chien-de-sable');assert.ok(chien);assert.equal(chien.mobaLane,'right');assert.equal(chien.arme.carteId,'lame-des-ergs');assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Trésor de Lima : choix de la case, compteur et statut de Site', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');let duel;
    const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main=['le-tresor-de-lima'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;duel.sorcier.main=[];await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__card')].find(b=>b.textContent.includes('Trésor de Lima')));assert.match(document.querySelector('.moba__hint').textContent,/case libre pour installer le Site/);
    const slot=document.querySelector('[data-moba-lane="center"][data-moba-side="joueur"][data-moba-slot="0"] button');assert.match(slot.getAttribute('aria-label'),/installer le Site ici/);await click(slot);await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    const site=duel.joueur.creatures.find(x=>x.carteId==='le-tresor-de-lima');assert.ok(site);const display=document.querySelector(`[data-moba-entity="${site.id}"] button.moba__slot`);assert.match(display.getAttribute('aria-label'),/Site indestructible.*2 Heures/);assert.equal(display.disabled,true);assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Trésor de Lima : la découverte au début du tour joue le son de pioche', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];const props={onQuitter:()=>{},initialiser,onPlaySfx:s=>sounds.push(s)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};await click(document.querySelector('.moba__mulligan .moba__primary'));
    c.rpgFinDeTour(duel);duel.sorcier.main=['le-tresor-de-lima'];duel.sorcier.mana.eau=30;duel.sorcier.mana.sable=30;const site=e.rpgMobaJouerCreature(duel,'sorcier','le-tresor-de-lima','left',0).entite;assert.ok(site);c.rpgFinDeTour(duel);site.heures.restants=1;duel.sorcier.main=[];sounds.length=0;await act(async()=>root.render(React.createElement(Board,props)));
    await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Fin du tour')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.ok(!duel.sorcier.creatures.includes(site));assert.ok(sounds.includes('card_draw'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Source de Bimini : sélection obligatoire de la créature alliée et illustration du Site', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');let duel;const sounds=[];const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser,onPlaySfx:s=>sounds.push(s)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const cible=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const site=e.rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;cible.pv=1;cible.def=1;site.heures.restants=1;c.rpgFinDeTour(duel);c.rpgFinDeTour(duel);assert.equal(duel.siteEnAttente.entiteId,site.id);sounds.length=0;await act(async()=>root.render(React.createElement(Board,props)));
    assert.match(document.querySelector('.moba__hint').textContent,/Source de Bimini.*créature alliée/);const cibleButton=document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`);const siteButton=document.querySelector(`[data-moba-entity="${site.id}"] button.moba__slot`);assert.equal(siteButton.disabled,true);assert.match(siteButton.querySelector('img').src,/source-de-bimini-0/);assert.match(cibleButton.getAttribute('aria-label'),/cible de la Source/);assert.equal(document.querySelector('.moba__controls .moba__primary'),null);assert.ok([...document.querySelectorAll('.moba__card')].every(b=>b.disabled));
    await click(cibleButton);assert.equal(duel.siteEnAttente,null);assert.equal(cible.atk,4);assert.equal(cible.pv,7);assert.ok(sounds.includes('soin_vie'));assert.ok(!document.querySelector(`[data-moba-entity="${site.id}"]`));assert.ok(document.querySelector('.moba__controls .moba__primary'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Source de Bimini : fin du tour adverse, choix du joueur, puis reprise normale', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const props={onQuitter:()=>{},initialiser};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const cible=e.rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const source=e.rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;source.heures.restants=1;c.rpgFinDeTour(duel);duel.sorcier.main=[];duel.sorcier.deck=[];await act(async()=>root.render(React.createElement(Board,props)));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.equal(duel.finDeTour?.cote,'sorcier');await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Passer et commencer mon tour')));assert.equal(duel.tour,'joueur');assert.equal(duel.phase,'debut');assert.equal(duel.siteEnAttente?.entiteId,source.id);assert.match(document.querySelector('.moba__hint').textContent,/Source de Bimini/);
    await click(document.querySelector(`[data-moba-entity="${cible.id}"] button.moba__slot`));assert.equal(duel.phase,'principale');assert.equal(duel.siteEnAttente,null);assert.equal(cible.atk,4);assert.ok([...document.querySelectorAll('.moba__controls button')].some(b=>b.textContent.includes('Fin du tour')));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Nouvelles cartes : icônes de Vol de vie et poison actif sur le plateau MOBA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const e = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const c = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const initialiser = () => duel = voiesLateralesBlessees(e.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, rendu: RPG_RENDU_MOBA };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    if (duel.joueur.manaChoixEnAttente) c.rpgChoisirCouleurMana(duel, 'joueur', 'braise');
    duel.joueur.main = ['chasseuse-de-braise']; duel.joueur.mana.braise = 30;
    const chasseuse = e.rpgMobaJouerCreature(duel, 'joueur', 'chasseuse-de-braise', 'left', 0).entite;
    chasseuse.poison = { degats: 1, toursRestants: 2, sourceCarteId: 'scorpion-du-seuil' };
    await act(async () => root.render(React.createElement(Board, props)));
    const carte = document.querySelector(`[data-moba-entity="${chasseuse.id}"]`);
    assert.ok(carte); assert.match(carte.innerHTML, /Vol de vie/i); assert.match(carte.innerHTML, /Empoisonnée/);
    assert.match(carte.innerHTML, /tours restants/);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Souverain : choix du duel sur une autre voie et retour visuel du Vol de vie', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true; let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const e = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const c = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(e.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: name => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    c.rpgFinDeTour(duel); duel.sorcier.mana.neige = 30; duel.sorcier.main = ['jarl-au-marteau-de-guerre'];
    const target = e.rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
    c.rpgFinDeTour(duel); mobaInfliger(duel.moba, 'sorcier', 'left', 4);
    duel.joueur.main = ['souverain-de-la-lune-noire']; Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30 }); duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(x => x.textContent.includes('Souverain de la lune noire')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /simultan/);
    await click(document.querySelector(`[data-moba-entity="${target.id}"] button.moba__slot`));
    assert.ok(!duel.sorcier.creatures.includes(target)); assert.equal(duel.joueur.creatures.find(x => x.carteId === 'souverain-de-la-lune-noire').pv, 2);
    assert.equal(duel.moba.lanes.find(l => l.id === 'left').hp.joueur, 9);
    assert.ok(sounds.includes('soin_vie')); assert.ok(document.querySelector('[data-moba-lane-hp="@moba:left:joueur"] strong.is-healed'));
    assert.equal(e.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Lecteur du dernier nom : la pioche ouvre le choix de défausse sur la table', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true; let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const e = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const c = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(e.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: name => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    if (duel.joueur.manaChoixEnAttente) c.rpgChoisirCouleurMana(duel, 'joueur', 'sable');
    duel.joueur.main = ['lecteur-du-dernier-nom']; duel.joueur.deck = ['chien-du-guet', 'porteur-de-la-plume']; duel.joueur.mana.tenebres = 30; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(x => x.textContent.includes('Lecteur du dernier nom')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.joueur.deck.length, 0); assert.equal(duel.defausseEnAttente?.cote, 'joueur');
    assert.match(document.querySelector('.moba__hint').textContent, /défausser/); assert.ok(sounds.includes('card_draw'));
    await click([...document.querySelectorAll('.moba__card')].find(x => x.textContent.includes('Porteur de la plume')));
    assert.equal(duel.defausseEnAttente, null); assert.ok(duel.joueur.cimetiere.includes('porteur-de-la-plume'));
    assert.equal(e.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Djinn vengeur : la mort alliée affiche les dégâts sur la voie du Djinn', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true; let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const e = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const c = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(e.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: name => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    if (duel.joueur.manaChoixEnAttente) c.rpgChoisirCouleurMana(duel, 'joueur', 'sable');
    Object.assign(duel.joueur.mana, { braise: 30, sable: 30, tenebres: 30 });
    duel.joueur.main = ['djinn-des-cendres-vengeresses', 'chien-du-guet'];
    e.rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-cendres-vengeresses', 'right', 0);
    const chien = e.rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).entite;
    duel.joueur.main = ['effacement-des-faibles']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(x => x.textContent.includes('Effacement des faibles')));
    await click(document.querySelector(`[data-moba-entity="${chien.id}"] button.moba__slot`));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.equal(duel.moba.lanes.find(l => l.id === 'right').hp.sorcier, 9);
    assert.ok(document.querySelector('[data-moba-lane-hp="@moba:right:sorcier"] strong.is-damaged'));
    assert.ok(sounds.includes('degats_sorcier')); assert.equal(e.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Takouba de Tin Hinan : la pioche en combat est audible sur le plateau', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');const e=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const c=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;const initialiser=()=>duel=voiesLateralesBlessees(e.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('gardienne-des-portes-de-sable'),sorcierDeck:Array(30).fill('gardienne-des-portes-de-sable'),joueurCouleurs:['sable'],sorcierCouleurs:['sable'],rng:()=>.5}));const sounds=[];const props={onQuitter:()=>{},initialiser,onPlaySfx:sound=>sounds.push(sound)};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    await click(document.querySelector('.moba__mulligan .moba__primary'));c.rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;e.rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0);c.rpgFinDeTour(duel);
    duel.joueur.main=['chien-du-guet','takouba-de-tin-hinan'];duel.joueur.mana.sable=30;duel.sorcier.main=[];const porteur=e.rpgMobaJouerCreature(duel,'joueur','chien-du-guet','left',0).entite;assert.equal(e.rpgMobaJouerArme(duel,'joueur','takouba-de-tin-hinan',porteur.id).ok,true);porteur.ready=true;duel.joueur.deck=['gardienne-des-portes-de-sable'];sounds.length=0;await act(async()=>root.render(React.createElement(Board,props)));
    await click(document.querySelector(`[data-moba-entity="${porteur.id}"] button.moba__slot`));await click([...document.querySelectorAll('.moba__controls button')].find(b=>b.textContent.includes('Déclarer')));await act(async()=>new Promise(resolve=>setTimeout(resolve,520)));
    assert.ok(duel.joueur.main.includes('gardienne-des-portes-de-sable'));assert.ok(sounds.includes('card_draw'));assert.equal(e.rpgMobaPlacementCoherent(duel),true);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('Guetteuse : choix allié protégé et pioche audible au retour en fin de tour', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true; let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const e = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(e.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: name => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async button => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    Object.assign(duel.joueur.mana, { eau: 30, tenebres: 30 }); duel.joueur.main = ['maitre-des-hieroglyphes', 'guetteuse-des-marees'];
    const allie = e.rpgMobaJouerCreature(duel, 'joueur', 'maitre-des-hieroglyphes', 'right', 0).entite;
    allie.protection = { contre: ['eau'] }; duel.joueur.deck = ['verglas', 'verglas']; duel.sorcier.main = []; sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click([...document.querySelectorAll('.moba__card')].find(x => x.textContent.includes('Guetteuse des marées')));
    await click(document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.match(document.querySelector('.moba__hint').textContent, /autre créature alliée à exiler/);
    await click(document.querySelector(`[data-moba-entity="${allie.id}"] button.moba__slot`));
    assert.ok(!duel.joueur.creatures.includes(allie));
    await click([...document.querySelectorAll('.moba__controls button')].find(b => b.textContent.includes('Fin du tour')));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.ok(duel.joueur.creatures.some(x => x.carteId === 'maitre-des-hieroglyphes'));
    assert.ok(sounds.includes('card_draw')); assert.equal(e.rpgMobaPlacementCoherent(duel), true);
  } finally { if (root) await act(async () => root.unmount()); await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

test('Sphère : le plateau annonce et sonorise le renvoi de l’attaquant ciblé', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true; let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const e = await server.ssrLoadModule('/src/games/rpgMobaLocal.js'); const c = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel; const sounds = [];
    const initialiser = () => duel = voiesLateralesBlessees(e.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('feriel'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['braise'], sorcierCouleurs: ['sable'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser, onPlaySfx: (name) => sounds.push(name) };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary')); c.rpgFinDeTour(duel);
    duel.sorcier.main = ['gardienne-des-portes-de-sable', 'sphere-de-rotation']; Object.assign(duel.sorcier.mana, { sable: 30, eau: 30 });
    const target = e.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.equal(e.rpgMobaJouerArme(duel, 'sorcier', 'sphere-de-rotation', target.id).ok, true);
    c.rpgFinDeTour(duel); duel.joueur.main = ['feriel']; duel.joueur.mana.braise = 30; duel.sorcier.main = [];
    const attacker = e.rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
    let jets = 0; c.rpgReglerHasard(duel, () => jets++ === 0 ? .5 : .14); sounds.length = 0;
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector(`[data-moba-entity="${attacker.id}"] button.moba__slot`));
    await click(document.querySelector(`[data-moba-entity="${target.id}"] button.moba__slot`));
    await click([...document.querySelectorAll('.moba__controls button')].find(button => button.textContent.includes('Déclarer')));
    await act(async () => new Promise(resolve => setTimeout(resolve, 520)));
    assert.ok(duel.joueur.main.includes('feriel')); assert.ok(sounds.includes('creature_return'));
    assert.match(document.querySelector('.moba__combat-result').textContent, /attaquant renvoyé par la Sphère/);
    assert.equal(e.rpgMobaPlacementCoherent(duel), true);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
