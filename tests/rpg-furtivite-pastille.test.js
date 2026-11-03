import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte, effetsDetailles, definitionPastille, iconePourLigne } from '../src/games/effetIcons.js';

const ids = ['ifrit-des-ergs', 'djinn-des-braises-voilees', 'djinn-de-la-flamme-mourante', 'djinn-du-dernier-brasier', 'djinn-de-la-premiere-etincelle', 'djinn-de-la-fleche-ardente', 'djinn-des-ailes-de-cendre'];

test('Furtivité est un effet explicable, distinct de la Rapidité', () => {
  for (const id of ids) {
    const carte = cardById(id);
    const { pastilles, texte } = effetsDetailles(carte);
    const furtivite = pastilles.filter(p => p.cle === 'furtif');
    assert.equal(furtivite.length, 1, id);
    assert.equal(furtivite[0].label, 'Furtivité');
    assert.match(furtivite[0].description, /[Dd]étruit.*fin du tour/);
    assert.doesNotMatch(texte, /Furtivité/);
    assert.ok(pastilles.some(p => p.cle === 'rapidite'));
    assert.equal(iconePourLigne(carte, 'Furtivité — Détruit à la fin du tour.'), 'furtif');
  }
  assert.match(effetsDetailles(cardById('djinn-de-la-flamme-mourante')).texte, /piochez une carte/i);
  assert.match(definitionPastille(pastillesPourCarte({ furtif: true })[0]), /fin du tour où elle arrive/);
  assert.equal(effetsDetailles({ furtif: true, text: 'Furtif — Détruit à la fin du tour.' }).pastilles[0].label, 'Furtivité', 'les anciens textes restent reconnus');
});

test('Furtivité partage la présentation des autres effets sur les fiches et les cartes de table', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { PastillesCarte, IconesCarte } = await vite.ssrLoadModule('/src/games/effetIcons.jsx');
    const carte = cardById('djinn-des-braises-voilees');
    const rendu = (composant) => new JSDOM(renderToStaticMarkup(React.createElement(composant, { carte }))).window.document;
    const pastille = rendu(PastillesCarte).querySelector('[data-pastille="furtif"]');
    assert.ok(pastille);
    assert.match(pastille.textContent, /Furtivité/);
    assert.match(pastille.getAttribute('aria-label'), /fin du tour/);
    assert.equal(pastille.tabIndex, 0, 'sa définition est accessible au clavier et au toucher');
    const badge = rendu(IconesCarte).querySelector('[data-effet="furtif"]');
    assert.ok(badge?.querySelector('use[href="#i-furtif"]'));
    const css = readFileSync(new URL('../src/games/effet-icons.css', import.meta.url), 'utf8');
    const pastillesDoc = rendu(PastillesCarte);
    const badgesDoc = rendu(IconesCarte);
    for (const doc of [pastillesDoc, badgesDoc]) {
      const style = doc.createElement('style');
      style.textContent = css;
      doc.head.appendChild(style);
    }
    for (const [doc, furtif, autre] of [
      [pastillesDoc, '[data-pastille="furtif"]', '[data-pastille="rapidite"]'],
      [badgesDoc, '[data-effet="furtif"]', '[data-effet="rapidite"]'],
    ]) {
      const vue = doc.defaultView;
      for (const propriete of ['backgroundColor', 'borderColor', 'color']) {
        assert.equal(vue.getComputedStyle(doc.querySelector(furtif))[propriete],
          vue.getComputedStyle(doc.querySelector(autre))[propriete], `${furtif} : ${propriete}`);
      }
    }
  } finally { await vite.close(); }
});
