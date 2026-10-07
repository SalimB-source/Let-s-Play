/**
 * Entrée SSR utilisée par scripts/vice-city-mexico-ui-check.mjs —
 * `npm run check:city-rush-mexico`.
 *
 * Le parcours mexicain (CARRETERA DEL SOL, Zacatecas → San Luis Potosí) est le
 * dernier de la carrière : il n'apparaît dans le sélecteur qu'une fois les six
 * parcours précédents terminés, et son décor lui est propre (ranchos, agaves,
 * chapelle). Cette entrée monte la vraie page dans jsdom — seul le moteur 3D
 * est remplacé par la doublure `scripts/vice-city-world-stub.jsx` — et rejoue
 * le chemin du joueur : choix du mode, choix du parcours, garage, départ.
 *
 * Elle vérifie que la carte du Mexique est bien proposée, que sa miniature
 * pointe sur le fichier livré, que le garage annonce la bonne route et que le
 * monde est bien lancé sur `mexico-countryside`, sans erreur moteur affichée.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const MEXICO_ID = 'mexico-countryside';
// Dernier parcours de la carrière : la sauvegarde simulée a bouclé les six
// précédents, sans quoi sa carte reste verrouillée.
const PROGRESS_KEY = 'letsplay_vice_city_rush_progress_v1';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const click = (el) => act(async () => { el.click(); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });
const mustFind = (node, selector, label) => {
  const el = node.querySelector(selector);
  if (!el) throw new Error(`élément introuvable : ${selector} (${label})`);
  return el;
};

// Le compte à rebours (≈ 3 s) est raccourci pour ne pas ralentir la vérif.
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return { restore: () => { window.setTimeout = original; } };
}

function seedProgress() {
  const before = ['vice-city', 'new-york', 'tokyo', 'paris', 'london', 'route-66'];
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    cash: 900,
    ownedCarIds: ['city-hatch', 'nova-18-gt'],
    completedCourseIds: before,
  }));
}

export async function checkViceCityMexicoUi(assert) {
  const timers = patchTimers();
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  try {
    seedProgress();
    await act(async () => root.render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/jeu/vice-city-rush']}>
          <ViceCityRushPage />
        </MemoryRouter>
      </AuthProvider>,
    ));
    await settle(30);
    await dismissTitleMenu(node);

    // 1. Le mode CIRCUIT propose les huit parcours, Mexique compris.
    const modeCards = [...node.querySelectorAll('.city-rush-mode-card')];
    const circuit = modeCards.find((card) => /CIRCUIT/.test(squash(card.textContent)));
    assert.ok(circuit, 'la vignette CIRCUIT est affichée');
    await click(circuit);
    await settle();

    const cards = [...node.querySelectorAll('.city-rush-city-card')];
    assert.equal(cards.length, 8, `les huit parcours sont proposés (trouvés : ${cards.length})`);
    const mexico = cards.find((card) => squash(card.querySelector('b')?.textContent) === 'CARRETERA DEL SOL');
    assert.ok(mexico, 'la carte CARRETERA DEL SOL est affichée');
    assert.ok(!mexico.classList.contains('is-locked'), 'le parcours mexicain est débloqué dans cette sauvegarde');

    // 2. Sa miniature est bien celle du fichier livré.
    const thumb = mustFind(mexico, '.city-rush-city-thumb img', 'miniature du parcours mexicain');
    assert.match(String(thumb.getAttribute('src')), /\/mexico-countryside-thumb\.jpg$/, 'la miniature pointe sur mexico-countryside-thumb.jpg');

    // 3. Le garage annonce la route fédérale 45, pas une ville.
    await click(mexico);
    await settle();
    const kickers = [...node.querySelectorAll('.city-rush-overlay-kicker')].map((el) => squash(el.textContent));
    assert.ok(kickers.some((kicker) => /GARAGE · CARRETERA FEDERAL 45/.test(kicker)), `le garage annonce la route mexicaine (lu : ${kickers.join(' // ')})`);

    // 4. Le départ lance le monde sur le bon parcours, sans erreur moteur.
    const start = [...node.querySelectorAll('button')].find((button) => /LANCER LA COURSE/.test(squash(button.textContent)));
    assert.ok(start, 'le bouton « LANCER LA COURSE » est affiché');
    await click(start);
    await settle(50);
    assert.equal(worldProbe.props?.cityId, MEXICO_ID, 'le monde est lancé sur le parcours mexicain');
    assert.equal(squash(node.querySelector('.city-rush-error')?.textContent ?? ''), '', "aucune erreur moteur affichée");
  } finally {
    timers.restore();
    await act(async () => root.unmount());
    node.remove();
  }
}
