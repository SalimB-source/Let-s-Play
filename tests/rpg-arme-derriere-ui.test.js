import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('sur la vraie table, chaque carte d’arme ouvre sa propre fiche sans action de combat', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
  const avant = {};
  for (const cle of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) avant[cle] = Object.getOwnPropertyDescriptor(globalThis, cle);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { default: Page } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgJouerCreature } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const { RPG_MODE_MANA_ESSAI } = await vite.ssrLoadModule('/src/games/rpgManaEssai.js');
    const { RPG_ELEMENTS } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI, joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], lignes: true, pvp: true, rng: () => .9 });
    duel.mulliganFait = { joueur: true, sorcier: true };
    duel.manaEssaiDemarre = true;
    for (const camp of ['joueur', 'sorcier']) duel[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    duel.tour = 'joueur';
    duel.joueur.main.push('chien-du-guet');
    const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
    assert.ok(pose.ok);
    pose.entite.arme = { carteId: 'armure-de-cendres', durabilite: 2 };
    pose.entite.armes = ['sabre-maudit'];
    duel.tour = 'sorcier';
    duel.sorcier.main.push('chien-du-guet');
    const adversaire = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
    assert.ok(adversaire.ok);
    adversaire.entite.arme = { carteId: 'armure-de-cendres', durabilite: 2 };
    duel.tour = 'joueur';
    duel.joueur.main.push('brise-lame');
    duel.joueur.deck = ['chien-du-guet'];
    const intentions = [];
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: duel, seq: 1, onIntention: async (intention) => { intentions.push(intention); return { ok: true }; }, onQuitter() {}, onAbandon() {} } })));
    const arme = document.querySelector('.card-row--equipe button[data-arme-equipee="sabre-maudit"]');
    assert.ok(arme);
    await act(async () => arme.click());
    const fiche = document.querySelector('.rpg-hover-card-preview--catalogue');
    assert.ok(fiche, 'la fiche est ouverte');
    assert.match(fiche.textContent, /Sabre maudit/i);
    assert.equal(intentions.length, 0);
    await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    const premiereArme = document.querySelector('.card-row--equipe button[data-arme-equipee="armure-de-cendres"]');
    await act(async () => premiereArme.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })));
    assert.match(document.querySelector('.rpg-hover-card-preview--catalogue').textContent, /Armure de cendres/i);
    assert.equal(intentions.length, 0);
    await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    const brise = document.querySelector('.rpg-hand [data-card-id="brise-lame"]');
    assert.ok(brise, 'Brise-lame est en main');
    await act(async () => brise.click());
    const cible = document.querySelector('.card-row--ennemi button[data-arme-equipee="armure-de-cendres"]');
    await act(async () => cible.click());
    assert.ok(intentions.some((intention) => intention.type === 'jouer-carte' && intention.carteId === 'brise-lame' && intention.cibleId === adversaire.entite.id),
      `cliquer l’arme désigne son porteur pour Brise-lame : ${JSON.stringify(intentions)}`);
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    for (const cle of Object.keys(avant)) { if (avant[cle]) Object.defineProperty(globalThis, cle, avant[cle]); else delete globalThis[cle]; }
  }
});

test('en Conquête, l’arme ouvre sa fiche et peut être ciblée par Brise-lame', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const avant = {};
  for (const cle of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) avant[cle] = Object.getOwnPropertyDescriptor(globalThis, cle);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { default: Board } = await vite.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const engine = await vite.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => {
      duel = engine.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 });
      for (const lane of duel.moba.lanes) if (lane.id !== 'center') lane.hp = { joueur: 10, sorcier: 10 };
      return duel;
    };
    const props = { onQuitter() {}, initialiser, rendu: RPG_RENDU_MOBA };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (element) => { assert.ok(element); await act(async () => element.click()); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const porteur = engine.rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(porteur);
    duel.sorcier.main = ['sabre-maudit']; duel.sorcier.mana.braise = 20;
    assert.ok(engine.rpgMobaLancerMagie(duel, 'sorcier', 'sabre-maudit', porteur.id).ok);
    rpgFinDeTour(duel); duel.joueur.main = ['brise-lame']; duel.joueur.mana.braise = 20; duel.joueur.deck = ['verglas']; duel.sorcier.main = [];
    await act(async () => root.render(React.createElement(Board, props)));
    const arme = () => document.querySelector(`[data-moba-entity="${porteur.id}"] button[data-arme-equipee="sabre-maudit"]`);
    await click(arme());
    const fiche = document.querySelector('.moba__preview-layer');
    assert.ok(fiche);
    assert.match(fiche.textContent, /Sabre maudit/i);
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await click([...document.querySelectorAll('.moba__card')].find((el) => el.textContent.includes('Brise-lame')));
    await click(arme());
    assert.equal(duel.mobaSortEnAttente?.carteId, 'brise-lame');
    assert.equal(duel.mobaSortEnAttente?.cibleId, porteur.id);
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const cle of Object.keys(avant)) { if (avant[cle]) Object.defineProperty(globalThis, cle, avant[cle]); else delete globalThis[cle]; }
  }
});
