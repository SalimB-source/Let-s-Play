import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { cibleApercuClicDroit } from '../src/games/rpgApercuCible.js';
import { cardById } from '../src/games/rpgCards.js';

const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const entite = (extra = {}) => ({ id: 'c1', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true, ...extra });

test('les armes sont des cartes distinctes derrière le porteur, dans les deux camps et modes', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const rendre = (e, cote = 'joueur', moba = null) => new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: e, cote, moba, caseEssai: 6 }))).window.document;
    assert.equal(rendre(entite()).querySelector('.rpg-card-avec-arme'), null);
    for (const cote of ['joueur', 'ennemi']) for (const moba of [null, { className: 'moba__slot', disabled: true }]) {
      const doc = rendre(entite({ arme: { carteId: 'jitte-d-amayas', durabilite: 2, compteurs: 3 }, heures: { restants: 2 } }), cote, moba);
      const pile = doc.querySelector('.rpg-card-avec-arme');
      const arme = pile.querySelector('button.rpg-card__arme-derriere');
      const creature = pile.querySelector('button.rpg-card');
      assert.equal(pile.dataset.ligne, 'fond');
      assert.equal(pile.style.getPropertyValue('--case-col'), '2');
      assert.equal(arme.dataset.cardId, 'jitte-d-amayas');
      assert.equal(arme.dataset.armeEquipee, 'jitte-d-amayas');
      assert.match(arme.querySelector('img').getAttribute('src'), /jitte-d-amayas/);
      assert.match(arme.getAttribute('aria-label'), /2 compteurs de durabilité, 3 compteurs de sable/);
      assert.equal(arme.querySelector('[data-compteur="durabilite"]').textContent, '2');
      assert.equal(arme.querySelector('[data-compteur="sable"]').textContent, '3');
      assert.equal(creature.querySelector('.rpg-card__arme-vignette'), null);
      assert.ok(arme.compareDocumentPosition(creature) & doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
      assert.equal(creature.contains(arme), false, 'aucun bouton imbriqué');
      assert.equal(creature.querySelector('.rpg-card__compteurs-creature [data-compteur="heures"]').textContent, '2');
      assert.equal(cibleApercuClicDroit(arme.querySelector('img')).carteId, 'jitte-d-amayas');
      assert.equal(cibleApercuClicDroit(arme).arme, true);
      assert.equal(cibleApercuClicDroit(creature.querySelector('.rpg-card__img')).carteId, 'chien-du-guet');
    }
    const multi = rendre(entite({ arme: { carteId: 'armure-de-cendres', durabilite: 1 }, armes: ['sabre-maudit'], durabilitesArmes: [2] }));
    const armes = [...multi.querySelectorAll('.rpg-card__arme-derriere')];
    assert.deepEqual(armes.map((a) => a.dataset.cardId), ['armure-de-cendres', 'sabre-maudit']);
    assert.deepEqual(armes.map((a) => a.querySelector('[data-compteur="durabilite"]').textContent), ['1', '2']);
    assert.equal(armes[1].style.getPropertyValue('--rpg-arme-index'), '1');
    assert.equal(cibleApercuClicDroit(armes[1]).carteId, 'sabre-maudit');
    const cale = rendre(entite({ arme: { carteId: 'armure-de-cendres', durabilite: 1 }, enCale: { name: 'Prisonnière', carteId: 'chien-du-guet' } }));
    assert.ok(cale.querySelector('.rpg-card__prisonniere'));
    assert.ok(cale.querySelector('.rpg-card__arme-derriere'));
    assert.equal(rendre(entite({ arme: { carteId: 'inconnue' } })).querySelector('.rpg-card__arme-derriere'), null);
  } finally { await vite.close(); }
});

test('le clic et le clavier consultent l’arme sans cliquer la créature', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const anciens = {};
  for (const cle of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT']) anciens[cle] = Object.getOwnPropertyDescriptor(globalThis, cle);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  let root;
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let ouvert = null, clics = 0;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(TableCard, { entite: entite({ arme: { carteId: 'armure-de-cendres' }, armes: ['sabre-maudit'] }),
      onClick: () => { clics += 1; }, onInspectWeapon: (arme) => { ouvert = arme.id; } })));
    const armes = document.querySelectorAll('.rpg-card__arme-derriere');
    await act(async () => armes[1].click());
    assert.equal(ouvert, 'sabre-maudit');
    assert.equal(clics, 0);
    armes[0].focus();
    assert.equal(document.activeElement, armes[0], 'le bouton est accessible au clavier');
    await act(async () => armes[0].click());
    assert.equal(ouvert, 'armure-de-cendres');
    await act(async () => document.querySelector('.rpg-card').click());
    assert.equal(clics, 1, 'la créature garde son action');
    document.getElementById('root').setAttribute('inert', '');
    assert.equal(cibleApercuClicDroit(armes[0]), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    for (const cle of Object.keys(anciens)) { if (anciens[cle]) Object.defineProperty(globalThis, cle, anciens[cle]); else delete globalThis[cle]; }
  }
});

test('l’aperçu conserve la liste des armes sans replacer l’icône sur la créature', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    for (const variante of ['', 'catalogue', 'appui-long']) {
      const doc = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, { carte: cardById('chien-du-guet'), armes: [cardById('jitte-d-amayas')], entite: entite(), variante }))).window.document;
      assert.ok(doc.querySelector('.rpg-hover-card-preview__weapon[data-arme-equipee="jitte-d-amayas"]'));
      assert.equal(doc.querySelector('.rpg-card__arme-vignette'), null);
    }
  } finally { await vite.close(); }
});

test('la carte d’arme dépasse et reste derrière la face', () => {
  assert.match(css, /\.rpg-card__arme-derriere\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*calc\(9 - var\(--rpg-arme-index, 0\)\);[^}]*top:\s*calc\(-1 \* max\(12%, 10px\)/s);
  assert.match(css, /\.rpg-card__arme-derriere\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5;[^}]*transform:\s*rotate\(-5deg\)/s);
  assert.match(css, /\.rpg-card-avec-arme > \.rpg-card\s*\{[^}]*z-index:\s*10/s);
  assert.match(css, /\.rpg-card__arme-derriere:focus-visible/);
  assert.doesNotMatch(css, /\.rpg-card__arme-vignette\s*\{/);
});
