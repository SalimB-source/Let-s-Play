/**
 * Entrée SSR utilisée par scripts/city-rush-ui-check.mjs —
 * `npm run check:city-rush-ui`.
 *
 * Joue l'écran d'accueil (mode → ville → garage : le niveau des rivaux se choisit au
 * garage) et la fin de course de Vice City Rush dans jsdom, avec la vraie page ; seul
 * le moteur 3D est remplacé par une doublure (scripts/city-rush-world-stub.jsx) qui
 * garde les props que la page lui donne.
 *
 *   1. Par défaut : Facile / Normal / Difficile, Normal choisi, décrit et transmis
 *      au monde.
 *   2. Choisir un niveau : bouton enfoncé, description, prop du monde, mémorisation.
 *   3. D'une visite à l'autre : le choix est retrouvé ; une valeur absente,
 *      altérée ou un stockage refusé (navigation privée) retombent sur Normal sans
 *      casser la page.
 *   4. Records : un par ville, par mode ET par niveau ; l'ancien record (une clé par ville)
 *      est celui du Normal ; seul un chrono de victoire plus rapide l'améliore.
 *   5. Le niveau se lit au compte à rebours, sur le résultat et dans le classement.
 *   6. Entrée sur un bouton de difficulté choisit sans lancer la course ; Entrée
 *      ailleurs la lance.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_DIFFICULTIES, CITY_RUSH_LAPS } from '../src/games/cityRushRules';
import { worldProbe } from './city-rush-world-stub.jsx';

const DIFFICULTY_KEY = 'letsplay_vice_city_rush_difficulty_v1';
const BEST_KEY = 'letsplay_vice_city_rush_bests_v1';
const mode = Object.fromEntries(CITY_RUSH_DIFFICULTIES.map((item) => [item.id, item]));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

// Le compte à rebours dure ≈ 3 s : on raccourcit les délais de la page.
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return () => { window.setTimeout = original; };
}

async function mountPage() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <MemoryRouter initialEntries={['/jeu/vice-city-rush']}>
      <ViceCityRushPage />
    </MemoryRouter>,
  ));
  await act(async () => { await sleep(30); });
  await goGarage();
  return { unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

// L'accueil s'ouvre sur le choix du mode ; le niveau des rivaux est au garage (3ᵉ écran).
async function goGarage() {
  if (document.querySelector('.city-rush-difficulty-card')) return;
  const garage = [...document.querySelectorAll('.city-rush-stepper-item')].find((item) => /GARAGE/.test(item.textContent));
  if (!garage) throw new Error('étape « GARAGE » introuvable dans l\'accueil');
  await act(async () => { garage.click(); });
}

async function until(read, label, timeout = 3000) {
  const start = performance.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await act(async () => { await sleep(10); });
  }
}

// ── Lecture de la page ───────────────────────────────────────────────
const $ = (selector) => document.querySelector(selector);
const cards = () => [...document.querySelectorAll('.city-rush-difficulty-card')];
const names = () => cards().map((card) => squash(card.textContent));
const pressed = () => cards().map((card) => card.getAttribute('aria-pressed'));
const tagline = () => squash($('.city-rush-difficulty-select .city-rush-car-select-heading small')?.textContent);
// Au garage l'étiquette est « VILLE · MODE · NIVEAU » : on lit le niveau (dernier mot) et le chrono.
const bestNote = () => ({ level: squash($('.city-rush-best-note span')?.textContent).split(' · ').pop(), time: squash($('.city-rush-best-note b')?.textContent) });
const sidebarMode = () => squash($('.city-rush-leader-foot.is-mode b')?.textContent);
const stored = (key) => window.localStorage.getItem(key);
const storedBests = () => JSON.parse(stored(BEST_KEY) || '{}');

const click = (element) => act(async () => { element.click(); });
async function press(key, target = window) {
  await act(async () => { target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}
const MARK = { easy: 'FACILE', normal: 'NORMAL', hard: 'DIFFICILE' };
const race = (over = {}) => ({
  city: 'vice-city', difficulty: 'hard', rank: 1, duration: 75.5, laps: CITY_RUSH_LAPS, score: 12, pickups: 5,
  winner: 'TOI', winnerId: 'player', racers: [], ...over,
});

export async function checkCityRushUi(assert) {
  const restoreTimers = patchTimers();
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  let page = null;
  const remount = async () => { await page?.unmount(); page = await mountPage(); };
  try {
    // 1. Par défaut ────────────────────────────────────────────────────
    window.localStorage.clear();
    await remount();
    assert.equal(cards().length, 3, 'trois niveaux');
    assert.deepEqual(names(), ['FACILE', 'NORMAL', 'DIFFICILE'], 'dans l\'ordre, du plus doux au plus dur');
    assert.deepEqual(pressed(), ['false', 'true', 'false'], 'Normal est choisi par défaut');
    assert.equal(tagline(), mode.normal.tagline, 'la description est celle du niveau choisi');
    assert.equal(worldProbe.props.difficulty, 'normal', 'le monde reçoit le niveau');
    assert.deepEqual(bestNote(), { level: 'NORMAL', time: '— : —' });
    assert.equal(sidebarMode(), 'NORMAL', 'le classement rappelle le niveau');
    assert.match(squash($('.city-rush-difficulty-select .city-rush-car-select-heading span')?.textContent), /^DIFFICULTÉ DES RIVAUX/, 'au garage, sous la grille des pilotes (les rivaux)');
    const intro = $('.city-rush-intro');
    const garageOrder = ['.city-rush-car-grid', '.city-rush-driver-select', '.city-rush-difficulty-select']
      .map((selector) => [...intro.querySelectorAll('*')].indexOf(intro.querySelector(selector)));
    assert.ok(garageOrder.every((index, i) => index >= 0 && (i === 0 || index > garageOrder[i - 1])), `le garage se suit : cabriolet, pilotes, niveau (${garageOrder.join(' < ')})`);
    assert.ok(cards().every((card) => card.getAttribute('title') === mode[card.className.match(/is-(easy|normal|hard)/)[1]].tagline), 'chaque bouton porte sa description en infobulle');

    // 2. Choisir un niveau ─────────────────────────────────────────────
    await click(cards()[0]);
    assert.deepEqual(pressed(), ['true', 'false', 'false']);
    assert.equal(tagline(), mode.easy.tagline);
    assert.equal(worldProbe.props.difficulty, 'easy');
    assert.equal(stored(DIFFICULTY_KEY), 'easy', 'le choix est mémorisé');
    assert.equal(bestNote().level, 'FACILE');
    assert.equal(sidebarMode(), 'FACILE');
    await click(cards()[0]);
    assert.deepEqual(pressed(), ['true', 'false', 'false'], 'recliquer le niveau choisi ne change rien');

    // 3. D'une visite à l'autre ────────────────────────────────────────
    await remount();
    assert.deepEqual(pressed(), ['true', 'false', 'false'], 'le choix est retrouvé à la visite suivante');
    assert.equal(worldProbe.props.difficulty, 'easy', 'et c\'est lui que reçoit le monde dès la construction');
    for (const bad of ['banana', '', 'HARD', 'null']) {
      window.localStorage.setItem(DIFFICULTY_KEY, bad);
      await remount();
      assert.deepEqual(pressed(), ['false', 'true', 'false'], `valeur « ${bad} » : retour à Normal`);
      assert.equal(worldProbe.props.difficulty, 'normal');
    }
    window.localStorage.setItem(DIFFICULTY_KEY, 'hard');
    await remount();
    assert.deepEqual(pressed(), ['false', 'false', 'true']);
    assert.equal(worldProbe.props.difficulty, 'hard');
    // Stockage refusé (navigation privée, politique du navigateur) : la page marche, sans mémoire.
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('stockage refusé'); } });
    await remount();
    assert.deepEqual(pressed(), ['false', 'true', 'false'], 'stockage refusé : Normal, sans erreur');
    await click(cards()[2]);
    assert.deepEqual(pressed(), ['false', 'false', 'true'], 'le choix marche quand même, le temps de la visite');
    assert.equal(worldProbe.props.difficulty, 'hard');
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor);
    else delete window.localStorage;

    // 4. Records par ville et par niveau ───────────────────────────────
    window.localStorage.clear();
    window.localStorage.setItem(BEST_KEY, JSON.stringify({ 'vice-city': 80 })); // record d'avant les niveaux
    await remount();
    assert.deepEqual(bestNote(), { level: 'NORMAL', time: '01:20.00' }, 'l\'ancien record est celui du Normal (mode CIRCUIT)');
    await click(cards()[0]);
    assert.deepEqual(bestNote(), { level: 'FACILE', time: '— : —' }, 'Facile n\'hérite pas du record Normal');
    await click(cards()[2]);
    assert.deepEqual(bestNote(), { level: 'DIFFICILE', time: '— : —' });

    // 5. Une course en Difficile ───────────────────────────────────────
    await click($('.city-rush-start-button'));
    assert.match(squash($('.city-rush-countdown small')?.textContent), /· DIFFICILE$/, 'le compte à rebours rappelle le niveau');
    await until(() => !$('.city-rush-countdown'), 'fin du compte à rebours');
    assert.ok($('.city-rush-hud-top'), 'en course');
    assert.equal(sidebarMode(), 'DIFFICILE');

    await act(async () => worldProbe.props.onFinish(race()));
    assert.equal(squash($('.city-rush-result-overlay .city-rush-overlay-kicker')?.textContent), `VICTOIRE · CIRCUIT · DIFFICILE · ${CITY_RUSH_LAPS} TOURS`);
    assert.deepEqual(storedBests(), { 'vice-city': 80, 'vice-city:hard': 75.5 }, 'le record Difficile est à part, celui du Normal est intact');

    await act(async () => worldProbe.props.onFinish(race({ duration: 90 })));
    assert.equal(storedBests()['vice-city:hard'], 75.5, 'un chrono plus lent n\'écrase pas le record');
    await act(async () => worldProbe.props.onFinish(race({ rank: 2, duration: 60 })));
    assert.equal(storedBests()['vice-city:hard'], 75.5, 'sans victoire, pas de record');
    assert.equal(squash($('.city-rush-result-overlay .city-rush-overlay-kicker')?.textContent), `ARRIVÉE · CIRCUIT · DIFFICILE · ${CITY_RUSH_LAPS} TOURS`);
    await act(async () => worldProbe.props.onFinish(race({ difficulty: 'easy', duration: 70 })));
    assert.deepEqual(storedBests(), { 'vice-city': 80, 'vice-city:hard': 75.5, 'vice-city:easy': 70 });
    await act(async () => worldProbe.props.onFinish(race({ city: 'tokyo', difficulty: 'hard', duration: 66 })));
    assert.equal(storedBests()['tokyo:hard'], 66, 'un record par ville');
    await act(async () => worldProbe.props.onFinish(race({ difficulty: 'normal', duration: 79 })));
    assert.equal(storedBests()['vice-city'], 79, 'un chrono Normal plus rapide améliore l\'ancien record');
    await act(async () => worldProbe.props.onFinish(race({ difficulty: undefined, duration: 78 })));
    assert.equal(storedBests()['vice-city'], 78, 'un résultat sans niveau compte pour Normal');
    assert.equal(storedBests()['vice-city:hard'], 75.5);

    const back = [...document.querySelectorAll('.city-rush-result-overlay .city-rush-text-button')].find((button) => /CHANGER DE MODE/.test(button.textContent));
    assert.ok(back, 'bouton « CHANGER DE MODE »');
    await click(back);
    assert.ok($('.city-rush-intro'), 'retour à l\'accueil');
    await goGarage();
    assert.deepEqual(pressed(), ['false', 'false', 'true'], 'le niveau choisi reste après la course');
    assert.deepEqual(bestNote(), { level: 'DIFFICILE', time: '01:15.50' }, 'le record du niveau s\'affiche');
    await click(cards()[1]);
    assert.deepEqual(bestNote(), { level: 'NORMAL', time: '01:18.00' });

    // 6. La touche Entrée ──────────────────────────────────────────────
    const hard = cards()[2];
    hard.focus();
    await press('Enter', hard);
    assert.ok($('.city-rush-intro') && !$('.city-rush-countdown'), 'Entrée sur un bouton ne lance pas la course (le bouton reçoit l\'action)');
    await press('Enter');
    assert.ok($('.city-rush-countdown'), 'Entrée ailleurs lance la course');
    await press('Escape');
    assert.ok($('.city-rush-intro'), 'Échap ramène à l\'accueil');
    await goGarage();
    assert.deepEqual(pressed(), ['false', 'true', 'false'], 'avec le niveau choisi en dernier');

    // 7. Le mode a ses propres records ─────────────────────────────────
    // Un sprint d'un tour n'écrase pas — et n'hérite pas de — le record d'une course de trois tours.
    window.localStorage.clear();
    window.localStorage.setItem(BEST_KEY, JSON.stringify({ 'vice-city': 80 }));
    await remount();
    assert.equal(bestNote().time, '01:20.00', 'CIRCUIT (mode d\'origine) : l\'ancien record');
    const stepper = (label) => [...document.querySelectorAll('.city-rush-stepper-item')].find((item) => item.textContent.includes(label));
    await click(stepper('MODE'));
    await click([...document.querySelectorAll('.city-rush-mode-card')].find((card) => /SPRINT/.test(card.textContent)));
    await goGarage();
    assert.equal(bestNote().time, '— : —', 'SPRINT n\'hérite pas du record de la course de trois tours');
    await click($('.city-rush-start-button'));
    await until(() => !$('.city-rush-countdown'), 'fin du compte à rebours (sprint)');
    await act(async () => worldProbe.props.onFinish(race({ difficulty: 'normal', duration: 21.5, laps: 1 })));
    assert.deepEqual(storedBests(), { 'vice-city': 80, 'vice-city:sprint': 21.5 }, 'le sprint a sa propre clé, le record CIRCUIT est intact');
  } finally {
    restoreTimers();
    if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor);
    else delete window.localStorage;
    await page?.unmount();
  }
  return `trois niveaux (${Object.values(MARK).join(' / ')}), Normal par défaut · choix retrouvé d'une visite à l'autre (absent, altéré ou refusé → Normal) · un record par ville et par niveau, l'ancien record reste celui du Normal · niveau rappelé au compte à rebours, au résultat et au classement · Entrée sur un bouton ne lance pas la course`;
}
