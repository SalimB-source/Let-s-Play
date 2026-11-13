import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tailleBadgesMoba } from '../src/games/rpgMobaBadgeFit.js';

const boite = (top, height, width = 70) => ({ top, height, width, bottom: top + height });
const mesurer = (nombre, hauteurCarte, taille = 16, top = 5) => {
  const badges = Array.from({ length: nombre }, (_, i) => ({
    getBoundingClientRect: () => boite(top + i * (taille + 2), taille),
  }));
  const colonne = { children: badges, getBoundingClientRect: () => boite(top, nombre * (taille + 2)) };
  const carte = { getBoundingClientRect: () => boite(0, hauteurCarte) };
  return tailleBadgesMoba(colonne, carte);
};

test('1 à 3 effets restent inchangés ; quatre qui tiennent aussi', () => {
  assert.equal(mesurer(3, 55), null);
  assert.equal(mesurer(4, 95), null);
});

test('plus de trois effets qui débordent : réduction à la hauteur disponible', () => {
  const ajustement = mesurer(4, 62);
  assert.deepEqual({ colonnes: ajustement.colonnes, lignes: ajustement.lignes }, { colonnes: 1, lignes: 4 });
  assert.ok(ajustement.taille < 16);
  assert.ok(5 + ajustement.lignes * ajustement.taille <= 62 - 2);
});

test('beaucoup d’effets : deux colonnes sans débord vertical ni horizontal', () => {
  const ajustement = mesurer(8, 70);
  assert.equal(ajustement.colonnes, 2);
  assert.equal(ajustement.lignes, 4);
  assert.ok(5 + ajustement.lignes * ajustement.taille <= 68);
  assert.ok(ajustement.colonnes * ajustement.taille <= 70 - 4);
});

test('mise en page commune : statistiques en colonne à gauche sur les créatures mobiles', () => {
  const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  const mobile = css.slice(css.lastIndexOf('/* Sur mobile, les créatures posées du duel'));
  assert.match(mobile, /@media \(max-width: 700px\), \(hover: none\) and \(pointer: coarse\)/);
  const duelMobile = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
  assert.match(duelMobile, /\.rpg-card--img \.rpg-card__foot,\s*\.rpg-hand__card--img \.rpg-hand__stats\s*\{\s*display: grid !important;\s*grid-template-columns: repeat\(2,/);
  // Le footer est déjà une grille !important : flex-direction n'a aucun effet.
  // Il faut remplacer explicitement les deux colonnes par une seule.
  assert.match(mobile, /\.moba__real-slot \.rpg-card--img \.rpg-card__foot\s*\{[^}]*left: 5%;[^}]*right: auto;[^}]*grid-template-columns: max-content;[^}]*grid-template-rows: auto auto;/s);
  assert.match(mobile, /\.moba__real-slot \.rpg-card--img \.rpg-card__foot > :is\(\.rpg-card__stat--atk, \.rpg-card__pt\)\s*\{\s*font-size: clamp\(9px, 16cqw, 14px\);/);
  assert.match(mobile, /\.moba__slot-label small\s*\{[^}]*font-size: 11px;/s);
  assert.match(mobile, /\.rpg-card-icones--colonne:has\(\.rpg-card-icone:nth-child\(4\)\)/);
  assert.match(mobile, /\.moba__slots \.rpg-card \.rpg-card-icones--colonne\.is-moba-compact-overflow/);
  assert.match(mobile, /\[data-scene="duel"\] \.card-table > \.card-row \.rpg-card--img \.rpg-card__foot/);
  assert.match(css, /--moba-card-size: min\(17vw, 11\.3vh, 86px\)/);
  assert.match(css, /--moba-card-size: min\(12\.6vw, 16\.5vh, 196px\)/);
});

test('badges React : réduction seulement sur la carte MOBA qui déborde, puis retour à la taille normale', async () => {
  const { JSDOM } = await import('jsdom');
  const { createServer } = await import('vite');
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  const oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = () => ({ matches: true });
  let hauteurCarte = 64;
  dom.window.Element.prototype.getBoundingClientRect = function () {
    if (this.matches('.rpg-card')) return boite(0, hauteurCarte, 64);
    if (this.matches('.rpg-card-icones')) return boite(5, 0);
    if (this.matches('.rpg-card-icone')) {
      const index = [...this.parentElement.children].indexOf(this);
      return boite(5 + index * 18, 16);
    }
    return boite(0, 0);
  };
  let root, server;
  try {
    server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    const { IconesCarte } = await server.ssrLoadModule('/src/games/effetIcons.jsx');
    const { cardById } = await server.ssrLoadModule('/src/games/rpgCards.js');
    root = createRoot(document.getElementById('root'));
    const render = async (id, zone = 'moba__real-slot') => {
      await React.act(async () => root.render(React.createElement('div', { className: zone },
        React.createElement('div', { className: 'rpg-card' },
          React.createElement(IconesCarte, { carte: cardById(id), className: 'rpg-card-icones--colonne' })))));
      return document.querySelector('.rpg-card-icones');
    };
    const compacts = await render('tojiro-le-pourfendeur');
    assert.equal(compacts.children.length, 4);
    assert.ok(compacts.classList.contains('is-moba-compact-overflow'));
    assert.equal(compacts.style.getPropertyValue('--moba-effect-size'), '14px');
    hauteurCarte = 95;
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event('resize')));
    assert.equal(compacts.classList.contains('is-moba-compact-overflow'), false, 'quatre icônes qui tiennent restent intactes');
    hauteurCarte = 64;
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event('resize')));
    assert.equal(compacts.classList.contains('is-moba-compact-overflow'), true);
    const simples = await render('chacal-du-seuil');
    assert.equal(simples.classList.contains('is-moba-compact-overflow'), false);
    const horsPlateau = await render('tojiro-le-pourfendeur', 'rpg-hand__card');
    assert.equal(horsPlateau.classList.contains('is-moba-compact-overflow'), false);
  } finally {
    if (root) await React.act(async () => root.unmount());
    await server?.close();
    dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct;
  }
});
