/**
 * Entrée SSR utilisée par scripts/vice-city-sprint-ui-check.mjs —
 * `npm run check:city-rush-sprint-ui`.
 *
 * Le moteur de course est déjà vérifié seul (`npm run check:city-rush-sprint` :
 * portes visibles et boosts au sol, mais ni police, ni rival, ni arme). Ce
 * smoke regarde l'autre moitié du problème : **ce que la page affiche autour
 * de la course** quand le mode SPRINT est choisi. Un sprint solo ne doit rien
 * montrer qui évoque une
 * course à plusieurs ou une poursuite — ni classement de rivaux, ni carte
 * « escouade de police », ni guide des armes — avant le départ, pendant le
 * compte à rebours et en course.
 *
 * La vraie page est montée dans jsdom ; seul le moteur 3D est remplacé par la
 * doublure `scripts/vice-city-world-stub.jsx`, qui expose les props reçues
 * (`worldProbe.props`) : on vérifie au passage que la page demande bien
 * `raceFormat="sprint"` au monde.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
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
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

/** Texte brut d'un sélecteur, ou '' si l'élément est absent. */
const textOf = (node, selector) => squash(node.querySelector(selector)?.textContent ?? '');
const has = (node, selector) => Boolean(node.querySelector(selector));
const countOf = (node, selector) => node.querySelectorAll(selector).length;

/** Les noms de pilotes affichés dans le classement latéral « POSITIONS ». */
function standingNames(node) {
  return [...node.querySelectorAll('.city-rush-leaderboard .city-rush-racer-name-row b')].map((el) => squash(el.textContent));
}

/** Choisit le mode SPRINT (2e vignette), puis un parcours, puis une voiture. */
async function pickSprint(node) {
  const cards = node.querySelectorAll('.city-rush-mode-card');
  const sprintCard = [...cards].find((card) => /SPRINT/.test(squash(card.textContent)));
  if (!sprintCard) throw new Error('vignette SPRINT introuvable');
  await click(sprintCard);
  await settle();
  await click(mustFind(node, '.city-rush-city-card', 'étape ville du Sprint'));
  await settle();
  return sprintCard;
}

export async function checkViceCitySprintUi(assert) {
  const timers = patchTimers();
  const page = await mountPage();
  const { node } = page;
  const failures = [];
  const check = (label, condition, extra = '') => {
    if (condition) return;
    failures.push(`${label}${extra ? ` — ${extra}` : ''}`);
  };

  // ── 1. Écran des modes : SPRINT est annoncé solo, sans police ────────────
  const sprintCard = await pickSprint(node);
  check(
    'la vignette Sprint annonce les 14 checkpoints du parcours allongé',
    /14 CHECKPOINTS/i.test(squash(sprintCard.textContent)),
    squash(sprintCard.textContent),
  );
  check(
    'la page demande un Sprint au moteur 3D',
    worldProbe.props?.raceFormat === 'sprint' && worldProbe.props?.racePoliceFromStart === false,
    `raceFormat=${worldProbe.props?.raceFormat}`,
  );

  // Le classement latéral ne doit pas lister de rivaux avant le départ.
  const introStandings = standingNames(node);
  check(
    'aucun rival dans le classement latéral avant le départ',
    introStandings.length <= 1,
    `pilotes affichés : ${introStandings.join(', ') || '(aucun)'}`,
  );

  // Aucune carte « police » ni guide des armes : le sprint n'en a pas.
  const sidebarText = textOf(node, '.city-rush-sidebar');
  check(
    'aucune carte ESCOUADE DE POLICE dans la colonne latérale',
    !has(node, '.city-rush-no-collision-note.is-police') && !/ESCOUADE DE POLICE/i.test(sidebarText),
    `"${sidebarText.slice(0, 160)}…"`,
  );
  check(
    'aucun guide des armes/objets dans la colonne latérale',
    !has(node, '.city-rush-item-guide:not(.is-sprint)') && !/MITRAILLEUSE|AK-47|MISSILE/i.test(sidebarText),
  );
  check(
    'la colonne latérale annonce le chrono solo et les checkpoints',
    /CHECKPOINT/i.test(sidebarText),
    `"${sidebarText.slice(0, 160)}…"`,
  );
  check(
    'le guide SPRINT affiche les pads turbo au sol',
    /TURBO AU SOL|PAD TURBO/i.test(sidebarText) && has(node, '.city-rush-guide-item.is-boost'),
  );
  check(
    'le guide précise que le turbo est le seul bonus du Sprint',
    /SEUL BONUS/i.test(sidebarText),
  );

  // ── 2. Compte à rebours et course : rien sur les rivaux ni la police ─────
  await click(mustFind(node, '.city-rush-car-card', 'garage du Sprint'));
  await settle(60);
  check(
    'le moteur reçoit toujours raceFormat="sprint" au lancement',
    worldProbe.props?.raceFormat === 'sprint',
    `raceFormat=${worldProbe.props?.raceFormat}`,
  );

  const hudText = squash(node.querySelector('.city-rush-shell')?.textContent ?? '');
  check(
    'pas de mitrailleuse annoncée pendant le sprint',
    !/Z : MITRAILLEUSE/i.test(hudText),
  );
  check(
    'pas de « 1 TOURS » : le sprint parle de checkpoints',
    !/\b1 TOURS\b/i.test(hudText),
    `"${hudText.match(/.{0,40}\b1 TOURS\b.{0,40}/i)?.[0] ?? ''}"`,
  );
  check(
    'la barre supérieure annonce le sprint solo',
    /SOLO|CHECKPOINT/i.test(textOf(node, '.city-rush-topbar')),
    `"${textOf(node, '.city-rush-topbar').slice(0, 120)}"`,
  );

  // La course démarre : le monde passe en phase « playing » une fois prêt.
  await act(async () => { worldProbe.props?.onReady?.(); });
  await settle(80);
  const racing = standingNames(node);
  check(
    'aucun rival dans le classement latéral en course',
    racing.length <= 1,
    `pilotes affichés : ${racing.join(', ') || '(aucun)'}`,
  );

  // ── 3. Les autres modes gardent leur police et leurs rivaux ─────────────
  await act(async () => { worldProbe.props?.onFinish?.({ rank: 1, laps: 4, distance: 3600, duration: 90, score: 0, pickups: 0, racers: [], winner: 'NOVA' }); });
  await settle(40);
  const nextRaceBtn = node.querySelector('.city-rush-next-race-button');
  check(
    'le bouton COURSE SUIVANTE est affiché en cas de victoire en mode course',
    Boolean(nextRaceBtn && /COURSE SUIVANTE/i.test(squash(nextRaceBtn.textContent))),
  );
  check(
    'le bouton COURSE SUIVANTE porte la classe is-gold',
    Boolean(nextRaceBtn?.classList.contains('is-gold')),
  );
  // L'écran d'arrivée ne montre pas les vignettes : « CHANGER DE MODE » ramène
  // au choix des modes, où l'on reprend le CIRCUIT.
  const backToModes = [...node.querySelectorAll('.city-rush-text-button')]
    .find((button) => /CHANGER DE MODE|MODE LIBRE/i.test(squash(button.textContent)));
  if (backToModes) { await click(backToModes); await settle(); }
  const circuitCard = [...node.querySelectorAll('.city-rush-mode-card')]
    .find((card) => /CIRCUIT/.test(squash(card.textContent)));
  if (!circuitCard) throw new Error('vignette CIRCUIT introuvable après l’arrivée');
  check(
    'la vignette Circuit annonce six tours',
    /6 TOURS/i.test(squash(circuitCard.textContent)),
    squash(circuitCard.textContent),
  );
  await click(circuitCard);
  await settle();
  const circuitSidebar = textOf(node, '.city-rush-sidebar');
  check(
    'le mode CIRCUIT garde sa carte ESCOUADE DE POLICE',
    /ESCOUADE DE POLICE/i.test(circuitSidebar),
  );
  check(
    'le mode CIRCUIT garde ses rivaux au classement',
    standingNames(node).length === 3,
    `pilotes affichés : ${standingNames(node).join(', ') || '(aucun)'}`,
  );

  await page.unmount();
  timers.restore();

  if (failures.length) {
    console.error('SPRINT UI FAILED:');
    failures.forEach((line) => console.error('  •', line));
    throw new Error(`${failures.length} trace(s) de police ou de rivaux en mode SPRINT`);
  }
}
