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
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {} })));
    assert.match(document.querySelector('.moba').style.getPropertyValue('--moba-map'), /sablier-moba\/champ-trois-voies-rapprochees\.webp/);
    const lanes = [...document.querySelectorAll('.moba__lane')];
    assert.deepEqual(lanes.map((lane) => lane.getAttribute('aria-label')), ['Voie gauche', 'Voie centrale', 'Voie droite']);
    assert.deepEqual(lanes.map((lane) => lane.querySelectorAll('[data-moba-position]').length), [4, 2, 4]);
    const click = async (button) => { assert.ok(button && !button.disabled); await act(async () => button.click()); };
    await click([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Commencer le duel')));
    await click([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Garder ma main')));
    assert.ok(document.querySelector('.moba__choice button'));
    await click(document.querySelector('.moba__choice button'));
    assert.equal(document.querySelector('.moba__choice'), null);
    assert.equal(document.querySelectorAll('.moba__lane').length, 3);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('une voie conquise affiche le sceau du bon camp sans désactiver les autres voies', async () => {
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
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('gardienne-des-portes-de-sable'), sorcierDeck: Array(30).fill('gardienne-des-portes-de-sable'), joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng: () => .5 }));
    const props = { onQuitter: () => {}, initialiser };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    assert.equal(document.querySelectorAll('.moba__conquest').length, 0);
    mobaInfliger(duel.moba, 'joueur', 'left', 20);
    await act(async () => root.render(React.createElement(Board, props)));
    const [left, center, right] = document.querySelectorAll('.moba__lane');
    assert.ok(left.classList.contains('is-conquered--joueur'));
    assert.match(left.querySelector('.moba__conquest').textContent, /Voie conquise.*VOUS.*Voie fermée/);
    assert.match(left.querySelector('.moba__conquest img').getAttribute('src'), /icons\/sablier\/conquete\.svg$/);
    assert.ok([...left.querySelectorAll('.moba__side')].every((side) => side.hasAttribute('inert') && side.getAttribute('aria-hidden') === 'true'));
    assert.ok([...left.querySelectorAll('button')].every((button) => button.disabled));
    assert.ok(!center.querySelector('.moba__conquest'));
    assert.ok(!center.querySelector('.moba__side').hasAttribute('inert'));
    assert.match(document.querySelector('[role="status"].moba__sr-only:not(.moba__combat-result)').textContent, /Voie gauche conquise par Vous ; voie fermée/);
    assert.equal(duel.moba.winner, null);
    mobaInfliger(duel.moba, 'sorcier', 'center', 10);
    await act(async () => root.render(React.createElement(Board, props)));
    assert.ok(center.classList.contains('is-conquered--sorcier'));
    assert.equal(center.querySelector('.moba__conquest'), null, 'le centre ne reçoit pas le sceau d’une voie définitivement fermée');
    const { mobaRattacherCentre } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    assert.equal(mobaRattacherCentre(duel.moba, 'sorcier', 'right').ok, true);
    await act(async () => root.render(React.createElement(Board, props)));
    assert.equal(center.querySelector('.moba__side--sorcier').hasAttribute('inert'), false);
    assert.equal(center.querySelector('.moba__side--joueur').getAttribute('aria-hidden'), 'true');
    assert.match(document.querySelector('[role="status"].moba__sr-only:not(.moba__combat-result)').textContent, /Voie centrale conquise par IA ; centre rattaché à Voie droite/);
    assert.ok(!right.querySelector('.moba__conquest'));
    assert.equal(duel.moba.winner, null, 'une voie par camp ne termine pas la partie');
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
