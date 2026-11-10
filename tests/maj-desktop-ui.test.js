/**
 * Le panneau de mise à jour de la coque PC, monté pour de vrai dans le jeu.
 *
 * Les règles (store, pont, câblage IPC) sont tenues par `tests/maj-desktop.test.js`.
 * Ici on vérifie ce que le joueur voit : la pastille apparaît quand une version
 * est disponible, le panneau s'ouvre, « Télécharger » lance le téléchargement,
 * la barre de progression suit, et « Redémarrer et installer » commande la
 * coque. Hors coque PC, le composant ne rend rien.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

function installerDom() {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body></body></html>', {
    url: 'https://let-s-play-nu.vercel.app/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  return dom;
}

/** Un pont de coque factice posé sur window, avec ses ordres journalisés. */
function poserPontFactice(dom) {
  const journal = [];
  let ecouteurEtat = null;
  let ecouteurOuverture = null;
  dom.window.letsPlayDesktop = {
    isDesktop: true,
    maj: {
      etat: async () => { journal.push('etat'); return { phase: 'repos', versionInstallee: '1.0.8' }; },
      verifier: async () => { journal.push('verifier'); },
      telecharger: async () => { journal.push('telecharger'); },
      installer: async () => { journal.push('installer'); },
      surEtat: (cb) => { ecouteurEtat = cb; return () => { ecouteurEtat = null; }; },
      surOuverture: (cb) => { ecouteurOuverture = cb; return () => { ecouteurOuverture = null; }; },
    },
  };
  return {
    journal,
    diffuser: (etat) => ecouteurEtat?.(etat),
    ouvrir: () => ecouteurOuverture?.(),
  };
}

test('hors coque PC, le panneau ne rend rien', async () => {
  const dom = installerDom();
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();
    await act(async () => { racine.render(React.createElement(RpgMiseAJour)); });
    assert.equal(conteneur.querySelector('.rpg-maj'), null);
    assert.equal(conteneur.querySelector('.rpg-maj__pastille'), null);
  } finally {
    await act(async () => { racine.unmount(); });
    await vite.close();
    dom.window.close();
  }
});

test('la pastille apparaît, le panneau s’ouvre, télécharger puis installer commandent la coque', async () => {
  const dom = installerDom();
  const pont = poserPontFactice(dom);
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();

    await act(async () => { racine.render(React.createElement(RpgMiseAJour)); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Une nouvelle version arrive : le panneau s'ouvre tout seul.
    await act(async () => { pont.diffuser({ phase: 'disponible', version: '1.0.9', datePublication: '2026-11-03T10:00:00.000Z' }); });
    const panneau = conteneur.querySelector('.rpg-maj');
    assert.ok(panneau, 'le panneau s’ouvre sur une nouvelle version');
    assert.equal(panneau.getAttribute('role'), 'dialog');
    assert.match(conteneur.textContent, /1\.0\.9/);
    assert.match(conteneur.textContent, /3 novembre 2026/, 'la date de publication est affichée');

    // « Télécharger » commande la coque.
    const telecharger = [...conteneur.querySelectorAll('button')].find((b) => b.textContent.includes('Télécharger la mise à jour'));
    assert.ok(telecharger, 'le bouton de téléchargement est là');
    await act(async () => { telecharger.click(); });
    assert.ok(pont.journal.includes('telecharger'), 'le clic lance le téléchargement côté coque');

    // La progression arrive : la barre suit.
    await act(async () => { pont.diffuser({ phase: 'telechargement', version: '1.0.9', progression: { percent: 42, octetsParSeconde: 2097152, transferes: 44040192, total: 104857600 } }); });
    const barre = conteneur.querySelector('[role="progressbar"]');
    assert.ok(barre, 'la barre de progression est là');
    assert.equal(barre.getAttribute('aria-valuenow'), '42');
    assert.match(conteneur.textContent, /42 %/);
    assert.match(conteneur.textContent, /Mo\/s/, 'le débit est affiché');

    // Le téléchargement se termine : « Redémarrer et installer » commande la coque.
    await act(async () => { pont.diffuser({ phase: 'prete', version: '1.0.9' }); });
    const installer = [...conteneur.querySelectorAll('button')].find((b) => b.textContent.includes('Redémarrer et installer'));
    assert.ok(installer, 'le bouton d’installation est là');
    await act(async () => { installer.click(); });
    assert.ok(pont.journal.includes('installer'), 'le clic commande l’installation côté coque');
  } finally {
    await act(async () => { racine.unmount(); });
    await vite.close();
    dom.window.close();
  }
});

test('« Plus tard » range le panneau en pastille, la pastille le rouvre', async () => {
  const dom = installerDom();
  const pont = poserPontFactice(dom);
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();

    await act(async () => { racine.render(React.createElement(RpgMiseAJour)); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { pont.diffuser({ phase: 'disponible', version: '1.0.9' }); });
    assert.ok(conteneur.querySelector('.rpg-maj'), 'le panneau est ouvert');

    // « Plus tard » range le panneau et laisse la pastille.
    const plusTard = [...conteneur.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Plus tard');
    await act(async () => { plusTard.click(); });
    assert.equal(conteneur.querySelector('.rpg-maj'), null, 'le panneau se referme');
    const pastille = conteneur.querySelector('.rpg-maj__pastille');
    assert.ok(pastille, 'une pastille discrète reste');

    // La pastille rouvre le panneau.
    await act(async () => { pastille.click(); });
    assert.ok(conteneur.querySelector('.rpg-maj__panneau'), 'la pastille rouvre le panneau');

    // Échap vaut « Plus tard ».
    await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); });
    assert.equal(conteneur.querySelector('.rpg-maj'), null, 'Échap range le panneau');
    assert.ok(conteneur.querySelector('.rpg-maj__pastille'), 'Échap laisse la pastille');
  } finally {
    await act(async () => { racine.unmount(); });
    await vite.close();
    dom.window.close();
  }
});

test('le menu Aide de la coque ouvre le panneau dans le jeu', async () => {
  const dom = installerDom();
  const pont = poserPontFactice(dom);
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();

    await act(async () => { racine.render(React.createElement(RpgMiseAJour)); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    assert.equal(conteneur.querySelector('.rpg-maj'), null, 'rien d’ouvert au départ');

    // Le menu Aide envoie le signal d'ouverture.
    await act(async () => { pont.ouvrir(); });
    assert.ok(conteneur.querySelector('.rpg-maj'), 'le signal du menu Aide ouvre le panneau');
  } finally {
    await act(async () => { racine.unmount(); });
    await vite.close();
    dom.window.close();
  }
});

test('la mise à jour reste dans la table native plein écran, puis revient hors plein écran', async () => {
  const dom = installerDom();
  const pont = poserPontFactice(dom);
  const conteneur = document.createElement('div');
  const table = document.createElement('div');
  table.className = 'rpg-battle';
  document.body.append(conteneur, table);
  let pleinEcran = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => pleinEcran });
  const racine = createRoot(conteneur);
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();
    await act(async () => { racine.render(React.createElement(RpgMiseAJour)); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => { pont.diffuser({ phase: 'disponible', version: '1.0.9' }); });
    assert.ok(conteneur.querySelector('.rpg-maj'), 'panneau dans la page avant le plein écran');
    await act(async () => { pleinEcran = table; document.dispatchEvent(new window.Event('fullscreenchange')); });
    assert.ok(table.querySelector('.rpg-maj'), 'panneau déplacé dans la top layer du jeu');
    assert.equal(conteneur.querySelector('.rpg-maj'), null);
    await act(async () => { [...table.querySelectorAll('button')].find(b => b.textContent.trim() === 'Plus tard').click(); });
    assert.ok(table.querySelector('.rpg-maj__pastille'), 'pastille également visible en plein écran');
    await act(async () => { table.querySelector('.rpg-maj__pastille').click(); });
    assert.ok(table.querySelector('.rpg-maj'));
    await act(async () => { [...table.querySelectorAll('button')].find(b => b.textContent.includes('Télécharger la mise à jour')).click(); });
    assert.equal(pont.journal.filter(x => x === 'telecharger').length, 1, 'le bouton déclenche un seul téléchargement');
    assert.ok(table.querySelector('[role="progressbar"]'));
    await act(async () => { pleinEcran = null; document.dispatchEvent(new window.Event('fullscreenchange')); });
    assert.ok(conteneur.querySelector('[role="progressbar"]'), 'état conservé en sortie de plein écran');
    await act(async () => { pont.diffuser({ phase: 'prete', version: '1.0.9' }); });
    await act(async () => { pleinEcran = table; document.dispatchEvent(new window.Event('fullscreenchange')); });
    await act(async () => { [...table.querySelectorAll('button')].find(b => b.textContent.includes('Redémarrer et installer')).click(); });
    assert.equal(pont.journal.filter(x => x === 'installer').length, 1, 'installation accessible en plein écran');
    await act(async () => { pleinEcran = document.createElement('video'); document.dispatchEvent(new window.Event('fullscreenchange')); });
    assert.ok(conteneur.querySelector('.rpg-maj'), 'ne pas déplacer le panneau dans une vidéo plein écran');
  } finally {
    await act(async () => { racine.unmount(); }); await vite.close(); dom.window.close();
  }
});

test('le plein écran WebKit déjà actif accueille la mise à jour dès son ouverture', async () => {
  const dom = installerDom(); const pont = poserPontFactice(dom);
  const conteneur = document.createElement('div'); const table = document.createElement('div');
  table.className = 'rpg-battle'; document.body.append(conteneur, table);
  Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: table });
  const racine = createRoot(conteneur);
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();
    await act(async () => racine.render(React.createElement(RpgMiseAJour)));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => pont.diffuser({ phase: 'disponible', version: '2.0' }));
    assert.ok(table.querySelector('.rpg-maj__bouton--ok'));
  } finally { await act(async () => racine.unmount()); await vite.close(); dom.window.close(); }
});

test('premier clic de téléchargement : le vrai jeu ne déclenche pas le plein écran et transmet l’ordre', async () => {
  const dom = installerDom(); const pont = poserPontFactice(dom);
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const conteneur = document.createElement('div'); document.body.appendChild(conteneur);
  let pleinEcran = null; let demandes = 0;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => pleinEcran });
  window.HTMLElement.prototype.requestFullscreen = async function () { demandes += 1; pleinEcran = this; document.dispatchEvent(new window.Event('fullscreenchange')); };
  document.exitFullscreen = async () => { pleinEcran = null; document.dispatchEvent(new window.Event('fullscreenchange')); };
  const racine = createRoot(conteneur);
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: RpgMiseAJour } = await vite.ssrLoadModule('/src/games/RpgMiseAJour.jsx');
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { reinitialiserStoreMajDesktop } = await vite.ssrLoadModule('/src/updates/maj-desktop.js');
    reinitialiserStoreMajDesktop();
    await act(async () => racine.render(React.createElement(React.Fragment, null, React.createElement(RpgDuelPage), React.createElement(RpgMiseAJour))));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.ok(conteneur.querySelector('.rpg-battle'));
    await act(async () => pont.diffuser({ phase: 'disponible', version: '1.0.9' }));
    const telecharger = [...conteneur.querySelectorAll('button')].find(b => b.textContent.includes('Télécharger la mise à jour'));
    assert.ok(telecharger);
    await act(async () => {
      telecharger.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
      telecharger.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true }));
      telecharger.click();
    });
    assert.equal(demandes, 0, 'le pointerdown de la mise à jour ne demande pas le plein écran');
    assert.equal(pont.journal.filter(x => x === 'telecharger').length, 1);
    const table = conteneur.querySelector('.rpg-battle');
    await act(async () => { table.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })); });
    assert.equal(demandes, 0, 'une modale ouverte bloque aussi les gestes derrière elle');
    await act(async () => { [...conteneur.querySelectorAll('button')].find(b => b.textContent.trim() === 'Réduire').click(); });
    await act(async () => { table.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })); });
    assert.equal(demandes, 1, 'un geste normal sur le jeu demande toujours le plein écran');
    assert.ok(table.querySelector('.rpg-maj__pastille'), 'la pastille reste visible après la bascule');
    await act(async () => table.querySelector('.rpg-maj__pastille').click());
    assert.ok(table.querySelector('.rpg-maj [role="progressbar"]'), 'le téléchargement peut être rouvert en plein écran');
  } finally { await act(async () => racine.unmount()); await vite.close(); dom.window.close(); }
});
