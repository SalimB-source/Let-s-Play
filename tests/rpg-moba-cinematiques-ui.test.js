import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
const wait = (ms = 550) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
async function plateau(fn, { reduit = false } = {}) {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '2');
  if (reduit) dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.matches?.('[data-moba-position]')) {
      const x = this.dataset.mobaLane === 'right' ? 300 : 50;
      const y = this.dataset.mobaSide === 'joueur' ? 250 : 50;
      return { left: x, top: y, width: 80, height: 100, right: x + 80, bottom: y + 100 };
    }
    return { left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 };
  };
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const engine = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const core = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { TableCard, RoueDeFeu, TempeteSable, EclairDuMarteau } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let duel;
    const props = { onQuitter: () => {}, rendu: { TableCard, RoueDeFeu, TempeteSable, EclairDuMarteau }, initialiser: () => (duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement('div', { className: `rpg-battle rpg-battle--moba${reduit ? ' is-reduced' : ''}` }, React.createElement(Board, props))));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    await fn({ duel, engine, core, render, click });
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
}
const carte = nom => [...document.querySelectorAll('.moba__card')].find(el => el.textContent.includes(nom));
const bouton = id => document.querySelector(`[data-moba-entity="${id}"] button`);
async function cibleAdverse({ duel, engine, core }, lane = 'left') {
  core.rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
  const cible = engine.rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', lane, 0).entite;
  core.rpgFinDeTour(duel); duel.sorcier.main = [];
  return cible;
}

test('tir ciblé manqué : une flèche part mais aucun choc ni faux dégât', () => plateau(async (ctx) => {
  const { duel, engine, core, render, click } = ctx;
  const cible = await cibleAdverse(ctx);
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const tireur = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  tireur.ready = true; tireur.coupRapide = true; core.rpgReglerHasard(duel, () => 0);
  await render(); await click(bouton(tireur.id)); await click(bouton(cible.id));
  assert.equal(document.querySelectorAll('[data-moba-projectile]').length, 0, 'pas de tir lors de la déclaration');
  await wait();
  const tir = document.querySelector('[data-moba-projectile="ciblee"]');
  assert.ok(tir); assert.equal(tir.style.getPropertyValue('--tir-dy'), '-160px');
  assert.equal(document.querySelectorAll('.moba__impact-trail').length, 0);
  assert.equal(document.querySelectorAll('[data-moba-clash]').length, 0);
  assert.equal(cible.pv, cible.pvMax);
}));

test('un échange ordinaire affiche un choc uniquement après résolution', () => plateau(async (ctx) => {
  const { duel, engine, render, click } = ctx; const cible = await cibleAdverse(ctx);
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const attaquant = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  attaquant.ready = true; await render(); await click(bouton(attaquant.id)); await click(bouton(cible.id));
  assert.equal(document.querySelectorAll('[data-moba-clash]').length, 0);
  await wait(); assert.equal(document.querySelectorAll('[data-moba-clash]').length, 1);
  assert.equal(document.querySelectorAll('[data-moba-projectile]').length, 0);
}));

for (const [id, nom, selector] of [
  ['trait-de-braise', 'Trait de braise', '[data-rpg-burn-fx="braise"]'],
  ['eclair-du-marteau', 'Éclair du marteau', '[data-rpg-foudre-fx="eclair-du-marteau"]'],
]) test(`${nom} : signature classique au lieu de la cible, même détruite`, () => plateau(async (ctx) => {
  const { duel, render, click } = ctx; const cible = await cibleAdverse(ctx, 'right'); cible.pv = 1;
  duel.joueur.main = [id]; Object.assign(duel.joueur.mana, { braise: 30, neige: 30 });
  await render(); await click(carte(nom)); await click(bouton(cible.id));
  assert.equal(document.querySelectorAll(selector).length, 0, 'la réponse n’est pas encore résolue');
  await wait();
  const effet = document.querySelector(selector); assert.ok(effet);
  assert.equal(effet.style.left, '300px'); assert.equal(effet.style.top, '50px');
  assert.equal(duel.sorcier.creatures.includes(cible), false);
  if (id === 'trait-de-braise') {
    await wait(2150); await render();
    assert.equal(document.querySelectorAll(selector).length, 0, 'la signature expire et ne rejoue pas au rendu suivant');
  }
}));

test('une parade intercepte le sort : bouclier mais aucune fausse brûlure', () => plateau(async (ctx) => {
  const { duel, engine, render, click } = ctx; const cible = await cibleAdverse(ctx, 'right'); cible.bouclier = 1;
  duel.joueur.main = ['ashigaru-des-braises', 'trait-de-braise']; duel.joueur.mana.braise = 30;
  const attaquant = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  attaquant.ready = true;
  await render(); await click(carte('Trait de braise')); await click(bouton(cible.id)); await wait();
  assert.ok(document.querySelector('.rpg-bouclier-impact'));
  assert.equal(document.querySelectorAll('[data-rpg-burn-fx]').length, 0);
  assert.equal(cible.pv, cible.pvMax);
  await click(bouton(attaquant.id)); await wait();
  assert.ok(document.querySelector('.rpg-bouclier-impact'), 'une attaque suivante ne coupe pas la parade');
  await wait(2500);
  assert.equal(document.querySelectorAll('.rpg-bouclier-impact').length, 0);
}));

test('mouvement réduit : pas de projectile ni signature ni choc', () => plateau(async (ctx) => {
  const { duel, render, click } = ctx; const cible = await cibleAdverse(ctx);
  duel.joueur.main = ['trait-de-braise']; duel.joueur.mana.braise = 30;
  await render(); await click(carte('Trait de braise')); await click(bouton(cible.id)); await wait();
  assert.ok(cible.pv < cible.pvMax);
  assert.equal(document.querySelectorAll('[data-rpg-burn-fx], [data-moba-projectile], [data-moba-clash]').length, 0);
}, { reduit: true }));

test('Tempête de sable : signature sur les cartes effectivement blessées', () => plateau(async (ctx) => {
  const { duel, render, click } = ctx; const cible = await cibleAdverse(ctx, 'right');
  duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 30;
  await render(); await click(carte('Tempête de sable')); await click(document.querySelector('[aria-label="Appliquer Tempête de sable sur Voie droite"]')); await wait();
  const effet = document.querySelector('[data-rpg-sable-fx="sable"]');
  assert.ok(effet); assert.equal(effet.style.left, '300px'); assert.ok(cible.pv < cible.pvMax);
}));

test('tir ciblé réussi : une seule flèche puis chiffre sur la cible', () => plateau(async (ctx) => {
  const { duel, engine, core, render, click } = ctx; const cible = await cibleAdverse(ctx);
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 30;
  const tireur = engine.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  tireur.ready = true; tireur.coupRapide = true; core.rpgReglerHasard(duel, () => .5);
  await render(); await click(bouton(tireur.id)); await click(bouton(cible.id)); await wait();
  assert.equal(document.querySelectorAll('[data-moba-projectile="ciblee"]').length, 1);
  assert.equal(document.querySelector('.moba__impact-cinema.is-targeted .moba__impact-number')?.textContent, '−1');
  assert.equal(document.querySelectorAll('.moba__impact-trail').length, 0);
}));
