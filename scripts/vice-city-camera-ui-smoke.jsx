/**
 * Fumée jsdom de la vue cockpit de Vice City Rush, côté interface — entrée de
 * `scripts/vice-city-camera-ui-check.mjs` (`npm run check:city-rush-cockpit`).
 *
 * La vraie page est montée ; seul le moteur 3D est la doublure partagée
 * (`vice-city-world-stub.jsx`), qui garde les props reçues : on y lit la vue
 * que la page transmet au monde.
 *
 *   1. Écran-titre : OPTIONS porte l'entrée CAMÉRA (poursuite par défaut), le
 *      clic et la touche C la basculent, Ctrl + C (copier) ne fait rien.
 *   2. Page : le bouton COCKPIT de la barre reflète la préférence et la
 *      transmet au monde (`cameraMode`) ; C et le clic la basculent, une
 *      saisie de texte ne la touche pas ; le rappel « C · VUE COCKPIT » figure
 *      dans les commandes.
 *   3. La préférence reste sur l'appareil : une page rouverte retrouve la vue
 *      choisie, et une valeur corrompue retombe sur la poursuite.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_CAMERA_PREF_KEY } from '../src/games/cityRushCockpit.js';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (ms = 25) => act(async () => { await sleep(ms); });
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const press = (name, options = {}, target = window) => act(async () => {
  target.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options }));
});
const click = (element) => act(async () => { element.click(); });
const stored = () => window.localStorage.getItem(CITY_RUSH_CAMERA_PREF_KEY);

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

const cameraButtonOf = (node) => node.querySelector('.city-rush-top-actions .city-rush-camera-button');

export async function checkViceCityCameraUi(assert) {
  window.localStorage.clear();

  // ── 1. Écran-titre ───────────────────────────────────────────────────────
  {
    const { node, unmount } = await mountPage();
    try {
      const menu = node.querySelector('.vcr-menu');
      assert.ok(menu, 'l’écran-titre s’ouvre à l’arrivée');
      const options = [...menu.querySelectorAll('.vcr-entry')]
        .find((entry) => (entry.getAttribute('aria-label') || '').toUpperCase().includes('OPTIONS'));
      assert.ok(options, 'entrée OPTIONS du carrousel');
      await click(options);
      const option = () => node.querySelector('.vcr-menu-panel .vcr-menu-camera-option');
      assert.ok(option(), 'le panneau OPTIONS propose la caméra');
      assert.equal(squash(option().textContent), 'CAMÉRA : POURSUITE · C', 'la poursuite reste la vue par défaut');
      assert.equal(option().getAttribute('aria-pressed'), 'false');

      await click(option());
      assert.equal(squash(option().textContent), 'CAMÉRA : COCKPIT · C', 'le clic passe en vue cockpit');
      assert.equal(option().getAttribute('aria-pressed'), 'true');
      assert.equal(stored(), 'cockpit', 'la préférence est enregistrée sur l’appareil');

      await press('c');
      assert.equal(squash(option().textContent), 'CAMÉRA : POURSUITE · C', 'C bascule depuis l’écran-titre');
      assert.equal(stored(), 'chase');
      await press('c', { ctrlKey: true });
      await press('C', { metaKey: true });
      assert.equal(stored(), 'chase', 'Ctrl / Cmd + C (copier) ne touche pas la vue');
      await press('C');
      assert.equal(stored(), 'cockpit', 'C majuscule bascule aussi');
    } finally {
      await unmount();
    }
  }

  // ── 2. Page de jeu ───────────────────────────────────────────────────────
  {
    const { node, unmount } = await mountPage();
    try {
      await dismissTitleMenu(node);
      const button = cameraButtonOf(node);
      assert.ok(button, 'le bouton de vue est dans la barre du jeu');
      assert.equal(button.getAttribute('aria-label'), 'Vue cockpit');
      assert.equal(squash(button.textContent), 'COCKPIT');
      assert.ok(button.querySelector('svg.city-rush-camera-icon'), 'icône de volant dessinée en SVG');
      assert.match(button.title, /\(C\)/, 'l’infobulle annonce la touche C');
      assert.equal(button.getAttribute('aria-pressed'), 'true', 'la préférence de la page précédente est retrouvée');
      assert.ok(button.classList.contains('is-on'));
      assert.equal(worldProbe.props.cameraMode, 'cockpit', 'la page transmet la vue cockpit au monde');
      assert.match(squash(node.querySelector('.city-rush-intro-foot')?.textContent ?? ''), /C · VUE COCKPIT/, 'le rappel « C · VUE COCKPIT » figure dans les commandes');

      await press('c');
      assert.equal(worldProbe.props.cameraMode, 'chase', 'C revient à la poursuite');
      assert.equal(cameraButtonOf(node).getAttribute('aria-pressed'), 'false');
      assert.equal(cameraButtonOf(node).classList.contains('is-on'), false);
      assert.equal(stored(), 'chase');

      await click(cameraButtonOf(node));
      assert.equal(worldProbe.props.cameraMode, 'cockpit', 'le bouton repasse en vue cockpit');
      assert.equal(stored(), 'cockpit');

      await press('c', { altKey: true });
      assert.equal(worldProbe.props.cameraMode, 'cockpit', 'Alt + C ne bascule pas');
      const input = document.createElement('input');
      node.append(input);
      await press('c', {}, input);
      input.remove();
      assert.equal(worldProbe.props.cameraMode, 'cockpit', 'une saisie de texte ne bascule pas la vue');
    } finally {
      await unmount();
    }
  }

  // ── 3. Préférence de l'appareil ──────────────────────────────────────────
  {
    window.localStorage.setItem(CITY_RUSH_CAMERA_PREF_KEY, 'vue-du-toit');
    const { node, unmount } = await mountPage();
    try {
      await dismissTitleMenu(node);
      assert.equal(worldProbe.props.cameraMode, 'chase', 'une préférence corrompue retombe sur la poursuite');
      assert.equal(cameraButtonOf(node).getAttribute('aria-pressed'), 'false');
    } finally {
      await unmount();
    }
  }
}
