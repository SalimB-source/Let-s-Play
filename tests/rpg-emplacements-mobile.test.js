import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');

test('sur téléphone les cases neutres reprennent le style transparent du PC, sans toucher aux choix', () => {
  const css = lire('rpg-mana-essai.css'), portrait = lire('rpg-portrait.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const neutre = css.match(/\.rpg-creature-slot\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(neutre, /border:\s*1px dashed transparent/);
  assert.match(neutre, /background:\s*transparent/); assert.match(neutre, /box-shadow:\s*none/);
  assert.match(css, /\.card-table:not\(\.is-dragging-creature\)[\s\S]*?::before,[\s\S]*?::after\s*\{\s*content:\s*none/);
  assert.doesNotMatch(portrait, /\.rpg-creature-slot\.is-empty:not\(\.rpg-creature-slot--choix\)/,
    'aucune décoration portrait ne réintroduit les rectangles au repos');
  for (const type of ['choix', 'deplacement', 'zone-sort']) {
    assert.match(css, new RegExp(`\\.rpg-creature-slot--${type}\\s*\\{[^}]*pointer-events:\\s*auto`, 's'));
    assert.match(css, new RegExp(`\\.rpg-creature-slot--${type}\\s*\\{[^}]*background:`, 's'));
  }
  assert.match(css, /\.card-table\.is-dragging-creature[\s\S]*?\.rpg-creature-slot:not\(\.is-occupied\)\s*\{[^}]*background:/);
});

test('la grille reste présente et le choix, le déplacement et la zone restent cliquables', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { CreatureSlots } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    root = createRoot(document.getElementById('root'));
    const appels = [];
    const base = { camp: { creatures: [] }, cote: 'joueur', maximum: 8, deuxLignes: true };
    const render = (props) => act(async () => root.render(React.createElement('div', { className: 'rpg-battle rpg-battle--touch', 'data-scene': 'duel' },
      React.createElement('div', { className: 'card-table' }, React.createElement('div', { className: 'card-row card-row--equipe', 'data-lignes': 'true' }, React.createElement(CreatureSlots, { ...base, ...props }))))));
    await render({});
    assert.equal(document.querySelectorAll('[data-creature-slot]').length, 8);
    assert.equal(document.querySelectorAll('button[data-creature-slot]').length, 0);
    await render({ choixEmplacement: true, onChoisirEmplacement: (i) => appels.push(['pose', i]) });
    const pose = document.querySelector('[data-creature-slot-choix="true"]');
    assert.ok(pose); await act(async () => pose.click()); assert.deepEqual(appels.pop(), ['pose', 0]);
    await render({ casesDeplacement: [1], onChoisirDeplacement: (i) => appels.push(['pas', i]) });
    const pas = document.querySelector('[data-creature-slot-deplacement="true"]');
    assert.ok(pas); await act(async () => pas.click()); assert.deepEqual(appels.pop(), ['pas', 1]);
    await render({ zoneSort: { cases: [2] }, onChoisirZone: (i) => appels.push(['zone', i]) });
    const zone = document.querySelector('[data-zone-sort="ancre"][data-case-index="2"]');
    assert.ok(zone); await act(async () => zone.click()); assert.deepEqual(appels.pop(), ['zone', 2]);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
