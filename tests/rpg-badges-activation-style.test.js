import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const feuilles = ['rpg-cadre-carte.css', 'rpg-battle.css', 'rpg-moba.css']
  .map(nom => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8'));

test('éclair et spirale sont sans fond et la spirale est plus petite partout', () => {
  const paires = [
    '<div class="rpg-cadre-vignette">',
    '<div class="rpg-battle"><div class="rpg-card--img">',
    '<div class="rpg-hover-card-preview__face">',
    '<div class="rpg-mulligan__card">',
    '<div class="moba__mulligan-card">',
  ];
  const fixture = paires.map((parent, i) => `${parent}<span id="actif-${i}" class="rpg-card__effet-badge">⚡</span><span id="reponse-${i}" class="rpg-card__effet-badge rpg-card__effet-badge--reponse">🌀</span>${i === 1 ? '</div></div>' : '</div>'}`).join('');
  const dom = new JSDOM(`<style>${feuilles.join('\n')}</style>${fixture}`, { virtualConsole: new VirtualConsole() });
  try {
    for (let i = 0; i < paires.length; i++) {
      const actif = dom.window.getComputedStyle(dom.window.document.getElementById(`actif-${i}`));
      const reponse = dom.window.getComputedStyle(dom.window.document.getElementById(`reponse-${i}`));
      for (const style of [actif, reponse]) {
        assert.equal(style.backgroundColor, 'rgba(0, 0, 0, 0)', `${i} : fond transparent`);
        assert.equal(style.borderStyle, 'none', `${i} : aucun contour`);
        assert.equal(style.boxShadow, 'none', `${i} : aucun disque ou ombre portée`);
        assert.equal(style.clipPath, 'none', `${i} : pas de triangle`);
        assert.equal(style.pointerEvents, 'none', `${i} : les clics passent à la carte`);
      }
      assert.equal(actif.fontSize, i === 0 ? '18px' : '22px', `${i} : éclair agrandi`);
      assert.ok(parseFloat(reponse.fontSize) < parseFloat(actif.fontSize), `${i} : spirale plus petite que l’éclair`);
      assert.equal(reponse.color, 'rgb(56, 189, 248)', `${i} : spirale bleue`);
    }
  } finally { dom.window.close(); }
});


test('le même éclair en relief est utilisé sur les cartes et dans leur description', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { RpgBadgeActivation } = await vite.ssrLoadModule('/src/games/RpgCadreCarte.jsx');
    const { RpgActivationDescription } = await vite.ssrLoadModule('/src/games/RpgActivationDescription.jsx');
    const { HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardById } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const actif = cardById('scalde-des-runes'), reponse = cardById('vipere-de-verre');
    const doc = element => new JSDOM(renderToStaticMarkup(element)).window.document;
    const badge = doc(React.createElement(RpgBadgeActivation, { carte: actif }));
    assert.match(badge.querySelector('.rpg-card__effet-badge').getAttribute('aria-label'), /Effet activé/);
    const svg = badge.querySelector('.rpg-eclair-activation');
    assert.ok(svg); assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.ok(svg.querySelectorAll('path').length >= 4, 'facettes et épaisseur');
    assert.equal(svg.querySelector('[id]'), null, 'pas d’identifiant SVG dupliqué entre cartes');
    assert.ok(doc(React.createElement(RpgActivationDescription, { carte: actif })).querySelector('.rpg-eclair-activation'));
    const apercu = doc(React.createElement(HoverCardPreview, { carte: actif }));
    assert.ok(apercu.querySelector('.rpg-card__effet-badge .rpg-eclair-activation'));
    const decoratif = doc(React.createElement(RpgBadgeActivation, { carte: actif, decoratif: true })).querySelector('.rpg-card__effet-badge');
    assert.equal(decoratif.getAttribute('aria-hidden'), 'true'); assert.equal(decoratif.hasAttribute('aria-label'), false);
    const contre = doc(React.createElement(RpgBadgeActivation, { carte: reponse }));
    assert.equal(contre.querySelector('.rpg-card__effet-badge--reponse').textContent, '🌀');
    assert.equal(contre.querySelector('.rpg-eclair-activation'), null);
    const css = readFileSync(new URL('../src/games/rpg-eclair-activation.css', import.meta.url), 'utf8');
    assert.match(css, /drop-shadow/); assert.match(css, /pointer-events:\s*none/);
  } finally { await vite.close(); }
});
