import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { cibleApercuClicDroit } from '../src/games/rpgApercuCible.js';

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
      assert.match(badge.title, /Clic droit/);
      assert.equal(cibleApercuClicDroit(badge.querySelector('img')).carteId, 'armure-de-cendres');
      assert.equal(cibleApercuClicDroit(badge.querySelector('img')).arme, true);
      assert.equal(cibleApercuClicDroit(doc.querySelector('.rpg-card__img')).carteId, 'chien-du-guet');
      assert.match(doc.querySelector('button.rpg-card').getAttribute('aria-label'), /armes équipées : Armure de cendres/);
      assert.ok(doc.querySelector('[data-compteur="durabilite"]'));
    }
    const multi = rendre(entite({ arme: { carteId: 'armure-de-cendres' }, armes: ['sabre-maudit'] }));
    assert.equal(multi.querySelector('.rpg-card__arme-nombre').textContent, '+1');
    assert.equal(cibleApercuClicDroit(multi.querySelector('.rpg-card__arme-nombre')).carteId, 'armure-de-cendres');
    assert.match(multi.querySelector('button.rpg-card').getAttribute('aria-label'), /Armure de cendres, Sabre maudit/i);
    const magie = rendre(entite({ armes: ['sabre-maudit'] }));
    assert.equal(magie.querySelector('.rpg-card__arme-vignette')?.dataset.armeVignette, 'sabre-maudit');
    assert.ok(magie.querySelector('[data-compteur="durabilite"]'));
    const usee = rendre(entite({ armes: ['sabre-maudit'], durabilitesArmes: [1] }));
    assert.match(usee.querySelector('button.rpg-card').getAttribute('aria-label'), /1 compteur de durabilité/);
    assert.equal(rendre(entite({ armes: [], durabilitesArmes: [] })).querySelector('[data-compteur="durabilite"]'), null);
    assert.equal(rendre(entite({ arme: { carteId: 'inconnue' } })).querySelector('.rpg-card__arme-vignette'), null);
  } finally { await vite.close(); }
});

test('le losange est centré à cheval, interactif, sans boîtier métallique', () => {
  assert.match(css, /\.rpg-card__arme-vignette\s*\{[^}]*left:\s*50%;[^}]*top:\s*0;[^}]*transform:\s*translate\(-50%,\s*-50%\)/s);
  assert.match(css, /\.rpg-card__arme-vignette\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.rpg-card__arme-vignette > img\s*\{[^}]*clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/s);
  assert.match(css, /\.rpg-card\.has-arme:is\(\.has-resonance, \.has-aura, \.has-malediction\)\s*\{[^}]*overflow-clip-margin:\s*58px/s);
  assert.match(css, /\.rpg-card\.has-arme\s*\{[^}]*overflow-clip-margin:/s);
  assert.doesNotMatch(css, /\.rpg-card\.has-arme::before\s*\{/);
});

test('le clic droit vise l’arme sans modifier le clic de jeu, et respecte les éléments inertes', () => {
  const dom = new JSDOM('<div id="jeu"><button data-card-id="chien-du-guet" data-armes="sabre-maudit"><img class="face"><span data-arme-vignette="sabre-maudit"><img class="arme"></span></button></div>');
  const { document, MouseEvent } = dom.window;
  const jeu = document.querySelector('#jeu'), porteur = jeu.querySelector('button');
  let consultation = null, clics = 0;
  jeu.addEventListener('contextmenu', e => { e.preventDefault(); consultation = cibleApercuClicDroit(e.target); });
  porteur.addEventListener('click', () => { clics += 1; });
  const arme = jeu.querySelector('.arme');
  const droit = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
  arme.dispatchEvent(droit);
  assert.equal(droit.defaultPrevented, true);
  assert.equal(consultation.carteId, 'sabre-maudit');
  assert.equal(consultation.hote, porteur);
  assert.equal(clics, 0);
  jeu.querySelector('.face').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.equal(consultation.carteId, 'chien-du-guet');
  assert.equal(consultation.arme, false);
  arme.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
  assert.equal(clics, 1, 'le clic gauche reste celui de la créature');
  jeu.setAttribute('inert', '');
  assert.equal(cibleApercuClicDroit(arme), null);
  dom.window.close();
});
