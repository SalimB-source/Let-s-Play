import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { RPG_STORY_ALL_SCENES } from '../src/games/rpgStoryScenes.js';
import { recitHistoireVide } from '../src/games/rpgStoryFlow.js';

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('un seul acte sur la page : le clic tourne la feuille avant de révéler l’acte choisi', async () => {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body><div id="app"></div></body></html>', {
    url: 'https://lets-play.test/', pretendToBeVisual: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  let reduire = false;
  dom.window.matchMedia = () => ({ matches: reduire });
  const vite = await createServer({
    server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent',
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  });
  const root = createRoot(document.getElementById('app'));
  try {
    const { default: RpgStoryCampaign } = await vite.ssrLoadModule('/src/games/RpgStoryCampaign.jsx');
    const recit = {
      ...recitHistoireVide(),
      scenesVues: RPG_STORY_ALL_SCENES.filter((scene) => scene.acteId === 'acte-1').map((scene) => scene.id),
      curseur: { type: 'scene', id: RPG_STORY_ALL_SCENES.find((scene) => scene.acteId === 'acte-2').id, replique: 0 },
    };
    await act(async () => root.render(React.createElement(RpgStoryCampaign, {
      recit, cardArt: () => '', sauvegardeOk: true,
    })));
    const page = () => document.querySelector('[data-campaign-page]')?.getAttribute('data-campaign-page');
    const onglet = (id) => document.querySelector(`[data-campaign-act="${id}"] button`);
    const tourne = () => document.querySelector('[data-campaign-livre]').classList.contains('is-tournee');
    assert.equal(document.querySelectorAll('.rpg-campaign__pages').length, 1);
    assert.equal(page(), 'acte-2');
    assert.ok(onglet('acte-1') && onglet('acte-2'), 'les deux onglets restent accessibles');
    assert.equal(onglet('acte-2').getAttribute('aria-pressed'), 'true');

    await act(async () => onglet('acte-1').click());
    assert.equal(tourne(), true, 'la feuille démarre dès le clic');
    assert.equal(page(), 'acte-2', 'la page précédente reste visible pendant le début du tournage');
    assert.equal(onglet('acte-1').getAttribute('aria-pressed'), 'false');
    await act(async () => { await attendre(380); });
    assert.equal(page(), 'acte-1', 'l’acte demandé apparaît au milieu du tournage');
    assert.equal(document.querySelectorAll('.rpg-campaign__pages').length, 1);
    assert.equal(onglet('acte-1').getAttribute('aria-pressed'), 'true');
    await act(async () => { await attendre(370); });
    assert.equal(tourne(), false);

    await act(async () => onglet('acte-2').click());
    assert.equal(page(), 'acte-1', 'l’acte 2 n’est pas affiché avant que la feuille tourne');
    await act(async () => { await attendre(380); });
    assert.equal(page(), 'acte-2');
    await act(async () => { await attendre(370); });

    await act(async () => onglet('acte-1').click());
    await act(async () => onglet('acte-2').click());
    assert.equal(tourne(), false, 'revenir aussitôt à l’acte déjà affiché annule le tournage');
    await act(async () => { await attendre(380); });
    assert.equal(page(), 'acte-2', 'le minuteur annulé ne peut plus afficher l’ancien choix');

    reduire = true;
    await act(async () => onglet('acte-1').click());
    assert.equal(page(), 'acte-1', 'mouvement réduit : changement immédiat sans attendre un minuteur');
    assert.equal(tourne(), false);
  } finally {
    await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.HTMLElement;
    delete globalThis.Node;
    delete globalThis.navigator;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
