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
const soukCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-souk.css'), 'utf8');
const atelierCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-deck-atelier.css'), 'utf8');

test('Reflet lumineux souris : défini uniquement pour .rpg-hover-card-preview__lumiere (preview clic droit)', () => {
  const matchLumiere = battleCss.match(/\.rpg-hover-card-preview__lumiere\s*\{([^}]*)\}/);
  assert.ok(matchLumiere, '.rpg-hover-card-preview__lumiere est défini dans rpg-battle.css');
  const corps = matchLumiere[1];
  assert.match(corps, /radial-gradient\([\s\S]*var\(--rpg-lumiere-x/,
    'le point lumineux suit horizontalement la souris (--rpg-lumiere-x)');
  assert.match(corps, /var\(--rpg-lumiere-y/,
    'le point lumineux suit verticalement la souris (--rpg-lumiere-y)');
  assert.match(corps, /linear-gradient\([\s\S]*var\(--rpg-lumiere-angle/,
    'l’écharpe irisée pivote avec la souris (--rpg-lumiere-angle)');
  assert.match(corps, /mix-blend-mode:\s*screen\s*;/,
    'le reflet s’additionne en lumière screen sur l’illustration');

  assert.doesNotMatch(soukCss, /--rpg-lumiere-/, 'les cartes posées au Souk n’utilisent pas le calque de preview clic droit');
  assert.doesNotMatch(atelierCss, /--rpg-lumiere-/, 'les cartes de l’atelier n’utilisent pas le calque de preview clic droit');
  assert.match(duelPageJsx, /surMenuContextuel[\s\S]{0,1200}?clicDroit:\s*\{/,
    'seul surMenuContextuel (clic droit) active clicDroit sur l’aperçu');
});

test('Rendu React + JSDOM : le reflet qui suit la souris n’apparaît QUE sur les previews clic droit', async () => {
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
  const { default: RpgDuelPage, HoverCardPreview } = await import('../node_modules/.cache/rpg-preview-lumiere/RpgDuelPage.js');
  const { cardById } = await import('../src/games/rpgCards.js');

  const host = dom.window.document.getElementById('root');
  const root = createRoot(host);

  try {
    // 1. HoverCardPreview seul (aperçu de survol / appui long / annonce) : AUCUN reflet lumineux
    await act(async () => {
      root.render(React.createElement(HoverCardPreview, { carte: cardById('salem'), variante: 'appui-long' }));
    });
    assert.equal(host.querySelector('[data-preview-lumiere]'), null,
      'l’aperçu d’appui long ne porte pas le reflet lumineux');

    // 2. Montage complet de la page Le Sablier : comparaison clic gauche Catalogue vs clic droit Catalogue & Souk
    await act(async () => {
      root.render(React.createElement(RpgDuelPage, { rng: () => 0.999 }));
      await new Promise((r) => setTimeout(r, 40));
    });

    const btnCatalogue = [...host.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((b) => b.getAttribute('aria-label') === 'Catalogue');
    assert.ok(btnCatalogue, 'onglet Catalogue trouvé');
    await act(async () => {
      btnCatalogue.click();
      await new Promise((r) => setTimeout(r, 40));
    });

    const boutonOuvrirCatalogue = host.querySelector('.rpg-card-catalogue__ouvrir');
    assert.ok(boutonOuvrirCatalogue, 'carte du Catalogue présente');

    // 2a. Clic gauche au Catalogue -> ouvre la fiche SANS le reflet lumineux
    await act(async () => {
      boutonOuvrirCatalogue.click();
    });
    const ficheClicGauche = host.querySelector('.rpg-card-peek');
    assert.ok(ficheClicGauche, 'le clic gauche au Catalogue ouvre la fiche');
    assert.equal(ficheClicGauche.getAttribute('data-clic-droit'), null,
      'la fiche ouverte au clic gauche n’est pas marquée clic droit');
    assert.equal(ficheClicGauche.querySelector('[data-preview-lumiere]'), null,
      'la fiche ouverte au clic gauche n’affiche PAS le reflet lumineux');

    await act(async () => {
      ficheClicGauche.querySelector('.rpg-card-peek__close').click();
    });
    assert.equal(host.querySelector('.rpg-card-peek'), null, 'la fiche se referme');

    // 2b. Clic droit au Catalogue -> ouvre la fiche AVEC reflet lumineux
    const carteCatalogue = host.querySelector('.rpg-card-catalogue__card[data-card-id]');
    await act(async () => {
      carteCatalogue.dispatchEvent(new dom.window.MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, button: 2, clientX: 500, clientY: 320,
      }));
    });
    assert.ok(host.querySelector('.rpg-card-peek[data-clic-droit="true"] [data-preview-lumiere]'),
      'le clic droit au Catalogue active le reflet lumineux');
    await act(async () => {
      host.querySelector('.rpg-card-peek__close').click();
    });

    // 2c. Clic droit au Souk (sur une carte à l’unité) -> ouvre la fiche AVEC reflet lumineux qui suit la souris
    const btnSouk = host.querySelector('[data-souk-onglet]');
    assert.ok(btnSouk, 'onglet Souk trouvé');
    await act(async () => {
      btnSouk.click();
    });

    const carteDirecteSouk = host.querySelector('.rpg-souk__direct-carte[data-card-id]');
    assert.ok(carteDirecteSouk, 'carte à l’unité au Souk présente');

    await act(async () => {
      carteDirecteSouk.dispatchEvent(new dom.window.MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, button: 2, clientX: 460, clientY: 320,
      }));
    });

    const ficheClicDroit = host.querySelector('.rpg-card-peek');
    assert.ok(ficheClicDroit, 'le clic droit sur une carte du Souk ouvre sa preview');
    assert.equal(ficheClicDroit.getAttribute('data-clic-droit'), 'true',
      'la preview ouverte au clic droit porte data-clic-droit="true"');
    const calqueLumiere = ficheClicDroit.querySelector('[data-preview-lumiere]');
    assert.ok(calqueLumiere,
      'la preview ouverte au clic droit monte le calque .rpg-hover-card-preview__lumiere');

    const face = ficheClicDroit.querySelector('.rpg-hover-card-preview__face');
    face.getBoundingClientRect = () => ({
      left: 400, top: 200, width: 280, height: 350, right: 680, bottom: 550,
    });

    await act(async () => {
      dom.window.dispatchEvent(new dom.window.MouseEvent('mousemove', {
        bubbles: true, clientX: 610, clientY: 270,
      }));
      await new Promise((r) => setTimeout(r, 25));
    });

    assert.ok(face.classList.contains('is-suit-la-souris'),
      'la face de la preview clic droit suit la souris');
    assert.equal(face.style.getPropertyValue('--rpg-lumiere-x'), '75.0%',
      'la coordonnée horizontale de la lumière suit la position de la souris sur la carte');
    assert.equal(face.style.getPropertyValue('--rpg-lumiere-y'), '20.0%',
      'la coordonnée verticale de la lumière suit la position de la souris sur la carte');
    assert.notEqual(face.style.getPropertyValue('--rpg-lumiere-angle'), '',
      'l’angle du faisceau irisé pivote avec la souris');
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
    for (const [cle, desc] of Object.entries(saved)) {
      if (desc) Object.defineProperty(globalThis, cle, desc);
      else delete globalThis[cle];
    }
  }
});
