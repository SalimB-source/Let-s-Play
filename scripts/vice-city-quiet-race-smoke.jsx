/**
 * Entrée SSR utilisée par scripts/vice-city-quiet-race-check.mjs —
 * `npm run check:city-rush-quiet`.
 *
 * Vice City Rush se joue écran nu : en course, la page n'ouvre plus aucune
 * fenêtre de message. Ni les chocs, ni les bonus, ni les herses, ni les
 * mouvements de police, ni le franchissement de la ligne ne se racontent en
 * texte — le tour, le chrono, le butin, la vie et le classement vivent dans
 * leurs cartes du HUD, et le reste se voit dans la scène (fumée, éclats, halo
 * de visée, étoiles de recherche).
 *
 * Ce smoke monte la vraie page dans jsdom (moteur 3D remplacé par la doublure
 * `vice-city-world-stub.jsx`) et vérifie les deux moitiés de la promesse :
 *   · en course, une volée d'événements ne fait apparaître ni message, ni
 *     bandeau de tour, ni pastille d'état — et la page ne demande même plus au
 *     moteur de les lui annoncer (`onPickup`/`onLap` ont disparu) ;
 *   · hors course, le retour des menus existe toujours : acheter une voiture au
 *     garage ouvre bien sa fenêtre de confirmation.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_CARS, CITY_RUSH_FREE_CAR_IDS } from '../src/games/cityRushRules.js';
import { CITY_RUSH_PROGRESS_KEY } from '../src/games/cityRushProgress.js';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

// Le compte à rebours (≈ 3 s) est raccourci pour ne pas ralentir la vérif.
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return { restore: () => { window.setTimeout = original; } };
}

const click = (el) => act(async () => { el.click(); });
function mustFind(node, selector, label) {
  const el = node.querySelector(selector);
  if (!el) throw new Error(`élément introuvable : ${selector} (${label})`);
  return el;
}
const settle = (ms = 20) => act(async () => { await sleep(ms); });
const textOf = (node, selector) => squash(node.querySelector(selector)?.textContent ?? '');

async function mountPage(node) {
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/jeu/vice-city-rush']}>
        <ViceCityRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await settle(30);
  return root;
}

/** MODE → VILLE : les deux premières vignettes mènent au garage. */
async function openGarage(node) {
  await click(mustFind(node, '.city-rush-mode-card', 'étape mode'));
  await settle();
  await click(mustFind(node, '.city-rush-city-card', 'étape ville'));
  await settle();
  return [...node.querySelectorAll('.city-rush-car-card')];
}

export async function checkViceCityQuietRace(assert) {
  // Un portefeuille garni : de quoi acheter une voiture lockée et voir la
  // fenêtre de confirmation des menus, sans toucher aux courses à gagner.
  window.localStorage.setItem(CITY_RUSH_PROGRESS_KEY, JSON.stringify({
    cash: 50000,
    ownedCarIds: [],
    completedCourseIds: ['vice-city'],
  }));
  const node = document.createElement('div');
  document.body.append(node);
  let root = null;
  let timers = null;
  try {
    root = await mountPage(node);

    // ── 1. Hors course, les fenêtres de message des menus existent encore ────
    const cards = await openGarage(node);
    assert.equal(cards.length, CITY_RUSH_CARS.length, `les ${CITY_RUSH_CARS.length} voitures du garage sont proposées`);
    const paid = CITY_RUSH_CARS.findIndex((car) => !CITY_RUSH_FREE_CAR_IDS.includes(car.id) && car.price > 0);
    assert.ok(paid >= 0, 'le catalogue contient une voiture à acheter');
    await click(cards[paid]);
    // Le message est franc et immédiat : c'est le retour attendu d'un menu.
    assert.match(
      textOf(node, '.city-rush-toast'),
      /DÉBLOQUÉE/,
      'acheter une voiture répond encore par une fenêtre de message',
    );
    assert.ok(
      node.querySelector('.city-rush-viewport > .city-rush-toast'),
      'la fenêtre des menus se pose dans la fenêtre de jeu, pas dans le HUD de course',
    );
    assert.equal(node.querySelectorAll('.city-rush-hud').length, 0, 'le HUD de course n’est pas monté pendant la préparation');

    // ── 2. En course, plus rien ne se raconte ────────────────────────────────
    // À partir du départ, le compte à rebours est raccourci (≈ 3 s → 3 × 10 ms)
    // pour ne pas ralentir la vérification. Les messages des menus, eux, ont
    // déjà été vus avec leur vrai minuteur.
    timers = patchTimers();
    // La voiture offerte du garage (la Mistral) part en course.
    const starter = cards.find((card) => card.querySelector('.city-rush-car-lock-badge.is-offered'));
    assert.ok(starter, 'une voiture offerte est proposée pour partir en course');
    await click(starter);
    const hud = await (async () => {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const found = node.querySelector('.city-rush-hud');
        if (found) return found;
        await settle(20);
      }
      throw new Error('le HUD de course n’est jamais apparu');
    })();

    // La page ne demande même plus au moteur de lui raconter la course.
    assert.equal(worldProbe.props?.onPickup, undefined, 'la page n’écoute plus les ramassages');
    assert.equal(worldProbe.props?.onLap, undefined, 'la page n’écoute plus les passages de ligne');

    // Le bouton jaune est à gauche de l'AK-47 rouge, et reste grisé tant que
    // le HUD n'annonce pas la traversée d'un des deux entrepôts (30 % / 65 %).
    const gunButton = mustFind(node, '.city-rush-machine-gun-button', 'commande rouge');
    const bazookaButton = mustFind(node, '.city-rush-bazooka-button', 'commande bazooka');
    assert.ok(bazookaButton.parentElement === gunButton.parentElement, 'les deux armes partagent le dock tactile');
    assert.ok(bazookaButton.nextElementSibling === gunButton, 'le bouton bazooka précède le bouton rouge dans l’ordre gauche-droite');
    assert.equal(bazookaButton.disabled, true, 'le bazooka reste verrouillé avant le pickup');
    assert.match(bazookaButton.className, /is-empty/, 'le bouton de bazooka est grisé avant le pickup');
    await click(bazookaButton);
    assert.deepEqual(worldProbe.actions, [], 'un bouton verrouillé ne déclenche aucun tir');

    const fakeHud = {
      distance: 3000, totalDistance: 7200, progress: 0.41, lap: 3, laps: 3,
      lapLength: 4800, lapProgress: 0.1, lapDistance: 480, elapsed: 80, speed: 114,
      rank: 3, racers: [], inventory: { 'blue-shot': 0, pistol: 0, radio: 0 },
      score: 250, pickups: 1, slowLeft: 0, trafficImpactLeft: 0, boostLeft: 0, stunLeft: 0,
      sprint: null, route: null, playerHealth: 15, playerHealthMax: 15, playerHealthActive: true,
      playerHealthFlash: 0, police: [], wantedLevel: 0, wantedMaxStars: 5,
      miniGaragesActive: false, miniGaragesRemaining: 1, miniGaragesTotal: 1,
      miniGarageNextDistance: null, oncomingPoliceTurnarounds: [], spikeBlock: null, suvCharges: [],
      bazookaAmmo: 2, bazookaPickupTaken: true,
    };
    await act(async () => worldProbe.props?.onHud?.(fakeHud));
    assert.equal(bazookaButton.disabled, false, 'le bouton devient disponible après le pickup');
    assert.match(bazookaButton.className, /is-ready/, 'le bouton prêt prend l’accent jaune');
    assert.match(bazookaButton.textContent, /2 TIRS · X/, 'le HUD montre les deux tirs et le raccourci');
    await click(bazookaButton);
    assert.deepEqual(worldProbe.actions, ['bazooka'], 'le bouton transmet bien l’action bazooka au monde');
    await act(async () => worldProbe.props?.onHud?.({ ...fakeHud, bazookaAmmo: 0 }));
    assert.equal(bazookaButton.disabled, true, 'le bouton se reverrouille une fois les deux tirs utilisés');
    assert.match(bazookaButton.textContent, /ÉPUISÉ/, 'le HUD signale le stock épuisé');

    // Une volée d'événements de course : ceux qui ouvraient autrefois une
    // fenêtre de message, un bandeau de tour ou une pastille d'état.
    const volley = [
      { type: 'traffic-impact', isPlayer: true, oncoming: false, traffic: 'SENTINEL', healthLost: 1, health: 14, maxHealth: 15 },
      { type: 'traffic-impact', isPlayer: true, oncoming: true, policeContact: true, isSuv: true, healthLost: 2, health: 12, maxHealth: 15 },
      { type: 'pistol-hit-player', attacker: 'BERLINE 04', health: 11, maxHealth: 15 },
      { type: 'wanted-level', stars: 3, reason: 'police-shot' },
      { type: 'police-aim', police: 'BERLINE 04' },
      { type: 'police-spike-block', stage: 'set', covered: true, lanes: 2 },
      { type: 'police-spike-hit', healthLost: 1, health: 10, maxHealth: 15, slowSeconds: 2.4 },
      { type: 'mini-garage-used', remaining: 0, healthRestored: 3, previousStars: 3, stars: 0, pursuersReleased: 2 },
      { type: 'oncoming-bonus', stage: 'full' },
      { type: 'ramp-jump', distance: 42 },
      { type: 'jump-overpass' },
      { type: 'rival-boost', rival: 'DANTE' },
      { type: 'police-destroyed', police: 'BERLINE 07', byPlayer: true, wantedLevel: 3 },
      { type: 'bazooka-impact', targetId: 'police-08', count: 2 },
      { type: 'tunnel-enter', name: 'TUNNEL', closed: 2, open: 2, walls: 1, side: 'left' },
      { type: 'sprint-timeout', checkpoints: 4 },
      { type: 'story-warning' },
    ];
    await act(async () => { volley.forEach((effect) => worldProbe.props?.onEffect?.(effect)); });
    await settle(40);

    for (const selector of ['.city-rush-toast', '.city-rush-lap-banner', '.city-rush-status-pill']) {
      assert.equal(node.querySelectorAll(selector).length, 0, `aucun « ${selector} » ne se pose sur la course`);
    }
    assert.ok(hud.contains(node.querySelector('.city-rush-hud-zone.is-top-center')), 'la zone haute du HUD reste en place, sans message dedans');
    assert.ok(node.querySelector('.city-rush-bazooka-blast-vignette'), 'un impact de bazooka déclenche sa vignette rouge');
    assert.ok(node.querySelector('.city-rush-world.is-bazooka-shaking'), 'la scène 3D tremble à l’impact, sans déplacer le HUD');

    // Le HUD de course, lui, garde tout ce qui se lit d'un coup d'œil.
    assert.ok(node.querySelector('.city-rush-position-card'), 'la carte POSITION reste affichée');
    assert.ok(node.querySelector('.city-rush-lap-card'), 'la carte TOUR / CHECKPOINT reste affichée');
    assert.ok(node.querySelector('.city-rush-gta-cash'), 'la carte BUTIN et chrono reste affichée');
    assert.ok(node.querySelector('.city-rush-speedometer'), 'le compteur de vitesse reste affiché');
    assert.ok(node.querySelector('.city-rush-race-list'), 'le classement de la course reste affiché');

    // ── 3. L'arrivée ne rouvre pas non plus de fenêtre de course ─────────────
    await act(async () => {
      worldProbe.props?.onFinish({
        city: 'vice-city', rank: 1, duration: 118.42, score: 1250, pickups: 6, winner: 'Nico Vega', laps: 3,
      });
    });
    await settle(40);
    assert.ok(node.querySelector('.city-rush-result-overlay'), 'l’écran d’arrivée s’affiche');
    assert.equal(node.querySelectorAll('.city-rush-toast').length, 0, 'l’arrivée ne laisse aucun message traîner sur le HUD');
  } finally {
    timers?.restore();
    await act(async () => root?.unmount());
    node.remove();
    window.localStorage.clear();
  }
}
