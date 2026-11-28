import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('les deux marques suivent les états React et la carte reste cliquable', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Afflictions } = await server.ssrLoadModule('/src/games/RpgAfflictionsVisuelles.jsx');
    let clics = 0;
    root = createRoot(document.getElementById('root'));
    const render = async (entite) => act(async () => root.render(React.createElement('button', { onClick: () => clics++ }, React.createElement(Afflictions, { entite }))));
    await render({ poison: { toursRestants: 2 }, brulure: true });
    assert.deepEqual([...document.querySelectorAll('[data-affliction]')].map(e => e.dataset.affliction), ['poison', 'brulure']);
    assert.ok([...document.querySelectorAll('[data-affliction]')].every(e => e.getAttribute('aria-hidden') === 'true'));
    await act(async () => document.querySelector('button').click());
    assert.equal(clics, 1);
    await render({ poison: null, brulure: true });
    assert.equal(document.querySelector('[data-affliction="poison"]'), null);
    assert.ok(document.querySelector('[data-affliction="brulure"]'));
    await render({ poison: null, brulure: false });
    assert.equal(document.querySelectorAll('[data-affliction]').length, 0);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('le dégel joue une seule fois, uniquement pour la même créature et hors mouvement réduit', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '0.5');
  let root;
  try {
    const { default: Degel } = await server.ssrLoadModule('/src/games/RpgDegelVisuel.jsx');
    root = createRoot(document.getElementById('root'));
    const render = async (id, gelToursRestants) => act(async () => root.render(React.createElement(Degel, { entite: { id, gelToursRestants } })));
    const effet = () => document.querySelector('[data-degel]');
    await render('a', 2); assert.equal(effet(), null);
    await render('a', 1); assert.equal(effet(), null);
    await render('a', 0); assert.ok(effet()); assert.equal(effet().getAttribute('aria-hidden'), 'true');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 500)); });
    assert.equal(effet(), null, 'la cinématique se nettoie à la bonne vitesse');
    await render('a', 1); await render('b', 0); assert.equal(effet(), null, 'pas de dégel pour une nouvelle carte');
    await render('b', 1); await render('b', 0); assert.ok(effet());
    await render('b', 1); assert.equal(effet(), null, 'un nouveau gel interrompt le dégel');
    dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
    await render('b', 0); assert.equal(effet(), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('la carte de table montre les entraves puis le dégel sans perdre son clic', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let clics = 0;
    const entite = { id: 'cible', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, gelToursRestants: 1, empecheAttaqueToursRestants: 1, empecheBlocageToursRestants: 1 };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement('div', { className: 'rpg-battle' }, React.createElement(TableCard, { entite, cote: 'joueur', onClick: () => clics++ }))));
    await render();
    assert.ok(document.querySelector('[data-affliction="entrave-attaque"]'));
    assert.ok(document.querySelector('[data-affliction="entrave-blocage"]'));
    assert.match(document.querySelector('button.rpg-card').getAttribute('aria-label'), /ne peut pas bloquer/);
    const visuel = JSON.parse(document.querySelector('button.rpg-card').dataset.apercuEntite);
    assert.equal(visuel.empecheAttaqueToursRestants, 1); assert.equal(visuel.empecheBlocageToursRestants, 1);
    entite.gelToursRestants = 0; entite.empecheAttaqueToursRestants = 0;
    await render();
    assert.ok(document.querySelector('[data-degel]'));
    assert.equal(document.querySelector('[data-affliction="entrave-attaque"]'), null);
    assert.ok(document.querySelector('[data-affliction="entrave-blocage"]'));
    await act(async () => document.querySelector('button.rpg-card').click());
    assert.equal(clics, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('dégagement et fin du poison ne jouent que sur la bonne transition et se nettoient', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem('letsplay_sablier_anim_vitesse_v1', '0.5');
  let root;
  try {
    const { default: Degagement } = await server.ssrLoadModule('/src/games/RpgDegagementVisuel.jsx');
    const { default: FinPoison } = await server.ssrLoadModule('/src/games/RpgFinPoisonVisuel.jsx');
    root = createRoot(document.getElementById('root'));
    const render = (entite) => act(async () => root.render(React.createElement(React.Fragment, null,
      React.createElement(Degagement, { entite }), React.createElement(FinPoison, { entite }))));
    const nb = () => document.querySelectorAll('[data-degagement], [data-fin-poison]').length;
    await render({ id: 'a', attaquee: true, poison: { toursRestants: 2 } }); assert.equal(nb(), 0);
    await render({ id: 'a', attaquee: true, poison: { toursRestants: 1 } }); assert.equal(nb(), 0);
    await render({ id: 'a', attaquee: false, poison: null }); assert.equal(nb(), 2);
    assert.ok([...document.querySelectorAll('[data-degagement], [data-fin-poison]')].every(el => el.getAttribute('aria-hidden') === 'true'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); }); assert.equal(nb(), 0);
    await render({ id: 'a', attaquee: true, poison: { toursRestants: 2 } });
    await render({ id: 'b', attaquee: false, poison: null }); assert.equal(nb(), 0, 'changement d’exemplaire');
    await render({ id: 'b', attaquee: true, poison: { toursRestants: 2 } });
    dom.window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
    await render({ id: 'b', attaquee: false, poison: null }); assert.equal(nb(), 0);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
