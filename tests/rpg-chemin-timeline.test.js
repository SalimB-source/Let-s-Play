import React, { act } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const lire = (relatif) => readFileSync(new URL(relatif, import.meta.url), 'utf8');

const css = lire('../src/games/rpg-piste-gains.css');
const pisteJsx = lire('../src/games/RpgPisteGains.jsx');
const paquetJsx = lire('../src/games/RpgPaquetChemin.jsx');
const duelPageJsx = lire('../src/games/RpgDuelPage.jsx');
const battleCss = lire('../src/games/rpg-battle.css');

test('Écran Progression simplifié façon Mastery MTG Arena : médaillon de niveau, barre claire et zéro table de barème encombrante', () => {
  const debut = duelPageJsx.indexOf(") : screen === 'progression' ? (");
  const fin = duelPageJsx.indexOf(") : screen === 'souk' ? (");
  assert.ok(debut > 0 && fin > debut, 'la branche screen === progression est présente');
  const tranche = duelPageJsx.slice(debut, fin);

  assert.match(tranche, /rpg-xp-screen__blason\b/, 'médaillon circulaire de maîtrise inspiré de MTG Arena');
  assert.match(tranche, /rpg-xp-screen__blason-niveau\b/, 'écusson affichant le niveau courant');
  assert.match(tranche, /rpg-xp-screen__barre\b/, 'barre de progression d’XP');
  assert.match(tranche, /<RpgPisteGains\b/, 'grille paginée des paliers montée directement dessous');
  assert.doesNotMatch(tranche, /rpg-xp-screen__bareme/, 'l’ancienne grille verbeuse du barème d’XP a été retirée');
  assert.match(battleCss, /\.rpg-xp-screen__blason\s*\{/, 'styles du blason présents dans rpg-battle.css');
});

test('Grille Mastery 10 colonnes : deux cases superposées lisibles sans texte entassé dans les colonnes', () => {
  assert.match(
    css,
    /\.rpg-piste__grille\s*\{[^}]*grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\)/s,
    '10 colonnes égales côte à côte par page sur ordinateur',
  );
  assert.match(css, /\.rpg-piste__case-haut\s*\{/, 'case supérieure : numéro du niveau + coche');
  assert.match(css, /\.rpg-piste__case-bas\s*\{/, 'case inférieure : visuel de la récompense');
  assert.match(css, /\.rpg-piste__detail\s*\{/, 'bandeau lisible dédié sous la grille pour nommer la récompense');
  assert.match(css, /\.rpg-piste__point\s*\{[^}]*rotate\(45deg\)/s, 'losanges de pagination sous la grille');
});

test('Le paquet du Chemin reste le vrai sachet 3D du Souk en miniature', () => {
  assert.match(pisteJsx, /import RpgPaquetChemin from '\.\/RpgPaquetChemin\.jsx'/);
  assert.match(pisteJsx, /import '\.\/rpg-souk\.css'/);
  assert.match(paquetJsx, /rpg-souk__sachet-ancre/);
  assert.match(paquetJsx, /rpg-souk__sachet-corps/);
  assert.match(paquetJsx, /rpg-souk__sachet-languette/);
  assert.match(css, /\.rpg-piste__paquet-reel \.rpg-souk__sachet-ancre \{/);
});

test('Rendu JSDOM interactif : ouverture sur la page du niveau actuel, pagination 1..6, cadenas, non-divulgation et équipement cosmétique', async () => {
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'src/games/RpgPisteGains.jsx',
      outDir: 'node_modules/.cache/rpg-piste-gains-mtga',
      emptyOutDir: true,
    },
  });
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;

  const dom = new JSDOM('<!doctype html><html lang="fr"><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });

  const globals = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'HTMLButtonElement',
    'SVGElement',
    'Node',
    'Event',
    'MouseEvent',
  ];
  const sauvegarde = Object.fromEntries(globals.map((k) => [k, globalThis[k]]));
  for (const k of globals) {
    Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const { createRoot } = await import('react-dom/client');
    const { default: RpgPisteGains } = await import('../node_modules/.cache/rpg-piste-gains-mtga/RpgPisteGains.js');
    const { xpTotalDuNiveau } = await import('../src/games/rpgProfil.js');

    let cadreChoisi = undefined;
    const rootEl = dom.window.document.getElementById('root');
    const root = createRoot(rootEl);

    await act(async () => {
      root.render(
        React.createElement(RpgPisteGains, {
          profil: { xp: xpTotalDuNiveau(25) + 40, cadre: 'laiton' },
          paquetsEnAttente: 2,
          onChoisirCadre: (id) => {
            cadreChoisi = id;
            return true;
          },
          onOuvrirSouk: () => {},
        }),
      );
    });

    const piste = rootEl.querySelector('[data-piste]');
    assert.ok(piste, 'le composant RpgPisteGains est monté');
    assert.equal(piste.getAttribute('data-piste-page'), '3/6', 'ouvre directement sur la page 3/6 pour le niveau 25');
    assert.equal(piste.getAttribute('data-piste-niveaux'), '21-30', 'affiche les niveaux 21 à 30');

    const colonnes = [...rootEl.querySelectorAll('[data-palier]')];
    assert.equal(colonnes.length, 10, 'exactement 10 colonnes visibles sur la page');

    const palier25 = rootEl.querySelector('[data-palier="25"]');
    assert.equal(palier25.getAttribute('data-palier-etat'), 'courant');
    assert.equal(palier25.querySelector('.rpg-piste__ici')?.textContent, 'Niveau actuel');
    assert.ok(palier25.querySelector('.rpg-piste__coche-svg'), 'coche visible sur le palier courant atteint');
    assert.equal(palier25.querySelector('.rpg-piste__verrou'), null, 'aucun cadenas sur le palier 25 débloqué');

    const palier26 = rootEl.querySelector('[data-palier="26"]');
    assert.equal(palier26.getAttribute('data-palier-etat'), 'verrouille');
    assert.ok(palier26.querySelector('.rpg-piste__verrou'), 'cadenas affiché sur le palier 26 verrouillé');

    // Non-divulgation : l'illustration débloquée niv. 24 charge sa peinture, celle verrouillée niv. 28 garde le dos de carte
    const styleAlt24 = rootEl.querySelector('[data-palier="24"] .rpg-piste__carte-alt-img')?.getAttribute('style') ?? '';
    const styleAlt28 = rootEl.querySelector('[data-palier="28"] .rpg-piste__carte-alt-img')?.getAttribute('style') ?? '';
    assert.doesNotMatch(styleAlt24, /dos-de-carte/, 'l’illustration du niveau 24 débloqué montre sa vraie peinture');
    assert.match(styleAlt28, /dos-de-carte/, 'l’illustration du niveau 28 verrouillé reste scellée sur le dos de carte');

    // Équipement direct du cadre du niveau 25 via le bouton du bandeau de détail
    const btnCadre = rootEl.querySelector('[data-gain-cadre="pourpre"]');
    assert.ok(btnCadre, 'le bandeau de détail propose de porter le cadre du niveau 25');
    await act(async () => {
      btnCadre.click();
    });
    assert.equal(cadreChoisi, 'pourpre', 'cliquer sur Porter équipe le cadre Fil de pourpre');

    // Navigation entre les 6 pages via flèches et losanges + bouton retour au niveau actuel
    const flecheSuivante = rootEl.querySelector('button[aria-label="Page suivante"]');
    await act(async () => {
      flecheSuivante.click();
    });
    assert.equal(piste.getAttribute('data-piste-page'), '4/6');
    assert.equal(piste.getAttribute('data-piste-niveaux'), '31-40');

    const btnRetour = rootEl.querySelector('.rpg-piste__retour-courant');
    assert.ok(btnRetour, 'un bouton permet de revenir en un clic au niveau actuel depuis une autre page');
    await act(async () => {
      btnRetour.click();
    });
    assert.equal(piste.getAttribute('data-piste-page'), '3/6');

    const losanges = rootEl.querySelectorAll('.rpg-piste__point');
    assert.equal(losanges.length, 6, '6 losanges de pagination pour les 60 niveaux');

    await act(async () => {
      root.unmount();
    });
  } finally {
    for (const k of globals) {
      if (sauvegarde[k] === undefined) delete globalThis[k];
      else Object.defineProperty(globalThis, k, { value: sauvegarde[k], configurable: true, writable: true });
    }
  }
});
