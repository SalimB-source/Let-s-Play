/**
 * Entrée SSR utilisée par scripts/vice-city-nordschleife-ui-check.mjs —
 * `npm run check:city-rush-nordschleife`.
 *
 * Le Nürburgring Nordschleife est le dernier parcours de la carrière et le seul
 * circuit permanent : piste étroite à sens unique, aucun véhicule en face,
 * relief réel. Cette entrée monte la vraie page dans jsdom — seul le moteur 3D
 * est remplacé par la doublure `scripts/vice-city-world-stub.jsx` — et rejoue
 * le chemin du joueur : choix du mode, choix du parcours, garage, départ.
 *
 * Elle vérifie que la carte du Ring est proposée, débloquée dans une sauvegarde
 * complète, que sa miniature pointe sur le fichier livré, que la plaque de
 * route annonce les 20 832 km en sens horaire et que le monde est bien lancé
 * sur `nordschleife`, sans erreur moteur affichée.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const NORDSCHLEIFE_ID = 'nordschleife';
// Dernier parcours de la carrière : la sauvegarde simulée a bouclé les sept
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
  const before = ['vice-city', 'new-york', 'tokyo', 'paris', 'london', 'route-66', 'mexico-countryside'];
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    cash: 900,
    ownedCarIds: ['city-hatch', 'nova-18-gt'],
    completedCourseIds: before,
  }));
}

export async function checkViceCityNordschleifeUi(assert) {
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

    // 1. Le mode CIRCUIT propose les huit parcours, le Ring compris.
    const modeCards = [...node.querySelectorAll('.city-rush-mode-card')];
    const circuit = modeCards.find((card) => /CIRCUIT/.test(squash(card.textContent)));
    assert.ok(circuit, 'la vignette CIRCUIT est affichée');
    await click(circuit);
    await settle();

    const cards = [...node.querySelectorAll('.city-rush-city-card')];
    assert.equal(cards.length, 8, `les huit parcours sont proposés (trouvés : ${cards.length})`);
    const ring = cards.find((card) => squash(card.querySelector('b')?.textContent) === 'NÜRBURGRING NORDSCHLEIFE');
    assert.ok(ring, 'la carte NÜRBURGRING NORDSCHLEIFE est affichée');
    assert.ok(!ring.classList.contains('is-locked'), 'le circuit est débloqué dans cette sauvegarde');

    // 2. Sa miniature est bien celle du fichier livré.
    const thumb = mustFind(ring, '.city-rush-city-thumb img', 'miniature du Nordschleife');
    assert.match(String(thumb.getAttribute('src')), /\/nordschleife-thumb\.jpg$/, 'la miniature pointe sur nordschleife-thumb.jpg');

    // 3. La plaque de route annonce le circuit réel : 20 832 km, sens horaire,
    //    vitesse de pointe de la Döttinger Höhe.
    const plate = mustFind(ring, '.city-rush-city-route', 'plaque de route du Ring');
    const plateText = squash(plate.textContent);
    assert.match(plateText, /NS/, `la plaque porte la pastille NS (lue : ${plateText})`);
    // `toLocaleString('fr-FR')` écrit « 20,832 » : le séparateur décimal varie
    // selon la plateforme, on accepte les deux.
    assert.match(plateText, /20[\s\u202f,.]?832 km/, `la plaque annonce les 20 832 km (lue : ${plateText})`);
    assert.match(plateText, /SENS HORAIRE/, `la plaque annonce le sens horaire (lue : ${plateText})`);
    assert.match(plateText, /300 km\/h/, `la plaque annonce la vitesse de pointe (lue : ${plateText})`);

    // 4. Le garage annonce le Ring, pas une ville.
    await click(ring);
    await settle();
    const kickers = [...node.querySelectorAll('.city-rush-overlay-kicker')].map((el) => squash(el.textContent));
    assert.ok(kickers.some((kicker) => /GARAGE · NÜRBURGRING · GRÜNE HÖLLE/.test(kicker)), `le garage annonce le circuit (lu : ${kickers.join(' // ')})`);

    // 5. Le départ lance le monde sur le bon parcours, sans erreur moteur.
    const start = [...node.querySelectorAll('button')].find((button) => /LANCER LA COURSE/.test(squash(button.textContent)));
    assert.ok(start, 'le bouton « LANCER LA COURSE » est affiché');
    await click(start);
    await settle(50);
    assert.equal(worldProbe.props?.cityId, NORDSCHLEIFE_ID, 'le monde est lancé sur le Nordschleife');
    assert.equal(squash(node.querySelector('.city-rush-error')?.textContent ?? ''), '', 'aucune erreur moteur affichée');
  } finally {
    timers.restore();
    await act(async () => root.unmount());
    node.remove();
  }
}
