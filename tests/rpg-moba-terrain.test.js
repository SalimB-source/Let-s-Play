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

test('les chaînes remplissent la voie conquise et le verrou reste au centre à toute taille', async () => {
  const css = await readFile(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /\.moba__conquest-chains \{[^}]*inset: 0; width: 100%; height: 100%/);
  assert.match(css, /\.moba__conquest-lock \{[^}]*top: 50%; left: 50%; transform: translate\(-50%, -50%\)/);
  assert.match(css, /\.moba__conquest \{[^}]*pointer-events: none/);
  assert.match(css, /\.moba__lane\.is-conquered \.moba__side\.is-joined-center \{[^}]*z-index: 3/);
  assert.match(css, /\.moba__conquest-links ellipse \{[^}]*stroke: #ead2a1/);
  assert.match(css, /container-type:\s*size/);
  assert.match(css, /hypot\(100cqw, 100cqh\)/);
  assert.match(css, /atan2\(100cqh, 100cqw\)/);
  const chain = await readFile(new URL('../public/sablier-moba/chaine-fer.png', import.meta.url));
  assert.equal(chain.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(chain[25], 6, 'PNG RGBA à fond transparent');
  const icon = await readFile(new URL('../public/icons/sablier/verrou-voie.svg', import.meta.url), 'utf8');
  const dom = new JSDOM(icon, { contentType: 'image/svg+xml' });
  try {
    assert.ok(dom.window.document.querySelector('svg[viewBox="0 0 72 92"]'));
    assert.ok(dom.window.document.querySelector('path[fill="#17120e"]'), 'trou de serrure visible');
  } finally { dom.window.close(); }
});

test('une voie conquise affiche les chaînes et le verrou du bon camp sans désactiver les autres voies', async () => {
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
    const barrage = left.querySelector('.moba__conquest');
    const chaines = barrage.querySelector('.moba__conquest-chains');
    const photos = barrage.querySelectorAll('.moba__conquest-photo-chain');
    assert.equal(photos.length, 2);
    for (const photo of photos) assert.match(photo.getAttribute('src'), /sablier-moba\/chaine-fer\.png$/);
    assert.equal(chaines.querySelectorAll('.moba__conquest-chain-core').length, 1);
    assert.equal(chaines.querySelectorAll('.moba__conquest-links ellipse').length, 42, 'deux chaînes de maillons en diagonales');
    assert.match(chaines.querySelector('.moba__conquest-chain-core').getAttribute('d'), /M5 5 95 95 M95 5 5 95/);
    assert.match(barrage.querySelector('.moba__conquest-lock img').getAttribute('src'), /icons\/sablier\/verrou-voie\.svg$/);
    assert.equal(barrage.getAttribute('aria-hidden'), 'true', 'le décor ne double pas l’annonce accessible');
    assert.ok([...left.querySelectorAll('.moba__side')].every((side) => side.hasAttribute('inert') && side.getAttribute('aria-hidden') === 'true'));
    assert.ok([...left.querySelectorAll('button')].every((button) => button.disabled));
    assert.ok(!center.querySelector('.moba__conquest'));
    assert.ok(!center.querySelector('.moba__side').hasAttribute('inert'));
    assert.match(document.querySelector('[role="status"].moba__sr-only:not(.moba__combat-result)').textContent, /Voie gauche conquise par Vous ; voie fermée/);
    assert.equal(duel.moba.winner, null);
    assert.equal(mobaInfliger(duel.moba, 'sorcier', 'center', 15).conquered, true);
    await act(async () => root.render(React.createElement(Board, props)));
    assert.ok(center.classList.contains('is-conquered--sorcier'));
    const sceauCentre = center.querySelector('.moba__conquest');
    assert.ok(sceauCentre, 'la voie centrale reçoit aussi le sceau');
    assert.equal(sceauCentre.querySelectorAll('.moba__conquest-photo-chain').length, 2);
    assert.equal(sceauCentre.querySelectorAll('.moba__conquest-links ellipse').length, 42);
    assert.match(sceauCentre.querySelector('.moba__conquest-lock img').getAttribute('src'), /icons\/sablier\/verrou-voie\.svg$/);
    assert.match(sceauCentre.textContent, /Voie conquise.*L’IA.*Case sur les flancs/);
    assert.equal(sceauCentre.getAttribute('aria-hidden'), 'true');
    assert.equal(center.querySelector('.moba__side--sorcier').hasAttribute('inert'), false);
    assert.ok(center.querySelector('.moba__side--sorcier').classList.contains('is-joined-center'));
    assert.equal(center.querySelector('.moba__side--joueur').getAttribute('aria-hidden'), 'true');
    assert.match(document.querySelector('[role="status"].moba__sr-only:not(.moba__combat-result)').textContent, /Voie centrale conquise par IA ; présence sur les deux voies latérales actives/);
    assert.ok(!right.querySelector('.moba__conquest'));
    assert.equal(duel.moba.winner, null, 'une voie par camp ne termine pas la partie');
    mobaInfliger(duel.moba, 'sorcier', 'right', 30);
    await act(async () => root.render(React.createElement(Board, props)));
    assert.ok(right.classList.contains('is-conquered--sorcier'));
    assert.equal(right.querySelectorAll('.moba__conquest-links ellipse').length, 42);
    assert.ok(right.querySelector('.moba__conquest-lock img'));
    assert.match(right.querySelector('.moba__conquest-owner').textContent, /L’IA/);
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

test('le centre fermé en seconde conquête porte le verrou même sans case conservée', async () => {
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
        assert.equal(mobaInfliger(duel.moba, side, 'left', 20).conquered, true);
        assert.equal(mobaInfliger(duel.moba, side, 'center', 15).winner, side);
        assert.equal(duel.moba.centerJoined, null);
        return duel;
      };
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser })));
      const center = document.querySelector('.moba__lane[aria-label="Voie centrale"]');
      const sceau = center.querySelector('.moba__conquest');
      assert.ok(sceau.querySelector('.moba__conquest-lock img'));
      assert.equal(sceau.querySelectorAll('.moba__conquest-photo-chain').length, 2);
      assert.match(sceau.textContent, side === 'joueur' ? /VOUS.*Voie fermée/ : /L’IA.*Voie fermée/);
      assert.ok([...center.querySelectorAll('.moba__side')].every((camp) => camp.hasAttribute('inert')));
      await act(async () => root.unmount());
      root = null;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
