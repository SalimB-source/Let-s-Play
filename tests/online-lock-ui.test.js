import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

test('liens directs verrouillés : état accessible et aucune requête de jeu en ligne', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
  const requests = [];
  const oldEnv = { url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY };
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-public-key';
  const oldSocket = globalThis.WebSocket;
  globalThis.WebSocket = class { constructor(url) { requests.push(`WebSocket: ${url}`); } };
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (...args) => { requests.push(String(args[0])); return Promise.reject(new Error('unexpected request')); };
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'] } });
  const roots = [];
  try {
    const { AuthContext } = await vite.ssrLoadModule('/src/auth/AuthContext.jsx');
    const { LanguageContext } = await vite.ssrLoadModule('/src/i18n/LanguageContext.jsx');
    const { default: Salon } = await vite.ssrLoadModule('/src/games/RpgPvpSalon.jsx');
    const { default: MirageOnline } = await vite.ssrLoadModule('/src/games/MirageOnline.jsx');
    const { default: MirageRushPage } = await vite.ssrLoadModule('/src/games/MirageRushPage.jsx');
    const mount = async (element) => {
      const node = document.createElement('div'); document.body.append(node);
      const root = createRoot(node); roots.push(root);
      await act(async () => { root.render(element); });
      return node;
    };
    for (const path of ['/jeu/sablier-de-bab-el/defi', '/jeu/sablier-de-bab-el/defi/ABCDEF12']) {
      const node = await mount(React.createElement(AuthContext.Provider, { value: { user: null, loading: false, isDemo: false } },
        React.createElement(LanguageContext.Provider, { value: { lang: 'en' } },
          React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(Routes, null,
            React.createElement(Route, { path: '/jeu/sablier-de-bab-el/defi/:code?', element: React.createElement(Salon) }))))));
      assert.equal(node.querySelector('h1')?.textContent, 'Coming soon');
      assert.equal(node.querySelector('form'), null);
    }
    const node = await mount(React.createElement(LanguageContext.Provider, { value: { lang: 'ar' } },
      React.createElement(MemoryRouter, null, React.createElement(MirageOnline, { connected: false, onBack() {}, onSelectMode() {} }))));
    assert.equal(node.querySelector('#mirage-soon-title')?.textContent, 'قريباً');
    assert.equal(node.querySelector('form'), null);
    const direct = await mount(React.createElement(AuthContext.Provider, { value: { user: null, isDemo: false } },
      React.createElement(MemoryRouter, { initialEntries: ['/jeu/mirage-rush?mode=online'] }, React.createElement(MirageRushPage))));
    assert.equal(direct.querySelector('#mirage-soon-title')?.textContent, 'Bientôt disponible');
    const home = await mount(React.createElement(AuthContext.Provider, { value: { user: null, isDemo: false } },
      React.createElement(MemoryRouter, { initialEntries: ['/jeu/mirage-rush'] }, React.createElement(MirageRushPage))));
    const onlineButton = [...home.querySelectorAll('.mirage-mode-action')].find((el) => el.getAttribute('aria-label')?.includes('En ligne'));
    assert.ok(onlineButton?.disabled);
    assert.ok([...home.querySelectorAll('.mirage-mode-action')].some((el) => el.textContent.includes('RUÉE') && !el.disabled));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 2400)); });
    assert.deepEqual(requests, []);
  } finally {
    for (const root of roots) await act(async () => root.unmount());
    const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.js');
    await supabase?.auth.dispose();
    await supabase?.removeAllChannels();
    await vite.close(); globalThis.fetch = oldFetch; globalThis.WebSocket = oldSocket;
    if (oldEnv.url === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = oldEnv.url;
    if (oldEnv.key === undefined) delete process.env.VITE_SUPABASE_ANON_KEY; else process.env.VITE_SUPABASE_ANON_KEY = oldEnv.key;
    dom.window.close();
  }
});
