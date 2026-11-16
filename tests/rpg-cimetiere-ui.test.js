import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const css = readFileSync('src/games/rpg-battle.css', 'utf8');

test('le cimetière affiche les cartes récentes, les noms, les filtres et le détail', async () => {
  await build({ logLevel: 'error', build: { ssr: 'src/games/RpgDuelPage.jsx', outDir: 'node_modules/.cache/rpg-cimetiere-test', emptyOutDir: true } });
  const { CimetiereCarousel } = await import('../node_modules/.cache/rpg-cimetiere-test/RpgDuelPage.js');
  const html = renderToStaticMarkup(React.createElement(CimetiereCarousel, {
    cartes: ['chien-du-guet', 'dune-marchante', 'chien-du-guet'], campLabel: 'VOTRE', onClose() {},
  }));
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__item').length, 3);
  assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__name').length, 3);
  assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__filters button').length, 4);
  assert.ok(document.querySelector('.rpg-graveyard-carousel__details h2'));
  assert.ok(document.querySelector('[aria-label="Fermer le cimetière"]'));
  assert.match(css, /\.rpg-graveyard-carousel__cards\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /@media \(max-width: 600px\)/);
});

test('le cimetière garde les filtres, la sélection et le choix d’arme fonctionnels', async () => {
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const { CimetiereCarousel } = await import('../node_modules/.cache/rpg-cimetiere-test/RpgDuelPage.js');
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root, choisi = null, fermetures = 0;
  try {
    root = createRoot(document.getElementById('root'));
    const render = async (cartes, onChoose = null) => act(async () => root.render(React.createElement(CimetiereCarousel, {
      cartes, campLabel: 'VOTRE', onClose: () => { fermetures += 1; }, onChoose,
    })));
    const click = async (el) => { assert.ok(el); await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const filtre = (texte) => [...document.querySelectorAll('.rpg-graveyard-carousel__filters button')].find((b) => b.textContent === texte);
    await render(['chien-du-guet', 'sabre-maudit', 'dune-marchante']);
    assert.deepEqual([...document.querySelectorAll('.rpg-graveyard-carousel__item')].map((el) => el.dataset.cardId), ['dune-marchante', 'sabre-maudit', 'chien-du-guet']);
    assert.match(document.querySelector('.rpg-graveyard-carousel__collection-heading').textContent, /3 affichées/);
    await click(document.querySelector('[aria-label="Voir Chien du guet"]'));
    assert.equal(document.querySelector('.rpg-graveyard-carousel__details h2').textContent, 'Chien du guet');
    assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__card-button[aria-pressed="true"]').length, 1);
    await click(filtre('Armes'));
    assert.equal(filtre('Armes').getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__item').length, 1);
    assert.equal(document.querySelector('.rpg-graveyard-carousel__details h2').textContent, 'Sabre maudit');
    await click(filtre('Sorts'));
    assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__item').length, 0);
    assert.match(document.querySelector('.rpg-graveyard-carousel__empty').textContent, /Aucune carte/);
    assert.match(document.querySelector('.rpg-graveyard-carousel__details').textContent, /Sélectionnez une carte/);
    await click(document.querySelector('.rpg-graveyard-carousel__content'));
    assert.equal(fermetures, 0);
    await click(document.querySelector('.rpg-card-peek__backdrop'));
    assert.equal(fermetures, 1);
    await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await render(['chien-du-guet', 'sabre-maudit'], (id) => { choisi = id; });
    assert.equal(filtre('Armes').getAttribute('aria-pressed'), 'true');
    await click(document.querySelector('.rpg-graveyard-carousel__choose'));
    assert.equal(choisi, 'sabre-maudit');
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
