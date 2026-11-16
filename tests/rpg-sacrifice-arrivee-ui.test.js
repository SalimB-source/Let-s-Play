import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const wait = (ms) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });

for (const scenario of ['vol', 'deux victimes', 'mouvement système réduit', 'mouvement réduit du jeu', 'source absente', 'effets à la pose']) test(`duel : le sacrifice précède la pose — ${scenario}`, async () => {
  const reduit = scenario.startsWith('mouvement');
  const deuxVictimes = scenario === 'deux victimes';
  const carteInvoquee = deuxVictimes ? 'orochi' : scenario === 'effets à la pose' ? 'geant-des-banquises' : 'anqa-des-braises';
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const previous = {};
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: scenario === 'mouvement système réduit', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  if (scenario === 'mouvement réduit du jeu') dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { default: Page } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgJouerCreature } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { RPG_MODE_MANA_ESSAI } = await server.ssrLoadModule('/src/games/rpgManaEssai.js');
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI, joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], pvp: true });
    duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
    let cible = null;
    if (scenario === 'effets à la pose') {
      duel.tour = 'sorcier'; duel.sorcier.main = ['ashigaru-des-braises'];
      cible = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
      assert.ok(cible); cible.pv = cible.pvMax = 5; duel.tour = 'joueur';
    }
    duel.joueur.main = ['ashigaru-des-braises'];
    const victime = rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises', null, { emplacement: 3 });
    assert.equal(victime.ok, true, JSON.stringify(victime));
    duel.joueur.invocationNormaleJouee = false;
    let secondeVictime = null;
    if (deuxVictimes) {
      duel.joueur.main = ['chien-du-guet'];
      secondeVictime = rpgJouerCreature(duel, 'joueur', 'chien-du-guet', null, { emplacement: 1 });
      assert.equal(secondeVictime.ok, true);
      duel.joueur.invocationNormaleJouee = false;
    }
    duel.joueur.main = [carteInvoquee];
    const intentions = [];
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: duel, seq: 1, onIntention: async i => { intentions.push(i); return { ok: true }; }, onQuitter() {}, onAbandon() {} } })));
    const click = async (el) => { assert.ok(el, 'commande présente'); await act(async () => el.click()); };
    const main = () => document.querySelector(`.rpg-hand__card[data-card-id="${carteInvoquee}"]`);
    assert.ok(main());
    assert.equal(main().dataset.jouable, 'true', `carte jouable : ${main().outerHTML.slice(0, 400)} ; ${document.body.textContent.slice(-1200)}`);
    await click(main());
    await click(document.querySelector('.rpg-sacrifice-choix__annuler'));
    assert.ok(main(), 'annulation sans paiement');
    await click(main());
    await click(document.querySelector('.rpg-sacrifice-choix__sacrifier'));
    const victimeEl = document.querySelector(`.rpg-card--equipe[data-entity-id="${victime.entite.id}"]`);
    const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
    main().getBoundingClientRect = () => rect(20, 500, 100, 125);
    victimeEl.getBoundingClientRect = () => rect(400, 200, 100, 125);
    document.querySelector('.card-row--equipe [data-creature-slot="4"]').getBoundingClientRect = () => rect(400, 200, 120, 160);
    await click(victimeEl);
    if (secondeVictime) {
      const secondeEl = document.querySelector(`.rpg-card--equipe[data-entity-id="${secondeVictime.entite.id}"]`);
      secondeEl.getBoundingClientRect = () => rect(200, 200, 100, 125);
      await click(secondeEl);
    }
    assert.equal(document.querySelectorAll('[data-rpg-sacrifice-id]').length, deuxVictimes ? 2 : 1, 'un cercle par victime');
    for (const id of [victime.entite.id, secondeVictime?.entite.id].filter(Boolean)) {
      assert.ok(document.querySelector(`.rpg-card--equipe[data-entity-id="${id}"]`).classList.contains('is-sacrifice-animating'), 'victime masquée sous la déchirure');
    }
    assert.ok(main(), 'la carte reste en main pendant le rituel');
    assert.equal(intentions.length, 0, 'aucun paiement avant la fin du rituel');
    if (cible) { const label = document.querySelector(`[data-entity-id="${cible.id}"]`).getAttribute('aria-label'); assert.match(label, /défense 5/); assert.doesNotMatch(label, /gelée/); }
    if (scenario === 'source absente') main().removeAttribute('data-card-id');
    if (reduit) {
      await wait(140);
      assert.equal(document.querySelector('[data-rpg-card-flight]'), null);
      assert.equal(intentions.length, 1, 'pose immédiate après le rituel réduit');
    } else if (scenario === 'source absente') {
      await wait(1900);
      assert.equal(document.querySelector('[data-rpg-card-flight]'), null);
      assert.equal(intentions.length, 1, 'la pose reste possible sans source visuelle');
    } else {
      await wait(1900);
      const vol = document.querySelector('[data-rpg-card-flight="creature"]');
      assert.ok(vol, 'vol après le rituel');
      assert.equal(document.querySelector('[data-rpg-sacrifice-id]'), null, 'cercle retiré avant le vol');
      assert.equal(document.querySelector('[data-sacrifice-fx="dechirement"]'), null, 'déchirure retirée avant le vol');
      for (const id of [victime.entite.id, secondeVictime?.entite.id].filter(Boolean)) {
        assert.ok(document.querySelector(`.rpg-card--equipe[data-entity-id="${id}"]`).classList.contains('is-sacrifice-animating'), 'la victime ne réapparaît pas pendant le vol');
      }
      assert.equal(vol.style.getPropertyValue('--rpg-flight-dx'), '390px', 'le vol vise la case de la victime');
      assert.equal(vol.style.getPropertyValue('--rpg-flight-dy'), '-265px');
      assert.equal(intentions.length, 0, 'la pose attend l’atterrissage');
      if (cible) { const label = document.querySelector(`[data-entity-id="${cible.id}"]`).getAttribute('aria-label'); assert.match(label, /défense 5/); assert.doesNotMatch(label, /gelée/); }
      await wait(800);
      assert.equal(intentions.length, 1);
    }
    if (cible) { const label = document.querySelector(`[data-entity-id="${cible.id}"]`).getAttribute('aria-label'); assert.match(label, /défense 4/); assert.match(label, /gelée/); }
    assert.deepEqual(intentions[0].sacrificeIds, [victime.entite.id, secondeVictime?.entite.id].filter(Boolean));
    assert.ok(document.querySelector(`.rpg-card--equipe[data-card-id="${carteInvoquee}"]`), 'créature posée');
    for (const id of [victime.entite.id, secondeVictime?.entite.id].filter(Boolean)) {
      assert.equal(document.querySelector(`.rpg-card--equipe[data-entity-id="${id}"]`), null);
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});

test('la carte adverse démarre son entrée après sa révélation, pas sous le rituel', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document, oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const entite = { id: 'nouvelle', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true };
    root = createRoot(document.getElementById('root'));
    const render = (differee) => act(async () => root.render(React.createElement(TableCard, { entite, cote: 'ennemi', sacrificeEnAnimation: differee, entreeDifferee: differee })));
    await render(true);
    const carte = document.querySelector('.rpg-card');
    assert.ok(carte.classList.contains('is-sacrifice-animating'));
    assert.ok(!carte.classList.contains('fx-enter'));
    await wait(700);
    await render(false);
    assert.equal(document.querySelector('.rpg-card'), carte, 'la carte reste montée');
    assert.ok(carte.classList.contains('fx-enter'), 'entrée visible après le rituel');
    await wait(700);
    assert.ok(!carte.classList.contains('fx-enter'), 'entrée terminée');
    await render(false);
    assert.ok(!carte.classList.contains('fx-enter'), 'un rendu ordinaire ne rejoue pas l’entrée');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct;
  }
});

test('duel : les effets de la créature du sorcier attendent sa pose après le cercle', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const previous = {};
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT', '__SACRIFICE_TEST_DUEL__']) previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const injection = { name: 'test-sacrifice', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('RpgDuelPage.jsx')) return null;
    return code.replace("useState(() => (pvp ? 'partie' : 'jouer'))", "useState(() => (globalThis.__SACRIFICE_TEST_DUEL__ || pvp ? 'partie' : 'jouer'))")
      .replace('const duelRef = useRef(null);', 'const duelRef = useRef(globalThis.__SACRIFICE_TEST_DUEL__ ?? null);');
  } };
  const server = await createServer({ plugins: [injection], server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const moteur = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const duel = moteur.rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: 'essai', joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'] });
    duel.manaEssaiDemarre = true; duel.essaiDeckId = 'essai-mana-sable'; duel.mulliganFait = { joueur: true, sorcier: true };
    duel.joueur.main = ['viking-des-neiges'];
    const cible = moteur.rpgJouerCreature(duel, 'joueur', 'viking-des-neiges').entite;
    cible.pv = cible.pvMax = 5;
    duel.tour = 'sorcier'; duel.sorcier.main = ['viking-des-neiges'];
    const victime = moteur.rpgJouerCreature(duel, 'sorcier', 'viking-des-neiges').entite;
    duel.sorcier.invocationNormaleJouee = false; duel.sorcier.main = ['geant-des-banquises'];
    duel.annonce = { cote: 'sorcier', carteId: 'geant-des-banquises', cibleId: null }; duel.fenetreReponse = true;
    const avant = JSON.stringify(duel);
    assert.deepEqual(moteur.rpgSacrificesAnnonceSorcier(duel), [victime.id]);
    assert.equal(JSON.stringify(duel), avant, 'préparer le sacrifice ne modifie pas la partie');
    globalThis.__SACRIFICE_TEST_DUEL__ = duel;
    const { default: Page } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { decksMaison: [{ id: 'test', name: 'Test', cardIds: Array(30).fill('viking-des-neiges'), elements: ['neige'] }], rng: () => .5 })));
    const passer = document.querySelector('.rpg-annonce-sort__pass');
    assert.ok(passer, 'annonce du Géant');
    await act(async () => passer.click());
    const cercle = document.querySelector(`[data-rpg-sacrifice-id="${victime.id}"]`);
    assert.ok(cercle, 'le rituel commence');
    assert.equal(cible.pv, 5); assert.equal(cible.gelToursRestants, 0);
    assert.ok(duel.sorcier.creatures.some((e) => e.id === victime.id));
    assert.equal(duel.sorcier.creatures.some((e) => e.carteId === 'geant-des-banquises'), false);
    assert.equal(document.querySelector('.rpg-gel-masse'), null, 'aucune animation de gel avant la pose');
    await wait(1900);
    assert.ok(duel.sorcier.creatures.some((e) => e.carteId === 'geant-des-banquises'));
    assert.equal(cible.pv, 4); assert.ok(cible.gelToursRestants > 0);
    assert.equal(duel.sorcier.creatures.some((e) => e.id === victime.id), false);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
