import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';

test('plumes au changement, clic préservé, nettoyage, session et préférences de mouvement', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '0.5');
  let root;
  try {
    const { useEnvolTransitions, RpgEnvolTransition } = await server.ssrLoadModule('/src/games/RpgEnvolTransition.jsx');
    let clics = 0;
    function Plateau({ duel, session }) {
      const effets = useEnvolTransitions(duel, session);
      return React.createElement('div', null, ...duel.joueur.creatures.map(e => React.createElement('button', { key: e.id, onClick: () => clics++ }, e.id, React.createElement(RpgEnvolTransition, { effet: effets[`joueur:${e.id}`] }))));
    }
    const a = { id: 'a', envol: false }, b = { id: 'b', envol: true };
    const duel = { joueur: { creatures: [a, b] }, sorcier: { creatures: [] } };
    root = createRoot(document.getElementById('root'));
    const render = (session = 'pvp:1') => act(async () => root.render(React.createElement(Plateau, { duel, session })));
    const effet = () => document.querySelector('[data-envol-transition]');
    await render(); assert.equal(effet(), null, 'pas d’effet au montage, même volant');
    a.envol = true; await render(); assert.equal(effet().dataset.envolTransition, 'envol');
    assert.equal(effet().getAttribute('aria-hidden'), 'true');
    await act(async () => document.querySelector('button').click()); assert.equal(clics, 1);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    a.envol = false; await render(); assert.equal(effet().dataset.envolTransition, 'atterrissage');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    assert.equal(effet().dataset.envolTransition, 'atterrissage', 'le premier minuteur ne supprime pas la transition suivante');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); }); assert.equal(effet(), null);
    b.envol = false; await render(); assert.ok(effet());
    duel.joueur.creatures = [a]; await render();
    duel.joueur.creatures = [a, b]; await render(); assert.equal(effet(), null, 'aucun effet périmé au retour');
    a.envol = true; await render('pvp:2'); assert.equal(effet(), null, 'nouvelle session');
    dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
    a.envol = false; await render('pvp:2'); assert.equal(effet(), null);
    dom.window.localStorage.removeItem('letsplay_sablier_anim_reduite_v1');
    dom.window.matchMedia = () => ({ matches: true });
    a.envol = true; await render('pvp:2'); assert.equal(effet(), null, 'préférence système');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('les deux plateaux, les piles et le mouvement réduit utilisent le calque décoratif', () => {
  const duel = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const moba = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-envol-transition.css', import.meta.url), 'utf8');
  assert.match(duel, /<RpgEnvolTransition effet=\{envolTransitionFx\}/);
  assert.equal((duel.match(/envolTransitionFx=\{effetsEnvol/g) ?? []).length, 2);
  assert.equal((duel.match(/!deployee \? pile\.entites\.map\(\(membre\) => effetsEnvol/g) ?? []).length, 2, 'la pile repliée révèle aussi une transition d’un membre');
  assert.match(moba, /envolTransitionFx=\{effetsEnvol/);
  assert.match(moba, /<RpgEnvolTransition effet=\{effetsEnvol/);
  assert.match(css, /\.rpg-envol-transition\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.is-reduced \.rpg-envol-transition \{ display: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.rpg-envol-transition \{ display: none/);
});

test('sur une carte de table, la plume et l’état réel d’Envol ne bloquent pas le clic', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { useEnvolTransitions } = await server.ssrLoadModule('/src/games/RpgEnvolTransition.jsx');
    const entite = { id: 'a', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, envol: false };
    const duel = { joueur: { creatures: [entite] }, sorcier: { creatures: [] } };
    let clics = 0;
    function Plateau() {
      const effets = useEnvolTransitions(duel, duel);
      return React.createElement(TableCard, { entite, cote: 'joueur', envolTransitionFx: effets['joueur:a'], onClick: () => clics++ });
    }
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Plateau)));
    await render(); entite.envol = true; await render();
    const carte = document.querySelector('button.rpg-card');
    assert.ok(carte.querySelector('[data-envol-transition="envol"]'));
    assert.ok(carte.classList.contains('is-envol'));
    assert.match(carte.getAttribute('aria-label'), /envol/);
    await act(async () => carte.click()); assert.equal(clics, 1);
    entite.envol = false; await render();
    assert.ok(carte.querySelector('[data-envol-transition="atterrissage"]'));
    assert.ok(!carte.classList.contains('is-envol'));
    assert.doesNotMatch(carte.getAttribute('aria-label'), /, envol,/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
