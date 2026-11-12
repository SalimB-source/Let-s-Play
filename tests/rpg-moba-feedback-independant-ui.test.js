import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const wait = (ms) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });

async function plateau(fn, { reduit = false, renduReel = false } = {}) {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '2');
  if (reduit) dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 });
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const core = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const moba = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const TableCardTest = ({ entite, miss, critiqueFx, onClick, moba }) => React.createElement('button', {
      className: moba.className, disabled: moba.disabled, onClick,
      'data-miss': miss ? String(miss.token) : undefined,
      'data-critique': critiqueFx ? String(critiqueFx.token) : undefined,
      'data-card': entite.carteId,
    }, entite.name);
    const TableCard = renduReel ? (await server.ssrLoadModule('/src/games/RpgDuelPage.jsx')).TableCard : TableCardTest;
    const props = { onQuitter: () => {}, rendu: { TableCard }, initialiser: () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement('div', { className: `rpg-battle--moba${reduit ? ' is-reduced' : ''}` }, React.createElement(Board, props))));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    await fn({ duel, engine, core, moba, render, click });
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
}

test('un tir manqué reste visible et annoncé pendant une autre attaque', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const tireur = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false;
  const second = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  tireur.ready = second.ready = true; tireur.coupRapide = true; second.atk = 2;
  duel.sorcier.main = []; core.rpgReglerHasard(duel, () => 0);
  await render();
  await click(document.querySelector(`[data-moba-entity="${tireur.id}"] button`));
  await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  await wait(550);
  const boutonTireur = () => document.querySelector(`[data-moba-entity="${tireur.id}"] button`);
  assert.ok(boutonTireur().dataset.miss);
  assert.match(document.querySelector('.moba__combat-result').textContent, /attaque ciblée manquée/);
  await click(document.querySelector(`[data-moba-entity="${second.id}"] button`));
  await wait(550);
  assert.ok(boutonTireur().dataset.miss, 'le second combat ne coupe pas le tir manqué');
  assert.match(document.querySelector('.moba__combat-result').textContent, /attaque ciblée manquée/);
  assert.match(document.querySelector('.moba__combat-result').textContent, /voie droite : 2 dégâts/);
  assert.equal(duel.moba.lanes.find(lane => lane.id === 'right').hp.sorcier, 18);
  await wait(2700);
  assert.equal(boutonTireur().dataset.miss, undefined);
  assert.equal(document.querySelector('.moba__combat-result').textContent, '');
}));

test('deux tirs manqués ont des délais indépendants, même en mouvement réduit', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const premier = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false;
  const second = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
  premier.ready = second.ready = true; premier.coupRapide = second.coupRapide = true;
  duel.sorcier.main = []; core.rpgReglerHasard(duel, () => 0);
  await render();
  const bouton = (entity) => document.querySelector(`[data-moba-entity="${entity.id}"] button`);
  await click(bouton(premier)); await click(bouton(cible)); await wait(550);
  const jetonPremier = bouton(premier).dataset.miss;
  assert.ok(jetonPremier);
  await click(bouton(second)); await click(bouton(cible)); await wait(550);
  const jetonSecond = bouton(second).dataset.miss;
  assert.ok(jetonSecond); assert.notEqual(jetonPremier, jetonSecond);
  assert.equal(bouton(premier).dataset.miss, jetonPremier);
  assert.equal((document.querySelector('.moba__combat-result').textContent.match(/attaque ciblée manquée/g) ?? []).length, 2);
  assert.equal(cible.pv, cible.pvMax, 'aucun dégât inventé pour ces deux échecs');
  await wait(2450);
  assert.equal(bouton(premier).dataset.miss, undefined, 'le premier effet termine à son heure');
  assert.equal(bouton(second).dataset.miss, jetonSecond, 'le second ne disparaît pas avec lui');
  await wait(650);
  assert.equal(bouton(second).dataset.miss, undefined);
  assert.equal(document.querySelector('.moba__combat-result').textContent, '');
}, { reduit: true }));

test('un coup critique garde son éclat après une attaque ultérieure', () => plateau(async ({ duel, engine, core, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const critique = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false;
  const second = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  critique.carteId = 'kagutsuchi-flamme-originelle'; critique.name = 'Kagutsuchi';
  critique.coupCritique = { chance: 1, fois: 4 }; critique.atk = 1;
  critique.ready = second.ready = true; second.atk = 2;
  duel.sorcier.main = []; core.rpgReglerHasard(duel, () => 0);
  await render();
  const bouton = (entity) => document.querySelector(`[data-moba-entity="${entity.id}"] button`);
  await click(bouton(critique)); await wait(550);
  const jeton = bouton(critique).dataset.critique;
  assert.ok(jeton); assert.match(document.querySelector('.moba__combat-result').textContent, /Kagutsuchi : coup critique ×4/);
  await click(bouton(second)); await wait(550);
  assert.equal(bouton(critique).dataset.critique, jeton);
  assert.match(document.querySelector('.moba__combat-result').textContent, /Kagutsuchi : coup critique ×4/);
  assert.match(document.querySelector('.moba__combat-result').textContent, /voie droite : 2 dégâts/);
  await wait(2700);
  assert.equal(bouton(critique).dataset.critique, undefined);
}));

test('Rejouer efface les indications de combat et leurs minuteurs', () => plateau(async ({ duel, engine, core, moba, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const tireur = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  tireur.ready = true; tireur.coupRapide = true; duel.sorcier.main = [];
  core.rpgReglerHasard(duel, () => 0);
  await render(); await click(document.querySelector(`[data-moba-entity="${tireur.id}"] button`));
  await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`)); await wait(550);
  assert.match(document.querySelector('.moba__combat-result').textContent, /attaque ciblée manquée/);
  moba.mobaInfliger(duel.moba, 'joueur', 'left', 20);
  moba.mobaInfliger(duel.moba, 'joueur', 'right', 20);
  await render();
  assert.equal(duel.moba.winner, 'joueur');
  await click([...document.querySelectorAll('.moba__end-actions button')].find(button => button.textContent.includes('Rejouer')));
  assert.equal(document.querySelector('.moba__combat-result')?.textContent ?? '', '', 'aucune ancienne annonce dans la nouvelle partie');
  await wait(3100);
  assert.equal(Boolean(document.querySelector('[data-miss]')), false);
}));

test('la carte illustrée conserve son indicateur MISS pendant une attaque suivante', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const tireur = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false;
  const second = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  tireur.ready = second.ready = true; tireur.coupRapide = true; second.atk = 2;
  duel.sorcier.main = []; core.rpgReglerHasard(duel, () => 0);
  await render();
  const bouton = (entity) => document.querySelector(`[data-entity-id="${entity.id}"]`);
  await click(bouton(tireur)); await click(bouton(cible)); await wait(550);
  assert.equal(bouton(tireur).getAttribute('data-miss'), 'true');
  assert.equal(bouton(tireur).querySelector('.rpg-card__miss')?.textContent.trim(), 'MISS');
  await click(bouton(second)); await wait(550);
  assert.equal(bouton(tireur).getAttribute('data-miss'), 'true');
  assert.equal(bouton(tireur).querySelector('.rpg-card__miss')?.textContent.trim(), 'MISS');
  assert.match(document.querySelector('.moba__combat-result').textContent, /attaque ciblée manquée/);
}, { renduReel: true }));

test('la carte illustrée conserve son éclat critique pendant une attaque suivante', () => plateau(async ({ duel, engine, core, render, click }) => {
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const critique = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false;
  const second = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  critique.carteId = 'kagutsuchi-flamme-originelle'; critique.name = 'Kagutsuchi';
  critique.coupCritique = { chance: 1, fois: 4 }; critique.atk = 1;
  critique.ready = second.ready = true; second.atk = 2; duel.sorcier.main = [];
  core.rpgReglerHasard(duel, () => 0);
  await render();
  const bouton = (entity) => document.querySelector(`[data-entity-id="${entity.id}"]`);
  await click(bouton(critique)); await wait(550);
  assert.equal(bouton(critique).querySelector('.rpg-card__critique')?.textContent.trim(), '×4');
  await click(bouton(second)); await wait(550);
  assert.equal(bouton(critique).querySelector('.rpg-card__critique')?.textContent.trim(), '×4');
  assert.ok(bouton(critique).classList.contains('is-moba-critique'));
  assert.match(document.querySelector('.moba__combat-result').textContent, /Kagutsuchi : coup critique ×4/);
}, { renduReel: true }));

for (const reduit of [false, true]) test(`Contre-attaque de sort : X sur la voie touchée${reduit ? ', mouvement réduit' : ''}`, () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const defenseur = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  defenseur.contreAttaque = true; defenseur.atk = 3; defenseur.pv = 1;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['trait-de-braise']; duel.joueur.mana.braise = 30; duel.sorcier.main = [];
  await render();
  await click([...document.querySelectorAll('.moba__card')].find((el) => el.textContent.includes('Trait de braise')));
  await click(document.querySelector(`[data-moba-entity="${defenseur.id}"] button`));
  assert.equal(document.querySelectorAll('[data-moba-counterattack]').length, 0, 'pas de X à l’annonce');
  await wait(550);
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').hp.joueur, 17);
  assert.equal(duel.sorcier.creatures.includes(defenseur), false, 'le riposteur détruit frappe tout de même');
  const xs = [...document.querySelectorAll('[data-moba-counterattack]')];
  if (reduit) assert.equal(xs.length, 0);
  else {
    assert.deepEqual(xs.map((x) => x.dataset.mobaCounterattack), ['@moba:right:joueur']);
    assert.equal(xs[0].querySelectorAll('.rpg-counterattack-slashes__slash').length, 2);
    await wait(1700);
    assert.equal(document.querySelectorAll('[data-moba-counterattack]').length, 0, 'durée ajustée à la vitesse');
  }
}, { reduit }));

test('le X reste sur la case du tireur détruit par la réplique du Gardien', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const gardien = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  gardien.carteId = 'gardien-de-la-porte-ardente';
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const tireur = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  tireur.ready = true; tireur.coupRapide = true; tireur.pv = 1; duel.sorcier.main = [];
  core.rpgReglerHasard(duel, () => 0);
  await render(); await click(document.querySelector(`[data-moba-entity="${tireur.id}"] button`));
  await click(document.querySelector(`[data-moba-entity="${gardien.id}"] button`)); await wait(550);
  assert.equal(duel.joueur.creatures.includes(tireur), false);
  assert.equal(document.querySelector('[data-moba-counterattack]')?.dataset.mobaCounterattack, `creature:${tireur.id}`);
  assert.deepEqual(duel.combatAnimations.find((e) => e.type === 'contre-attaque').cible.mobaLane, 'left');
}));

test('une riposte du centre rattaché marque les deux jauges de flanc, pas le centre', () => plateau(async ({ duel, engine, core, moba, render, click }) => {
  core.rpgFinDeTour(duel);
  assert.equal(moba.mobaInfliger(duel.moba, 'sorcier', 'center', 20).conquered, true);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const defenseur = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  defenseur.contreAttaque = true; defenseur.atk = 2;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['trait-de-braise']; duel.joueur.mana.braise = 30; duel.sorcier.main = [];
  await render();
  await click([...document.querySelectorAll('.moba__card')].find((el) => el.textContent.includes('Trait de braise')));
  await click(document.querySelector(`[data-moba-entity="${defenseur.id}"] button`)); await wait(550);
  assert.deepEqual([...document.querySelectorAll('[data-moba-counterattack]')].map((x) => x.dataset.mobaCounterattack).sort(), ['@moba:left:joueur', '@moba:right:joueur']);
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'left').hp.joueur, 18);
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').hp.joueur, 18);
}));

test('une parade qui empêche la riposte ne produit aucun X', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const defenseur = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  defenseur.contreAttaque = true; defenseur.atk = 3; defenseur.bouclier = 1;
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['trait-de-braise']; duel.joueur.mana.braise = 30; duel.sorcier.main = [];
  await render(); await click([...document.querySelectorAll('.moba__card')].find((el) => el.textContent.includes('Trait de braise')));
  await click(document.querySelector(`[data-moba-entity="${defenseur.id}"] button`)); await wait(550);
  assert.equal(duel.moba.lanes.find((lane) => lane.id === 'right').hp.joueur, 20);
  assert.equal(document.querySelectorAll('[data-moba-counterattack]').length, 0);
}));

test('deux répliques successives conservent leurs X indépendamment', () => plateau(async ({ duel, engine, core, render, click }) => {
  core.rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const gardien = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  gardien.carteId = 'gardien-de-la-porte-ardente';
  core.rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const premier = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.moba.creaturesJouees.joueur = false;
  const second = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
  premier.ready = second.ready = true; premier.coupRapide = second.coupRapide = true; duel.sorcier.main = [];
  core.rpgReglerHasard(duel, () => 0);
  await render();
  const attaquer = async (tireur) => {
    await click(document.querySelector(`[data-moba-entity="${tireur.id}"] button`));
    await click(document.querySelector(`[data-moba-entity="${gardien.id}"] button`)); await wait(550);
  };
  await attaquer(premier); await attaquer(second);
  assert.deepEqual([...document.querySelectorAll('[data-moba-counterattack]')].map((x) => x.dataset.mobaCounterattack).sort(), [`creature:${premier.id}`, `creature:${second.id}`].sort());
  await wait(1800);
  assert.equal(document.querySelectorAll('[data-moba-counterattack]').length, 0);
}));
