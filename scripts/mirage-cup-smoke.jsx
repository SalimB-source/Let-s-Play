/**
 * Entrée SSR utilisée par scripts/mirage-cup-check.mjs — `npm run check:mirage-cup`.
 *
 * Joue la COUPE de Mirage Rush de bout en bout, dans jsdom, avec la vraie page
 * (/jeu?mode=cup) : seul le moteur 3D est remplacé par une doublure
 * (scripts/mirage-world-stub.jsx) qui termine chaque course avec le classement
 * que le test lui donne.
 *
 *   1. Coupe du Désert, le joueur gagne : 3 courses dans l'ordre Dunes de
 *      l'Écho → Dust Creek → Plaines d'Or, 4 cavaliers, barème 10 / 7 / 4 / 2 ;
 *      après chaque arrivée, l'overlay montre ta place, les points gagnés et le
 *      classement cumulé (une égalité est départagée) ; Entrée enchaîne mais
 *      « R » (le pistolet) ne saute pas le classement ; après la 3ᵉ course, le
 *      trophée : « FÉLICITATIONS », le vainqueur, le total, les OR réellement
 *      gagnés sur les courses (10 par victoire), le moteur démonté et — sans
 *      WebGL — le repli CSS ; le maximum dépend du nombre de courses gagnées.
 *   2. Entrée sur le trophée relance une coupe neuve (0 point) ; cette fois un
 *      rival gagne : le message le dit, rappelle ta place et ne crédite pas
 *      d’OR au joueur.
 *   3. Abandon : « CHOISIR TON MODE », « ABANDONNER LA COUPE » et Échap pendant
 *      le compte à rebours ramènent à l'intro, et la coupe suivante repart de 0.
 *   4. Piste à trois voies du téléphone (`setLaneCount(3)`) : le moteur n'aligne
 *      que deux rivaux, la coupe compte donc trois cavaliers (le joueur, L'Ombre et
 *      Sauge), trois places au barème (10 / 7 / 4) et aucun cavalier fantôme.
 *   5. Coupe Grand Tour : 4 courses, globe distinct du calice du Désert dans
 *      le sélecteur, le HUD, le bouton du podium et le repli sans WebGL ;
 *      rejouer garde le globe et revenir au Désert retrouve son calice.
 *   6. Coupe des Vents : 3 cartes différentes, 3 victoires à +10 OR, soit
 *      +30 OR au total ; la Rose des Vents accompagne le HUD et le podium.
 *   7. Steel Ball Run, la dernière coupe (ouverte par les quatre autres) :
 *      les dix cartes du jeu dans l'ordre, dix victoires de course à 10 OR,
 *      puis la prime de champion de 90 OR versée une seule fois avec le titre
 *      du classement général — 190 OR maximum. La boule d'acier suit le
 *      sélecteur, le HUD, la collection et le podium ; la prime n'est jamais
 *      créditée avant le titre ni re-créditée en restant sur le podium.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import { MIRAGE_CUP_TROPHIES_KEY } from '../src/achievements/engine.js';
import { STORAGE_KEY } from '../src/achievements/storage.js';
import MirageCupTrophyCollection from '../src/games/MirageCupTrophyCollection';
import MirageRushPage from '../src/games/MirageRushPage';
import { PROGRESSION_KEY } from '../src/games/mirageProgression';
import { DUEL_DISTANCE, DUEL_RIVALS, duelRivalsForTrack, setLaneCount } from '../src/games/mirageRules';
import { worldProbe } from './mirage-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);

// Les délais du compte à rebours (≈ 3 s par course) sont raccourcis ; `state.max` peut
// être relevé le temps d'un test qui doit attraper le compte à rebours en cours.
function patchTimers() {
  const original = window.setTimeout;
  const state = { max: 10 };
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, state.max), ...args);
  return { state, restore: () => { window.setTimeout = original; } };
}

async function mountPage(entry) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <AchievementProvider>
          <MirageCupTrophyCollection />
          <MirageRushPage />
        </AchievementProvider>
      </MemoryRouter>
    </AuthProvider>,
  ));
  await act(async () => { await sleep(30); });
  return {
    node,
    unmount: async () => { await act(async () => root.unmount()); node.remove(); },
  };
}

async function until(read, label, timeout = 5000) {
  const start = Date.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await act(async () => { await sleep(10); });
  }
}

const click = (el) => act(async () => { el.click(); });
const press = (key) => act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
});

async function typeName(input, value) {
  const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    setValue.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

// Résultat de course tel que le moteur l'émet à l'arrivée du joueur. `order` classe les
// cavaliers de la piste du 1ᵉʳ au dernier ; ceux qui finissent derrière le joueur sont
// encore en piste. Seuls les rivaux de la piste courante (trois, ou deux à trois voies)
// figurent dans le résultat, comme pour le vrai moteur.
function duelResult(stage, order) {
  const at = order.indexOf('player');
  const rivals = duelRivalsForTrack().map((rival, index) => {
    const position = order.indexOf(rival.id);
    const arrived = position < at;
    return {
      id: rival.id,
      slot: index + 1,
      name: rival.name,
      duration: arrived ? 40 + position + 0.3 * index : null,
      distance: arrived ? DUEL_DISTANCE : DUEL_DISTANCE - 10 * (position - at),
    };
  });
  return { mode: 'duel', stage, duration: 40 + at + 0.5, rank: at + 1, totalRiders: order.length, rivals, won: at === 0, score: 1200, gems: 9 };
}

const finishRace = (order) => act(async () => {
  const { props } = worldProbe;
  await props.onFinish(duelResult(props.race.stage, order));
});

const standings = (scope) => [...scope.querySelectorAll('.mirage-cup-row')]
  .map((row) => `${text(row.querySelector('.mirage-cup-name strong'))} ${text(row.querySelector('.mirage-cup-total b'))}`);
const details = (scope) => [...scope.querySelectorAll('.mirage-cup-row .mirage-cup-name small')].map(text);

const countdownKicker = (node) => text(node.querySelector('.mirage-countdown-overlay .mirage-overlay-kicker'));
const nextButton = (node) => node.querySelector('.mirage-cup-results .mirage-start-button');

/**
 * Lance une coupe depuis l'écran 02 : c'est le **clic sur sa carte** qui
 * démarre la coupe (plus de bouton « LANCER LA COUPE »). Quand le test vient
 * déjà de cliquer la carte, la coupe est en route et l'appel ne fait rien :
 * on ne re-clique pas une carte dont l'écran a disparu.
 */
async function startCupFromIntro(node, cupId = 'desert') {
  if (!node.querySelector('.mirage-intro-overlay')) return;
  const card = await until(() => {
    const button = node.querySelector(`.mirage-intro-overlay .mirage-cup-card.is-${cupId}`);
    return button && !button.disabled ? button : null;
  }, `la carte de la coupe ${cupId} est jouable`);
  await click(card);
}

const waitForCountdown = (node) => until(() => node.querySelector('.mirage-countdown-overlay'), 'le compte à rebours');
const waitForRace = (node) => until(() => node.querySelector('.mirage-hud'), 'le départ de la course');
const waitForResults = (node) => until(() => node.querySelector('.mirage-cup-results'), 'l’overlay d’arrivée de la coupe');
const waitForIntro = (node) => until(() => node.querySelector('.mirage-intro-overlay'), 'l’overlay d’intro');

// Écran 01 (les boutons de mode), où l'on retombe en quittant une coupe : COUPE rouvre son écran.
async function openCupFromModes(node, assert) {
  const intro = await waitForIntro(node);
  assert.ok(intro.classList.contains('is-mode-step'), 'quitter la coupe ramène à l’écran des modes');
  const cup = [...intro.querySelectorAll('.mirage-mode-picker button')].find((button) => text(button.querySelector('strong')) === 'COUPE');
  assert.ok(cup, 'le bouton COUPE est proposé');
  await click(cup);
  await until(() => node.querySelector('.mirage-cup-card'), 'le choix de la coupe');
}

export async function checkMirageCup(assert) {
  const [ombre, sauge, amethyste] = DUEL_RIVALS.map((rival) => rival.name);
  assert.deepEqual(DUEL_RIVALS.map((rival) => rival.id), ['ombre', 'sauge', 'amethyste'], 'les 3 rivaux de la coupe');

  window.localStorage.clear();
  const timers = patchTimers();
  const { node, unmount } = await mountPage('/jeu?mode=cup');
  try {
    // La collection du profil est visible même vide, puis ajoute un seul
    // trophée lorsqu'une coupe est remportée.
    assert.match(text(node.querySelector('.mirage-profile-trophies')), /Aucun trophée remporté/);
    assert.equal(node.querySelectorAll('.mirage-profile-trophy-card').length, 0);

    // ── 1. Le joueur remporte la Coupe du Désert ───────────────────────────
    assert.equal(node.querySelectorAll('.mirage-cup-card').length, 5, 'chaque coupe est présentée comme une option distincte');
    assert.ok([...node.querySelectorAll('.mirage-cup-card')].every((button) => button.tagName === 'BUTTON' && button.type === 'button'),
      'les coupes sont de vrais boutons HTML');
    assert.equal(text(node.querySelector('.mirage-cup-card.is-desert .mirage-cup-reward-copy > strong')), '+30 OR', 'la Coupe du Désert met en avant son gain maximal');
    assert.equal(text(node.querySelector('.mirage-cup-card.is-winds .mirage-cup-reward-copy > strong')), '+30 OR', 'la Coupe des Vents annonce son gain maximal');
    assert.equal(text(node.querySelector('.mirage-cup-card.is-worldtour .mirage-cup-reward-copy > strong')), '+40 OR', 'le Grand Tour annonce son gain maximal');
    assert.equal(text(node.querySelector('.mirage-cup-card.is-legends .mirage-cup-reward-copy > strong')), '+50 OR', 'la Coupe des Légendes annonce son gain maximal');
    assert.equal(text(node.querySelector('.mirage-cup-card.is-sbr .mirage-cup-reward-copy > strong')), '+190 OR', 'la Steel Ball Run annonce 10 victoires de course + la prime de champion');
    assert.equal(text(node.querySelector('.mirage-cup-card.is-sbr .mirage-cup-champion-bonus')), '+90 OR POUR LE VAINQUEUR DU GÉNÉRAL',
      'la Steel Ball Run annonce sa prime de champion de 90 OR');
    assert.ok([...node.querySelectorAll('.mirage-cup-card:not(.is-sbr)')].every((card) => !card.querySelector('.mirage-cup-champion-bonus')),
      'aucune autre coupe n’annonce de prime de champion');
    assert.equal(node.querySelector('.mirage-cup-card.is-desert .mirage-cup-route'), null, 'les terrains restent cachés dans l’aperçu');
    assert.equal(node.querySelector('.mirage-cup-card.is-desert svg').dataset.trophy, 'desert');
    assert.equal(node.querySelector('.mirage-cup-card.is-winds svg').dataset.trophy, 'winds');
    assert.equal(node.querySelector('.mirage-cup-card.is-worldtour svg').dataset.trophy, 'worldtour');
    assert.equal(node.querySelector('.mirage-cup-card.is-sbr svg').dataset.trophy, 'sbr');
    assert.notEqual(node.querySelector('.mirage-cup-card.is-desert svg').innerHTML, node.querySelector('.mirage-cup-card.is-winds svg').innerHTML, 'la Rose des Vents a sa silhouette propre');
    assert.notEqual(node.querySelector('.mirage-cup-card.is-desert svg').innerHTML, node.querySelector('.mirage-cup-card.is-worldtour svg').innerHTML, 'chaque coupe annonce une silhouette différente');
    assert.notEqual(node.querySelector('.mirage-cup-card.is-sbr svg').innerHTML, node.querySelector('.mirage-cup-card.is-legends svg').innerHTML, 'la boule d’acier de la Steel Ball Run a sa propre silhouette');
    assert.ok([...node.querySelectorAll('.mirage-cup-card')].every((card) =>
      card.querySelector('.mirage-cup-reward-copy > em')?.textContent.includes('+10 OR PAR VICTOIRE')),
    'chaque coupe affiche les 10 OR gagnés par victoire');
    assert.ok([...node.querySelectorAll('.mirage-cup-card')].every((card) => !card.querySelector('.mirage-cup-route')),
      'aucune coupe ne détaille son parcours dans l’aperçu');

    // Au départ, seule la 1ʳᵉ coupe (`desert`) est débloquée ; les 3 suivantes ont un cadenas.
    const initialDesertCard = node.querySelector('.mirage-cup-card.is-desert');
    const initialWindsCard = node.querySelector('.mirage-cup-card.is-winds');
    const initialTourCard = node.querySelector('.mirage-cup-card.is-worldtour');
    const initialLegendsCard = node.querySelector('.mirage-cup-card.is-legends');
    const initialSbrCard = node.querySelector('.mirage-cup-card.is-sbr');
    assert.equal(initialDesertCard.disabled, false, 'la 1ʳᵉ coupe est ouverte dès le départ');
    assert.equal(initialDesertCard.classList.contains('is-locked'), false);
    assert.equal(initialDesertCard.querySelector('.mirage-cup-lock'), null);
    assert.match(text(initialSbrCard.querySelector('.mirage-cup-card-action')), /FINIR COUPE DES LÉGENDES/,
      'la Steel Ball Run s’annonce comme la dernière, après la Coupe des Légendes');
    for (const lockedCard of [initialWindsCard, initialTourCard, initialLegendsCard, initialSbrCard]) {
      assert.equal(lockedCard.disabled, true, 'toutes les coupes suivantes sont verrouillées au départ');
      assert.equal(lockedCard.classList.contains('is-locked'), true);
      assert.equal(text(lockedCard.querySelector('.mirage-cup-lock')), '🔒', 'chaque coupe verrouillée porte un cadenas');
      assert.match(text(lockedCard.querySelector('.mirage-cup-card-action')), /🔒 FINIR /);
      await click(lockedCard);
      assert.equal(lockedCard.getAttribute('aria-pressed'), 'false', 'cliquer une coupe verrouillée ne la sélectionne pas');
    }
    assert.equal(initialDesertCard.getAttribute('aria-pressed'), 'true');

    await typeName(node.querySelector('.mirage-cup-name-field input'), 'Salim');
    assert.equal(window.localStorage.getItem('letsplay_mirage_cup_name_v1'), 'Salim', 'le nom du trophée est mémorisé');
    await startCupFromIntro(node);

    // Course 1 — Dunes de l'Écho
    await waitForCountdown(node);
    assert.match(countdownKicker(node), /COURSE 1 \/ 3 · DUNES DE L’ÉCHO/);
    await waitForRace(node);
    const powerBar = await until(() => node.querySelector('.mirage-powerup-bar'), 'la barre d’objets');
    assert.equal(/\d+\s*\/\s*(8|10|12)/.test(text(powerBar)), false,
      'les boutons de pouvoirs n’affichent plus 0/8, 0/10 ou 0/12');
    const triggeredActions = [];
    worldProbe.props.actionsRef.current = (actionName) => triggeredActions.push(actionName);
    await act(async () => {
      worldProbe.props.onHud({
        score: 0, gems: 5, combo: 5, multiplier: '1.3', lives: 3, remaining: 55,
        shieldCharges: 0, lassoCharges: 1, pistolCharges: 0, boostCharges: 0,
        shieldChargePoints: 4, lassoChargePoints: 10, pistolChargePoints: 6, boostChargePoints: 2,
        shieldProgress: 0.5, lassoProgress: 1, pistolProgress: 0.5, boostProgress: 0.25,
        anyPowerReady: true,
      });
    });
    assert.equal(/\d+\s*\/\s*(8|10|12)/.test(text(powerBar)), false,
      'même en charge partielle, aucun compteur /8, /10 ou /12 n’est affiché sur les pouvoirs');
    const lassoBtn = powerBar.querySelector('.mirage-powerup-btn.is-lasso-btn');
    assert.equal(lassoBtn.disabled, false, 'le bouton Lasso prêt est actif');
    await act(async () => {
      lassoBtn.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
      lassoBtn.click();
    });
    assert.deepEqual(triggeredActions, ['use_lasso'],
      'le bouton de pouvoir réagit dès le premier appui (pointerdown) sans doublon au click');
    assert.equal(worldProbe.props.stage, 'desert');
    assert.equal(worldProbe.props.race.mode, 'duel', 'une course de coupe est un duel');
    assert.deepEqual(worldProbe.props.race.cup, { id: 'desert', index: 0, total: 3 });
    assert.equal(text(node.querySelector('.mirage-chip.is-cup')), 'COURSE 1/3 · 0 PTS');
    assert.equal(node.querySelector('.mirage-chip.is-cup svg').dataset.trophy, 'desert', 'le HUD porte le calice du Désert');
    await finishRace(['player', 'ombre', 'sauge', 'amethyste']);

    let results = await waitForResults(node);
    assert.match(text(results.querySelector('.mirage-overlay-kicker')), /COURSE 1 \/ 3/);
    assert.match(text(results.querySelector('h2')), /VICTOIRE/);
    assert.equal(text(results.querySelector('.mirage-coin-gain')), '+10 OR', 'la victoire crédite bien les 10 OR annoncés sur l’aperçu');
    assert.equal(text(results.querySelector('.mirage-cup-gained strong')), '+10 POINTS');
    assert.deepEqual(standings(results), ['Salim 10', `${ombre} 7`, `${sauge} 4`, `${amethyste} 2`]);
    assert.deepEqual(details(results), ['1ᵉʳ · 40,5 s', '2ᵉ · à 10 m', '3ᵉ · à 20 m', '4ᵉ · à 30 m']);
    assert.match(text(nextButton(node)), /COURSE SUIVANTE · DUST CREEK/);
    await press('r');
    assert.ok(node.querySelector('.mirage-cup-results'), '« R » est le pistolet : il ne saute pas le classement');
    await press('Enter');

    // Course 2 — Dust Creek : l'Ombre gagne, le joueur est 2ᵉ → égalité à 17 points
    await waitForCountdown(node);
    assert.match(countdownKicker(node), /COURSE 2 \/ 3 · DUST CREEK/);
    await waitForRace(node);
    assert.equal(worldProbe.props.stage, 'western');
    assert.equal(text(node.querySelector('.mirage-chip.is-cup')), 'COURSE 2/3 · 10 PTS');
    await finishRace(['ombre', 'player', 'amethyste', 'sauge']);

    results = await waitForResults(node);
    assert.match(text(results.querySelector('h2')), /BELLE 2ᵉ PLACE/);
    assert.equal(results.querySelector('.mirage-coin-gain'), null, 'l’or du mode coupe est gagné à la première place');
    assert.equal(text(results.querySelector('.mirage-cup-gained strong')), '+7 POINTS');
    // 17 – 17 : même nombre de victoires, donc la dernière course départage (l'Ombre y a gagné) ;
    // même chose pour Améthyste (3ᵉ) devant Sauge (4ᵉ) à 6 – 6.
    assert.deepEqual(standings(results), [`${ombre} 17`, 'Salim 17', `${amethyste} 6`, `${sauge} 6`]);
    assert.match(text(nextButton(node)), /COURSE SUIVANTE · PLAINES D’OR/);
    await click(nextButton(node));

    // Course 3 — Plaines d'Or : le joueur gagne et passe devant → 27 points
    await waitForCountdown(node);
    assert.match(countdownKicker(node), /COURSE 3 \/ 3 · PLAINES D’OR/);
    await waitForRace(node);
    assert.equal(worldProbe.props.stage, 'prairie');
    assert.equal(text(node.querySelector('.mirage-chip.is-cup')), 'COURSE 3/3 · 17 PTS');
    await finishRace(['player', 'ombre', 'sauge', 'amethyste']);
    assert.equal(node.querySelectorAll('.mirage-profile-trophy-card').length, 1, 'la victoire ajoute un trophée au profil');
    assert.equal(node.querySelector('.mirage-profile-trophy-card')?.getAttribute('data-cup-id'), 'desert');
    assert.equal(node.querySelector('.mirage-profile-trophy-card')?.getAttribute('data-trophy-design'), 'desert');
    const savedAchievements = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}:guest`));
    assert.deepEqual(savedAchievements.sets[MIRAGE_CUP_TROPHIES_KEY], ['desert'], 'le trophée est persisté une seule fois');

    results = await waitForResults(node);
    assert.deepEqual(standings(results), ['Salim 27', `${ombre} 24`, `${sauge} 10`, `${amethyste} 8`]);
    assert.match(text(nextButton(node)), /VOIR LE PODIUM/, 'après la 3ᵉ course, on passe au podium');
    await click(nextButton(node));

    // Le trophée
    let trophy = await until(() => node.querySelector('.mirage-trophy-screen'), 'l’écran du trophée');
    assert.equal(text(trophy.querySelector('.mirage-trophy-title')), 'FÉLICITATIONS');
    assert.ok(trophy.classList.contains('is-desert'), 'l’écran reprend le design propre à la coupe');
    assert.equal(text(trophy.querySelector('.mirage-trophy-name')).replace(/^♛\s*/, ''), 'Salim');
    assert.match(text(trophy.querySelector('.mirage-trophy-lede')), /Tu remportes la Coupe du Désert avec 27 points/);
    assert.ok(trophy.classList.contains('is-player-win'));
    assert.deepEqual(standings(trophy), ['Salim 27', `${ombre} 24`, `${sauge} 10`, `${amethyste} 8`]);
    assert.deepEqual(details(trophy).slice(0, 2), ['1ᵉʳ · 2ᵉ · 1ᵉʳ', '2ᵉ · 1ᵉʳ · 2ᵉ'], 'le rappel des places par course');
    assert.equal(worldProbe.mounted, 0, 'le moteur de course est démonté pendant la remise du trophée');
    await until(() => trophy.querySelector('.mirage-trophy-fallback'), 'le repli CSS du trophée (jsdom n’a pas de WebGL)');
    assert.equal(trophy.dataset.trophy, 'desert');
    assert.equal(trophy.querySelector('.mirage-trophy-fallback svg').dataset.trophy, 'desert');
    assert.equal(text(trophy.querySelector('.mirage-trophy-design')), 'Calice des Dunes');
    assert.ok(trophy.querySelector('.mirage-trophy-fallback-cup')?.classList.contains('is-desert'), 'le repli garde le dessin de la Coupe du Désert');
    // Le total du podium correspond aux OR réellement gagnés sur les courses.
    const purseLine = trophy.querySelector('.mirage-trophy-purse');
    assert.equal(text(purseLine), '● OR GAGNÉS EN COURSE · +20 OR MAX. 30 OR SI TOUTES LES COURSES SONT GAGNÉES');
    assert.ok(purseLine.classList.contains('is-won'), 'les OR gagnés sont mis en avant');
    assert.equal(JSON.parse(window.localStorage.getItem(PROGRESSION_KEY)).coins, 20, 'deux victoires créditent 20 OR, sans prime de coupe');

    // ── 2. Entrée relance une coupe neuve ; cette fois l'Ombre gagne ───────
    await press('Enter');
    await waitForCountdown(node);
    assert.match(countdownKicker(node), /COURSE 1 \/ 3 · DUNES DE L’ÉCHO/);
    await waitForRace(node);
    assert.equal(worldProbe.mounted, 1, 'le moteur de course revient pour la nouvelle coupe');
    assert.equal(text(node.querySelector('.mirage-chip.is-cup')), 'COURSE 1/3 · 0 PTS', 'la nouvelle coupe repart de 0');
    assert.equal(JSON.parse(window.localStorage.getItem(PROGRESSION_KEY)).coins, 20, 'le replay ne verse pas de prime supplémentaire');
    for (let race = 1; race <= 3; race += 1) {
      if (race > 1) {
        await click(nextButton(node));
        await waitForCountdown(node);
        await waitForRace(node);
      }
      await finishRace(['ombre', 'sauge', 'amethyste', 'player']);
      results = await waitForResults(node);
    }
    assert.match(text(results.querySelector('h2')), /4ᵉ PLACE/);
    assert.deepEqual(standings(results), [`${ombre} 30`, `${sauge} 21`, `${amethyste} 12`, 'Salim 6']);
    await click(nextButton(node));
    trophy = await until(() => node.querySelector('.mirage-trophy-screen'), 'le trophée de la 2ᵉ coupe');
    assert.equal(text(trophy.querySelector('.mirage-trophy-name')).replace(/^♛\s*/, ''), ombre);
    assert.ok(!trophy.classList.contains('is-player-win'));
    assert.equal(node.querySelectorAll('.mirage-profile-trophy-card').length, 1, 'une victoire PNJ n’ajoute pas de trophée et le précédent reste unique');
    assert.match(text(trophy.querySelector('.mirage-trophy-lede')), new RegExp(`${ombre} remporte la Coupe du Désert avec 30 points\\. Tu termines 4ᵉ avec 6 points`));
    const lostPurse = trophy.querySelector('.mirage-trophy-purse');
    assert.equal(text(lostPurse), '● OR GAGNÉS EN COURSE · +0 OR MAX. 30 OR SI TOUTES LES COURSES SONT GAGNÉES', 'le podium distingue les OR gagnés du maximum de la coupe');
    assert.ok(!lostPurse.classList.contains('is-won'));
    assert.equal(JSON.parse(window.localStorage.getItem(PROGRESSION_KEY)).coins, 20, 'une coupe perdue ne verse pas de prime supplémentaire');

    // ── 3. Abandons ─────────────────────────────────────────────────────────
    // « CHOISIR TON MODE » : retour à l'écran des modes, d'où COUPE rouvre la coupe.
    await click(trophy.querySelector('.mirage-share-button'));
    await waitForIntro(node);
    assert.ok(!node.querySelector('.mirage-trophy-screen'));
    await openCupFromModes(node, assert);
    assert.ok(node.querySelector('.mirage-cup-card'), 'retour au choix de la coupe');

    // « ABANDONNER LA COUPE » entre deux courses.
    await startCupFromIntro(node);
    await waitForCountdown(node);
    await waitForRace(node);
    await finishRace(['sauge', 'ombre', 'player', 'amethyste']);
    results = await waitForResults(node);
    assert.deepEqual(standings(results).slice(0, 1), [`${sauge} 10`]);
    await click(results.querySelector('.mirage-share-button'));
    await waitForIntro(node);
    assert.ok(!node.querySelector('.mirage-cup-results'));
    await openCupFromModes(node, assert);

    // Échap pendant le compte à rebours de la course suivante.
    await startCupFromIntro(node);
    await waitForCountdown(node);
    await waitForRace(node);
    assert.equal(text(node.querySelector('.mirage-chip.is-cup')), 'COURSE 1/3 · 0 PTS', 'l’abandon efface les points de la coupe');
    await finishRace(['player', 'ombre', 'sauge', 'amethyste']);
    await waitForResults(node);
    timers.state.max = 5000; // le compte à rebours reste en place le temps d'appuyer sur Échap
    await press('Enter');
    await waitForCountdown(node);
    assert.match(countdownKicker(node), /COURSE 2 \/ 3/);
    assert.match(text(node.querySelector('.mirage-countdown-overlay .mirage-overlay-hint')), /ABANDONNER LA COUPE/);
    await press('Escape');
    timers.state.max = 10;
    await waitForIntro(node);
    await startCupFromIntro(node);
    await waitForCountdown(node);
    assert.match(countdownKicker(node), /COURSE 1 \/ 3 · DUNES DE L’ÉCHO/, 'après un abandon, la coupe repart de la 1ʳᵉ course');
    await waitForRace(node);
    assert.equal(text(node.querySelector('.mirage-chip.is-cup')), 'COURSE 1/3 · 0 PTS');
  } finally {
    timers.restore();
    await unmount();
  }

  // ── 4. Piste à trois voies : trois cavaliers, barème 10 / 7 / 4 ──────────
  setLaneCount(3);
  const appTimers = patchTimers();
  const app = await mountPage('/jeu?mode=cup');
  try {
    assert.equal(duelRivalsForTrack().length, 2, 'la piste à trois voies n’aligne que deux rivaux');
    await startCupFromIntro(app.node);
    // Course 1 : le joueur gagne. Course 2 : L'Ombre gagne. Course 3 : le joueur gagne,
    // devant Sauge, à 18 – 18 avec L'Ombre — qui a une victoire de plus.
    const orders = [['player', 'sauge', 'ombre'], ['ombre', 'player', 'sauge'], ['player', 'sauge', 'ombre']];
    let results;
    let layoutChecked = false;
    for (let race = 0; race < 3; race += 1) {
      if (race > 0) await click(nextButton(app.node));
      await waitForCountdown(app.node);
      await waitForRace(app.node);
      if (!layoutChecked) {
        // Les boutons de la course : une seule barre d'objets, la disposition
        // du PC, sur téléphone comme ailleurs — plus de croix directionnelle
        // ni de losange de manette (on esquive au glissement).
        const bars = app.node.querySelectorAll('.mirage-powerup-bar');
        assert.equal(bars.length, 1, 'une seule barre d’objets pendant la course');
        assert.ok(!bars[0].className.includes('is-gamepad'), 'la barre n’est plus ancrée en manette');
        assert.ok(bars[0].querySelector('.mirage-powerup-buttons-row'), 'les objets forment la rangée horizontale du PC');
        assert.equal(bars[0].querySelectorAll('.mirage-powerup-btn').length, 4, 'les quatre objets sont là');
        for (const selector of ['.mirage-touch-dpad', '.mirage-dpad-btn', '.mirage-powerup-diamond',
          '.mirage-powerup-btn.is-diamond']) {
          assert.equal(app.node.querySelectorAll(selector).length, 0, `${selector} a bien disparu de la course`);
        }
        layoutChecked = true;
      }
      await finishRace(orders[race]);
      results = await waitForResults(app.node);
      assert.equal(results.querySelectorAll('.mirage-cup-row').length, 3, 'trois cavaliers au classement, pas de fantôme');
      assert.ok(!results.textContent.includes(amethyste), 'Améthyste ne court pas à trois voies');
    }
    assert.deepEqual(standings(results), ['Salim 27', `${ombre} 18`, `${sauge} 18`]);
    await click(nextButton(app.node));
    const trophy = await until(() => app.node.querySelector('.mirage-trophy-screen'), 'le trophée à trois cavaliers');
    assert.equal(text(trophy.querySelector('.mirage-trophy-title')), 'FÉLICITATIONS');
    assert.match(text(trophy.querySelector('.mirage-trophy-lede')), /Tu remportes la Coupe du Désert avec 27 points/);
    assert.deepEqual(standings(trophy), ['Salim 27', `${ombre} 18`, `${sauge} 18`]);
    assert.equal(text(trophy.querySelector('.mirage-trophy-purse')), '● OR GAGNÉS EN COURSE · +20 OR MAX. 30 OR SI TOUTES LES COURSES SONT GAGNÉES', 'le total d’OR suit les deux victoires, même à trois voies');
  } finally {
    appTimers.restore();
    await app.unmount();
    setLaneCount(4);
  }

  // ── 5. Coupe des Vents (débloquée après la 1ʳᵉ coupe) : 3 cartes, 3 victoires, 30 OR ──
  const tourTimers = patchTimers();
  const tour = await mountPage('/jeu?mode=cup');
  try {
    const desertIcon = tour.node.querySelector('.mirage-cup-card.is-desert svg').innerHTML;
    const windsCard = tour.node.querySelector('.mirage-cup-card.is-winds');
    const lockedTourCard = tour.node.querySelector('.mirage-cup-card.is-worldtour');
    const lockedLegendsCard = tour.node.querySelector('.mirage-cup-card.is-legends');
    assert.ok(windsCard, 'la Coupe des Vents est proposée');
    assert.equal(windsCard.disabled, false, 'finir la 1ʳᵉ coupe a débloqué la 2ᵉ coupe (Coupe des Vents)');
    assert.equal(windsCard.classList.contains('is-locked'), false);
    assert.equal(lockedTourCard.disabled, true, 'la 3ᵉ coupe reste verrouillée tant que la 2ᵉ n’est pas terminée');
    assert.equal(lockedLegendsCard.disabled, true, 'la 4ᵉ coupe reste verrouillée');
    assert.equal(text(windsCard.querySelector('.mirage-cup-reward-copy > strong')), '+30 OR');
    const windsIcon = windsCard.querySelector('svg').innerHTML;
    await click(windsCard);
    assert.match(countdownKicker(tour.node), /COUPE DES VENTS · COURSE 1 \/ 3/,
      'le clic sur la carte démarre la Coupe des Vents (compte à rebours)');
    await startCupFromIntro(tour.node); // déjà lancée : la carte n’est plus à l’écran

    const windStages = ['sardinia', 'alger', 'snakeway'];
    let windsResults;
    let windsGold = 0;
    for (let race = 0; race < windStages.length; race++) {
      if (race > 0) await click(nextButton(tour.node));
      await waitForCountdown(tour.node);
      await waitForRace(tour.node);
      assert.equal(worldProbe.props.stage, windStages[race], 'les trois courses de la Coupe des Vents sont sur des maps différentes');
      assert.deepEqual(worldProbe.props.race.cup, { id: 'winds', index: race, total: 3 });
      assert.equal(tour.node.querySelector('.mirage-chip.is-cup svg').dataset.trophy, 'winds', 'le HUD affiche la Rose des Vents');
      await finishRace(['player', 'ombre', 'sauge', 'amethyste']);
      windsResults = await waitForResults(tour.node);
      const earned = text(windsResults.querySelector('.mirage-coin-gain'));
      assert.equal(earned, '+10 OR', 'chaque victoire crédite les 10 OR annoncés');
      windsGold += Number.parseInt(earned, 10);
    }
    assert.equal(windsGold, 30, 'trois victoires rapportent exactement 30 OR');
    assert.deepEqual(standings(windsResults), ['Salim 30', `${ombre} 21`, `${sauge} 12`, `${amethyste} 6`]);
    assert.equal(tour.node.querySelectorAll('.mirage-profile-trophy-card').length, 2, 'la victoire ajoute la Rose des Vents sans perdre le trophée précédent');
    const collectedWinds = tour.node.querySelector('.mirage-profile-trophy-card[data-cup-id="winds"] svg');
    assert.equal(collectedWinds.dataset.trophy, 'winds');
    assert.equal(collectedWinds.innerHTML, windsIcon, 'la collection partage la Rose des Vents du sélecteur');
    const savedWindsCollection = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}:guest`));
    assert.deepEqual(savedWindsCollection.sets[MIRAGE_CUP_TROPHIES_KEY], ['desert', 'winds']);
    await click(nextButton(tour.node));
    const windsTrophy = await until(() => tour.node.querySelector('.mirage-trophy-screen'), 'le podium de la Coupe des Vents');
    await until(() => windsTrophy.querySelector('.mirage-trophy-fallback'), 'la Rose des Vents sans WebGL');
    assert.equal(windsTrophy.dataset.trophy, 'winds');
    assert.equal(text(windsTrophy.querySelector('.mirage-trophy-design')), 'Rose des Vents');
    assert.equal(windsTrophy.querySelector('.mirage-trophy-fallback svg').innerHTML, windsIcon, 'le podium garde le dessin du sélecteur');
    assert.notEqual(windsTrophy.querySelector('.mirage-trophy-fallback svg').innerHTML, desertIcon);
    assert.match(text(windsTrophy.querySelector('.mirage-trophy-lede')), /Tu remportes la Coupe des Vents avec 30 points/);
    assert.equal(text(windsTrophy.querySelector('.mirage-trophy-purse')), '● OR GAGNÉS EN COURSE · +30 OR MAX. 30 OR SI TOUTES LES COURSES SONT GAGNÉES');

    // ── 6. Grand Tour (débloqué après la 2ᵉ coupe) : son globe suit toute la coupe ──
    await click(windsTrophy.querySelector('.mirage-share-button'));
    await openCupFromModes(tour.node, assert);
    const tourCard = tour.node.querySelector('.mirage-cup-card.is-worldtour');
    const legendsCardBefore = tour.node.querySelector('.mirage-cup-card.is-legends');
    assert.equal(tourCard.disabled, false, 'finir la 2ᵉ coupe a débloqué la 3ᵉ coupe (Coupe Grand Tour)');
    assert.equal(tourCard.classList.contains('is-locked'), false);
    assert.equal(legendsCardBefore.disabled, true, 'la 4ᵉ coupe reste verrouillée tant que la 3ᵉ n’est pas terminée');
    const tourIcon = tourCard.querySelector('svg').innerHTML;
    assert.match(text(tourCard.querySelector('.mirage-cup-card-title small')), /Globe des Horizons/);
    await click(tourCard);
    assert.match(countdownKicker(tour.node), /COUPE GRAND TOUR · COURSE 1 \/ 4/,
      'le clic sur la carte démarre le Grand Tour (compte à rebours)');
    await startCupFromIntro(tour.node); // déjà lancé : la carte n’est plus à l’écran
    const stages = ['sardinia', 'alger', 'japan', 'airbase'];
    let results;
    for (let race = 0; race < stages.length; race++) {
      if (race > 0) await click(nextButton(tour.node));
      await waitForCountdown(tour.node);
      await waitForRace(tour.node);
      assert.equal(worldProbe.props.stage, stages[race], 'les quatre courses du Grand Tour restent dans l’ordre');
      assert.deepEqual(worldProbe.props.race.cup, { id: 'worldtour', index: race, total: 4 });
      assert.equal(tour.node.querySelector('.mirage-chip.is-cup svg').dataset.trophy, 'worldtour', 'le HUD montre le globe, pas la coupe dorée');
      await finishRace(['player', 'ombre', 'sauge', 'amethyste']);
      results = await waitForResults(tour.node);
    }
    assert.deepEqual(standings(results), ['Salim 40', `${ombre} 28`, `${sauge} 16`, `${amethyste} 8`]);
    assert.equal(tour.node.querySelectorAll('.mirage-profile-trophy-card').length, 3, 'la collection conserve un trophée par coupe remportée');
    const collectedGlobe = tour.node.querySelector('.mirage-profile-trophy-card[data-cup-id="worldtour"] svg');
    assert.equal(collectedGlobe.dataset.trophy, 'worldtour');
    assert.equal(collectedGlobe.innerHTML, tourIcon, 'la collection partage le globe du sélecteur et du podium');
    const savedCollection = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}:guest`));
    assert.deepEqual(savedCollection.sets[MIRAGE_CUP_TROPHIES_KEY], ['desert', 'winds', 'worldtour']);
    assert.equal(nextButton(tour.node).querySelector('svg').dataset.trophy, 'worldtour', 'le bouton du podium annonce le même globe');
    await click(nextButton(tour.node));
    const trophy = await until(() => tour.node.querySelector('.mirage-trophy-screen'), 'le podium du Grand Tour');
    await until(() => trophy.querySelector('.mirage-trophy-fallback'), 'le globe sans WebGL');
    assert.equal(trophy.dataset.trophy, 'worldtour');
    assert.equal(text(trophy.querySelector('.mirage-trophy-design')), 'Globe des Horizons');
    assert.equal(trophy.querySelector('.mirage-trophy-fallback svg').dataset.trophy, 'worldtour');
    assert.equal(trophy.querySelector('.mirage-trophy-fallback svg').innerHTML, tourIcon, 'le podium conserve exactement le design du sélecteur');
    assert.notEqual(trophy.querySelector('.mirage-trophy-fallback svg').innerHTML, desertIcon);
    assert.match(text(trophy.querySelector('.mirage-trophy-lede')), /Tu remportes la Coupe Grand Tour avec 40 points/);
    assert.equal(text(trophy.querySelector('.mirage-trophy-purse')), '● OR GAGNÉS EN COURSE · +40 OR MAX. 40 OR SI TOUTES LES COURSES SONT GAGNÉES', 'les quatre victoires du Grand Tour créditent 40 OR');
    assert.ok(trophy.querySelector('.mirage-trophy-purse').classList.contains('is-won'));
    assert.equal(worldProbe.mounted, 0, 'le moteur de course est démonté sur le podium du globe');

    await click(trophy.querySelector('.mirage-start-button'));
    await waitForCountdown(tour.node);
    await waitForRace(tour.node);
    assert.equal(text(tour.node.querySelector('.mirage-chip.is-cup')), 'COURSE 1/4 · 0 PTS', 'rejouer le Grand Tour repart de zéro');
    assert.equal(tour.node.querySelector('.mirage-chip.is-cup svg').dataset.trophy, 'worldtour', 'rejouer garde le design du Grand Tour');
    await press('Escape');
    await click(tour.node.querySelector('.mirage-pause-overlay .mirage-share-button'));
    await openCupFromModes(tour.node, assert);
    const legendsCardAfter = tour.node.querySelector('.mirage-cup-card.is-legends');
    assert.equal(legendsCardAfter.disabled, false, 'finir la 3ᵉ coupe a débloqué la 4ᵉ coupe (Coupe des Légendes)');
    assert.equal(legendsCardAfter.classList.contains('is-locked'), false);
    await click(tour.node.querySelector('.mirage-cup-card.is-desert'));
    await startCupFromIntro(tour.node);
    await waitForCountdown(tour.node);
    await waitForRace(tour.node);
    assert.equal(tour.node.querySelector('.mirage-chip.is-cup svg').dataset.trophy, 'desert', 'changer de coupe ne conserve pas le globe précédent');
  } finally {
    tourTimers.restore();
    await tour.unmount();
  }

  // ── 7. Steel Ball Run : les dix cartes, 90 OR pour le champion ─────────
  // Les quatre coupes sont mises au tableau de chasse dans la progression
  // sauvegardée (les rejouer prendrait vingt courses) : la dernière coupe du
  // catalogue s’ouvre alors, et le titre du classement général doit verser
  // exactement une fois la prime de champion de 90 OR, en plus des dix
  // victoires de course à 10 OR.
  const sbrStartCoins = 100;
  window.localStorage.setItem(PROGRESSION_KEY, JSON.stringify({
    xp: 0, runs: 10, coins: sbrStartCoins, skinId: 'desert', ownedSkins: [],
    wonStages: ['desert', 'western', 'prairie', 'sardinia', 'alger'],
    completedCups: ['desert', 'winds', 'worldtour', 'legends'],
  }));
  const sbrTimers = patchTimers();
  const sbr = await mountPage('/jeu?mode=cup');
  try {
    const sbrCard = sbr.node.querySelector('.mirage-cup-card.is-sbr');
    assert.equal(sbrCard.disabled, false, 'les quatre coupes remportées ouvrent la Steel Ball Run');
    assert.equal(text(sbrCard.querySelector('.mirage-cup-reward-copy > strong')), '+190 OR');
    assert.equal(text(sbrCard.querySelector('.mirage-cup-card-title small')), 'TROPHÉE · Boule d’Acier');
    await click(sbrCard);
    assert.match(countdownKicker(sbr.node), /STEEL BALL RUN · COURSE 1 \/ 10 · DUNES DE L’ÉCHO/,
      'le clic sur la carte démarre les dix courses de la Steel Ball Run');
    await startCupFromIntro(sbr.node); // déjà lancée : la carte n’est plus à l’écran

    const sbrStages = ['desert', 'western', 'prairie', 'sardinia', 'alger', 'japan', 'ramparts', 'infinity', 'airbase', 'snakeway'];
    let sbrResults;
    for (let race = 0; race < sbrStages.length; race += 1) {
      if (race > 0) {
        await click(nextButton(sbr.node));
        await waitForCountdown(sbr.node);
        assert.match(countdownKicker(sbr.node), new RegExp(`COURSE ${race + 1} / 10`));
      }
      await waitForRace(sbr.node);
      assert.equal(worldProbe.props.stage, sbrStages[race], 'les dix courses suivent les dix cartes du jeu');
      assert.deepEqual(worldProbe.props.race.cup, { id: 'sbr', index: race, total: 10 });
      assert.equal(sbr.node.querySelector('.mirage-chip.is-cup svg').dataset.trophy, 'sbr', 'le HUD porte la boule d’acier');
      assert.equal(text(sbr.node.querySelector('.mirage-chip.is-cup')), `COURSE ${race + 1}/10 · ${race * 10} PTS`);
      await finishRace(['player', 'ombre', 'sauge', 'amethyste']);
      sbrResults = await waitForResults(sbr.node);
      // Les OR de la course sont ceux du bloc de récompense : la prime de
      // champion, elle, a sa propre ligne — absente tant que le titre n’est
      // pas acquis, et elle ne doit jamais doubler les 10 OR de la victoire.
      assert.equal(text(sbrResults.querySelector('.mirage-xp-award .mirage-coin-gain')), '+10 OR',
        'chaque victoire de course crédite ses 10 OR');
      const coins = JSON.parse(window.localStorage.getItem(PROGRESSION_KEY)).coins;
      if (race < sbrStages.length - 1) {
        assert.equal(coins, sbrStartCoins + (race + 1) * 10, 'la prime de champion ne tombe pas course par course');
        assert.equal(sbrResults.querySelector('.mirage-cup-champion-bonus'), null, 'pas de prime tant que le titre n’est pas acquis');
      }
    }

    // Le titre du général : la prime de champion apparaît sur l’arrivée de la
    // dernière course, exactement une fois.
    assert.equal(text(sbrResults.querySelector('.mirage-cup-champion-bonus')), '♛ PRIME DE CHAMPION · +90 OR CLASSEMENT GÉNÉRAL REMPORTÉ');
    assert.deepEqual(standings(sbrResults), ['Salim 100', `${ombre} 70`, `${sauge} 40`, `${amethyste} 20`]);
    assert.equal(JSON.parse(window.localStorage.getItem(PROGRESSION_KEY)).coins, sbrStartCoins + 100 + 90,
      'dix victoires de course (100 OR) plus la prime de champion (90 OR), une seule fois');
    // Le profil garde un trophée par coupe remportée : les trois des sections
    // précédentes, plus la boule d’acier — ajoutée une seule fois.
    assert.equal(sbr.node.querySelectorAll('.mirage-profile-trophy-card[data-cup-id="sbr"]').length, 1,
      'la victoire ajoute la boule d’acier au profil, une seule fois');
    const collectedSbr = sbr.node.querySelector('.mirage-profile-trophy-card[data-cup-id="sbr"] svg');
    assert.equal(collectedSbr.dataset.trophy, 'sbr');
    assert.equal(collectedSbr.innerHTML, sbrCard.querySelector('svg').innerHTML, 'la collection partage le trophée du sélecteur');
    const savedSbrAchievements = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}:guest`));
    const savedCupTrophies = savedSbrAchievements.sets[MIRAGE_CUP_TROPHIES_KEY];
    assert.deepEqual([...savedCupTrophies].sort(), ['desert', 'sbr', 'winds', 'worldtour'],
      'un trophée par coupe remportée, sans doublon');
    assert.equal(savedCupTrophies.filter((id) => id === 'sbr').length, 1,
      'le trophée de la Steel Ball Run est persisté une seule fois');

    assert.match(text(nextButton(sbr.node)), /VOIR LE PODIUM/);
    await click(nextButton(sbr.node));
    const sbrTrophy = await until(() => sbr.node.querySelector('.mirage-trophy-screen'), 'le podium de la Steel Ball Run');
    await until(() => sbrTrophy.querySelector('.mirage-trophy-fallback'), 'la boule d’acier sans WebGL');
    assert.equal(sbrTrophy.dataset.trophy, 'sbr');
    assert.equal(text(sbrTrophy.querySelector('.mirage-trophy-design')), 'Boule d’Acier');
    assert.equal(sbrTrophy.querySelector('.mirage-trophy-fallback svg').dataset.trophy, 'sbr');
    assert.match(text(sbrTrophy.querySelector('.mirage-trophy-lede')), /Tu remportes la Steel Ball Run avec 100 points/);
    assert.deepEqual(standings(sbrTrophy), ['Salim 100', `${ombre} 70`, `${sauge} 40`, `${amethyste} 20`]);
    assert.equal(text(sbrTrophy.querySelector('.mirage-trophy-purse')), '● OR GAGNÉS EN COURSE · +100 OR MAX. 190 OR SI TOUTES LES COURSES SONT GAGNÉES',
      'le podium sépare les OR de course du maximum, prime comprise');
    const sbrBonus = sbrTrophy.querySelector('.mirage-trophy-champion-bonus');
    assert.ok(sbrBonus.classList.contains('is-won'), 'la prime de champion gagnée est mise en avant');
    assert.equal(text(sbrBonus), '♛ PRIME DE CHAMPION · +90 OR AU TITRE DU CLASSEMENT GÉNÉRAL');
    assert.equal(JSON.parse(window.localStorage.getItem(PROGRESSION_KEY)).coins, sbrStartCoins + 190,
      'rester sur le podium ne re-crédite jamais la prime');
  } finally {
    sbrTimers.restore();
    await sbr.unmount();
  }
}
