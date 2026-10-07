/**
 * Fumée jsdom de l'écran-titre de Vice City Rush (menu principal façon
 * NFS : Most Wanted) : le menu s'ouvre à l'arrivée, le carrousel se pilote
 * aux flèches, T ouvre les stats, chaque entrée route vers l'écran existant
 * et « ↶ MENU » ramène l'écran-titre. Le moteur 3D est le stub partagé.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (ms = 25) => act(async () => { await sleep(ms); });
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const key = (name) => act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
});
const click = (element) => act(async () => { element.click(); });
const titleBackButton = (node) => [...node.querySelectorAll('button')]
  .find((button) => /↖?↶?\s*MENU/.test(squash(button.textContent)) && button.className.includes('city-rush-top-button'));

export async function checkViceCityRushMenu(assert) {
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

  try {
    // 1. L'écran-titre s'ouvre à l'arrivée, par-dessus la page.
    let menu = node.querySelector('.vcr-menu');
    assert.ok(menu, 'l’écran-titre s’ouvre à l’arrivée');
    const entries = [...menu.querySelectorAll('.vcr-entry')];
    assert.equal(entries.length, 5, 'cinq entrées au carrousel');
    assert.match(squash(menu.querySelector('.vcr-menu-selected').textContent), /HISTOIRE/, 'HISTOIRE présélectionné');
    assert.ok(menu.querySelector('.vcr-menu-bg[src*="car-"]'), 'la photo du modèle engagé sert de décor');
    assert.ok(menu.querySelector('.vcr-menu-logo-title'), 'le logo est posé');

    // 2. Les flèches déplacent la sélection du carrousel.
    await key('ArrowRight');
    assert.match(squash(menu.querySelector('.vcr-menu-selected').textContent), /TOURNOIS/);
    await key('ArrowLeft');
    assert.match(squash(menu.querySelector('.vcr-menu-selected').textContent), /HISTOIRE/);

    // 3. T ouvre puis referme le panneau des statistiques.
    await key('t');
    assert.ok(node.querySelector('.vcr-menu-panel'), 'T ouvre les game stats');
    await key('t');
    assert.equal(node.querySelector('.vcr-menu-panel'), null, 'T referme les game stats');

    // 4. Entrée sur HISTOIRE : le menu se referme, la cinématique d'acte arrive.
    await key('Enter');
    await settle(40);
    assert.equal(node.querySelector('.vcr-menu'), null, 'le choix referme l’écran-titre');
    assert.ok(node.querySelector('.city-rush-story-cinematic'), 'HISTOIRE démarre sur la cinématique du chapitre');

    // 5. « ↶ MENU » ramène l'écran-titre.
    await click(titleBackButton(node));
    await settle(30);
    menu = node.querySelector('.vcr-menu');
    assert.ok(menu, '↶ MENU rouvre l’écran-titre');

    // 6. L'entrée GARAGE mène au hub (photo de repli en jsdom).
    await click([...menu.querySelectorAll('.vcr-entry')][3]);
    await settle(30);
    assert.equal(node.querySelector('.vcr-menu'), null, 'GARAGE referme l’écran-titre');
    assert.ok(node.querySelector('.city-rush-car-select'), 'GARAGE ouvre le hub des voitures');

    // 7. COURSE RAPIDE retombe sur le sélecteur de modes.
    await click(titleBackButton(node));
    await settle(30);
    menu = node.querySelector('.vcr-menu');
    assert.ok(menu, '↶ MENU rouvre l’écran-titre depuis le garage');
    await click([...menu.querySelectorAll('.vcr-entry')][2]);
    await settle(30);
    assert.equal(node.querySelector('.vcr-menu'), null);
    assert.ok(node.querySelector('.city-rush-mode-card'), 'COURSE RAPIDE retombe sur le sélecteur de modes');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
