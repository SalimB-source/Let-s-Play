import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('les actions de créature restent indépendantes de la carte, même équipée et prisonnière', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  let cardLeft = 2, cardTop = 8;
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('rpg-battle') || this.classList.contains('card-table')) return rect(0, 0, 320, 240);
    if (this.classList.contains('rpg-card')) return rect(cardLeft, cardTop, 60, 80);
    return rect(0, 0, 0, 0);
  };
  Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.classList.contains('rpg-card__effet-menu') ? 128 : 0; } });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.classList.contains('rpg-card__effet-menu') ? 58 : 0; } });
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const entite = { id: 'salem-1', carteId: 'salem', name: 'Salem', atk: 2, pv: 3, pvMax: 3, ready: true };
    let attaques = 0, activations = 0, armes = 0, ferme = 0, pointers = 0;
    root = createRoot(document.getElementById('root'));
    const render = (entity, open = true, dispo = true) => act(async () => root.render(React.createElement('div', { className: 'rpg-battle', onPointerDown: () => pointers++ },
      React.createElement('div', { className: 'card-table' }, React.createElement('div', { className: 'card-row' }, React.createElement(TableCard, { entite: entity, cote: 'joueur', effetMenuOuvert: open, activationDispo: dispo,
        onClick: () => attaques++, onActiver: () => activations++, onFermerMenuEffet: () => ferme++, onInspectWeapon: () => armes++ })) ))));
    for (const entity of [entite, { ...entite, arme: { carteId: 'sabre-maudit', durabilite: 2 }, enCale: { carteId: 'chien-du-guet', name: 'Chien du guet' } }]) {
      await render(entity);
      const carte = document.querySelector('.rpg-card[data-entity-id]');
      const menu = document.querySelector('.rpg-card__effet-menu');
      assert.ok(menu);
      assert.equal(menu.parentElement.className, 'card-table');
      assert.equal(menu.style.left, '4px', 'ne déborde pas à gauche');
      assert.equal(menu.style.top, '98px', 'sous la carte si le bord supérieur manque de place');
      cardLeft = 285; cardTop = 150;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); });
      assert.equal(menu.style.left, '188px', 'ne déborde pas à droite');
      assert.equal(menu.style.top, '82px', 'suit la carte au-dessus');
      const row = document.querySelector('.card-row');
      row.setAttribute('inert', '');
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); });
      assert.equal(menu.style.visibility, 'hidden', 'une table désactivée ne laisse pas agir le menu');
      row.removeAttribute('inert'); cardLeft = 2; cardTop = 8;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); });
      assert.equal(carte.querySelector('button'), null, 'pas de boutons imbriqués');
      const [attaque, effet] = menu.querySelectorAll('button');
      assert.equal(attaque.getAttribute('aria-label'), 'Attaquer');
      assert.equal(effet.getAttribute('aria-label'), 'Activer l’effet');
      await act(async () => attaque.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })));
      assert.equal(pointers, 0, 'les gestes des actions ne démarrent pas le glisser de la table');
      await act(async () => attaque.click());
      await act(async () => effet.click());
      assert.equal(attaques, activations, 'un clic pour chaque action, sans clic de carte supplémentaire');
      await act(async () => effet.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      assert.equal(document.activeElement, carte, 'Échap rend le focus à la carte');
      if (entity.arme) {
        await act(async () => document.querySelector('[data-arme-equipee]').click());
        assert.equal(armes, 1);
      }
      await render(entity, false);
      assert.equal(document.querySelector('.rpg-card__effet-menu'), null);
    }
    assert.equal(attaques, 2); assert.equal(activations, 2); assert.equal(ferme, 2);
    await render(entite, true, false);
    assert.equal(document.querySelector('.rpg-card__effet-menu'), null, 'action indisponible');
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});

test('duel PvP : ouvrir puis choisir attaque ou effet de Salem', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
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
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI, joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], lignes: true, pvp: true });
    duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true; duel.tour = 'joueur';
    duel.joueur.mana = { sable: 40, eau: 40, braise: 40, neige: 40, ombre: 40 };
    duel.joueur.main = ['salem'];
    const pose = rpgJouerCreature(duel, 'joueur', 'salem', null, { emplacement: 3 });
    assert.ok(pose.ok, JSON.stringify(pose));
    Object.assign(pose.entite, { ready: true, malInvocation: false });
    duel.joueur.deck = ['chien-du-guet'];
    const intentions = [];
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: duel, seq: 1, onIntention: async i => { intentions.push(i); return { ok: true }; }, onQuitter() {}, onAbandon() {} } })));
    const click = async el => { assert.ok(el); await act(async () => el.click()); };
    const carte = () => document.querySelector(`.rpg-card[data-entity-id="${pose.entite.id}"]`);
    await click(carte());
    assert.ok(document.querySelector('.rpg-card__effet-menu'));
    await click(document.querySelector('.rpg-card__effet-btn--atk'));
    assert.equal(document.querySelector('.rpg-card__effet-menu'), null, 'attaque choisie, menu fermé');
    assert.equal(intentions.some(i => i.type === 'activer'), false);
    // Revenir à l’état initial, puis choisir l’effet et sa cible.
    await act(async () => root.unmount()); root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: duel, seq: 1, onIntention: async i => { intentions.push(i); return { ok: true }; }, onQuitter() {}, onAbandon() {} } })));
    await click(carte());
    await click(document.querySelector('.rpg-card__effet-btn--effet'));
    assert.equal(document.querySelector('.rpg-card__effet-menu'), null);
    await click(carte());
    assert.ok(intentions.some(i => i.type === 'activer' && i.entiteId === pose.entite.id && i.cibleId === pose.entite.id), JSON.stringify(intentions));
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});

test('badge et nom : carte posée, aperçu et mulligan suivent l’état de la présence', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { TableCard, HoverCardPreview, RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardById } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const carte = cardById('salem');
    const entite = { id: 'salem', carteId: 'salem', name: 'Salem', atk: 2, pv: 3, pvMax: 3, ready: true };
    root = createRoot(document.getElementById('root'));
    const render = async (entity, epuises = []) => act(async () => root.render(React.createElement('div', { className: 'rpg-battle' },
      React.createElement(TableCard, { entite: entity, cote: 'joueur' }),
      React.createElement(HoverCardPreview, { carte, entite: entity, effetsEpuises: epuises }),
      React.createElement(RPG_RENDU_MOBA.CarteMulligan, { carte, index: 0, onBasculer() {}, afficherIcones: false }),
    )));
    await render(entite);
    assert.ok(document.querySelector('.rpg-card .rpg-card__effet-badge'));
    assert.ok(document.querySelector('.rpg-hover-card-preview__face .rpg-card__effet-badge'));
    assert.ok(document.querySelector('.rpg-mulligan__card .rpg-card__effet-badge'));
    assert.match(document.querySelector('.rpg-hover-card-preview__activation').textContent, /Le Sondeur — .*\+0\/\+2/);
    assert.match(document.querySelector('.rpg-mulligan__card').getAttribute('aria-label'), /Le Sondeur/);
    assert.doesNotMatch(document.querySelector('.rpg-hover-card-preview').textContent, /1\s*\/\s*(tour|présence)/);
    for (const key of ['activationUtiliseeMatch', 'activationUtiliseeCeTour']) {
      await render({ ...entite, [key]: true });
      assert.equal(document.querySelector('.rpg-card .rpg-card__effet-badge'), null);
      assert.equal(document.querySelector('.rpg-hover-card-preview__face .rpg-card__effet-badge'), null);
      assert.match(document.querySelector('.rpg-hover-card-preview__activation').textContent, /Déjà utilisé/);
      assert.ok(document.querySelector('.rpg-mulligan__card .rpg-card__effet-badge'), 'une carte en main est une nouvelle présence');
    }
    await render(entite, ['activation']);
    assert.equal(document.querySelector('.rpg-hover-card-preview__face .rpg-card__effet-badge'), null);
    assert.match(document.querySelector('.rpg-hover-card-preview').getAttribute('aria-label'), /déjà utilisé/);
    await render({ ...entite, id: 'nouvelle-presence' });
    assert.ok(document.querySelector('.rpg-card .rpg-card__effet-badge'), 'une nouvelle présence retrouve son badge');
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
