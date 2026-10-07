/**
 * Entrée SSR utilisée par scripts/vice-city-story-cars-check.mjs —
 * `npm run check:city-rush-story-cars`.
 *
 * Le mode Histoire (« MIDNIGHT REVANCHE ») prête parfois une voiture au pilote :
 * la **MISTRAL 1.4** du prologue de 1983 (`fixedCarId: 'city-hatch'`) et la
 * **TEMPESTA LP-780** de Mr. Voss sur le Ring (`fixedCarId: 'toro-v12'`). Le
 * prêt ne vaut que pour le chapitre qui le fait — jamais pour la campagne :
 * un pilote qui a choisi sa voiture au garage doit la retrouver dans chaque
 * chapitre sans prêt, y compris celui qui suit le Ring, et son choix doit
 * survivre à l'Histoire (le garage le montre toujours sélectionné après).
 *
 * Ce smoke monte la vraie page dans jsdom (moteur 3D remplacé par la doublure
 * `vice-city-world-stub.jsx`) et marche les dix chapitres : à chaque départ, la
 * voiture reçue par le monde — donc celle qui est construite et conduite — doit
 * être celle du chapitre, et le briefing doit l'annoncer.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_CARS } from '../src/games/cityRushRules.js';
import { CITY_RUSH_STORY_CHAPTERS, CITY_RUSH_STORY_CHAPTER_COUNT } from '../src/games/cityRushStory.js';
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
/** Cherche un bouton par son texte (les libellés changent selon le chapitre). */
function findByText(node, selector, pattern) {
  return [...node.querySelectorAll(selector)].find((el) => pattern.test(squash(el.textContent)));
}
const settle = (ms = 20) => act(async () => { await sleep(ms); });
const carName = (carId) => CITY_RUSH_CARS.find((car) => car.id === carId)?.name || `?${carId}`;

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

/** Attend l'écran demandé (HUD de course, cinématique, arrivée…). */
async function waitFor(node, selector, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const found = node.querySelector(selector);
    if (found) return found;
    await settle(15);
  }
  throw new Error(`${label} n’est jamais apparu (${selector})`);
}

/** Ligne « VOITURE » du briefing replié : ce que le chapitre annonce. */
function briefedCar(node) {
  const line = [...node.querySelectorAll('.cr-story-challenge-list p')]
    .find((entry) => /VOITURE/.test(squash(entry.querySelector('b')?.textContent)));
  return squash(line?.querySelector('span')?.textContent ?? '');
}

export async function checkViceCityStoryCars(assert) {
  // Un pilote installé : il possède une voiture qui n'est ni offerte ni prêtée
  // par le scénario (la CAVALLO F8 GTB) et l'a choisie au garage avant de
  // lancer la campagne. C'est elle que les chapitres sans prêt doivent rendre.
  const garageCarId = 'vice-roadster';
  assert.ok(
    CITY_RUSH_CARS.some((car) => car.id === garageCarId),
    'la voiture du garage testée existe au catalogue',
  );
  assert.ok(
    !CITY_RUSH_STORY_CHAPTERS.some((chapter) => chapter.fixedCarId === garageCarId),
    'la voiture du garage testée n’est prêtée par aucun chapitre',
  );
  window.localStorage.clear();
  window.localStorage.setItem(CITY_RUSH_PROGRESS_KEY, JSON.stringify({
    cash: 9000,
    ownedCarIds: [garageCarId],
    completedCourseIds: ['vice-city', 'new-york', 'tokyo', 'paris', 'london', 'route-66', 'mexico-countryside', 'nordschleife'],
    storyChapter: 0,
  }));

  const node = document.createElement('div');
  document.body.append(node);
  let root = null;
  let timers = null;
  try {
    root = await mountPage(node);
    timers = patchTimers();

    // ── Le choix du garage ─────────────────────────────────────────────────
    const cards = await openGarage(node);
    const chosen = cards.find((card) => squash(card.textContent).includes(carName(garageCarId)));
    assert.ok(chosen, `la ${carName(garageCarId)} est proposée au garage`);
    await click(chosen);
    await waitFor(node, '.city-rush-hud', 'le HUD de la course libre');
    assert.equal(worldProbe.props?.carId, garageCarId, 'la course libre part bien avec la voiture choisie au garage');

    // Retour aux menus : la sélection du pilote doit rester la même.
    const backToMenu = findByText(node, '.city-rush-top-button', /^↶ MENU$/);
    assert.ok(backToMenu, 'le bouton MENU est proposé en course');
    await click(backToMenu);
    await waitFor(node, '.city-rush-story-banner', 'la bannière du mode Histoire');

    // ── Les dix chapitres ──────────────────────────────────────────────────
    for (let index = 0; index < CITY_RUSH_STORY_CHAPTER_COUNT; index += 1) {
      const chapter = CITY_RUSH_STORY_CHAPTERS[index];
      const expectedCarId = chapter.fixedCarId || garageCarId;
      const label = `chapitre ${index + 1} « ${chapter.title} »`;

      const entry = index === 0
        ? mustFind(node, '.city-rush-story-banner', 'bannière du mode Histoire')
        : findByText(node, '.city-rush-start-button', /CHAPITRE SUIVANT/i);
      assert.ok(entry, `${label} : l’entrée du chapitre est proposée`);
      await click(entry);
      await waitFor(node, '.city-rush-story-cinematic', `la cinématique du ${label}`);

      // La voiture prêtée est annoncée telle quelle, sinon c'est celle du garage.
      const skip = node.querySelector('.cr-comic-nav-button.is-quiet');
      if (skip) { await click(skip); await settle(20); }
      const briefed = briefedCar(node);
      if (chapter.fixedCarId) {
        assert.match(briefed, new RegExp(carName(chapter.fixedCarId), 'i'), `${label} : le briefing annonce la voiture prêtée`);
        assert.match(briefed, /prêtée/i, `${label} : le briefing dit que la voiture est prêtée`);
      } else {
        assert.match(briefed, new RegExp(carName(garageCarId), 'i'), `${label} : le briefing annonce la voiture du garage`);
      }

      await click(findByText(node, '.city-rush-start-button', /LANCER LA COURSE|AFFRONTER LE BOSS/i));
      await waitFor(node, '.city-rush-hud', `le HUD du ${label}`);

      assert.equal(
        worldProbe.props?.carId,
        expectedCarId,
        `${label} : le monde conduit la ${carName(expectedCarId)}${chapter.fixedCarId ? ' (prêtée par le scénario)' : ' (voiture du garage)'}, pas la ${carName(worldProbe.props?.carId)}`,
      );
      assert.equal(worldProbe.props?.cityId, chapter.city, `${label} : le parcours du chapitre`);
      assert.equal(worldProbe.props?.raceLaps, chapter.laps, `${label} : le nombre de tours du chapitre`);

      // Objectif rempli (1re place, tous les défis) : le chapitre suivant s’ouvre.
      const props = worldProbe.props;
      await act(async () => {
        props.onFinish({
          city: props.cityId,
          rank: 1,
          duration: 10,
          healthLeft: 10,
          healthMax: 10,
          healthLeftAtBreakdown: 10,
          destroyed: false,
          timedOut: false,
          shotsFired: 0,
          hitsTaken: 0,
          policeDestroyed: 3,
          pickups: 12,
          margin: 200,
          rankAtBreakdown: 1,
          sprint: props.raceFormat === 'sprint',
          score: 1000,
        });
      });
      await waitFor(node, '.city-rush-result-overlay', `l’écran d’arrivée du ${label}`);
      await settle(40);
    }

    // ── Après la campagne, le garage a gardé le choix du pilote ────────────
    const exit = findByText(node, '.city-rush-text-button', /MODE LIBRE/i);
    assert.ok(exit, 'la sortie « MODE LIBRE / VILLE » est proposée après la finale');
    await click(exit);
    const afterCards = await openGarage(node);
    const stillChosen = afterCards.find((card) => squash(card.textContent).includes(carName(garageCarId)));
    assert.ok(
      stillChosen?.classList.contains('is-selected'),
      `après l’Histoire, la ${carName(garageCarId)} est toujours la voiture sélectionnée du garage`,
    );
  } finally {
    if (root) await act(async () => root.unmount());
    node.remove();
    timers?.restore();
  }
}
