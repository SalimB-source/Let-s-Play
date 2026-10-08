/**
 * Entrée SSR utilisée par scripts/vice-city-tournament-check.mjs —
 * `npm run check:city-rush-tournament`.
 *
 * Joue un tournoi complet de Vice City Rush sur la vraie page montée dans
 * jsdom (seul le moteur 3D est remplacé par la doublure
 * `scripts/vice-city-world-stub.jsx`) : la Coupe Sunset, trois courses sans
 * police ni armes, avec les mêmes rivaux — puis vérifie le titre, la prime,
 * le déblocage du tournoi suivant et la sauvegarde.
 *
 * Déroulé :
 *   1. le hub affiche 4 tournois : Sunset ouvert, les 3 autres verrouillés ;
 *   2. la Coupe Sunset part au garage (ville imposée : Vice City), le monde
 *      reçoit 3 tours, les règles « pures » (ni police ni armes) et les
 *      rivaux attitrés (Maya, Mateo) ;
 *   3. manche 1 (victoire) : classement général (10 pts), bouton
 *      « COURSE SUIVANTE · HISTORIC U.S. 66 », +50 billets ;
 *   4. manche 2 (2e place) : égalité 16-16, le vainqueur de la manche mène ;
 *   5. manche 3 (victoire) : sacre (26 pts), prime +100, notice de déblocage
 *      de la Coupe d'Europe, sauvegarde (terminé + titre + 230 billets) ;
 *   6. retour aux modes : Sunset dit « TITRE ×1 », l'Europe est ouverte, et
 *      l'entrer puis revenir en arrière abandonne proprement.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu, openHubPage } from './vice-city-title-menu-dismiss.jsx';
import { CITY_RUSH_TOURNAMENTS } from '../src/games/cityRushTournaments.js';
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
/** Trouve un élément ou lève une erreur qui dit quelle étape a échoué. */
function mustFind(node, selector, label) {
  const el = node.querySelector(selector);
  if (!el) throw new Error(`élément introuvable : ${selector} (${label})`);
  return el;
}
const settle = (ms = 20) => act(async () => { await sleep(ms); });
// Le compte à rebours est une chaîne de minuteurs (3 → 2 → 1 → GO) : chaque
// maillon n'est posé qu'au rendu suivant, donc il faut sortir de `act` entre
// les deux — un seul long `settle` ne fait avancer que le premier.
async function awaitRaceStart(node) {
  for (let round = 0; round < 12 && !node.querySelector('.city-rush-hud'); round += 1) {
    await settle(30);
  }
}
const textOf = (node, selector) => squash(node.querySelector(selector)?.textContent ?? '');

/** Fausse arrivée au format émis par `ViceCityWorld` (`order[0]` gagne). */
function finishPayload(city, order) {
  return {
    city,
    duration: 120,
    distance: 4800,
    laps: 3,
    sprint: false,
    checkpoints: null,
    timedOut: false,
    destroyed: false,
    sabotaged: false,
    rank: order.indexOf('player') + 1,
    winner: order[0] === 'player' ? 'KENJI' : 'RIVAL',
    winnerId: order[0],
    score: 900,
    pickups: 4,
    racers: order.map((slot, index) => ({ id: slot, rank: index + 1 })),
  };
}

/** Termine la manche en cours par le podium `order` (le monde est une doublure). */
async function finishLeg(node, city, order) {
  await act(async () => { worldProbe.props?.onFinish?.(finishPayload(city, order)); });
  await settle();
  return mustFind(node, '.city-rush-result-overlay', `arrivée ${city}`);
}

async function mountPage(entry = '/jeu/vice-city-rush') {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <ViceCityRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await settle(30);
  await dismissTitleMenu(node);
  // Les tournois ont leur page : c'est là que le hub les mène, et c'est là
  // qu'ils doivent être listés — plus dans le sélecteur de modes libres.
  await openHubPage(node, 'TOURNOIS');
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

export async function checkViceCityTournament(assert) {
  const timers = patchTimers();
  window.localStorage.clear();
  const page = await mountPage();
  const { node } = page;
  const failures = [];
  const check = (label, condition, extra = '') => {
    if (condition) return;
    failures.push(`${label}${extra ? ` — ${extra}` : ''}`);
  };

  // ── 1. Le hub : 4 tournois, seul Sunset est ouvert ───────────────────────
  const cards = [...node.querySelectorAll('.cr-tournament-card')];
  check('le hub affiche les 4 tournois', cards.length === CITY_RUSH_TOURNAMENTS.length, `${cards.length} cartes`);
  check('seule la Coupe Sunset est jouable', cards[0]?.disabled === false && cards.slice(1).every((card) => card.disabled === true));
  check(
    'les cartes verrouillées annoncent le tournoi précédent',
    /APRÈS COUPE SUNSET/.test(squash(cards[1]?.textContent)),
    `"${squash(cards[1]?.textContent).slice(0, 120)}"`,
  );
  check(
    'les cartes annoncent 3 tours, le barème et la prime',
    cards.every((card) => /3 TOURS\/COURSE · 10 · 6 · 3 PTS · \+/.test(squash(card.textContent))),
  );

  // ── 2. Entrée en tournoi : garage imposé, règles « pures » ───────────────
  await click(cards[0]);
  await settle();
  const garageCopy = textOf(node, '.city-rush-intro-copy');
  check('le garage annonce le tournoi et la manche', /TOURNOI · COUPE SUNSET · COURSE 1\/3/.test(garageCopy), `"${garageCopy.slice(0, 120)}"`);
  check('le garage annonce 3 courses sans police ni armes', /sans police ni armes/i.test(garageCopy));
  check('le garage impose la première ville du tournoi (Vice City)', worldProbe.props?.cityId === 'vice-city', `cityId=${worldProbe.props?.cityId}`);
  // L'étape ville n'existe pas en tournoi : le stepper la verrouille.
  const cityStep = [...node.querySelectorAll('.city-rush-stepper-item')].find((step) => /VILLE/.test(step.textContent));
  check('l’étape ville du stepper est verrouillée en tournoi', cityStep?.classList.contains('is-locked') === true);
  await click(cityStep);
  await settle();
  check('le garage reste affiché après un clic sur l’étape ville', Boolean(node.querySelector('.city-rush-car-select')));

  // Voiture offerte → départ immédiat, sans police ni armes.
  const launchCard = mustFind(node, '.city-rush-car-card:not(.is-locked)', 'voiture offerte du tournoi');
  await click(launchCard);
  await settle();
  check(
    'le compte à rebours annonce la manche du tournoi',
    /COUPE SUNSET · COURSE 1\/3 · PRÊT/.test(textOf(node, '.city-rush-countdown')),
    `"${textOf(node, '.city-rush-countdown')}"`,
  );
  await awaitRaceStart(node);
  check('le monde court 3 tours en tournoi', worldProbe.props?.raceLaps === 3, `raceLaps=${worldProbe.props?.raceLaps}`);
  check('la police est coupée en tournoi', worldProbe.props?.storyRules?.policeEnabled === false);
  check('les armes sont coupées en tournoi', worldProbe.props?.storyRules?.weaponsEnabled === false);
  check('le bazooka est coupé en tournoi', worldProbe.props?.storyRules?.bazookaEnabled === false);
  check('aucune poursuite dès le départ', worldProbe.props?.racePoliceFromStart === false);
  check(
    'les rivaux attitrés roulent leurs voitures (Mistral, Nova)',
    worldProbe.props?.storyRules?.rivalCarIds?.nova === 'city-hatch'
      && worldProbe.props?.storyRules?.rivalCarIds?.juno === 'nova-18-gt',
    JSON.stringify(worldProbe.props?.storyRules?.rivalCarIds),
  );
  const gridDrivers = (worldProbe.props?.roster || []).map((racer) => racer.driverId);
  check(
    'la grille aligne le pilote et les rivaux du tournoi (Maya, Mateo)',
    gridDrivers.length === 3 && gridDrivers[1] === 'maya' && gridDrivers[2] === 'mateo',
    gridDrivers.join('/'),
  );
  check('la course démarre (HUD affiché)', Boolean(node.querySelector('.city-rush-hud')));
  check('aucun bouton d’arme pendant la manche', !node.querySelector('.city-rush-weapon-controls'));

  // ── 3. Manche 1 (victoire) : 10 pts, +50 billets, manche suivante ────────
  await finishLeg(node, 'vice-city', ['player', 'nova', 'juno']);
  const leaderLeg1 = textOf(node, '.cr-tournament-row.is-leader');
  check('le classement montre le pilote en tête après sa victoire', /KENJI/.test(leaderLeg1) && /10/.test(leaderLeg1), `"${leaderLeg1}"`);
  check('le classement compte la manche courue', /1 \/ 3 COURSES/.test(textOf(node, '.cr-tournament-standings')));
  check('la victoire de manche paie 50 billets', /\+50 BILLETS VERTS/.test(textOf(node, '.city-rush-cash-reward')));
  const nextLegButton = mustFind(node, '.city-rush-next-race-button', 'bouton manche suivante');
  check(
    'le bouton enchaîne la manche suivante (Route 66)',
    /COURSE SUIVANTE · HISTORIC U.S. 66/.test(squash(nextLegButton.textContent)),
    `"${squash(nextLegButton.textContent)}"`,
  );
  check('une manche courue ne se rejoue pas (aucun bouton REJOUER)', !/REJOUER/.test(squash(node.querySelector('.city-rush-result-overlay')?.textContent ?? '')));

  // ── 4. Manche 2 (2e) : égalité 16-16, le vainqueur de manche mène ────────
  await click(nextLegButton);
  await settle();
  await awaitRaceStart(node);
  check('la manche 2 part sur la Route 66', worldProbe.props?.cityId === 'route-66', `cityId=${worldProbe.props?.cityId}`);
  check('la même voiture est gardée sur les 3 manches', worldProbe.props?.carId === 'city-hatch', `carId=${worldProbe.props?.carId}`);
  check(
    'les mêmes rivaux sur les 3 manches',
    (worldProbe.props?.roster || []).map((racer) => racer.driverId).join('/') === gridDrivers.join('/'),
  );
  await finishLeg(node, 'route-66', ['nova', 'player', 'juno']);
  const leaderLeg2 = textOf(node, '.cr-tournament-row.is-leader');
  check(
    'à 16-16, le vainqueur de la manche (Maya) mène le général',
    /MAYA/.test(leaderLeg2) && /16/.test(leaderLeg2),
    `"${leaderLeg2}"`,
  );
  check('la 2e place de manche paie 30 billets', /\+30 BILLETS VERTS/.test(textOf(node, '.city-rush-cash-reward')));

  // ── 5. Manche 3 (victoire) : sacre, prime, déblocage, sauvegarde ─────────
  await click(mustFind(node, '.city-rush-next-race-button', 'bouton dernière manche'));
  await settle();
  await awaitRaceStart(node);
  await finishLeg(node, 'new-york', ['player', 'juno', 'nova']);
  check('le sacre s’affiche en titre', /CHAMPION/.test(textOf(node, '.city-rush-result-overlay h2')));
  check(
    'le champion totalise 26 points (10 + 6 + 10)',
    /KENJI/.test(textOf(node, '.cr-tournament-row.is-leader')) && /26/.test(textOf(node, '.cr-tournament-row.is-leader')),
  );
  check('la dernière manche paie course (50) + prime (100)', /\+150 BILLETS VERTS/.test(textOf(node, '.city-rush-cash-reward')));
  check(
    'le titre débloque la Coupe d’Europe',
    /NOUVEAU TOURNOI DÉBLOQUÉ/.test(textOf(node, '.city-rush-course-unlocked-notice'))
      && /EUROPE/.test(textOf(node, '.city-rush-course-unlocked-notice')),
  );
  check('le portefeuille totalise 230 billets (50 + 30 + 50 + 100)', /230/.test(textOf(node, '.city-rush-wallet')), `"${textOf(node, '.city-rush-wallet')}"`);
  const saved = JSON.parse(window.localStorage.getItem('letsplay_vice_city_rush_progress_v1') || '{}');
  check('la sauvegarde garde le tournoi terminé', JSON.stringify(saved.completedTournamentIds) === JSON.stringify(['sunset']));
  check('la sauvegarde garde le titre de champion', saved.tournamentTitles?.sunset === 1, JSON.stringify(saved.tournamentTitles));
  check('la sauvegarde garde les 230 billets', saved.cash === 230, `cash=${saved.cash}`);

  // ── 6. Retour aux modes : palmarès, Europe ouverte, abandon propre ────────
  const backButton = [...node.querySelectorAll('.city-rush-text-button')].find((button) => /AUTRES TOURNOIS/.test(button.textContent));
  check('le bouton AUTRES TOURNOIS est proposé après le sacre', Boolean(backButton));
  await click(backButton);
  await settle();
  const hubCards = [...node.querySelectorAll('.cr-tournament-card')];
  check('Sunset annonce son titre au hub', hubCards[0]?.classList.contains('is-champion') === true && /TITRE ×1/.test(squash(hubCards[0]?.textContent ?? '')));
  check('l’Europe est débloquée après Sunset', hubCards[1]?.disabled === false);
  check('le compteur du hub dit 1 / 4', /1 \/ 4/.test(textOf(node, '.cr-tournament-hub-progress')));
  await click(hubCards[1]);
  await settle();
  check('l’Europe part au garage (Paris imposé)', /COUPE D’EUROPE/.test(textOf(node, '.city-rush-intro-copy')) && worldProbe.props?.cityId === 'paris');
  await click(mustFind(node, '.city-rush-intro-actions .city-rush-text-button', 'retour tournois'));
  await settle();
  check('revenir en arrière abandonne le tournoi sans planter le hub', node.querySelectorAll('.cr-tournament-card').length === 4);

  await page.unmount();
  timers.restore();

  if (failures.length) {
    console.error('TOURNAMENT FAILED:');
    failures.forEach((line) => console.error('  •', line));
    throw new Error(`${failures.length} incohérence(s) du tournoi (Coupe Sunset de bout en bout)`);
  }
  assert.ok(true, 'le tournoi se joue de bout en bout');
}
