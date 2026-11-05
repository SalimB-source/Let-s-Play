import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('la connexion précède toutes les routes du Sablier et ne concerne pas Vice City', () => {
  for (const route of ['/jeu/sablier-de-bab-el', '/jeu/sablier-de-bab-el/defi', '/jeu/sablier-de-bab-el/defi/:code']) {
    const ligne = main.split('\n').find((l) => l.includes(`path="${route}"`));
    assert.match(ligne, /<RpgConnexionRequise><PaysageSablier>/);
  }
  const viceCity = main.split('\n').find((l) => l.includes('path="/jeu/vice-city-rush"'));
  assert.doesNotMatch(viceCity, /RpgConnexionRequise/);
});

test('le jeu attend une session réelle, puis s’ouvre sans redirection', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: Gate } = await vite.ssrLoadModule('/src/games/RpgConnexionRequise.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/auth/AuthContext.jsx');
    const rendu = (auth) => renderToStaticMarkup(React.createElement(AuthContext.Provider, { value: auth },
      React.createElement(Gate, null, React.createElement('div', null, 'JEU DU SABLIER'))));
    assert.match(rendu({ loading: true }), /Chargement du compte/);
    assert.doesNotMatch(rendu({ loading: true }), /JEU DU SABLIER/);
    for (const auth of [{ loading: false, session: null }, { loading: false, session: null, user: { id: 'demo' }, isDemo: true }]) {
      const html = rendu(auth);
      assert.match(html, /Connexion/);
      assert.doesNotMatch(html, /JEU DU SABLIER|Continuer sans compte/);
    }
    assert.match(rendu({ loading: false, session: { user: { id: 'u1' } } }), /JEU DU SABLIER/);
    assert.doesNotMatch(rendu({ loading: false, session: { user: { id: 'u1' } } }), /rpg-desktop-login/);
  } finally { await vite.close(); }
});

test('le cadre du site et le dock sont absents pendant la connexion du Sablier uniquement', async () => {
  const { connexionSablierEnAttente } = await import('../src/games/rpgConnexionRoute.js');
  const attente = [{ loading: true }, { loading: false, session: null }, { loading: false, user: { id: 'demo' }, session: null }];
  for (const path of ['/jeu/sablier-de-bab-el', '/jeu/sablier-de-bab-el/', '/jeu/sablier-de-bab-el/defi', '/jeu/sablier-de-bab-el/defi/ABC']) {
    for (const auth of attente) assert.equal(connexionSablierEnAttente(path, auth), true);
    assert.equal(connexionSablierEnAttente(path, { loading: false, session: { user: { id: 'u1' } } }), false);
  }
  for (const path of ['/jeu/vice-city-rush', '/auth', '/jeu/sablier-de-bab-el-autre']) {
    assert.equal(connexionSablierEnAttente(path, { loading: false, session: null }), false);
  }
  const layout = readFileSync(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8');
  const dock = readFileSync(new URL('../src/social/SocialDock.jsx', import.meta.url), 'utf8');
  assert.match(layout, /isDesktopApp \|\| routeSablier/);
  assert.match(dock, /const dockVisible = !connexionEnAttente/);
  assert.match(dock, /if \(connexionEnAttente \|\| !isMobile/);
});

test('connexion obligatoire : création et récupération restent dans le formulaire, sans lien vers le site', async () => {
  const { JSDOM } = await import('jsdom');
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { LoginForm } = await vite.ssrLoadModule('/src/games/RpgDesktopLogin.jsx');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(React.createElement(LoginForm, { connexionObligatoire: true })); });
      assert.equal(container.querySelectorAll('a').length, 0);
      assert.equal(container.querySelector('.rpg-desktop-login__surtitre').textContent, 'Le Sablier de Bab El');
      assert.equal(container.querySelector('input[type="email"]') !== null, true);
      const boutons = () => [...container.querySelectorAll('button')];
      await act(async () => boutons().find((b) => b.textContent.includes('Créer un compte')).click());
      assert.equal(container.querySelector('h1').textContent, 'Créer un compte');
      assert.ok(container.querySelector('input[autocomplete="nickname"]'));
      assert.ok(container.querySelector('input[autocomplete="new-password"]'));
      assert.equal(container.querySelectorAll('a').length, 0);
      await act(async () => boutons().find((b) => b.textContent.includes('Retour à la connexion')).click());
      await act(async () => boutons().find((b) => b.textContent.includes('Mot de passe oublié')).click());
      assert.equal(container.querySelector('h1').textContent, 'Mot de passe oublié');
      assert.equal(container.querySelector('input[type="password"]'), null);
      assert.equal(container.querySelectorAll('a').length, 0);
    } finally { await act(async () => root.unmount()); container.remove(); }
  } finally { await vite.close(); dom.window.close(); delete globalThis.window; delete globalThis.document; }
});

test('la navigation du site reste absente sur le Sablier après connexion', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: Layout } = await vite.ssrLoadModule('/src/components/Layout.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/auth/AuthContext.jsx');
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/LanguageContext.jsx');
    const { MemoryRouter } = await import('react-router-dom');
    const render = (path, auth) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(LanguageProvider, { lang: 'fr' },
        React.createElement(AuthContext.Provider, { value: auth },
          React.createElement(Layout, null, React.createElement('div', { 'data-test-jeu': true }, 'Le jeu'))))));
    const connecte = { loading: false, session: { user: { id: 'user-1' } }, user: { id: 'user-1', email: 'joueur@example.com' }, isDemo: false };
    for (const path of ['/jeu/sablier-de-bab-el', '/jeu/sablier-de-bab-el/defi', '/jeu/sablier-de-bab-el/defi/ABC']) {
      for (const auth of [connecte, { loading: true, session: null, user: null }, { loading: false, session: null, user: null }]) {
        const html = render(path, auth);
        assert.match(html, /data-test-jeu/);
        assert.doesNotMatch(html, /class="nav(?:\s|"|$)|class="brand-logo"|class="footer wrap"/);
      }
    }
    const site = render('/jeu/vice-city-rush', connecte);
    assert.match(site, /class="brand-logo"/, 'le reste du site conserve sa navigation');
  } finally { await vite.close(); }
});
