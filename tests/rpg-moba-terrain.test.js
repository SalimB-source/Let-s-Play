import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('le terrain MOBA continu garde ses trois voies et ses commandes', async () => {
  const image = await readFile(new URL('../public/sablier-moba/champ-trois-voies-rapprochees.webp', import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  const css = await readFile(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /var\(--moba-map\) center \/ 100% 100% no-repeat/);
  assert.match(css, /@media \(max-width: 700px\) and \(orientation: portrait\)\s*\{[^}]*\.moba\s*\{[^}]*background-size:\s*145% 100%/s);
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const initialiser = () => rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
    assert.match(document.querySelector('.moba').style.getPropertyValue('--moba-map'), /sablier-moba\/champ-trois-voies-rapprochees\.webp/);
    const lanes = [...document.querySelectorAll('.moba__lane')];
    assert.deepEqual(lanes.map((lane) => lane.getAttribute('aria-label')), ['Voie gauche', 'Voie centrale', 'Voie droite']);
    assert.deepEqual(lanes.map((lane) => lane.querySelectorAll('[data-moba-position]').length), [4, 2, 4]);
    const click = async (button) => { assert.ok(button && !button.disabled); await act(async () => button.click()); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.ok([...document.querySelectorAll('.moba__controls button')].some((button) => button.textContent.includes('Fin du tour')));
    assert.equal(document.querySelectorAll('.moba__lane').length, 3);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('les voies conquises n’ont plus de masque rectangulaire au-dessus des ruines', async () => {
  const css = await readFile(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /\.moba__map-ruin\s*\{[^}]*pointer-events: none/);
  assert.doesNotMatch(css, /\.moba[^{}]*\.moba__lane\.is-conquered\s+\.moba__side[^{}]*\{[^}]*background\s*:/);
});

test('les trois versions détruites existent pour chacun des cinq décors et restent transparentes ailleurs', async () => {
  const { MOBA_PLATEAUX } = await import('../src/games/rpgMobaPlateaux.js');
  const css = await readFile(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /\.moba__map-ruin \{[^}]*pointer-events: none/);
  assert.match(css, /\.moba__map-ruin \{ background-size: 145% 100%; \}/);
  assert.doesNotMatch(css, /moba__conquest-(?:lock|chains|photo-chain)/);
  for (const plateau of MOBA_PLATEAUX) {
    assert.deepEqual(Object.keys(plateau.ruines), ['left', 'center', 'right']);
    for (const [voie, fichier] of Object.entries(plateau.ruines)) {
      assert.ok(fichier.endsWith(`-detruit-${voie}.webp`));
      const image = await readFile(new URL(`../public/${fichier}`, import.meta.url));
      assert.equal(image.toString('ascii', 0, 4), 'RIFF');
      assert.equal(image.toString('ascii', 8, 12), 'WEBP');
      assert.ok(image.length > 5000 && image.length < 100000, fichier);
    }
  }
});

test('les conquêtes révèlent les ruines correspondantes sans bloquer les autres voies', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    const ruines = () => [...document.querySelectorAll('[data-moba-ruin]')];
    assert.deepEqual(ruines(), []);
    mobaInfliger(duel.moba, 'joueur', 'left', 20);
    await act(async () => root.render(React.createElement(Board, props)));
    const [left, center, right] = document.querySelectorAll('.moba__lane');
    assert.ok(left.classList.contains('is-conquered--joueur'));
    assert.deepEqual(ruines().map((el) => el.dataset.mobaRuin), ['left']);
    assert.match(ruines()[0].style.backgroundImage, /champ-trois-voies-rapprochees-detruit-left\.webp/);
    assert.equal(document.querySelector('.moba__conquest'), null);
    assert.ok([...left.querySelectorAll('.moba__side')].every((camp) => camp.hasAttribute('inert')));
    assert.ok(!center.querySelector('.moba__side').hasAttribute('inert'));
    assert.equal(duel.moba.winner, null);
    mobaInfliger(duel.moba, 'sorcier', 'center', 15);
    await act(async () => root.render(React.createElement(Board, props)));
    assert.deepEqual(ruines().map((el) => el.dataset.mobaRuin), ['left', 'center']);
    assert.equal(ruines()[1].getAttribute('aria-hidden'), 'true');
    assert.ok(center.querySelector('.moba__side--joueur').hasAttribute('inert'));
    assert.equal(center.querySelector('.moba__side--sorcier').hasAttribute('inert'), false);
    assert.ok(center.querySelector('.moba__side--sorcier [data-moba-position]'));
    assert.match(document.querySelector('[role="status"].moba__sr-only:not(.moba__combat-result)').textContent, /Voie centrale conquise par IA/);
    assert.equal(duel.moba.winner, null);
    mobaInfliger(duel.moba, 'sorcier', 'right', 30);
    await act(async () => root.render(React.createElement(Board, props)));
    assert.ok(right.classList.contains('is-conquered--sorcier'));
    assert.deepEqual(ruines().map((el) => el.dataset.mobaRuin), ['left', 'center', 'right']);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('la fiche de contre classique nomme correctement le camp MOBA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const annonce = { carteId: 'contresort-des-abimes', contre: true, cible: { nom: 'Javelot du beffroi' } };
    const vue = (camp, nomLanceur) => renderToStaticMarkup(React.createElement(RPG_RENDU_MOBA.SpellAnnouncement, { annonce, camp, nomLanceur }));
    assert.match(vue('joueur', 'Vous'), /CONTRE · VOUS/);
    assert.match(vue('sorcier', 'IA'), /CONTRE · IA/);
    assert.match(vue('sorcier'), /CONTRE DU SORCIER/, 'le libellé classique reste inchangé');
  } finally { await server.close(); }
});

test('le centre détruit reste visible après la seconde conquête sans rendre sa case jouable', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    for (const side of ['joueur', 'sorcier']) {
      const initialiser = () => {
        const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
        mobaInfliger(duel.moba, side, 'left', 20);
        assert.equal(mobaInfliger(duel.moba, side, 'center', 15).winner, side);
        return duel;
      };
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
      assert.deepEqual([...document.querySelectorAll('[data-moba-ruin]')].map((el) => el.dataset.mobaRuin), ['left', 'center']);
      assert.ok([...document.querySelectorAll('.moba__lane[aria-label="Voie centrale"] .moba__side')].every((camp) => camp.hasAttribute('inert')));
      assert.equal(document.querySelector('.moba__conquest-lock'), null);
      await act(async () => root.unmount()); root = null;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('après conquête du centre, seule la case du camp perdant est inactive', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    for (const vainqueur of ['joueur', 'sorcier']) {
      const initialiser = () => {
        const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
        mobaInfliger(duel.moba, vainqueur, 'center', 15);
        return duel;
      };
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
      const center = document.querySelector('.moba__lane[aria-label="Voie centrale"]');
      const perdant = vainqueur === 'joueur' ? 'sorcier' : 'joueur';
      assert.deepEqual([...document.querySelectorAll('[data-moba-ruin]')].map((el) => el.dataset.mobaRuin), ['center']);
      assert.equal(center.querySelector(`.moba__side--${perdant}`).hasAttribute('inert'), true);
      assert.equal(center.querySelector(`.moba__side--${vainqueur}`).hasAttribute('inert'), false);
      assert.ok(center.querySelector(`.moba__side--${vainqueur} [data-moba-position]`));
      await act(async () => root.unmount()); root = null;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
