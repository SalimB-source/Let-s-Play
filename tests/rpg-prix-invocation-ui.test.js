import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const wait = (ms) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });

test('duel : le prix d’invocation se choisit dans la main, sans fenêtre ni victime', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const previous = {};
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeEventListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { default: Page } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgJouerCreature } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    const { RPG_MODE_MANA_ESSAI } = await server.ssrLoadModule('/src/games/rpgManaEssai.js');
    const duel = rpgNouveauDuel({ joueurDeck: Array(8).fill('ashigaru-des-braises'), sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI, joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'], pvp: true });
    duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
    duel.joueur.main = ['ashigaru-des-braises'];
    const victime = rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises', null, { emplacement: 3 });
    assert.equal(victime.ok, true, JSON.stringify(victime));
    duel.joueur.invocationNormaleJouee = false;
    duel.joueur.invocationsNormalesLignes = [];
    duel.joueur.main = ['anqa-des-braises', 'chien-du-guet']; // coût 5 : une carte à rendre
    const intentions = [];
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: duel, seq: 1, onIntention: async i => { intentions.push(i); return { ok: true }; }, onQuitter() {}, onAbandon() {} } })));
    const click = async (el) => { assert.ok(el, 'commande présente'); await act(async () => el.click()); };
    const main = () => document.querySelector('.rpg-hand__card[data-card-id="anqa-des-braises"]');
    const paiement = () => document.querySelector('.rpg-hand__card[data-card-id="chien-du-guet"]');
    assert.ok(main());
    assert.equal(main().dataset.jouable, 'true', `carte jouable : ${main().outerHTML.slice(0, 300)}`);
    await click(main());
    // Plus de fenêtre : un bandeau, et la main sert de sélecteur.
    assert.equal(document.querySelector('.rpg-sacrifice-choix'), null, 'aucune fenêtre de sacrifice');
    assert.equal(document.querySelector('[data-rpg-sacrifice-id]'), null, 'aucun cercle sur le plateau');
    const bandeau = document.querySelector('.rpg-retour-deck');
    assert.ok(bandeau, 'le bandeau du prix est là');
    assert.match(bandeau.textContent, /remettez/i);
    assert.equal(document.querySelector('.rpg-retour-deck__valider').disabled, true, 'rien de choisi : validation fermée');
    assert.ok(paiement().classList.contains('is-retour-deck-cible'), 'la carte admissible se propose');
    // Les cartes disponibles sont listées dans le bandeau, cochables au doigt.
    const jeton = document.querySelector('.rpg-retour-deck__carte');
    assert.ok(jeton, 'les créatures disponibles sont montrées dans le bandeau');
    assert.match(jeton.textContent, /Chien du guet/i);
    // Annuler rend la main sans rien payer.
    await click(document.querySelector('.rpg-retour-deck__annuler'));
    assert.equal(document.querySelector('.rpg-retour-deck'), null, 'bandeau refermé');
    assert.ok(main(), 'la carte est toujours en main');
    assert.equal(intentions.length, 0, 'aucun paiement');
    assert.ok(duel.joueur.creatures.some((e) => e.id === victime.entite.id), 'le plateau est intact');
    // Le prix : on coche dans la main, puis on valide.
    await click(main());
    await click(document.querySelector('.rpg-retour-deck__carte'));
    assert.equal(paiement().dataset.retourDeck, 'choisie', 'carte cochée depuis le bandeau');
    assert.equal(main().dataset.retourDeck, 'source', 'carte à invoquer marquée');
    assert.equal(document.querySelector('.rpg-retour-deck__valider').disabled, false, 'validation ouverte');
    await click(document.querySelector('.rpg-retour-deck__valider'));
    await wait(900);
    assert.equal(intentions.length, 1, 'la pose est partie');
    assert.deepEqual(intentions[0].retourIds, ['chien-du-guet'], 'l’intention porte la carte rendue au deck');
    assert.equal(intentions[0].sacrificeIds, null, 'aucune victime n’est désignée');
    // En PvP la vue locale n’applique pas l’intention : c’est le rendu qui dit
    // que la main a payé et que la créature est entrée.
    assert.equal(document.querySelector('.rpg-hand__card[data-card-id="chien-du-guet"]'), null, 'la carte payée quitte la main');
    assert.equal(document.querySelector('.rpg-hand__card[data-card-id="anqa-des-braises"]'), null, 'la carte invoquée quitte la main');
    assert.ok(document.querySelector(`.rpg-card--equipe[data-entity-id="${victime.entite.id}"]`), 'aucune victime sacrifiée : la créature en jeu reste');
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
    duel.sorcier.invocationNormaleJouee = false;
    // Le prix se paie depuis la main : il lui faut une autre carte à rendre.
    duel.sorcier.main = ['geant-des-banquises', 'viking-des-neiges'];
    duel.annonce = { cote: 'sorcier', carteId: 'geant-des-banquises', cibleId: null }; duel.fenetreReponse = true;
    duel.sorcier.deck = Array(6).fill('viking-des-neiges');
    const avant = JSON.stringify(duel);
    const prix = moteur.rpgSacrificesAnnonceSorcier(duel);
    assert.deepEqual(prix, ['viking-des-neiges'], 'le sorcier rend une carte de sa main');
    assert.equal(JSON.stringify(duel), avant, 'préparer le prix ne modifie pas la partie');
    globalThis.__SACRIFICE_TEST_DUEL__ = duel;
    const { default: Page } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { decksMaison: [{ id: 'test', name: 'Test', cardIds: Array(30).fill('viking-des-neiges'), elements: ['neige'] }], rng: () => .5 })));
    const passer = document.querySelector('.rpg-annonce-sort__pass');
    assert.ok(passer, 'annonce du Géant');
    await act(async () => passer.click());
    assert.equal(document.querySelector(`[data-rpg-sacrifice-id="${victime.id}"]`), null, 'aucun cercle : rien n’est sacrifié');
    assert.ok(duel.sorcier.creatures.some((e) => e.id === victime.id), 'sa créature reste en jeu');
    // Sans rituel à attendre, la pose et son effet d’arrivée passent tout de suite.
    assert.ok(duel.sorcier.creatures.some((e) => e.carteId === 'geant-des-banquises'), 'le Géant est posé');
    assert.equal(cible.pv, 4, 'son arrivée a gelé la cible');
    assert.ok(cible.gelToursRestants > 0);
    await wait(400);
    assert.ok(duel.sorcier.creatures.some((e) => e.carteId === 'geant-des-banquises'));
    assert.equal(cible.pv, 4); assert.ok(cible.gelToursRestants > 0);
    assert.ok(duel.sorcier.creatures.some((e) => e.id === victime.id), 'la créature du sorcier reste en jeu');
    assert.ok(duel.sorcier.deck.includes('viking-des-neiges'), 'la carte payée est repartie dans son deck');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
