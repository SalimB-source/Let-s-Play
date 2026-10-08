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

    // 1b. Le décor du hub est la scène de garage elle-même, en cadrage vitrine.
    //     jsdom n'a pas de WebGL : la scène doit s'effacer devant la photo —
    //     l'écran-titre ne reste jamais noir, et ne pleure pas une exception.
    assert.ok(menu.querySelector('.vcr-menu-stage'), 'l’écran-titre monte sa scène 3D');
    assert.ok(
      Boolean(menu.querySelector('.vcr-menu-stage .city-rush-hub-stage-canvas'))
        || Boolean(menu.querySelector('.vcr-menu-stage .city-rush-hub-stage-fallback')),
      'la scène se monte, ou cède la place à la photo sans WebGL',
    );
    assert.match(
      squash(menu.querySelector('.vcr-menu-car-name')?.textContent ?? ''),
      /PULSE RS/,
      'la vitrine roule la pièce du catalogue (PULSE RS), pas la voiture du garage',
    );
    assert.match(
      squash(menu.querySelector('.vcr-menu-car-class')?.textContent ?? ''),
      /ROADSTER/,
      'la plaque du plateau désigne le modèle',
    );
    // Un seul contexte WebGL à la fois : tant que le hub tient l'écran, la page
    // de préparation ne monte pas sa propre baie d'atelier dans son dos.
    assert.equal(
      node.querySelector('.city-rush-hub-stage .city-rush-hub-stage-canvas, .city-rush-hub-stage .city-rush-hub-stage-fallback'),
      null,
      'la page rend la scène au hub pendant que celui-ci est ouvert',
    );

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

    // 4. HISTOIRE est UNE PAGE : elle ouvre la campagne, elle ne plonge pas
    //    dans le chapitre — le joueur veut parfois reprendre un chapitre déjà
    //    atteint, et le menu ne doit pas décider à sa place.
    await key('Enter');
    await settle(40);
    assert.equal(node.querySelector('.vcr-menu'), null, 'le choix referme l’écran-titre');
    assert.ok(node.querySelector('.cr-story-hub'), 'HISTOIRE ouvre la page de la campagne');
    assert.ok(node.querySelector('.city-rush-story-banner'), 'la page offre la bannière du chapitre en cours');
    assert.equal(node.querySelector('.city-rush-mode-card'), null, 'la page HISTOIRE ne ressert pas les modes libres');
    assert.equal(node.querySelector('.cr-tournament-card'), null, 'la page HISTOIRE ne ressert pas les tournois');
    await click(node.querySelector('.city-rush-story-banner'));
    await settle(30);
    assert.ok(node.querySelector('.city-rush-story-cinematic'), 'la bannière de la page lance le chapitre en cours');

    // 5. « ↶ MENU » ramène l'écran-titre.
    await click(titleBackButton(node));
    await settle(30);
    menu = node.querySelector('.vcr-menu');
    assert.ok(menu, '↶ MENU rouvre l’écran-titre');

    // 6. L'entrée GARAGE est la page d'achat du catalogue : on y paie les
    //    modèles, on n'y part pas en course.
    await click([...menu.querySelectorAll('.vcr-entry')][3]);
    await settle(30);
    assert.equal(node.querySelector('.vcr-menu'), null, 'GARAGE referme l’écran-titre');
    const dealer = node.querySelector('.city-rush-car-select');
    assert.ok(dealer, 'GARAGE ouvre la grille des voitures');
    assert.match(
      squash(dealer.querySelector('.city-rush-car-select-heading')?.textContent ?? ''),
      /CONCESSION · \d+ MODÈLES · \d+ POSSÉDÉS/,
      'l’en-tête se lit comme une fiche de concession',
    );
    const dealerCards = [...dealer.querySelectorAll('.city-rush-car-card')];
    assert.ok(dealerCards.length >= 4, 'le catalogue entier est au mur');
    assert.equal(node.querySelector('.city-rush-driver-select'), null, 'la page d’achat ne choisit pas le pilote');
    assert.ok(
      dealerCards.every((card) => /ACHETER ·|MANQUE |MONTER AU PLATEAU|AU PLATEAU/.test(squash(card.textContent))),
      'chaque carte dit ce qu’elle vend : un prix, une absence de billets, ou un choix',
    );
    const free = dealerCards.find((card) => !card.classList.contains('is-locked') && !card.classList.contains('is-selected'));
    assert.ok(free, 'une voiture déjà possédée attend d’être montée au plateau');
    await click(free);
    await settle(30);
    assert.ok(node.querySelector('.city-rush-car-card.is-selected'), 'la toucher la met au départ');
    assert.equal(node.querySelector('.city-rush-countdown'), null, 'et ne lance aucune course depuis le concessionnaire');
    assert.ok(node.querySelector('.city-rush-dealer-cta'), 'la page rend le départ accessible par un bouton');
    await click(node.querySelector('.city-rush-dealer-cta'));
    await settle(30);
    assert.ok(node.querySelector('.city-rush-mode-card'), '« PRENDRE LA PISTE » rouvre la page des courses rapides');

    // 7. Chaque page ne contient que ce qu'elle vend — et la barre d'onglets
    //    suffit à changer de page, sans repasser par le logo.
    assert.equal(node.querySelector('.cr-story-hub'), null, 'la course rapide ne ressert pas le mode histoire');
    assert.equal(node.querySelector('.cr-tournament-card'), null, 'la course rapide ne ressert pas les tournois');
    const tabs = [...node.querySelectorAll('.city-rush-page-tab')];
    assert.equal(tabs.length, 4, 'quatre pages dans la barre d’onglets');
    assert.equal(
      squash(tabs.find((tab) => tab.classList.contains('is-active'))?.textContent ?? ''),
      squash(tabs.find((tab) => /COURSE RAPIDE/.test(tab.textContent))?.textContent ?? ''),
      'l’onglet allumé est la page ouverte',
    );
    await click(titleBackButton(node));
    await settle(30);
    menu = node.querySelector('.vcr-menu');
    assert.ok(menu, '↶ MENU rouvre l’écran-titre depuis la course rapide');
    await click([...menu.querySelectorAll('.vcr-entry')][1]);
    await settle(30);
    assert.equal(node.querySelector('.vcr-menu'), null, 'TOURNOIS referme l’écran-titre');
    assert.ok(node.querySelector('.cr-tournament-card'), 'TOURNOIS ouvre la page des plateaux');
    assert.equal(node.querySelector('.city-rush-mode-card'), null, 'la page TOURNOIS ne ressert pas les modes libres');
    assert.equal(node.querySelector('.cr-story-hub'), null, 'la page TOURNOIS ne ressert pas le mode histoire');
    await click([...node.querySelectorAll('.city-rush-page-tab')].find((tab) => /COURSE RAPIDE/.test(tab.textContent)));
    await settle(30);
    assert.ok(node.querySelector('.city-rush-mode-card'), 'l’onglet ramène à la page des courses libres');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
