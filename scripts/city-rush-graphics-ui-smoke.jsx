/**
 * Fumée jsdom de « RENDU : CINÉMA » — entrée de
 * `scripts/city-rush-graphics-check.mjs` (`npm run check:city-rush-graphics`).
 *
 * La vraie page est montée, seul le moteur 3D est la doublure partagée
 * (`vice-city-world-stub.jsx`) qui garde les props reçues : on y lit le rendu
 * que la page transmet au monde. Quatre situations :
 *
 *   1. l'écran-titre : OPTIONS porte l'entrée RENDU, STANDARD par défaut ; le
 *      clic passe en CINÉMA, la touche V aussi, le choix est mémorisé ;
 *   2. la page : le monde reçoit le rendu standard, puis cinéma — à chaud ;
 *   3. l'écran de pause : le bouton RENDU bascule sans quitter la course ;
 *   4. l'appareil allégé (`window.LetsPlayAndroid`, la coque Android) : le
 *      cinéma est annoncé « NON DISPO ICI », le choix reste mémorisé.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_GRAPHICS_PREF_KEY } from '../src/games/cityRushPost.js';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (ms = 25) => act(async () => { await sleep(ms); });
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const click = (element) => act(async () => { element.click(); });
const key = (name) => act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
});
const stored = () => window.localStorage.getItem(CITY_RUSH_GRAPHICS_PREF_KEY);

// Le compte à rebours (≈ 3 s) est raccourci : la fumée lance une vraie course.
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return () => { window.setTimeout = original; };
}

async function until(read, label, timeout = 5000) {
  const start = performance.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await act(async () => { await sleep(10); });
  }
}

async function mountPage() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/jeu/vice-city-rush']}>
        <ViceCityRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await settle(40);
  return {
    node,
    unmount: async () => {
      await act(async () => root.unmount());
      node.remove();
    },
  };
}

const waitForIntroStep = (node, label) => until(() => {
  const active = node.querySelector('.city-rush-stepper-item.is-active');
  return active && squash(active.textContent).includes(label) ? active : null;
}, `l’écran « ${label} » de l’intro`);

/** MODE → VILLE → GARAGE, puis la première voiture : la course part. */
async function startRace(node) {
  await waitForIntroStep(node, 'MODE');
  await click(node.querySelectorAll('.city-rush-mode-card')[0]);
  await waitForIntroStep(node, 'VILLE');
  await click(node.querySelectorAll('.city-rush-city-card')[0]);
  await waitForIntroStep(node, 'GARAGE');
  await click(node.querySelectorAll('.city-rush-car-card')[0]);
  await until(() => node.querySelector('.city-rush-hud'), 'le départ de la course');
}

const graphicsOption = (node) => node.querySelector('.vcr-menu-panel .vcr-menu-graphics-option');

export async function checkCityRushGraphicsUi(assert) {
  window.localStorage.clear();
  const restoreTimers = patchTimers();
  try {
    // ── 1. Écran-titre ─────────────────────────────────────────────────────
    {
      const { node, unmount } = await mountPage();
      try {
        const menu = node.querySelector('.vcr-menu');
        assert.ok(menu, 'l’écran-titre s’ouvre à l’arrivée');
        const options = [...menu.querySelectorAll('.vcr-entry')]
          .find((entry) => (entry.getAttribute('aria-label') || '').toUpperCase().includes('OPTIONS'));
        assert.ok(options, 'entrée OPTIONS du carrousel');
        await click(options);
        const option = graphicsOption(node);
        assert.ok(option, 'le panneau OPTIONS propose le rendu');
        assert.equal(squash(option.textContent), 'RENDU : STANDARD', 'le rendu standard est le rendu par défaut');
        assert.match(option.title, /^Halo de post-traitement/, 'l’infobulle annonce le halo');
        assert.equal(option.getAttribute('aria-pressed'), 'false', 'l’interrupteur est éteint');

        await click(option);
        assert.equal(squash(option.textContent), 'RENDU : CINÉMA', 'le clic passe au rendu cinéma');
        assert.equal(option.getAttribute('aria-pressed'), 'true');
        assert.equal(stored(), 'cinema', 'la préférence est enregistrée sur l’appareil');
        assert.match(option.title, /sans halo/, 'l’infobulle propose le retour au standard');

        // La touche V fait la même chose, sans passer par la souris.
        await key('v');
        assert.equal(squash(graphicsOption(node).textContent), 'RENDU : STANDARD', 'V revient au rendu standard');
        assert.equal(stored(), 'standard');
        await key('v');
        assert.equal(squash(graphicsOption(node).textContent), 'RENDU : CINÉMA', 'V repasse au rendu cinéma');
        assert.equal(stored(), 'cinema');
      } finally {
        await unmount();
      }
    }

    // ── 2-3. Page de jeu, course, écran de pause ───────────────────────────
    {
      window.localStorage.setItem(CITY_RUSH_GRAPHICS_PREF_KEY, 'cinema');
      const { node, unmount } = await mountPage();
      try {
        await dismissTitleMenu(node);
        assert.equal(worldProbe.props.graphicsMode, 'cinema', 'la page transmet le rendu cinéma au monde');
        await startRace(node);
        assert.equal(worldProbe.props.graphicsMode, 'cinema', 'la course part en rendu cinéma');

        const pauseButton = [...node.querySelectorAll('.city-rush-top-actions .city-rush-top-button')]
          .find((button) => squash(button.textContent).includes('PAUSE'));
        assert.ok(pauseButton, 'bouton PAUSE de la barre');
        await click(pauseButton);
        await until(() => node.querySelector('.city-rush-pause-overlay'), 'l’écran de pause');
        const graphics = () => node.querySelector('.city-rush-pause-overlay .city-rush-pause-graphics');
        assert.ok(graphics(), 'la pause propose le rendu');
        assert.equal(squash(graphics().textContent), 'RENDU : CINÉMA');
        assert.equal(graphics().getAttribute('aria-pressed'), 'true');

        await click(graphics());
        assert.equal(worldProbe.props.graphicsMode, 'standard', 'la pause repasse le monde en rendu standard');
        assert.equal(squash(graphics().textContent), 'RENDU : STANDARD');
        assert.equal(stored(), 'standard', 'le choix de la pause est enregistré');
        assert.ok(node.querySelector('.city-rush-pause-overlay'), 'régler le rendu ne quitte pas la pause');

        await click(graphics());
        assert.equal(worldProbe.props.graphicsMode, 'cinema', 'et revient au rendu cinéma');
        assert.equal(stored(), 'cinema');
      } finally {
        await unmount();
      }
    }

    // ── 4. Appareil allégé : le cinéma s'annonce indisponible ──────────────
    {
      window.localStorage.setItem(CITY_RUSH_GRAPHICS_PREF_KEY, 'cinema');
      window.LetsPlayAndroid = {};
      const { node, unmount } = await mountPage();
      try {
        const menu = node.querySelector('.vcr-menu');
        const options = [...menu.querySelectorAll('.vcr-entry')]
          .find((entry) => (entry.getAttribute('aria-label') || '').toUpperCase().includes('OPTIONS'));
        await click(options);
        const option = graphicsOption(node);
        assert.equal(
          squash(option.textContent),
          'RENDU : CINÉMA · NON DISPO ICI',
          'sur la coque Android (qualité allégée), l’option dit que le cinéma ne tourne pas ici',
        );
        assert.match(option.title, /qualité allégée/, 'l’infobulle explique le refus');
        assert.equal(stored(), 'cinema', 'le choix reste mémorisé pour un appareil capable');
      } finally {
        delete window.LetsPlayAndroid;
        await unmount();
      }
    }

    // Une préférence corrompue retombe sur le rendu standard.
    {
      window.localStorage.setItem(CITY_RUSH_GRAPHICS_PREF_KEY, 'ultra-8k');
      const { node, unmount } = await mountPage();
      try {
        await dismissTitleMenu(node);
        assert.equal(worldProbe.props.graphicsMode, 'standard', 'une préférence inconnue retombe sur le standard');
      } finally {
        await unmount();
      }
    }
  } finally {
    restoreTimers();
  }
}
