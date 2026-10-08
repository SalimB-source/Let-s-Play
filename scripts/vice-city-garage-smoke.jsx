/**
 * Entrée SSR utilisée par scripts/vice-city-garage-check.mjs —
 * `npm run check:city-rush-garage`.
 *
 * Les trois voitures les moins puissantes du catalogue sont débloquées pour
 * tout le monde (`cityRushFreeCarIds`, dans `cityRushRules.js`) : la Mistral,
 * la Nova et la Wolfsburg rejoignent le garage de chaque sauvegarde, sans
 * billet vert à dépenser. Ce smoke regarde ce que le garage affiche pour un
 * visiteur qui n'a jamais joué — donc avec **zéro billet vert** en poche :
 *   · les trois voitures offertes portent « DÉPART » / « OFFERTE », sans
 *     cadenas ni prix, et leur carte reste cliquable ;
 *   · les cinq autres restent verrouillées, avec leur prix et le manque à
 *     gagner ;
 *   · toucher une voiture offerte part en course (le monde reçoit bien son
 *     identifiant) au lieu d'afficher « IL TE MANQUE … BILLETS VERTS ».
 *
 * La seconde moitié du fichier regarde l'autre vie du garage : ouverte par
 * l'entrée GARAGE de l'écran-titre, la page est un concessionnaire. Avec un
 * portefeuille de 900 billets, on y achète un modèle payant — l'argent baisse,
 * la pastille passe à « ACHETÉE », la voiture se choisit — et rien ne part en
 * course, parce qu'acheter n'est pas démarrer.
 *
 * La vraie page est montée dans jsdom ; seul le moteur 3D est remplacé par la
 * doublure `scripts/vice-city-world-stub.jsx`, qui expose les props reçues
 * (`worldProbe.props`).
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu, openHubPage } from './vice-city-title-menu-dismiss.jsx';
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
/** Trouve un élément ou lève une erreur qui dit quelle étape a échoué. */
function mustFind(node, selector, label) {
  const el = node.querySelector(selector);
  if (!el) throw new Error(`élément introuvable : ${selector} (${label})`);
  return el;
}
const settle = (ms = 20) => act(async () => { await sleep(ms); });
const textOf = (node, selector) => squash(node.querySelector(selector)?.textContent ?? '');
/** Texte brut d'un billet vert, tel que le garage l'affiche. */
const cash = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('fr-FR');

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
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

/** MODE → VILLE → GARAGE : les deux premières vignettes suffisent. */
async function openGarage(node) {
  await click(mustFind(node, '.city-rush-mode-card', 'étape mode'));
  await settle();
  await click(mustFind(node, '.city-rush-city-card', 'étape ville'));
  await settle();
  return mustFind(node, '.city-rush-car-select', 'garage');
}

/** Une carte du garage : nom, pastille, état. */
function cardOf(card) {
  return {
    name: squash(card.querySelector('.city-rush-car-name')?.textContent),
    badge: squash(card.querySelector('.city-rush-car-lock-badge')?.textContent),
    action: squash(card.querySelector('.city-rush-card-action')?.textContent),
    label: card.getAttribute('aria-label') || '',
    disabled: card.disabled === true,
    locked: card.classList.contains('is-locked'),
    offered: Boolean(card.querySelector('.city-rush-car-lock-badge.is-offered')),
    card,
  };
}

export async function checkViceCityGarage(assert) {
  const timers = patchTimers();
  // Visiteur neuf : aucune sauvegarde, donc aucun billet vert.
  window.localStorage.clear();
  const page = await mountPage();
  const { node } = page;
  const failures = [];
  const check = (label, condition, extra = '') => {
    if (condition) return;
    failures.push(`${label}${extra ? ` — ${extra}` : ''}`);
  };

  const garage = await openGarage(node);
  const cards = [...node.querySelectorAll('.city-rush-car-card')].map(cardOf);

  check(
    'le garage affiche les huit voitures du catalogue',
    cards.length === CITY_RUSH_CARS.length,
    `${cards.length} cartes pour ${CITY_RUSH_CARS.length} voitures`,
  );
  // Le garage a son propre en-tête (la section pilote, au-dessus, en porte un
  // autre de la même classe) : on lit celui de la section des voitures.
  const heading = squash(garage.querySelector('.city-rush-car-select-heading')?.textContent ?? '');
  check(
    'l’en-tête du garage annonce les trois voitures offertes',
    /3 VOITURES OFFERTES/i.test(heading),
    `"${heading.slice(0, 160)}"`,
  );
  check(
    'un visiteur neuf n’a aucun billet vert',
    /0 BILLETS VERTS/i.test(heading),
    `"${heading.slice(0, 160)}"`,
  );

  CITY_RUSH_CARS.forEach((car, index) => {
    const shown = cards[index];
    if (!shown || shown.name !== car.name) {
      check(`la carte ${index + 1} est ${car.name}`, false, `carte « ${shown?.name ?? '(absente)'} »`);
      return;
    }
    const offered = CITY_RUSH_FREE_CAR_IDS.includes(car.id);
    if (offered) {
      check(
        `${car.name} est offerte : pastille sans prix`,
        !/🔒|\$/.test(shown.badge) && (shown.badge === 'DÉPART' || shown.badge === 'OFFERTE'),
        `pastille « ${shown.badge} »`,
      );
      check(
        `${car.name} est offerte : carte cliquable, sans cadenas`,
        !shown.disabled && !shown.locked && /LANCER LA COURSE/i.test(shown.action),
        `désactivée=${shown.disabled} verrouillée=${shown.locked} action « ${shown.action} »`,
      );
      check(
        `${car.name} est annoncée offerte à tous aux lecteurs d’écran`,
        /offerte à tous/i.test(shown.label),
        `"${shown.label}"`,
      );
      // La citadine de départ garde sa pastille historique ; les deux autres
      // voitures offertes portent la pastille « OFFERTE ».
      check(
        `${car.name} porte la pastille attendue`,
        shown.badge === (index === 0 ? 'DÉPART' : 'OFFERTE'),
        `pastille « ${shown.badge} »`,
      );
      check(
        `${car.name} porte la pastille stylée « offerte »`,
        shown.offered,
      );
    } else {
      check(
        `${car.name} reste payante : cadenas et prix`,
        shown.locked && shown.badge.includes('🔒') && shown.badge.includes(squash(cash(car.price))),
        `pastille « ${shown.badge} » pour un prix de ${cash(car.price)}`,
      );
      check(
        `${car.name} reste inaccessible sans billets`,
        shown.disabled && /MANQUE/i.test(shown.action),
        `désactivée=${shown.disabled} action « ${shown.action} »`,
      );
      check(
        `${car.name} ne porte pas la pastille « offerte »`,
        !shown.offered && shown.badge !== 'OFFERTE',
        `pastille « ${shown.badge} »`,
      );
    }
  });

  // ── La troisième voiture (la moins puissante des payantes d'autrefois) ────
  const wolfsburgIndex = CITY_RUSH_CARS.findIndex((car) => car.id === 'night-comet');
  const wolfsburg = cards[wolfsburgIndex];
  check('la WOLFSBURG GT-R fait partie du trio offert', wolfsburgIndex >= 0 && CITY_RUSH_FREE_CAR_IDS.includes('night-comet'));
  await click(wolfsburg.card);
  await settle(80);

  check(
    'toucher une voiture offerte part en course avec elle',
    worldProbe.props?.carId === 'night-comet',
    `carId=${worldProbe.props?.carId}`,
  );
  check(
    'aucun message « IL TE MANQUE … BILLETS » sur une voiture offerte',
    !/MANQUE/i.test(textOf(node, '.city-rush-toast')),
    `"${textOf(node, '.city-rush-toast')}"`,
  );
  check(
    'le compte à rebours démarre après le choix d’une voiture offerte',
    Boolean(node.querySelector('.city-rush-countdown')),
  );

  await page.unmount();

  // ── Le garage, page d'achat : le prix devient un geste, pas un départ ─────
  window.localStorage.setItem(CITY_RUSH_PROGRESS_KEY, JSON.stringify({
    cash: 900,
    ownedCarIds: [],
    completedCourseIds: [],
    storyChapter: 0,
    storyEnding: '',
    storyVersion: 2,
    storyStars: {},
  }));
  const shop = await mountPage();
  const shopNode = shop.node;
  await openHubPage(shopNode, 'GARAGE');
  await settle(30);

  const shopCards = [...shopNode.querySelectorAll('.city-rush-car-card')];
  const firstPaidId = CITY_RUSH_CARS.find((car) => !CITY_RUSH_FREE_CAR_IDS.includes(car.id))?.id;
  const firstPaid = CITY_RUSH_CARS.find((car) => car.id === firstPaidId);
  const indexOfPaid = CITY_RUSH_CARS.findIndex((car) => car.id === firstPaidId);
  const paidCard = shopCards[indexOfPaid];
  check('le concessionnaire a bien sa carte payante', Boolean(paidCard), `carte ${indexOfPaid}`);
  check(
    'la carte payante annonce son prix et le geste « acheter »',
    /ACHETER ·/.test(squash(paidCard?.querySelector('.city-rush-card-action')?.textContent))
      && squash(paidCard?.textContent).includes(cash(firstPaid.price)),
    `action « ${squash(paidCard?.querySelector('.city-rush-card-action')?.textContent)} »`,
  );
  check(
    'une carte hors de prix reste au mur, prix et manque écrits',
    shopCards.some((card) => card.disabled === true && /MANQUE /.test(squash(card.querySelector('.city-rush-card-action')?.textContent))),
  );
  check(
    'la page d’achat ne choisit pas le pilote',
    !shopNode.querySelector('.city-rush-driver-select'),
  );
  check(
    'la plaque du plateau nomme la voiture qui tourne, même sans étapes',
    squash(shopNode.querySelector('.city-rush-hub-plate')?.textContent).length > 0
      && !shopNode.querySelector('.city-rush-stepper'),
    `plaque « ${squash(shopNode.querySelector('.city-rush-hub-plate')?.textContent)} »`,
  );
  check(
    'aucune étape de parcours n’est ouverte sur la page d’achat',
    !shopNode.querySelector('.city-rush-stepper'),
    'le stepper doit rester au parcours mode → ville → garage',
  );

  // L'onglet GARAGE porte un compteur de collection, pas un numéro d'étape : il
  // doit dire exactement autant de voitures possédées que la grille en montre
  // sans cadenas — et c'est ce compteur que l'achat fait bouger.
  const ownedInGrid = () => shopNode.querySelectorAll('.city-rush-car-card:not(.is-locked)').length;
  const tabCount = () => squash(shopNode.querySelector('.city-rush-page-tab.is-active')?.textContent);
  const shownCounter = () => (tabCount().match(/(\d+)\s*\/\s*(\d+)/) ?? []).slice(1).map(Number);
  const counterBefore = shownCounter()[0];
  await click(paidCard);
  await settle(40);
  check(
    `l’achat de la ${firstPaid?.name} débite ${cash(firstPaid.price)} billets`,
    /-/.test('') === false && squash(shopNode.querySelector('.city-rush-wallet')?.textContent).includes(cash(900 - (Number(firstPaid?.price) || 0))),
    `porte-monnaie lu « ${squash(shopNode.querySelector('.city-rush-wallet')?.textContent)} »`,
  );
  check(
    'la carte achetée change de pastille',
    /ACHETÉE/.test(squash(paidCard.querySelector('.city-rush-car-lock-badge')?.textContent)),
    `pastille « ${squash(paidCard.querySelector('.city-rush-car-lock-badge')?.textContent)} »`,
  );
  check(
    'acheter ne lance aucune course',
    !shopNode.querySelector('.city-rush-countdown') && !shopNode.querySelector('.city-rush-hud'),
  );
  check(
    'l’onglet GARAGE compte les voitures du client, pas les étapes',
    shownCounter()[0] === ownedInGrid(),
    `onglet « ${tabCount()} » pour ${ownedInGrid()} cartes sans cadenas`,
  );

  check(
    'l’onglet a suivi l’achat',
    shownCounter()[0] === counterBefore + 1 && shownCounter()[0] === ownedInGrid(),
    `onglet « ${tabCount()} », ${ownedInGrid()} voitures sans cadenas`,
  );

  // La voiture payée est à toi : la retoucher la monte au plateau, et c'est
  // encore le CTA qui mène au départ — pas la carte.
  await click(paidCard);
  await settle(30);
  check(
    'la voiture achetée se choisit au plateau',
    paidCard.classList.contains('is-selected') && /AU PLATEAU/.test(squash(paidCard.querySelector('.city-rush-card-action')?.textContent)),
    `action « ${squash(paidCard.querySelector('.city-rush-card-action')?.textContent)} »`,
  );
  const savedShop = JSON.parse(window.localStorage.getItem(CITY_RUSH_PROGRESS_KEY) || '{}');
  check(
    'l’achat est écrit dans la sauvegarde',
    (savedShop.ownedCarIds || []).includes(firstPaidId) && savedShop.cash === 900 - (Number(firstPaid.price) || 0),
    JSON.stringify({ cash: savedShop.cash, ownedCarIds: savedShop.ownedCarIds }),
  );
  check(
    'la plaque dit la voiture achetée, plus un aperçu survolé',
    /ACHETÉE/.test(squash(shopNode.querySelector('.city-rush-hub-plate')?.textContent)),
    `plaque « ${squash(shopNode.querySelector('.city-rush-hub-plate')?.textContent)} »`,
  );
  await click(mustFind(shopNode, '.city-rush-dealer-cta', 'le bouton « prendre la piste »'));
  await settle(30);
  check('le CTA du concessionnaire rend la page des courses libres', Boolean(shopNode.querySelector('.city-rush-mode-card')));
  check('le départ n’a pas été volé au passage', !shopNode.querySelector('.city-rush-countdown'));

  await shop.unmount();
  timers.restore();

  if (failures.length) {
    console.error('GARAGE FAILED:');
    failures.forEach((line) => console.error('  •', line));
    throw new Error(`${failures.length} incohérence(s) du garage sur les voitures offertes`);
  }
  assert.ok(garage, 'le garage est affiché');
}
