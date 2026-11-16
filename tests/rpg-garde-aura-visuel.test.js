import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const entite = (extra = {}) => ({ id: 'c1', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true, ...extra });

test('Défenseur ou Provocation portent une seule aura orange dans les deux modes et les deux camps', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgJouerCreature } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const rendre = (e, cote, moba) => {
      const dom = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, { entite: e, cote, moba })));
      return dom.window.document;
    };
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
    duel.joueur.mana.braise = 10;
    duel.joueur.main.push('gardien-de-la-porte-ardente');
    const pose = rpgJouerCreature(duel, 'joueur', 'gardien-de-la-porte-ardente');
    assert.equal(pose.ok, true);
    assert.equal(pose.entite.defenseur, true);
    assert.equal(rendre(pose.entite, 'joueur', null).querySelectorAll('.rpg-card__resonance--garde').length, 1);
    for (const cote of ['joueur', 'ennemi']) for (const moba of [null, { className: 'moba__slot' }]) {
      for (const capacite of [{ defenseur: true }, { defenseurAccorde: true }, { provocation: true }, { prioriteAttaqueRapide: true }, { defenseur: true, provocation: true }]) {
        const doc = rendre(entite(capacite), cote, moba);
        assert.ok(doc.querySelector('.rpg-card.has-garde'));
        assert.equal(doc.querySelectorAll('[data-effet="defenseur"]').length, 1);
        const icone = doc.querySelector('[data-effet="defenseur"] .rpg-effet-icone');
        assert.equal(icone?.getAttribute('data-pierre'), 'braise', 'icône Défenseur rouge');
        assert.ok(icone?.querySelector('polygon[fill="#a8282d"]'), 'pierre rouge visible');
        assert.equal(doc.querySelectorAll('.rpg-card__resonance--garde').length, 1);
        assert.equal(doc.querySelectorAll('.rpg-card__liseret-garde[aria-hidden="true"]').length, 1);
        assert.equal(doc.querySelectorAll('.rpg-card__ombre-garde[aria-hidden="true"]').length, 1);
        assert.equal(doc.querySelectorAll('.rpg-card__resonance--garde .rpg-card__resonance-onde').length, 3);
        assert.equal(doc.querySelector('.rpg-card__resonance--garde').getAttribute('aria-hidden'), 'true');
        assert.match(doc.querySelector('.rpg-card__resonance--garde').getAttribute('style'), /--rpg-resonance-phase:/);
      }
      assert.equal(rendre(entite(), cote, moba).querySelector('.rpg-card__resonance--garde'), null);
      assert.equal(rendre(entite(), cote, moba).querySelector('.rpg-card__liseret-garde'), null);
      assert.equal(rendre(entite(), cote, moba).querySelector('.rpg-card__ombre-garde'), null);
      assert.equal(rendre(entite({ carteId: 'source-de-bimini', defenseur: true }), cote, moba).querySelector('.rpg-card__liseret-garde'), null);
      const avecArme = rendre(entite({ defenseur: true, arme: { carteId: 'armure-de-cendres' } }), cote, moba);
      assert.ok(avecArme.querySelector('.rpg-card.has-garde.has-arme .rpg-card__arme-vignette'));
      const cumul = rendre(entite({ carteId: 'la-barbe-noire', defenseur: true }), cote, moba);
      assert.ok(cumul.querySelector('.rpg-card__resonance--malediction'));
      assert.ok(cumul.querySelector('.rpg-card__resonance--garde'));
    }
  } finally { await vite.close(); }
});

test('le sonar orange conserve le débordement, la cadence et le mouvement réduit des autres auras', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-card\.has-garde\s*\{[^}]*overflow-clip-margin:\s*58px/);
  assert.match(css, /\.rpg-card\.has-arme\.has-garde\s*\{[^}]*overflow-clip-margin:\s*58px/);
  assert.match(css, /\.rpg-card__resonance--garde\s*\{[^}]*rgba\(238, 111, 20/s);
  assert.match(css, /\.rpg-card__resonance--garde \.rpg-card__resonance-onde\s*\{[^}]*border-color:/s);
  assert.match(css, /\.rpg-card__resonance-onde\s*\{[^}]*animation:\s*rpg-resonance-onde 3\.6s/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^]*?\.rpg-card__resonance-onde--3\s*\{[^}]*opacity:/);
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-card__resonance-onde--3\s*\{[^}]*opacity:/);
});


test('une ombre portée renforcée suit l’écu du plateau, indépendamment des filtres de la carte', () => {
  const css = readFileSync(new URL('../src/games/rpg-bouclier.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-card\.rpg-carte-bouclier > \.rpg-card__ombre-garde\s*\{[^}]*z-index:\s*-1;[^}]*background:\s*var\(--rpg-ecusson-aplat\) center \/ 100% 100% no-repeat;[^}]*drop-shadow\(0 7px 12px rgba\(0, 0, 0, \.85\)\)[^}]*pointer-events:\s*none/s);
});
