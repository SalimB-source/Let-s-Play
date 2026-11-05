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
