import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';

test('départ sur le bon porteur, remplacements, minuteries, session et mouvement réduit', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '0.5');
  let root;
  try {
    const { useArmesRetirees, RpgDepartArme } = await server.ssrLoadModule('/src/games/RpgOrnements.jsx');
    let clics = 0;
    function Plateau({ duel, session }) {
      const effets = useArmesRetirees(duel, session);
      return React.createElement('div', null, ...duel.joueur.creatures.map(e => React.createElement('button', { key: e.id, onClick: () => clics++ }, e.id, React.createElement(RpgDepartArme, { effet: effets[`joueur:${e.id}`] }))));
    }
    const a = { id: 'a', arme: { carteId: 'takouba-des-pistes', durabilite: 2 }, armes: ['sabre-maudit', 'sabre-maudit'] };
    const b = { id: 'b', arme: { carteId: 'takouba-des-pistes' } };
    const duel = { joueur: { creatures: [a, b] }, sorcier: { creatures: [] } };
    root = createRoot(document.getElementById('root'));
    const render = (session = 'pvp:1') => act(async () => root.render(React.createElement(Plateau, { duel, session })));
    const effet = () => document.querySelector('[data-arme-depart]');
    await render(); assert.equal(effet(), null);
    a.arme.durabilite = 1; await render(); assert.equal(effet(), null);
    a.armes.pop(); await render();
    assert.equal(effet().dataset.armeDepart, 'sabre-maudit');
    assert.equal(effet().getAttribute('aria-hidden'), 'true');
    await act(async () => document.querySelector('button').click()); assert.equal(clics, 1);
    a.arme = { carteId: 'autre' }; await render();
    assert.equal(effet().dataset.armeDepart, 'takouba-des-pistes', 'remplacement : départ, pas nécessairement bris');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); }); assert.equal(effet(), null);
    duel.joueur.creatures.splice(1, 1); await render(); assert.equal(effet(), null, 'porteur disparu');
    a.armes = []; await render('pvp:2'); assert.equal(effet(), null, 'nouvelle partie');
    a.armes.push('sabre-maudit'); await render('pvp:2');
    dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
    a.armes = []; await render('pvp:2'); assert.equal(effet(), null);
    dom.window.localStorage.removeItem('letsplay_sablier_anim_reduite_v1');
    a.armes = ['sabre-maudit']; await render('pvp:2');
    dom.window.matchMedia = () => ({ matches: true });
    a.armes = []; await render('pvp:2'); assert.equal(effet(), null, 'préférence système');
    dom.window.matchMedia = () => ({ matches: false });
    a.armes = ['sabre-maudit']; await render('pvp:2'); a.armes = []; await render('pvp:2'); assert.ok(effet());
    duel.joueur.creatures = []; await render('pvp:2');
    duel.joueur.creatures = [a]; await render('pvp:2'); assert.equal(effet(), null, 'un porteur disparu ne garde pas un ancien effet');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('rendu partagé et autonome : effet décoratif sans interception, deux préférences de mouvement réduit', () => {
  const duel = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const moba = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-ornements.css', import.meta.url), 'utf8');
  assert.match(duel, /<RpgDepartArme effet=\{armeDepartFx\}/);
  assert.equal((duel.match(/armeDepartFx=\{armesRetirees/g) ?? []).length, 2);
  assert.match(moba, /armeDepartFx=\{armesRetirees/);
  assert.match(moba, /<RpgDepartArme effet=\{armesRetirees/);
  assert.match(css, /\.rpg-arme-depart\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.rpg-arme-depart \{ display: none/);
  assert.match(css, /\.is-reduced \.rpg-arme-depart \{ display: none/);
});
