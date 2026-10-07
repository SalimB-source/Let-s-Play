/**
 * Entrée SSR utilisée par scripts/vice-city-garage-3d-check.mjs —
 * `npm run check:city-rush-garage-3d`.
 *
 * Le hub de préparation de Vice City Rush est devenu un garage type Need for
 * Speed : la voiture sélectionnée est modélisée en 3D sur son plateau
 * (`ViceCityGarageStage.jsx`) et les menus restent au-dessus, sur la même page.
 * Ce smoke monte la vraie page dans jsdom — donc **sans WebGL** — et regarde :
 *   · la scène est montée à chaque étape (mode, ville, garage), en décor
 *     derrière les menus ;
 *   · faute de contexte WebGL, la page retombe sur la photo du modèle au lieu
 *     de casser l'écran de préparation ;
 *   · la plaque du garage annonce la voiture montée sur le plateau, et le focus
 *     clavier sur une carte de modèle la fait tourner au modèle visé (aperçu)
 *     sans jamais lancer la course ;
 *   · les étapes et le départ en course continuent de fonctionner.
 *
 * Seul le moteur de course est remplacé par la doublure
 * `scripts/vice-city-world-stub.jsx` : la page, elle, est la vraie.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { CITY_RUSH_CARS } from '../src/games/cityRushRules.js';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

/** Le compte à rebours (≈ 3 s) est raccourci pour ne pas ralentir la vérif. */
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return { restore: () => { window.setTimeout = original; } };
}

const click = (el) => act(async () => { el.click(); });
const settle = (ms = 25) => act(async () => { await sleep(ms); });

function mustFind(node, selector, label) {
  const el = node.querySelector(selector);
  if (!el) throw new Error(`élément introuvable : ${selector} (${label})`);
  return el;
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
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

export async function checkViceCityGarage3d(assert) {
  const timers = patchTimers();
  window.localStorage.clear();
  const page = await mountPage();
  const { node } = page;
  const failures = [];
  const check = (label, condition, extra = '') => {
    if (condition) return;
    failures.push(`${label}${extra ? ` — ${extra}` : ''}`);
  };
  const plate = () => squash(node.querySelector('.city-rush-hub-plate')?.textContent ?? '');

  try {
    // 1. La scène est là dès la première étape, en décor derrière les menus.
    const stage = mustFind(node, '.city-rush-hub-stage', 'scène de garage');
    check(
      'la scène de garage est montée dans le hub de préparation',
      Boolean(stage),
      'aucune .city-rush-hub-stage',
    );
    check(
      'la scène est un décor : hors lecture d’écran',
      stage.getAttribute('aria-hidden') === 'true',
      `aria-hidden="${stage.getAttribute('aria-hidden')}"`,
    );
    check(
      'le voile de contraste habille la scène',
      Boolean(node.querySelector('.city-rush-hub-stage-scrim')),
    );

    // 2. jsdom n'a pas de WebGL : la photo du modèle doit prendre le relais.
    const fallback = node.querySelector('.city-rush-hub-stage-fallback');
    const fallbackImage = node.querySelector('.city-rush-hub-stage-fallback img');
    check(
      'sans WebGL, la photo du modèle remplace la scène 3D',
      Boolean(fallback) && Boolean(fallbackImage),
      fallback ? 'repli présent mais sans image' : 'aucun repli affiché',
    );
    check(
      'le repli montre la miniature de la voiture du garage',
      Boolean(fallbackImage) && /car-[a-z0-9-]+\.jpg/.test(fallbackImage.getAttribute('src') || ''),
      fallbackImage?.getAttribute('src') || '(aucune)',
    );

    // 3. La plaque annonce la voiture montée sur le plateau.
    check(
      'la plaque du garage annonce la voiture de départ',
      /MISTRAL 1\.4/.test(plate()),
      `« ${plate()} »`,
    );

    // 4. MODE → VILLE → GARAGE : la scène reste, les étapes tiennent.
    await click(mustFind(node, '.city-rush-mode-card', 'étape mode'));
    await settle();
    check(
      'la scène survit au passage à l’étape ville',
      Boolean(node.querySelector('.city-rush-hub-stage')),
    );
    await click(mustFind(node, '.city-rush-city-card', 'étape ville'));
    await settle();
    const garage = mustFind(node, '.city-rush-car-select', 'étape garage');
    check(
      'la scène est toujours là à l’étape garage',
      Boolean(node.querySelector('.city-rush-hub-stage')),
    );
    const cards = [...node.querySelectorAll('.city-rush-car-card')];
    check(
      'la grille du garage est complète',
      cards.length === CITY_RUSH_CARS.length,
      `${cards.length} cartes`,
    );

    // 5. Le focus clavier monte le modèle au plateau — sans lancer la course.
    const focused = cards[1];
    await act(async () => { focused.focus(); });
    await settle();
    check(
      'le focus sur une carte la fait monter au plateau (aperçu)',
      /APERÇU/.test(plate()) && new RegExp(CITY_RUSH_CARS[1].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(plate()),
      `« ${plate()} »`,
    );
    check(
      'l’aperçu ne lance aucune course',
      worldProbe.props?.phase === 'intro',
      `phase=${worldProbe.props?.phase}`,
    );
    await act(async () => { focused.blur(); });
    await settle();
    check(
      'la plaque revient à la voiture du garage',
      !/APERÇU/.test(plate()) && /MISTRAL 1\.4/.test(plate()),
      `« ${plate()} »`,
    );

    // 6. Le tap sur la voiture offerte part toujours en course : le décor ne
    //    vole pas le geste.
    await click(cards[0]);
    await settle(40);
    check(
      'toucher une voiture offerte part en course',
      worldProbe.props?.phase === 'countdown' && worldProbe.props?.carId === CITY_RUSH_CARS[0].id,
      `phase=${worldProbe.props?.phase} carId=${worldProbe.props?.carId}`,
    );
  } finally {
    timers.restore();
    await page.unmount();
  }

  assert.equal(failures.length, 0, `le garage 3D a des manques :\n- ${failures.join('\n- ')}`);
}
