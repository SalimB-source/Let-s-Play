import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

import { GAINS } from '../src/games/rpgCredits.js';
import { QUETES } from '../src/games/rpgQuetes.js';
import {
  METAUX_COFFRE, ORDRE_METAUX, SEUIL_ARGENT, SEUIL_OR,
  libelleCoffre, metalPourGain, paletteCoffre,
} from '../src/games/rpgCoffreMetal.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function installerDom() {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return dom;
}

/* ── Le palier : le métal suit le gain, jamais le hasard ─────────────────── */

test('le métal monte avec le gain : bronze, puis argent, puis or', () => {
  assert.equal(metalPourGain(55), 'bronze');
  assert.equal(metalPourGain(60), 'bronze');
  assert.equal(metalPourGain(SEUIL_ARGENT - 1), 'bronze', 'la veille du seuil, on est encore bronze');
  assert.equal(metalPourGain(SEUIL_ARGENT), 'argent', 'le seuil est inclus');
  assert.equal(metalPourGain(70), 'argent');
  assert.equal(metalPourGain(SEUIL_OR - 1), 'argent');
  assert.equal(metalPourGain(SEUIL_OR), 'or');
  assert.equal(metalPourGain(100), 'or');
});

test('un gain inconnu retombe sur le bronze, jamais sur l’or', () => {
  for (const flou of [null, undefined, NaN, 'abc', {}, Infinity]) {
    assert.equal(metalPourGain(flou), 'bronze', `gain ${String(flou)} : pas de promesse d’or`);
  }
  assert.equal(paletteCoffre('platine').id, 'bronze', 'un métal inconnu retombe sur une palette existante');
});

test('les seuils tombent entre les récompenses réelles, pas au milieu d’une valeur', () => {
  const gains = [...new Set(QUETES.map((q) => q.recompense))].sort((a, b) => a - b);
  for (const seuil of [SEUIL_ARGENT, SEUIL_OR]) {
    assert.ok(!gains.includes(seuil - 0.5), 'les gains sont entiers');
    assert.ok(gains.some((g) => g < seuil), `des quêtes paient moins que ${seuil}`);
    assert.ok(gains.some((g) => g >= seuil), `des quêtes paient au moins ${seuil}`);
  }
  // Les trois métaux sont réellement représentés dans le pool du jour.
  const employes = new Set(QUETES.map((q) => metalPourGain(q.recompense)));
  assert.deepEqual([...employes].sort(), ['argent', 'bronze', 'or']);
});

test('plus une quête paie, plus son métal est noble — jamais l’inverse', () => {
  const rang = (m) => ORDRE_METAUX.indexOf(m);
  const tries = [...QUETES].sort((a, b) => a.recompense - b.recompense);
  for (let i = 1; i < tries.length; i += 1) {
    assert.ok(
      rang(metalPourGain(tries[i].recompense)) >= rang(metalPourGain(tries[i - 1].recompense)),
      `${tries[i].id} paie plus que ${tries[i - 1].id} mais son métal est moindre`,
    );
  }
});

test('le Cachet et la Semaine sont en or, et le métal se dit aussi en toutes lettres', () => {
  assert.equal(metalPourGain(GAINS.cachetDuCycle), 'or');
  assert.equal(metalPourGain(GAINS.cachetDeLaSemaine), 'or');
  assert.equal(libelleCoffre(60), 'coffre de bronze');
  assert.equal(libelleCoffre(70), "coffre d'argent");
  assert.equal(libelleCoffre(100), "coffre d'or");
});

test('les trois palettes sont complètes et distinctes', () => {
  assert.deepEqual(ORDRE_METAUX, ['bronze', 'argent', 'or']);
  const empreintes = new Set();
  for (const id of ORDRE_METAUX) {
    const p = METAUX_COFFRE[id];
    assert.equal(p.id, id);
    for (const cle of ['face', 'cote', 'dessus', 'bande', 'lueur', 'gemme']) {
      assert.ok(Array.isArray(p[cle]) && p[cle].length >= 2, `${id}.${cle} est un dégradé`);
      for (const couleur of p[cle]) assert.match(couleur, /^#[0-9a-f]{6}$/i, `${id}.${cle} : couleur hexa`);
    }
    assert.match(p.reflet, /^#[0-9a-f]{6}$/i);
    empreintes.add(p.face.join('|'));
  }
  assert.equal(empreintes.size, 3, 'les trois métaux ne partagent pas la même matière');
});

/* ── Le dessin : le composant rend vraiment les trois coffres ────────────── */

test('le coffre rendu porte son métal, sa matière et son état', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom', logLevel: 'silent',
  });
  try {
    const { default: RpgCoffreDore } = await vite.ssrLoadModule('/src/games/RpgCoffreDore.jsx');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const clics = [];
    await act(async () => {
      root.render(React.createElement('div', null, [
        React.createElement(RpgCoffreDore, { key: 'b', etat: 'encours', montant: 60 }),
        React.createElement(RpgCoffreDore, { key: 'a', etat: 'encours', montant: 70 }),
        React.createElement(RpgCoffreDore, { key: 'o', etat: 'pret', montant: 100, onClick: () => clics.push('or') }),
        React.createElement(RpgCoffreDore, { key: 'v', etat: 'ouvert', montant: 80, sousTitre: 'Cachet' }),
      ]));
    });
    await act(async () => { await wait(20); });

    try {
      const coffres = [...container.querySelectorAll('[data-coffre-dore]')];
      assert.equal(coffres.length, 4);
      assert.deepEqual(coffres.map((c) => c.dataset.coffreMetal), ['bronze', 'argent', 'or', 'or']);
      assert.deepEqual(coffres.map((c) => c.dataset.coffreDore), ['encours', 'encours', 'pret', 'ouvert']);

      // Chaque coffre peint sa propre matière : aucun dégradé partagé.
      const tete = (c) => c.querySelector('linearGradient stop')?.getAttribute('stop-color');
      assert.deepEqual(coffres.slice(0, 3).map(tete), [
        METAUX_COFFRE.bronze.face[0], METAUX_COFFRE.argent.face[0], METAUX_COFFRE.or.face[0],
      ]);
      const refs = coffres.map((c) => c.querySelector('linearGradient')?.id);
      assert.equal(new Set(refs).size, 4, 'les identifiants de dégradés ne se percutent pas');

      // Le volume : flanc, dessus du couvercle, ferrures, serrure, pierre.
      const or = coffres[2];
      assert.ok(or.querySelector('.rpg-coffre-dore__couvercle'), 'le couvercle est un groupe à part');
      assert.ok(or.querySelector('.rpg-coffre-dore__serrure'), 'la platine de serrure est dessinée');
      assert.ok(or.querySelector('.rpg-coffre-dore__gemme'), 'une pierre est sertie sur le couvercle');
      assert.ok(or.querySelector('.rpg-coffre-dore__butin'), 'du butin attend dedans');
      assert.ok(or.querySelector('clipPath'), 'les ferrures sont découpées par la silhouette');
      assert.ok(or.querySelector('.rpg-coffre-dore__ombre'), 'le coffre est assis sur son ombre');

      // Prêt = bouton ; verrouillé = simple dessin, pas un bouton mort.
      assert.equal(coffres[0].tagName, 'DIV', 'un coffre verrouillé n’est pas cliquable');
      assert.equal(or.tagName, 'BUTTON');
      await act(async () => { or.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
      assert.deepEqual(clics, ['or']);

      // Ouvert : la coche est un SVG, pas un glyphe qui peut manquer.
      const ouvert = coffres[3];
      assert.ok(ouvert.querySelector('.rpg-coffre-dore__coche path'), 'la coche est tracée');
      assert.equal(ouvert.querySelector('.rpg-coffre-dore__sous')?.textContent, 'Cachet');
      assert.equal(ouvert.dataset.coffreDoreMontant, '80');

      // Les identifiants du coffre restent valides dans un url(#…) : `useId`
      // sort des deux-points, qui casseraient la référence au dégradé.
      for (const c of coffres) {
        const siens = [...c.querySelectorAll('linearGradient, radialGradient, clipPath')]
          .filter((g) => g.id.startsWith('coffre-'));
        assert.ok(siens.length >= 8, 'le coffre porte bien ses propres dégradés et découpes');
        for (const g of siens) {
          assert.match(g.id, /^[A-Za-z0-9-]+$/, `identifiant SVG utilisable : ${g.id}`);
        }
        for (const g of c.querySelectorAll('[id]')) {
          assert.ok(!g.id.includes(':'), `pas de deux-points dans ${g.id}`);
        }
      }
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});

test('le métal forcé l’emporte sur le gain, et le CSS accorde le halo au métal', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom', logLevel: 'silent',
  });
  try {
    const { default: RpgCoffreDore } = await vite.ssrLoadModule('/src/games/RpgCoffreDore.jsx');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(RpgCoffreDore, { etat: 'pret', montant: 60, metal: 'or' }));
    });
    try {
      const coffre = container.querySelector('[data-coffre-dore]');
      assert.equal(coffre.dataset.coffreMetal, 'or', 'le métal imposé gagne');
      assert.equal(coffre.querySelector('linearGradient stop')?.getAttribute('stop-color'), METAUX_COFFRE.or.face[0]);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }

  // Le halo, les éclats et la plaquette suivent le métal, pas une or fixe.
  const css = await import('node:fs').then((fs) => fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8'));
  for (const metal of ORDRE_METAUX) {
    assert.match(css, new RegExp(`\\[data-coffre-metal='${metal}'\\]`), `le CSS connaît le métal ${metal}`);
  }
  assert.match(css, /background:\s*radial-gradient\(circle,\s*var\(--coffre-halo-fort\)/, 'le halo prend la couleur du métal');
  assert.match(css, /\.rpg-coffre-dore__eclats\s*\{[^}]*fill:\s*var\(--coffre-eclat\)/, 'les éclats aussi');
  assert.match(css, /\.rpg-coffre-dore__montant\s*\{[^}]*color:\s*var\(--coffre-plaque-texte\)/s, 'la plaquette aussi');
});
