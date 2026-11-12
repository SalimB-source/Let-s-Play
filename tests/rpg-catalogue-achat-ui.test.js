import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const DECK = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons', 'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond', 'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes', 'cotre-de-course'].flatMap((id) => [id, id]);

test('catalogue : achat, stock et persistance, solde insuffisant et double clic', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'SVGElement', 'Element', 'Node', 'CustomEvent', 'Event', 'MouseEvent', 'localStorage', 'sessionStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const install = (key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'SVGElement', 'Element', 'Node', 'CustomEvent', 'Event', 'MouseEvent', 'localStorage', 'sessionStorage']) install(key, key === 'window' ? dom.window : dom.window[key]);
  install('requestAnimationFrame', (cb) => setTimeout(() => cb(Date.now()), 16));
  install('cancelAnimationFrame', clearTimeout);
  install('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  install('IS_REACT_ACT_ENVIRONMENT', true);
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const vite = await createServer({ server: { middlewareMode: true }, ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] }, appType: 'custom', logLevel: 'silent' });
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    const { RPG_BOURSE_STORAGE_KEY, portefeuilleVide } = await vite.ssrLoadModule('/src/games/rpgCredits.js');
    const { default: Page } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { useSablierBourse } = await vite.ssrLoadModule('/src/games/useSablierBourse.js');
    const { lireExemplaire } = await vite.ssrLoadModule('/src/games/rpgCollection.js');
    let bourse, notifications = 0;
    function Sonde() {
      bourse = useSablierBourse({ onCartesRangees: () => { notifications += 1; } });
      return null;
    }
    window.localStorage.setItem(RPG_BOURSE_STORAGE_KEY, JSON.stringify({ ...portefeuilleVide(), credits: 150 }));
    await act(async () => { root.render(React.createElement(Sonde)); });
    let premier, second;
    await act(async () => {
      premier = bourse.acheterCarteCatalogue('mousse-des-galiotes');
      second = bourse.acheterCarteCatalogue('mousse-des-galiotes');
    });
    assert.equal(premier.ok, true);
    assert.equal(second.raison, 'deja-possedee');
    assert.equal(notifications, 1);
    assert.equal(bourse.bourse.credits, 110);
    await act(async () => { root.render(null); });
    window.localStorage.clear();
    window.localStorage.setItem(RPG_BOURSE_STORAGE_KEY, JSON.stringify({ ...portefeuilleVide(), credits: 150 }));
    await act(async () => { root.render(React.createElement(Page, { joueurDeck: DECK, sorcierDeck: DECK, rng: () => 0.999 })); });
    const click = async (element) => { assert.ok(element); await act(async () => element.click()); };
    await click([...host.querySelectorAll('.rpg-mode-menu__switch button')].find((b) => b.getAttribute('aria-label') === 'Catalogue'));
    const id = 'mousse-des-galiotes';
    const carte = () => host.querySelector(`[data-card-id="${id}"].rpg-card-catalogue__card`);
    assert.equal(carte()?.dataset.locked, 'true');
    assert.match(carte().textContent, /40 ◈/);
    await click(host.querySelector(`[data-catalogue-open="${id}"]`));
    const bouton = host.querySelector(`[data-catalogue-acheter="${id}"]`);
    assert.ok(bouton && !bouton.disabled);
    await act(async () => { bouton.click(); bouton.click(); });
    assert.match(host.querySelector('.rpg-catalogue-achat [role="status"]').textContent, /ajoutée à votre collection/);
    assert.equal(carte()?.dataset.locked, 'false');
    const sauvegarde = JSON.parse(window.localStorage.getItem(RPG_BOURSE_STORAGE_KEY));
    assert.equal(sauvegarde.credits, 110);
    assert.ok(sauvegarde.cartes.includes(id));
    assert.equal(lireExemplaire(sauvegarde.exemplaires, id, true), 1);
    await click(host.querySelector('.rpg-card-peek__close'));
    await click(host.querySelector(`[data-catalogue-open="${id}"]`));
    assert.equal(Boolean(host.querySelector(`[data-catalogue-acheter="${id}"]`)), false);
    await click(host.querySelector('.rpg-card-peek__close'));
    await click(host.querySelector('[data-catalogue-open="tarek"]'));
    const cher = host.querySelector('[data-catalogue-acheter="tarek"]');
    assert.ok(cher?.disabled);
    assert.match(host.querySelector('.rpg-catalogue-achat').textContent, /Il manque 190 ◈/);
    await act(async () => { root.render(null); });
    await act(async () => { root.render(React.createElement(Page, { joueurDeck: DECK, sorcierDeck: DECK, rng: () => 0.999 })); });
    await click([...host.querySelectorAll('.rpg-mode-menu__switch button')].find((b) => b.getAttribute('aria-label') === 'Catalogue'));
    assert.equal(carte()?.dataset.locked, 'false', 'la carte reste acquise après rechargement');
    await click(host.querySelector(`[data-catalogue-open="${id}"]`));
    assert.equal(Boolean(host.querySelector(`[data-catalogue-acheter="${id}"]`)), false);

  } finally {
    await act(async () => root.unmount());
    host.remove(); await vite.close(); dom.window.close();
    for (const key of globals) { if (saved[key]) Object.defineProperty(globalThis, key, saved[key]); else delete globalThis[key]; }
  }
});
