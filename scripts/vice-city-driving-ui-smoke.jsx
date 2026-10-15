/**
 * Fumée jsdom de la conduite libre de Vice City Rush, côté interface — entrée
 * de `scripts/vice-city-driving-ui-check.mjs` (`npm run check:city-rush-free-drive`).
 *
 * La vraie page est montée ; seul le moteur 3D est la doublure partagée
 * (`vice-city-world-stub.jsx`), qui garde les props reçues : on y lit la
 * conduite que la page transmet au monde.
 *
 *   1. Écran-titre : OPTIONS porte l'entrée CONDUITE, libre par défaut ; le
 *      clic bascule sur la conduite par voies et retour, et la préférence est
 *      enregistrée sur l'appareil.
 *   2. Page : le monde reçoit la conduite libre ; les rappels de commandes
 *      (préparation, pied de page, aide du mode) parlent de volant libre et
 *      plus de voies.
 *   3. En course, l'écran de pause règle la conduite et la vue sans quitter la
 *      course : le monde reçoit le changement tout de suite, les rappels
 *      suivent, et la préférence est enregistrée.
 *   4. Une page rouverte retrouve la conduite choisie ; une valeur corrompue
 *      retombe sur la conduite libre.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_CAMERA_PREF_KEY } from '../src/games/cityRushCockpit.js';
import { CITY_RUSH_DRIVING_PREF_KEY } from '../src/games/cityRushFreeDrive.js';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (ms = 25) => act(async () => { await sleep(ms); });
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const click = (element) => act(async () => { element.click(); });
const stored = () => window.localStorage.getItem(CITY_RUSH_DRIVING_PREF_KEY);

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

const introFootOf = (node) => squash(node.querySelector('.city-rush-intro-foot')?.textContent ?? '');
const desktopHintOf = (node) => squash(node.querySelector('.city-rush-shell-footer .city-rush-desktop-hint')?.textContent ?? '');
const helpOf = (node) => squash(node.querySelector('.city-rush-no-collision-note')?.textContent ?? '');

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

export async function checkViceCityDrivingUi(assert) {
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
        const option = () => node.querySelector('.vcr-menu-panel .vcr-menu-driving-option');
        assert.ok(option(), 'le panneau OPTIONS propose la conduite');
        assert.equal(squash(option().textContent), 'CONDUITE : LIBRE', 'la conduite libre est la conduite par défaut');
        assert.match(option().title, /conduite par voies/, 'l’infobulle annonce l’autre conduite');

        await click(option());
        assert.equal(squash(option().textContent), 'CONDUITE : VOIES', 'le clic passe à la conduite par voies');
        assert.equal(stored(), 'lanes', 'la préférence est enregistrée sur l’appareil');
        assert.match(option().title, /conduite libre/);

        await click(option());
        assert.equal(squash(option().textContent), 'CONDUITE : LIBRE', 'et revient à la conduite libre');
        assert.equal(stored(), 'free');
      } finally {
        await unmount();
      }
    }

    // ── 2-3. Page de jeu, puis écran de pause ─────────────────────────────
    {
      const { node, unmount } = await mountPage();
      try {
        await dismissTitleMenu(node);
        assert.equal(worldProbe.props.drivingMode, 'free', 'la page transmet la conduite libre au monde');
        assert.match(introFootOf(node), /← → \/ Q D · VOLANT LIBRE \(MAINTENIR\)/, 'rappel clavier du volant libre');
        assert.match(introFootOf(node), /DOIGT SUR LA ROUTE · LA VOITURE LE SUIT/, 'rappel tactile du volant libre');
        assert.doesNotMatch(introFootOf(node), /VOIES \(MAINTENIR\)/, 'plus de rappel des voies en conduite libre');
        assert.match(desktopHintOf(node), /← → \/ Q D : VOLANT LIBRE/, 'pied de page : volant libre');
        assert.match(helpOf(node), /Conduite libre : la voiture tourne comme une vraie voiture/, 'l’aide du mode explique la conduite libre');
        assert.match(helpOf(node), /OPTIONS › CONDUITE/, 'l’aide indique où retrouver la conduite par voies');

        await startRace(node);
        assert.equal(worldProbe.props.drivingMode, 'free', 'la course part en conduite libre');
        const pauseButton = [...node.querySelectorAll('.city-rush-top-actions .city-rush-top-button')]
          .find((button) => squash(button.textContent).includes('PAUSE'));
        assert.ok(pauseButton, 'bouton PAUSE de la barre');
        await click(pauseButton);
        await until(() => node.querySelector('.city-rush-pause-overlay'), 'l’écran de pause');
        const driving = () => node.querySelector('.city-rush-pause-overlay .city-rush-pause-driving');
        const camera = () => node.querySelector('.city-rush-pause-overlay .city-rush-pause-camera');
        assert.ok(driving() && camera(), 'la pause propose la conduite et la vue');
        assert.equal(squash(driving().textContent), 'CONDUITE : LIBRE');
        assert.equal(squash(camera().textContent), 'CAMÉRA : POURSUITE · C');

        await click(driving());
        assert.equal(worldProbe.props.drivingMode, 'lanes', 'la pause passe le monde en conduite par voies');
        assert.equal(squash(driving().textContent), 'CONDUITE : VOIES');
        assert.equal(stored(), 'lanes', 'le choix de la pause est enregistré');
        assert.match(desktopHintOf(node), /← → \/ Q D : VOIES \(MAINTENIR\)/, 'le pied de page suit la conduite par voies');
        assert.ok(node.querySelector('.city-rush-pause-overlay'), 'régler la conduite ne quitte pas la pause');

        await click(camera());
        assert.equal(worldProbe.props.cameraMode, 'cockpit', 'la pause bascule aussi la vue');
        assert.equal(camera().getAttribute('aria-pressed'), 'true');
        assert.equal(window.localStorage.getItem(CITY_RUSH_CAMERA_PREF_KEY), 'cockpit');
        await click(camera());
        assert.equal(worldProbe.props.cameraMode, 'chase');

        await click(driving());
        assert.equal(worldProbe.props.drivingMode, 'free', 'et revient à la conduite libre');
        assert.equal(stored(), 'free');
      } finally {
        await unmount();
      }
    }

    // ── 4. Préférence de l'appareil ────────────────────────────────────────
    {
      window.localStorage.setItem(CITY_RUSH_DRIVING_PREF_KEY, 'lanes');
      const { node, unmount } = await mountPage();
      try {
        await dismissTitleMenu(node);
        assert.equal(worldProbe.props.drivingMode, 'lanes', 'une page rouverte retrouve la conduite par voies');
        assert.match(introFootOf(node), /← → \/ Q D · VOIES \(MAINTENIR\)/, 'rappel clavier des voies');
        assert.match(introFootOf(node), /GLISSE ← → SUR LA ROUTE · CHANGE DE VOIE/, 'rappel tactile des voies');
        assert.match(helpOf(node), /Conduite par voies/, 'l’aide du mode décrit la conduite par voies');
      } finally {
        await unmount();
      }
    }
    {
      window.localStorage.setItem(CITY_RUSH_DRIVING_PREF_KEY, 'sur-rails');
      const { node, unmount } = await mountPage();
      try {
        await dismissTitleMenu(node);
        assert.equal(worldProbe.props.drivingMode, 'free', 'une préférence corrompue retombe sur la conduite libre');
      } finally {
        await unmount();
      }
    }
  } finally {
    restoreTimers();
  }
}
