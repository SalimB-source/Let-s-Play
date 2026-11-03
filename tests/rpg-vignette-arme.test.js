import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const entite = (extra = {}) => ({ id: 'c1', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true, ...extra });

test('la vignette suit les armes réelles des deux camps et leur disparition', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const rendre = (e, cote = 'joueur') => new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: e, cote }))).window.document;
    assert.equal(rendre(entite()).querySelector('.rpg-card__arme-vignette'), null);
    for (const cote of ['joueur', 'ennemi']) {
      const doc = rendre(entite({ arme: { carteId: 'armure-de-cendres', durabilite: 2 } }), cote);
      const badge = doc.querySelector('.rpg-card__arme-vignette');
      assert.equal(badge?.dataset.armeVignette, 'armure-de-cendres');
      assert.match(badge.querySelector('img').getAttribute('src'), /armure-de-cendres/);
      assert.equal(badge.getAttribute('aria-hidden'), 'true');
      assert.match(doc.querySelector('button.rpg-card').getAttribute('aria-label'), /armes équipées : Armure de cendres/);
      assert.ok(doc.querySelector('[data-compteur="durabilite"]'));
    }
    const multi = rendre(entite({ arme: { carteId: 'armure-de-cendres' }, armes: ['sabre-maudit'] }));
    assert.equal(multi.querySelector('.rpg-card__arme-nombre').textContent, '+1');
    assert.match(multi.querySelector('button.rpg-card').getAttribute('aria-label'), /Armure de cendres, Sabre maudit/i);
    const magie = rendre(entite({ armes: ['sabre-maudit'] }));
    assert.equal(magie.querySelector('.rpg-card__arme-vignette')?.dataset.armeVignette, 'sabre-maudit');
    assert.equal(rendre(entite({ arme: { carteId: 'inconnue' } })).querySelector('.rpg-card__arme-vignette'), null);
  } finally { await vite.close(); }
});

test('le losange est centré à cheval, décoratif, sans boîtier métallique', () => {
  assert.match(css, /\.rpg-card__arme-vignette\s*\{[^}]*left:\s*50%;[^}]*top:\s*0;[^}]*transform:\s*translate\(-50%,\s*-50%\)/s);
  assert.match(css, /\.rpg-card__arme-vignette\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.rpg-card__arme-vignette > img\s*\{[^}]*clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/s);
  assert.match(css, /\.rpg-card\.has-arme:is\(\.has-resonance, \.has-aura, \.has-malediction\)\s*\{[^}]*overflow-clip-margin:\s*58px/s);
  assert.match(css, /\.rpg-card\.has-arme\s*\{[^}]*overflow-clip-margin:/s);
  assert.doesNotMatch(css, /\.rpg-card\.has-arme::before\s*\{/);
});
