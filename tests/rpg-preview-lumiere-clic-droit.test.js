import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const duelPageJsx = fs.readFileSync(path.join(ROOT, 'src/games/RpgDuelPage.jsx'), 'utf8');
const battleCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-battle.css'), 'utf8');

test('les aperçus ne mesurent plus le curseur et ne rendent plus de lumière', () => {
  const debut = duelPageJsx.indexOf('export function HoverCardPreview');
  const apercu = duelPageJsx.slice(debut, duelPageJsx.indexOf('function ApercuCarteAppuiLong', debut));
  assert.doesNotMatch(apercu, /requestAnimationFrame|addEventListener|--rpg-face-3d|data-preview-lumiere|getBoundingClientRect/);
  assert.doesNotMatch(battleCss, /--rpg-face-3d|\.rpg-hover-card-preview__lumiere/);
  assert.match(battleCss, /\.rpg-hover-card-preview \.rpg-hover-card-preview__face\s*\{\s*transform: none;\s*will-change: auto;\s*transition: none;/);
});

test('Rendu React + JSDOM : les aperçus restent statiques, y compris au clic droit', async () => {
  const prevEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'src/games/RpgDuelPage.jsx',
      outDir: 'node_modules/.cache/rpg-preview-lumiere',
      emptyOutDir: true,
    },
  });
  if (prevEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prevEnv;

  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
    { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true },
  );
  const saved = {};
  for (const cle of [
    'window', 'document', 'navigator', 'HTMLElement', 'SVGElement', 'Node',
    'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent',
    'localStorage', 'sessionStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'ResizeObserver', 'IntersectionObserver', 'matchMedia',
  ]) {
    saved[cle] = Object.getOwnPropertyDescriptor(globalThis, cle);
  }
  const definir = (cle, valeur) => Object.defineProperty(globalThis, cle, {
    value: valeur, configurable: true, writable: true,
  });

  definir('window', dom.window);
  definir('document', dom.window.document);
  definir('navigator', dom.window.navigator);
  definir('HTMLElement', dom.window.HTMLElement);
  definir('SVGElement', dom.window.SVGElement);
  definir('Node', dom.window.Node);
  definir('Event', dom.window.Event);
  definir('MouseEvent', dom.window.MouseEvent);
  definir('KeyboardEvent', dom.window.KeyboardEvent);
  definir('CustomEvent', dom.window.CustomEvent);
  definir('localStorage', dom.window.localStorage);
  definir('sessionStorage', dom.window.sessionStorage);
  definir('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  definir('requestAnimationFrame', (cb) => dom.window.setTimeout(() => cb(Date.now()), 0));
  definir('cancelAnimationFrame', (id) => dom.window.clearTimeout(id));
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
  definir('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  definir('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  const matchMediaMock = (query) => ({
    matches: query.includes('pointer: fine') || query.includes('hover: hover'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  definir('matchMedia', matchMediaMock);
  dom.window.matchMedia = matchMediaMock;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  // Contourne le coffret de bienvenue pour arriver directement sur le menu
  dom.window.localStorage.setItem('sablier_bienvenue_v1', JSON.stringify({ recu: true }));

  const React = await import('react');
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const { HoverCardPreview } = await import('../node_modules/.cache/rpg-preview-lumiere/RpgDuelPage.js');
  const { cardById } = await import('../src/games/rpgCards.js');

  const host = dom.window.document.getElementById('root');
  const root = createRoot(host);

  try {
    for (const variante of ['', 'appui-long', 'catalogue', 'annonce', 'graveyard']) {
      await act(async () => {
        root.render(React.createElement(HoverCardPreview, {
          carte: cardById('braisier-du-souk'), variante,
          lumiereSouris: { x: 500, y: 320 },
        }));
      });
      const face = host.querySelector('.rpg-hover-card-preview__face');
      if (!variante) {
        assert.ok(host.querySelector('.rpg-hover-card-preview--texte-seul'));
        assert.equal(face, null, 'le survol rapide reste textuel');
        continue;
      }
      assert.ok(face, `${variante} : illustration conservée`);
      assert.equal(host.querySelector('[data-preview-lumiere]'), null);
      let mesures = 0;
      face.getBoundingClientRect = () => {
        mesures++;
        return { left: 400, top: 200, width: 280, height: 350 };
      };
      await act(async () => {
        for (const type of ['pointermove', 'mousemove']) {
          dom.window.dispatchEvent(new dom.window.MouseEvent(type, { clientX: 610, clientY: 270 }));
        }
        await new Promise(r => setTimeout(r, 25));
      });
      assert.equal(mesures, 0, `${variante} : aucune mesure au mouvement du curseur`);
      assert.equal(face.classList.contains('is-suit-la-souris'), false);
      for (const variable of ['--rpg-lumiere-x', '--rpg-lumiere-y', '--rpg-lumiere-angle', '--rpg-face-3d-x', '--rpg-face-3d-y']) {
        assert.equal(face.style.getPropertyValue(variable), '');
      }
    }
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
    for (const [cle, desc] of Object.entries(saved)) {
      if (desc) Object.defineProperty(globalThis, cle, desc);
      else delete globalThis[cle];
    }
  }
});
