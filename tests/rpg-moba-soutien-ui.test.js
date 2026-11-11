import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

async function plateau(fn, { reduit = false, vitesse = null, rendu = null, onPlaySfx = null } = {}) {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (reduit) dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  if (vitesse !== null) dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', String(vitesse));
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const core = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const moba = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const props = { rendu, onPlaySfx, onQuitter: () => {}, initialiser: () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    await fn({ duel, engine, core, moba, render, click });
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
}
const attendreIA = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });
const carte = (name) => [...document.querySelectorAll('.moba__card')].find((el) => el.textContent.includes(name));

test('invocation : le cercle apparaît seulement après la fenêtre de réponse', () => plateau(async ({ duel, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
  await render(); await click(carte('Ashigaru'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  assert.ok(duel.mobaCreatureEnAttente);
  assert.equal(document.querySelector('.moba__summon-fx'), null);
  await attendreIA();
  const creature = duel.joueur.creatures[0]; assert.ok(creature);
  assert.ok(document.querySelector(`[data-moba-entity="${creature.id}"] .moba__summon-fx`));
  assert.equal(document.querySelector(`[data-moba-entity="${creature.id}"] .moba__summon-fx--retour-exil`), null);
}));

test('soin de voie : le montant apparaît uniquement au passage et reflète le plafond', () => plateau(async ({ duel, moba, render, click }) => {
  moba.mobaInfliger(duel.moba, 'sorcier', 'right', 2);
  duel.joueur.main = ['eau-de-la-source']; duel.sorcier.main = [];
  await render(); await click(carte('Eau de la source'));
  await click(document.querySelector('[aria-label="Soigner Voie droite de Vous"]'));
  assert.ok(duel.mobaSortEnAttente);
  assert.equal(document.querySelector('.moba__lane-heal'), null);
  await attendreIA();
  const heal = document.querySelector('[data-moba-lane-hp="@moba:right:joueur"] .moba__lane-heal');
  assert.ok(heal); assert.equal(heal.textContent, '+2');
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').hp.joueur, 20);
  assert.match(document.body.textContent, /Voie droite, Vous : 2 PV regagnés/);
}));

test('la Source soigne une créature et lui donne un bouclier, sans modifier les autres cartes', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const source = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
  assert.ok(cible); assert.ok(source); cible.pv = 1; cible.def = 1; source.heures.restants = 1;
  core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
  assert.ok(duel.siteEnAttente, JSON.stringify({ tour: duel.tour, phase: duel.phase, log: duel.log.slice(-8), source: source.heures, cible: cible.carteId }));
  await render(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  const slot = document.querySelector(`[data-moba-entity="${cible.id}"]`);
  assert.ok(slot.querySelector('.moba__shield-fx'));
  assert.equal(slot.querySelector('.moba__creature-heal')?.textContent, `+${cible.pv - 1}`);
  assert.equal(cible.bouclier, 1);
  assert.equal(document.querySelectorAll('.moba__shield-fx').length, 1);
  assert.equal(sons.filter((son) => son === 'soin_vie').length, 1);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('mouvement réduit : aucune animation d’invocation n’est créée', () => plateau(async ({ duel, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
  await render(); await click(carte('Ashigaru'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  await attendreIA();
  assert.ok(duel.joueur.creatures.length);
  assert.equal(document.querySelector('.moba__summon-fx'), null);
}, { reduit: true }));


test('l’éclat d’invocation attend la fin du rituel de sacrifice', async () => {
  let terminerRituel;
  const CercleMagique = ({ effet, onTermine }) => {
    terminerRituel = () => onTermine(effet.effectId);
    return React.createElement('span', { 'data-rituel': '' });
  };
  await plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises'];
    const victime = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(victime);
    core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
    duel.joueur.main = ['anqa-des-braises']; duel.sorcier.main = [];
    await render(); await click(carte('Anqa'));
    await click(document.querySelector(`[data-moba-entity="${victime.id}"] button`));
    await click(document.querySelector(`[data-moba-entity="${victime.id}"] button`));
    assert.ok(duel.mobaCreatureEnAttente);
    await attendreIA();
    const arrivee = duel.joueur.creatures.find((entity) => entity.carteId === 'anqa-des-braises');
    assert.ok(arrivee); assert.ok(document.querySelector('[data-rituel]'));
    assert.equal(document.querySelector(`[data-moba-entity="${arrivee.id}"] .moba__summon-fx`), null);
    assert.ok(terminerRituel);
    await act(async () => terminerRituel());
    assert.ok(document.querySelector(`[data-moba-entity="${arrivee.id}"] .moba__summon-fx`));
  }, { rendu: { CercleMagique } });
});

test('un soin sur une voie déjà pleine ne crée ni chiffre ni son trompeur', () => {
  const sons = [];
  return plateau(async ({ duel, render, click }) => {
  duel.joueur.main = ['eau-de-la-source']; duel.sorcier.main = [];
  await render(); await click(carte('Eau de la source'));
  await click(document.querySelector('[aria-label="Soigner Voie droite de Vous"]'));
  await attendreIA();
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').hp.joueur, 20);
  assert.equal(document.querySelector('.moba__lane-heal'), null);
  assert.equal(sons.filter((son) => son === 'soin_vie').length, 0);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('le plateau illustré réutilise son effet de soin existant sans superposer deux chiffres', async () => {
  const TableCard = ({ entite, soin, onClick, moba }) => React.createElement('button', {
    className: moba.className, disabled: moba.disabled, onClick, 'data-soin': soin?.montant ?? 0,
  }, entite.name);
  await plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    const source = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
    cible.pv = 1; cible.def = 1; source.heures.restants = 1;
    core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
    await render(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    const slot = document.querySelector(`[data-moba-entity="${cible.id}"]`);
    assert.equal(Number(slot.querySelector('button').dataset.soin), cible.pv - 1);
    assert.equal(slot.querySelector('.moba__creature-heal'), null);
    assert.ok(slot.querySelector('.moba__shield-fx'));
  }, { rendu: { TableCard } });
});

for (const [laneId, label] of [['left', 'gauche'], ['center', 'centrale']]) {
  test(`la conquête de la voie ${label} ne s’anime qu’après la résolution`, () => plateau(async ({ duel, engine, moba, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
    const attaquant = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', laneId, 0).entite;
    assert.ok(attaquant); attaquant.ready = true; attaquant.atk = 3;
    const lane = duel.moba.lanes.find((item) => item.id === laneId);
    moba.mobaInfliger(duel.moba, 'joueur', laneId, lane.hp.sorcier - 2);
    await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    assert.ok(duel.combatDeclare);
    assert.equal(document.querySelector('.moba__conquest-fx'), null);
    await attendreIA();
    const fx = document.querySelector(`.moba__lane[aria-label="Voie ${label}"] .moba__conquest-fx`);
    assert.ok(fx); assert.equal(fx.getAttribute('aria-hidden'), 'true');
    assert.ok(fx.classList.contains('moba__conquest-fx--joueur'));
    assert.equal(lane.conqueredBy, 'joueur');
    if (laneId === 'left') {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1600)); });
      assert.equal(document.querySelector('.moba__conquest-fx'), null, 'l’effet disparaît sans effacer la conquête');
      assert.equal(lane.conqueredBy, 'joueur');
    }
    if (laneId === 'center') {
      assert.ok(duel.joueur.creatures.includes(attaquant));
      assert.equal(lane.slots.joueur[0], attaquant.id);
      assert.equal(duel.moba.centerJoined.laneId, null);
    }
  }));
}

test('la conquête victorieuse conserve une fenêtre de fin immédiatement accessible', () => plateau(async ({ duel, engine, moba, render, click }) => {
  assert.ok(moba.mobaInfliger(duel.moba, 'joueur', 'left', 20).conquered);
  duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
  const attaquant = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  assert.ok(attaquant); attaquant.ready = true; attaquant.atk = 3;
  moba.mobaInfliger(duel.moba, 'joueur', 'center', 13);
  await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
  await attendreIA();
  assert.equal(duel.moba.winner, 'joueur');
  const dialogue = document.querySelector('[role="dialog"][aria-label="Victoire"]');
  assert.ok(dialogue); assert.ok(dialogue.querySelector('.moba__end-conquest-fx'));
  assert.equal(dialogue.querySelector('.moba__primary').disabled, false);
}));

test('en mouvement réduit, la conquête reste annoncée sans effet animé', () => plateau(async ({ duel, engine, moba, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
  const attaquant = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  attaquant.ready = true; attaquant.atk = 3;
  moba.mobaInfliger(duel.moba, 'joueur', 'left', 18);
  await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
  await attendreIA();
  assert.equal(duel.moba.lanes[0].conqueredBy, 'joueur');
  assert.equal(document.querySelector('.moba__conquest-fx'), null);
  assert.match(document.querySelector('.moba__sr-only[role="status"]:not(.moba__combat-result)').textContent, /Voie gauche conquise par Vous/);
}, { reduit: true }));

test('une magie ne montre une conquête qu’après sa résolution', () => plateau(async ({ duel, moba, render, click }) => {
  duel.joueur.main = ['eclair-du-marteau']; duel.sorcier.main = [];
  moba.mobaInfliger(duel.moba, 'joueur', 'right', 19);
  await render(); await click(carte('Éclair du marteau'));
  await click(document.querySelector('[aria-label="Cibler Voie droite de IA"]'));
  assert.ok(duel.mobaSortEnAttente);
  assert.equal(document.querySelector('.moba__conquest-fx'), null);
  await attendreIA();
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').conqueredBy, 'joueur');
  assert.ok(document.querySelector('.moba__lane[aria-label="Voie droite"] .moba__conquest-fx'));
}));

test('une conquête adverse emploie la même animation sans changer sa propriété', () => plateau(async ({ duel, engine, core, moba, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises'];
  const attaquant = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(attaquant); attaquant.ready = true; attaquant.atk = 3;
  duel.sorcier.main = []; duel.joueur.main = [];
  moba.mobaInfliger(duel.moba, 'sorcier', 'left', 18);
  assert.ok(moba.mobaInfliger(duel.moba, 'sorcier', 'center', 15).conquered);
  await render(); await attendreIA();
  assert.equal(duel.combatDeclare?.cote, 'sorcier', JSON.stringify({ tour: duel.tour, phase: duel.phase, main: duel.sorcier.main, log: duel.log.slice(-6), ready: attaquant.ready, erreur: document.querySelector('.moba__error')?.textContent }));
  assert.equal(document.querySelector('.moba__conquest-fx'), null);
  await click([...document.querySelectorAll('.moba__controls button')].find((button) => /Passer et résoudre l’attaque/.test(button.textContent)));
  assert.equal(duel.moba.lanes[0].conqueredBy, 'sorcier');
  assert.ok(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__conquest-fx--sorcier'));
}));


test('une armure qui augmente les PV ne déclenche ni soin visuel ni son de soin', async () => {
  const sons = [];
  const TableCard = ({ entite, soin, onClick, moba }) => React.createElement('button', {
    className: moba.className, disabled: moba.disabled, onClick, 'data-soin': soin?.montant ?? 0,
  }, entite.name);
  await plateau(async ({ duel, engine, render, click }) => {
    duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(cible); const pvAvant = cible.pv;
    duel.joueur.main = ['cuirasse-de-sel']; duel.sorcier.main = [];
    await render(); await click(carte('Cuirasse de sel'));
    await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    assert.ok(duel.mobaSortEnAttente);
    await attendreIA();
    assert.ok(cible.pv > pvAvant, 'le bonus de défense augmente les PV');
    assert.equal(Number(document.querySelector(`[data-moba-entity="${cible.id}"] button`).dataset.soin), 0);
    assert.equal(sons.filter((son) => son === 'soin_vie').length, 0);
  }, { rendu: { TableCard }, onPlaySfx: (son) => sons.push(son) });
});

test('un soin de voie et de créature simultané ne joue le son de soin qu’une fois', async () => {
  const sons = [];
  await plateau(async ({ duel, engine, moba, render, click }) => {
    duel.joueur.mana.sable = 30; duel.joueur.mana.neige = 30;
    duel.joueur.main = ['gardienne-des-portes-de-sable'];
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(cible); cible.pv -= 2; cible.def -= 2;
    moba.mobaInfliger(duel.moba, 'sorcier', 'left', 3);
    duel.joueur.main = ['festin-des-vaillants']; duel.sorcier.main = [];
    await render(); sons.length = 0;
    await click(carte('Festin des vaillants'));
    await click(document.querySelector('[aria-label="Soigner Voie gauche de Vous"]'));
    assert.equal(sons.filter((son) => son === 'soin_vie').length, 0);
    await attendreIA();
    assert.ok(cible.pv > 2); assert.ok(document.querySelector('.moba__lane-heal'));
    assert.ok(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__creature-heal`));
    assert.equal(sons.filter((son) => son === 'soin_vie').length, 1);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('deux gains de bouclier rapprochés restent visibles chacun pendant leur propre durée', () => plateau(async ({ duel, engine, core, render, click }) => {
  duel.joueur.mana.sable = 30; duel.joueur.mana.braise = 30;
  duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const premiere = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const source1 = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
  assert.ok(premiere); assert.ok(source1); source1.heures.restants = 10;
  core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const seconde = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  const source2 = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'right', 1).entite;
  assert.ok(seconde); assert.ok(source2);
  const attente = (source) => ({ cote: 'joueur', entiteId: source.id, carteId: source.carteId, recompense: 'bimini' });
  duel.siteEnAttente = attente(source1);
  await render(); await click(document.querySelector(`[data-moba-entity="${premiere.id}"] button`));
  assert.ok(document.querySelector(`[data-moba-entity="${premiere.id}"] .moba__shield-fx`));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 600)); });
  duel.siteEnAttente = attente(source2);
  await render(); await click(document.querySelector(`[data-moba-entity="${seconde.id}"] button`));
  assert.ok(document.querySelector(`[data-moba-entity="${premiere.id}"] .moba__shield-fx`), 'le second effet ne doit pas effacer le premier');
  assert.ok(document.querySelector(`[data-moba-entity="${seconde.id}"] .moba__shield-fx`));
  assert.ok(document.querySelector(`[data-moba-entity="${premiere.id}"] .moba__creature-heal`));
  assert.ok(document.querySelector(`[data-moba-entity="${seconde.id}"] .moba__creature-heal`));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 750)); });
  assert.equal(document.querySelector(`[data-moba-entity="${premiere.id}"] .moba__shield-fx`), null);
  assert.ok(document.querySelector(`[data-moba-entity="${seconde.id}"] .moba__shield-fx`), 'le deuxième effet continue après la fin du premier');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
  assert.equal(document.querySelector(`[data-moba-entity="${premiere.id}"] .moba__creature-heal`), null);
  assert.ok(document.querySelector(`[data-moba-entity="${seconde.id}"] .moba__creature-heal`));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });
  assert.equal(document.querySelector(`[data-moba-entity="${seconde.id}"] .moba__shield-fx`), null);
  assert.equal(document.querySelector(`[data-moba-entity="${seconde.id}"] .moba__creature-heal`), null);
}));


test('un bouclier regagné sur la même créature ne disparaît pas au premier délai', () => plateau(async ({ duel, engine, render, click }) => {
  duel.joueur.mana.sable = 30; duel.joueur.mana.braise = 30;
  duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const source1 = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
  assert.ok(cible); assert.ok(source1);
  const attente = (source) => ({ cote: 'joueur', entiteId: source.id, carteId: source.carteId, recompense: 'bimini' });
  duel.siteEnAttente = attente(source1);
  await render(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  const premier = document.querySelector(`[data-moba-entity="${cible.id}"] .moba__shield-fx`);
  assert.ok(premier);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 600)); });
  // La parade a été consommée avant qu'une autre Source la donne à nouveau.
  cible.bouclier = 0;
  duel.joueur.main = ['source-de-bimini'];
  const source2 = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
  assert.ok(source2);
  duel.siteEnAttente = attente(source2);
  await render(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  const second = document.querySelector(`[data-moba-entity="${cible.id}"] .moba__shield-fx`);
  assert.ok(second); assert.notEqual(second, premier, 'la nouvelle acquisition rejoue son effet');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 750)); });
  assert.equal(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__shield-fx`), second);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });
  assert.equal(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__shield-fx`), null);
}));


test('les délais de soin et de bouclier suivent la vitesse choisie', () => plateau(async ({ duel, engine, render, click }) => {
  duel.joueur.mana.sable = 30; duel.joueur.mana.braise = 30;
  duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const source = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
  assert.ok(cible); assert.ok(source);
  duel.siteEnAttente = { cote: 'joueur', entiteId: source.id, carteId: source.carteId, recompense: 'bimini' };
  await render(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.ok(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__shield-fx`));
  assert.ok(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__creature-heal`));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
  assert.equal(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__shield-fx`), null);
  assert.equal(document.querySelector(`[data-moba-entity="${cible.id}"] .moba__creature-heal`), null);
}, { vitesse: 0.5 }));

test('rejouer efface les effets et leurs minuteurs de la partie terminée', () => plateau(async ({ duel, engine, moba, render, click }) => {
  duel.joueur.mana.sable = 30; duel.joueur.mana.braise = 30;
  duel.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const source = engine.rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'left', 1).entite;
  assert.ok(cible); assert.ok(source);
  duel.siteEnAttente = { cote: 'joueur', entiteId: source.id, carteId: source.carteId, recompense: 'bimini' };
  await render(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.ok(document.querySelector('.moba__shield-fx'));
  assert.ok(moba.mobaInfliger(duel.moba, 'joueur', 'right', 20).conquered);
  assert.ok(moba.mobaInfliger(duel.moba, 'joueur', 'center', 15).conquered);
  await render();
  await click([...document.querySelectorAll('.moba__end-actions button')].find((button) => button.textContent.includes('Rejouer')));
  await click(document.querySelector('.moba__mulligan .moba__primary'));
  assert.equal(document.querySelector('.moba__shield-fx'), null);
  assert.equal(document.querySelector('.moba__creature-heal'), null);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1500)); });
  assert.equal(document.querySelector('.moba__shield-fx'), null);
  assert.equal(document.querySelector('.moba__creature-heal'), null);
}));

test('un renvoi réel fait apparaître le tourbillon bleu sur l’ancienne case après la réponse', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    core.rpgFinDeTour(duel);
    duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(cible); core.rpgFinDeTour(duel);
    duel.joueur.main = ['ressac']; duel.joueur.mana.eau = 30; duel.sorcier.main = [];
    await render(); sons.length = 0;
    await click(carte('Ressac'));
    await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    assert.ok(duel.mobaSortEnAttente);
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    await attendreIA();
    assert.ok(duel.sorcier.main.includes(cible.carteId));
    const effet = document.querySelector(`[data-rpg-bounce-id="${cible.id}"]`);
    assert.ok(effet); assert.equal(effet.dataset.rpgBounceFx, 'eau');
    assert.equal(effet.getAttribute('aria-hidden'), 'true');
    assert.ok(effet.closest('.moba__lane[aria-label="Voie droite"] .moba__side--sorcier'));
    assert.ok(effet.querySelector('.rpg-tourbillon-eau__carte img'));
    assert.equal(sons.filter((son) => son === 'creature_return').length, 1);
    assert.equal(sons.includes('destruction_hit'), false);
    assert.match(document.body.textContent, /renvoyée en main/);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1250)); });
    assert.equal(document.querySelector(`[data-rpg-bounce-id="${cible.id}"]`), null);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('la Guetteuse exilant une alliée déclenche le tourbillon blanc, pas une destruction', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
    assert.ok(cible); core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
    duel.joueur.main = ['guetteuse-des-marees']; duel.joueur.mana.eau = 30; duel.joueur.mana.sable = 30; duel.sorcier.main = [];
    await render(); sons.length = 0;
    await click(carte('Guetteuse des marées'));
    await click(document.querySelector('.moba__lane[aria-label="Voie droite"] .moba__side--joueur .moba__slot.is-empty'));
    await attendreIA();
    assert.ok(duel.arriveeEnAttente);
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    assert.ok(duel.joueur.exil.includes(cible.carteId));
    const effet = document.querySelector(`[data-rpg-bounce-id="${cible.id}"]`);
    assert.ok(effet); assert.equal(effet.dataset.rpgBounceFx, 'exil');
    assert.ok(effet.classList.contains('rpg-tourbillon-eau--exil'));
    assert.ok(effet.closest('.moba__lane[aria-label="Voie droite"] .moba__side--joueur'));
    assert.equal(sons.filter((son) => son === 'cold_wind').length, 1);
    assert.equal(sons.includes('destruction_hit'), false);
    assert.match(document.body.textContent, /exilée/);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('un renvoi intercepté par le bouclier ne produit ni tourbillon ni son de renvoi', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    core.rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(cible); cible.bouclier = 1; core.rpgFinDeTour(duel);
    duel.joueur.main = ['ressac']; duel.joueur.mana.eau = 30; duel.sorcier.main = [];
    await render(); sons.length = 0;
    await click(carte('Ressac')); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    await attendreIA();
    assert.ok(duel.sorcier.creatures.includes(cible)); assert.equal(cible.bouclier, 0);
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    assert.equal(sons.includes('creature_return'), false);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('mouvement réduit : le renvoi reste annoncé et sonore sans tourbillon', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    core.rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(cible); core.rpgFinDeTour(duel);
    duel.joueur.main = ['ressac']; duel.joueur.mana.eau = 30; duel.sorcier.main = [];
    await render(); await click(carte('Ressac')); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    await attendreIA();
    assert.ok(!duel.sorcier.creatures.includes(cible));
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    assert.match(document.body.textContent, /renvoyée en main/);
    assert.equal(sons.filter((son) => son === 'creature_return').length, 1);
  }, { reduit: true, onPlaySfx: (son) => sons.push(son) });
});

test('un renvoi lancé par l’IA n’apparaît qu’après la réponse du joueur', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(cible); cible.atk = 10;
    core.rpgFinDeTour(duel); duel.joueur.main = []; duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 30;
    await render(); await attendreIA();
    assert.equal(duel.mobaSortEnAttente?.carteId, 'ressac');
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et résoudre le sort')));
    assert.ok(!duel.joueur.creatures.includes(cible));
    assert.equal(document.querySelector(`[data-rpg-bounce-id="${cible.id}"]`)?.dataset.rpgBounceFx, 'eau');
    assert.equal(sons.filter((son) => son === 'creature_return').length, 1);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('une conquête qui retire les créatures ne rejoue pas un exil ordinaire', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, moba, render, click }) => {
    core.rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(cible); core.rpgFinDeTour(duel);
    moba.mobaInfliger(duel.moba, 'joueur', 'right', 19);
    duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 30; duel.sorcier.main = [];
    await render(); sons.length = 0;
    await click(carte('Éclair du marteau'));
    await click(document.querySelector('[aria-label="Cibler Voie droite de IA"]'));
    await attendreIA();
    assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').conqueredBy, 'joueur');
    assert.ok(!duel.sorcier.creatures.includes(cible));
    assert.ok(document.querySelector('.moba__conquest-fx'));
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    assert.equal(sons.includes('cold_wind'), false);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('en mouvement réduit, l’exil reste sonore et annoncé sans tourbillon', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
    assert.ok(cible); core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
    duel.joueur.main = ['guetteuse-des-marees']; duel.joueur.mana.eau = 30; duel.joueur.mana.sable = 30; duel.sorcier.main = [];
    await render(); await click(carte('Guetteuse des marées'));
    await click(document.querySelector('.moba__lane[aria-label="Voie droite"] .moba__side--joueur .moba__slot.is-empty'));
    await attendreIA(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    assert.ok(duel.joueur.exil.includes(cible.carteId));
    assert.equal(document.querySelector('[data-rpg-bounce-fx]'), null);
    assert.equal(sons.filter((son) => son === 'cold_wind').length, 1);
    assert.match(document.body.textContent, /exilée/);
  }, { reduit: true, onPlaySfx: (son) => sons.push(son) });
});

test('un renvoi de zone anime toutes les créatures réellement renvoyées', () => {
  const sons = [];
  return plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
    const allie = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(allie); core.rpgFinDeTour(duel);
    duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const ennemi = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(ennemi); core.rpgFinDeTour(duel);
    duel.joueur.main = ['ressac-de-la-lune-noire']; duel.joueur.mana.eau = 30; duel.joueur.mana.tenebres = 30; duel.sorcier.main = [];
    await render(); sons.length = 0; await click(carte('Ressac de la lune noire'));
    await click(document.querySelector('[aria-label="Appliquer Ressac de la lune noire sur Voie gauche"]'));
    await attendreIA();
    assert.ok(duel.joueur.main.includes(allie.carteId)); assert.ok(duel.sorcier.main.includes(ennemi.carteId));
    assert.equal(document.querySelector(`[data-rpg-bounce-id="${allie.id}"]`)?.dataset.rpgBounceFx, 'eau');
    assert.equal(document.querySelector(`[data-rpg-bounce-id="${ennemi.id}"]`)?.dataset.rpgBounceFx, 'eau');
    assert.equal(sons.filter((son) => son === 'creature_return').length, 1);
  }, { onPlaySfx: (son) => sons.push(son) });
});

test('le tourbillon de renvoi respecte le réglage de vitesse', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  assert.ok(cible); core.rpgFinDeTour(duel);
  duel.joueur.main = ['ressac']; duel.joueur.mana.eau = 30; duel.sorcier.main = [];
  await render(); await click(carte('Ressac')); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  await attendreIA();
  assert.ok(document.querySelector(`[data-rpg-bounce-id="${cible.id}"]`));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 700)); });
  assert.equal(document.querySelector(`[data-rpg-bounce-id="${cible.id}"]`), null);
}, { vitesse: 0.5 }));

for (const reduit of [false, true]) {
  test(`le retour temporaire n’apparaît qu’à la fin du tour${reduit ? ' en mouvement réduit' : ''}`, () => plateau(async ({ duel, engine, core, render, click }) => {
    duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
    const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
    assert.ok(cible); core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
    duel.joueur.main = ['guetteuse-des-marees']; duel.joueur.mana.eau = 30; duel.joueur.mana.sable = 30; duel.sorcier.main = [];
    await render(); await click(carte('Guetteuse des marées'));
    await click(document.querySelector('.moba__lane[aria-label="Voie droite"] .moba__side--joueur .moba__slot.is-empty'));
    await attendreIA(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    assert.ok(duel.joueur.exil.includes(cible.carteId));
    assert.equal(document.querySelector('.moba__summon-fx--retour-exil'), null);
    assert.doesNotMatch(document.body.textContent, /revient d’exil/);
    await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
    await attendreIA();
    const retour = duel.joueur.creatures.find((entity) => entity.carteId === cible.carteId);
    assert.ok(retour); assert.notEqual(retour.id, cible.id);
    assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').slots.joueur[1], retour.id);
    assert.match(document.body.textContent, /Ashigaru des braises.*Voie droite : revient d’exil/);
    assert.doesNotMatch(document.body.textContent, /exilée/, 'l’annonce du départ ne persiste pas après le retour');
    const nouveau = document.querySelector(`[data-moba-entity="${retour.id}"]`);
    assert.ok(nouveau);
    assert.equal(Boolean(nouveau.querySelector('.moba__summon-fx--retour-exil')), !reduit);
    assert.equal(nouveau.querySelector(`[data-rpg-bounce-id="${cible.id}"]`), null, 'le tourbillon de départ ne recouvre pas le retour');
  }, { reduit }));
}

test('un retour d’exil différé faute de place n’est ni animé ni annoncé prématurément', () => plateau(async ({ duel, engine, core, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
  assert.ok(cible); core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
  duel.joueur.main = ['guetteuse-des-marees']; duel.joueur.mana.eau = 30; duel.joueur.mana.sable = 30; duel.sorcier.main = [];
  await render(); await click(carte('Guetteuse des marées'));
  await click(document.querySelector('.moba__lane[aria-label="Voie droite"] .moba__side--joueur .moba__slot.is-empty'));
  await attendreIA(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.ok(duel.joueur.exil.includes(cible.carteId));
  // Construire une voie saturée pour tester le retour différé sans changer
  // les quotas de la partie : le moteur place une créature de scénario.
  const quota = duel.moba.creaturesJouees.joueur;
  duel.moba.creaturesJouees.joueur = false;
  duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 30;
  const bloqueur = engine.rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 1).entite;
  duel.moba.creaturesJouees.joueur = quota;
  assert.ok(bloqueur); duel.joueur.main = [];
  await render();
  await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
  await attendreIA();
  assert.ok(duel.joueur.exil.includes(cible.carteId));
  assert.equal(duel.retoursExilFinTour.length, 1);
  assert.equal(duel.joueur.creatures.some((entity) => entity.carteId === cible.carteId), false);
  assert.equal(document.querySelector('.moba__summon-fx--retour-exil'), null);
  assert.doesNotMatch(document.body.textContent, /revient d’exil/);
}));

test('la conquête de la voie annule le retour : aucun effet de retour n’est joué', () => plateau(async ({ duel, engine, core, moba, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
  assert.ok(cible); core.rpgFinDeTour(duel); core.rpgFinDeTour(duel);
  moba.mobaInfliger(duel.moba, 'joueur', 'right', 19);
  duel.joueur.main = ['guetteuse-des-marees']; duel.joueur.mana.eau = 30; duel.joueur.mana.sable = 30; duel.sorcier.main = [];
  await render(); await click(carte('Guetteuse des marées'));
  await click(document.querySelector('.moba__lane[aria-label="Voie droite"] .moba__side--joueur .moba__slot.is-empty'));
  await attendreIA(); await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.equal(duel.retoursExilFinTour.length, 1);
  duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 30;
  await render(); await click(carte('Éclair du marteau'));
  await click(document.querySelector('[aria-label="Cibler Voie droite de IA"]'));
  await attendreIA();
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').conqueredBy, 'joueur');
  assert.equal(duel.retoursExilFinTour.length, 0);
  assert.ok(duel.joueur.exil.includes(cible.carteId));
  await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
  await attendreIA();
  assert.equal(duel.joueur.creatures.some((entity) => entity.carteId === cible.carteId), false);
  assert.equal(document.querySelector('.moba__summon-fx--retour-exil'), null);
  assert.doesNotMatch(document.body.textContent, /revient d’exil/);
}));

test('retour d’exil ciblé : le plateau attend le choix et frappe la créature désignée', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 30;
  const a = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  duel.moba.creaturesJouees.sorcier = false;
  const b = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 1).entite;
  assert.ok(a && b); core.rpgFinDeTour(duel);
  duel.joueur.main = ['vipere-de-verre']; duel.joueur.mana.eau = 30;
  const vipere = engine.rpgMobaJouerCreature(duel, 'joueur', 'vipere-de-verre', 'right', 0).entite;
  assert.ok(vipere); assert.equal(engine.rpgMobaResoudreArrivee(duel, 'joueur', a.id).ok, true);
  duel.moba.creaturesJouees.joueur = false; duel.joueur.main = ['guetteuse-des-marees']; duel.joueur.mana.eau = 30;
  assert.ok(engine.rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'right', 1).entite);
  assert.equal(engine.rpgMobaResoudreArrivee(duel, 'joueur', vipere.id).ok, true);
  duel.joueur.main = []; duel.sorcier.main = [];
  const attaqueAvant = b.atk;
  await render();
  await click([...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Fin du tour')));
  await attendreIA();
  assert.equal(duel.tour, 'joueur'); assert.equal(duel.arriveeEnAttente?.carteId, 'vipere-de-verre');
  assert.equal(b.atk, attaqueAvant);
  const boutonCible = document.querySelector(`[data-moba-entity="${b.id}"] button`);
  assert.ok(boutonCible); await click(boutonCible);
  assert.equal(b.atk, Math.max(0, attaqueAvant - 2)); assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.arriveeEnAttente, null); assert.equal(duel.transitionRetours, null);
}));

test('retour hors tour : le Maître peut viser sa voie adverse depuis le bon camp', () => plateau(async ({ duel, core, render, click }) => {
  core.rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  duel.sorcier.main = []; duel.joueur.main = [];
  (duel.joueur.exil ??= []).push('maitre-du-marteau');
  duel.retoursExilFinTour = [{ cote: 'joueur', carteId: 'maitre-du-marteau', mobaLane: 'right', mobaSlot: 0 }];
  await render(); await attendreIA();
  const passer = [...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et commencer'));
  await click(passer);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.arriveeEnAttente?.cote, 'joueur');
  const cibleVoie = document.querySelector('[aria-label="Frapper Voie droite de IA avec le Maître"]');
  assert.ok(cibleVoie);
  const hp = duel.moba.lanes.find(lane => lane.id === 'right').hp.sorcier;
  await click(cibleVoie);
  assert.equal(duel.moba.lanes.find(lane => lane.id === 'right').hp.sorcier, hp - 3);
  assert.equal(duel.tour, 'joueur'); assert.equal(duel.transitionRetours, null);
}));

test('Ténacité : le plateau propose une cible après la renaissance avant de commencer le tour', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel); duel.sorcier.main = ['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  assert.ok(cible); core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const sacrifice = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false; duel.joueur.main = ['maitre-du-marteau']; duel.joueur.mana.neige = 30;
  const marteau = engine.rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'right', 0, { sacrificeIds: [sacrifice.id] }).entite;
  assert.ok(marteau); assert.equal(engine.rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').ok, true);
  marteau.pv = 1; duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 30;
  const hiver = engine.rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, 'right'); assert.equal(hiver.ok, true, hiver.raison);
  core.rpgFinDeTour(duel); cible.attaquee = true; duel.sorcier.main = []; duel.joueur.main = [];
  await render(); await attendreIA();
  const passer = [...document.querySelectorAll('.moba__controls button')].find((button) => button.textContent.includes('Passer et commencer'));
  assert.ok(passer, JSON.stringify({ buttons: [...document.querySelectorAll('.moba__controls button')].map(b => b.textContent), tour: duel.tour, phase: duel.phase, log: duel.log.slice(-5), texte: document.body.textContent.slice(-700) }));
  await click(passer);
  assert.equal(duel.phase, 'debut'); assert.equal(duel.arriveeEnAttente?.carteId, 'maitre-du-marteau');
  const pv = cible.pv;
  await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.equal(cible.pv, pv - 3); assert.equal(duel.phase, 'principale');
  assert.equal(duel.transitionRetours, null);
}));
