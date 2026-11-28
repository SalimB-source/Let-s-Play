import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';

test('les doses simultanées se renouvellent et se nettoient indépendamment, sans bloquer les clics', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '0.5');
  let root;
  try {
    const { useTicsAfflictions, RpgTicsAfflictions } = await server.ssrLoadModule('/src/games/RpgTicsAfflictions.jsx');
    let clics = 0;
    function Plateau({ duel, session }) {
      const effets = useTicsAfflictions(duel, session);
      return React.createElement('div', null, ...duel.joueur.creatures.map(e => React.createElement('button', { key: e.id, onClick: () => clics++ }, e.id, React.createElement(RpgTicsAfflictions, { effets: effets[`joueur:${e.id}`] }))));
    }
    const a = { id: 'a' }, b = { id: 'b' };
    const ancien = { id: 1, type: 'affliction-tic', affliction: 'poison', cote: 'joueur', entiteId: 'a', montant: 1 };
    const duel = { joueur: { creatures: [a, b] }, sorcier: { creatures: [] }, combatAnimations: [ancien] };
    root = createRoot(document.getElementById('root'));
    const render = (session = 'pvp:1') => act(async () => root.render(React.createElement(Plateau, { duel, session })));
    const types = () => [...document.querySelectorAll('[data-tic-affliction]')].map(el => el.dataset.ticAffliction);
    await render(); assert.deepEqual(types(), [], 'pas de rejeu au montage');
    duel.combatAnimations.push({ ...ancien, id: 2 }, { ...ancien, id: 3, affliction: 'brulure' });
    await render(); assert.deepEqual(types(), ['poison', 'brulure']);
    assert.ok([...document.querySelectorAll('[data-tic-affliction]')].every(el => el.getAttribute('aria-hidden') === 'true'));
    await act(async () => document.querySelector('button').click()); assert.equal(clics, 1);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    duel.combatAnimations.push({ ...ancien, id: 4 }); await render();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
    assert.deepEqual(types(), ['poison'], 'l’ancien minuteur ne supprime pas le nouveau poison');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); }); assert.deepEqual(types(), []);
    duel.combatAnimations.push({ ...ancien, id: 5, entiteId: 'b' }); await render(); assert.deepEqual(types(), ['poison']);
    duel.joueur.creatures = [a]; await render(); duel.joueur.creatures = [a, b]; await render(); assert.deepEqual(types(), [], 'pas d’effet périmé au retour');
    duel.combatAnimations.push({ ...ancien, id: 6 }); await render('pvp:2'); assert.deepEqual(types(), [], 'nouvelle session');
    dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
    duel.combatAnimations.push({ ...ancien, id: 7 }); await render('pvp:2'); assert.deepEqual(types(), []);
    dom.window.localStorage.removeItem('letsplay_sablier_anim_reduite_v1');
    dom.window.matchMedia = () => ({ matches: true });
    duel.combatAnimations.push({ ...ancien, id: 8, affliction: 'brulure' }); await render('pvp:2'); assert.deepEqual(types(), [], 'préférence système');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('les calques sont présents sur les plateaux partagés et autonomes et respectent le mouvement réduit', () => {
  const duel = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const moba = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-tics-afflictions.css', import.meta.url), 'utf8');
  assert.match(duel, /<RpgTicsAfflictions effets=\{ticsAfflictionsFx\}/);
  assert.equal((duel.match(/ticsAfflictionsFx=\{deployee/g) ?? []).length, 2);
  assert.match(moba, /ticsAfflictionsFx=\{ticsAfflictions/);
  assert.match(moba, /<RpgTicsAfflictions effets=\{ticsAfflictions/);
  assert.match(css, /\.rpg-tic-affliction\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.is-reduced \.rpg-tic-affliction \{ display: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.rpg-tic-affliction \{ display: none/);
});

test('la carte de table garde ses interactions pendant les deux pulsations', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const entite = { id: 'a', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, poison: { toursRestants: 1 }, brulure: true };
    let clics = 0;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(TableCard, { entite, cote: 'joueur', ticsAfflictionsFx: { poison: 1, brulure: 2 }, onClick: () => clics++ })));
    const carte = document.querySelector('button.rpg-card');
    assert.equal(carte.querySelectorAll('[data-tic-affliction]').length, 2);
    assert.ok(carte.querySelector('[data-affliction="poison"]') && carte.querySelector('[data-affliction="brulure"]'));
    await act(async () => carte.click()); assert.equal(clics, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
