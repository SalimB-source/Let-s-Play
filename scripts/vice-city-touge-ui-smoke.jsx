/**
 * Entrée SSR utilisée par scripts/vice-city-touge-ui-check.mjs —
 * `npm run check:city-rush-touge`.
 *
 * Le tōgé du Mont Haruna est le neuvième parcours de Vice City Rush et la
 * seule route de montagne : chaussée étroite de nuit à double sens fermée,
 * épingles, aucun bazooka ni mini-garage. Cette entrée monte la vraie page
 * dans jsdom — seul le moteur 3D est remplacé par la doublure
 * `scripts/vice-city-world-stub.jsx` — et rejoue le chemin du joueur : choix
 * du mode, choix du parcours, garage, départ.
 *
 * Elle vérifie que la carte du tōgé est proposée, débloquée dans une sauvegarde
 * complète, que sa miniature pointe sur le fichier livré, que la plaque de
 * route annonce les 13,8 km en descente et que le monde est bien lancé sur
 * `touge`, sans erreur moteur affichée.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const TOUGE_ID = 'touge';
// Dernier parcours de la carrière : la sauvegarde simulée a bouclé les huit
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
  const before = ['vice-city', 'new-york', 'tokyo', 'paris', 'london', 'route-66', 'mexico-countryside', 'nordschleife'];
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    cash: 900,
    ownedCarIds: ['city-hatch', 'nova-18-gt'],
    completedCourseIds: before,
  }));
}

export async function checkViceCityTougeUi(assert) {
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

    // 1. Le mode CIRCUIT propose les neuf parcours, le tōgé compris.
    const modeCards = [...node.querySelectorAll('.city-rush-mode-card')];
    const circuit = modeCards.find((card) => /CIRCUIT/.test(squash(card.textContent)));
    assert.ok(circuit, 'la vignette CIRCUIT est affichée');
    await click(circuit);
    await settle();

    const cards = [...node.querySelectorAll('.city-rush-city-card')];
    assert.equal(cards.length, 9, `les neuf parcours sont proposés (trouvés : ${cards.length})`);
    const touge = cards.find((card) => squash(card.querySelector('b')?.textContent) === 'MONT HARUNA · TŌGE');
    assert.ok(touge, 'la carte MONT HARUNA · TŌGE est affichée');
    assert.ok(!touge.classList.contains('is-locked'), 'le tōgé est débloqué dans cette sauvegarde');

    // 2. Sa miniature est bien celle du fichier livré.
    const thumb = mustFind(touge, '.city-rush-city-thumb img', 'miniature du tōgé');
    assert.match(String(thumb.getAttribute('src')), /\/touge-thumb\.jpg$/, 'la miniature pointe sur touge-thumb.jpg');

    // 3. La plaque de route annonce la descente : 13,8 km, du col au lac,
    //    limitation 40 km/h.
    const plate = mustFind(touge, '.city-rush-city-route', 'plaque de route du tōgé');
    const plateText = squash(plate.textContent);
    assert.match(plateText, /榛/, `la plaque porte la pastille 榛 (lue : ${plateText})`);
    assert.match(plateText, /13[\s\u202f,.]?8 km/, `la plaque annonce les 13,8 km (lue : ${plateText})`);
    assert.match(plateText, /DESCENTE/, `la plaque annonce la descente (lue : ${plateText})`);
    assert.match(plateText, /40 km\/h/, `la plaque annonce la limitation (lue : ${plateText})`);

    // 4. Le garage annonce la montagne, pas une ville.
    await click(touge);
    await settle();
    const kickers = [...node.querySelectorAll('.city-rush-overlay-kicker')].map((el) => squash(el.textContent));
    assert.ok(kickers.some((kicker) => /GARAGE · 榛名山 · 峠ダウンヒル/.test(kicker)), `le garage annonce le tōgé (lu : ${kickers.join(' // ')})`);

    // 5. Le départ lance le monde sur le bon parcours, sans erreur moteur.
    const start = [...node.querySelectorAll('button')].find((button) => /LANCER LA COURSE/.test(squash(button.textContent)));
    assert.ok(start, 'le bouton « LANCER LA COURSE » est affiché');
    await click(start);
    await settle(50);
    assert.equal(worldProbe.props?.cityId, TOUGE_ID, 'le monde est lancé sur le tōgé');
    assert.equal(squash(node.querySelector('.city-rush-error')?.textContent ?? ''), '', 'aucune erreur moteur affichée');
  } finally {
    timers.restore();
    await act(async () => root.unmount());
    node.remove();
  }
}
