/**
 * Entrée SSR utilisée par scripts/mirage-graphics-check.mjs —
 * `npm run check:mirage-graphics`.
 *
 * Joue l'option « Graphismes baissés » de Mirage Rush dans jsdom, avec la vraie page
 * (/jeu) et la vraie fenêtre de course en ligne : seul le moteur 3D est remplacé par une
 * doublure (scripts/mirage-world-stub.jsx). Ce que la vérification garantit, c'est le
 * câblage — boutons, classes, mémorisation, bascule en pleine course ; le rendu lui-même
 * (pixels, flous) ne se voit que dans un vrai navigateur.
 *
 *   1. Par défaut : graphismes normaux, un bouton dans la barre du jeu (interrupteur
 *      `aria-pressed`) et le même réglage en toutes lettres sur l'écran du choix du mode.
 *   2. Le bouton de la barre, puis chacun des deux choix de l'écran, changent le réglage :
 *      classe `is-low-graphics` sur la coque, libellé, mémorisation dans le stockage.
 *   3. En pleine course : la bascule ne reconstruit pas le monde 3D (même nœud), la course
 *      continue (HUD, pas de pause) ; en pause, le réglage est aussi sur l'écran de pause ;
 *      de retour au choix du mode, il est toujours là.
 *   4. Un choix mémorisé s'applique dès l'ouverture de la page ; une valeur illisible vaut
 *      « normal » ; un changement fait dans un autre onglet (évènement `storage`) suit.
 *   5. Stockage refusé (navigation privée) : le choix tient pour l'onglet, sans erreur.
 *   6. Après un clic, le bouton rend le focus (sinon Espace et Entrée le rebasculeraient en
 *      pleine course) ; au clavier, il le garde.
 *   7. Course en ligne : le bouton est dans la barre de la fenêtre de course, la bascule
 *      s'applique à la fenêtre et à son arrière-plan sans interrompre la course.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import MirageRushPage from '../src/games/MirageRushPage';
import { resetLocalRoomsForTests } from '../src/games/mirageRooms';
import { GRAPHICS_STORAGE_KEY, graphicsStore } from '../src/games/mirageGraphics';
import { worldProbe } from './mirage-world-stub.jsx';

// `assert` est fourni par le script de vérification (assert/strict de Node).
// Jamais d'élément DOM dans une assertion : en cas d'échec, Node inspecterait tout le graphe de
// jsdom (des Go de mémoire) au lieu d'afficher le message. On compare des booléens.
let assert;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

// Les délais du compte à rebours (≈ 3 s) sont raccourcis.
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return { restore: () => { window.setTimeout = original; } };
}

async function mountPage(entry) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <MirageRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await act(async () => { await sleep(30); });
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

// Horloge `performance` : `Date.now` est décalé dans le test En ligne.
async function until(read, label, timeout = 5000) {
  const start = performance.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await act(async () => { await sleep(10); });
  }
}

const click = (el) => act(async () => { el.click(); });
/** Clic « de souris » : `detail` vaut 1, comme dans un navigateur (au clavier, il vaut 0). */
const pointerClick = (el) => act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });
const press = (key, init = {}) => act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
});

/** Ce qu'une autre fenêtre du navigateur ferait : écrire dans le stockage, puis `storage`. */
async function otherTab(value) {
  if (value === null) window.localStorage.removeItem(GRAPHICS_STORAGE_KEY);
  else window.localStorage.setItem(GRAPHICS_STORAGE_KEY, value);
  await act(async () => { window.dispatchEvent(new window.StorageEvent('storage', { key: GRAPHICS_STORAGE_KEY, newValue: value })); });
}

// ── Lecture de la page ──────────────────────────────────────────────────────

const shellOf = (node) => node.querySelector('.mirage-game-shell');
const buttonOf = (node) => node.querySelector('.mirage-game-controls-top .mirage-graphics-button');
const worldOf = (node) => node.querySelector('.mirage-world-stub');
const choicesOf = (scope) => [...scope.querySelectorAll('.mirage-graphics-choice')];
const choiceOf = (scope, name) => choicesOf(scope).find((button) => squash(button.textContent) === name);
const startOf = (node) => node.querySelector('.mirage-stage-actions .mirage-start-button');
const pauseOf = (node) => node.querySelector('.mirage-pause-button');
const backOf = (node) => node.querySelector('.mirage-back-game-button');

const NORMAL = { low: false, pressed: 'false', label: 'GRAPHISMES : NORMAUX' };
const LOW = { low: true, pressed: 'true', label: 'GRAPHISMES : BAISSÉS' };

/** Le réglage tel que la page le montre : coque, bouton de la barre, libellé. */
const shown = (node) => ({
  low: shellOf(node).classList.contains('is-low-graphics'),
  pressed: buttonOf(node).getAttribute('aria-pressed'),
  label: squash(buttonOf(node).querySelector('.mirage-graphics-label').textContent),
});
/** Les deux choix en toutes lettres d'un écran : celui qui est actif. */
const activeChoice = (scope) => {
  const actives = choicesOf(scope).filter((button) => button.classList.contains('is-active'));
  assert.equal(actives.length, 1, 'un seul choix est actif à la fois');
  const pressed = choicesOf(scope).filter((button) => button.getAttribute('aria-pressed') === 'true');
  assert.equal(pressed.length === 1 && pressed[0] === actives[0], true, 'le choix actif est aussi celui d’`aria-pressed`');
  return squash(actives[0].textContent);
};
const stored = () => window.localStorage.getItem(GRAPHICS_STORAGE_KEY);

const waitForIntroStep = (node, step) => until(() => node.querySelector(`.mirage-intro-overlay.is-${step}-step`), `l’écran « ${step} » de l’intro`);
const waitForCountdown = (node) => until(() => node.querySelector('.mirage-countdown-overlay'), 'le compte à rebours');
const waitForRace = (node) => until(() => node.querySelector('.mirage-hud'), 'le départ de la course');
const waitForPause = (node) => until(() => node.querySelector('.mirage-pause-overlay'), 'la pause');

/** Écran 01 → écran 02 du mode `index` (0 Rapide, 1 Duel, 2 Coupe, 3 En ligne), puis attend le moteur. */
async function openStage(node, index) {
  const intro = await waitForIntroStep(node, 'mode');
  await click(intro.querySelectorAll('.mirage-mode-action')[index]);
  await waitForIntroStep(node, 'stage');
  await until(() => { const button = startOf(node); return button && !button.disabled; }, 'le moteur est prêt (bouton de lancement actif)');
}

/** Remet le réglage de l'appareil à `value` (`null` : jamais choisi) avant d'ouvrir la page. */
function resetDevice(value = null) {
  if (value === null) window.localStorage.removeItem(GRAPHICS_STORAGE_KEY);
  else window.localStorage.setItem(GRAPHICS_STORAGE_KEY, value);
  graphicsStore.sync();
}

export async function checkMirageGraphics(assertion) {
  assert = assertion;
  window.localStorage.clear();
  resetDevice(null);
  const timers = patchTimers();
  try {
    // ── 1-3. Page solo ────────────────────────────────────────────────────
    {
      const { node, unmount } = await mountPage('/jeu');
      assert.deepEqual(shown(node), NORMAL, 'par défaut : graphismes normaux');
      assert.equal(stored(), null, 'rien n’est écrit tant que le joueur n’a rien choisi');
      const button = buttonOf(node);
      assert.ok(button, 'le bouton Graphismes est dans la barre du jeu dès l’intro');
      assert.equal(button.getAttribute('type'), 'button');
      assert.equal(button.getAttribute('aria-label'), 'Graphismes baissés');
      assert.ok(button.querySelector('svg.mirage-graphics-icon'), 'icône dessinée en SVG (pas de glyphe absent des polices)');
      assert.match(button.title, /réduire le lag/i, 'l’infobulle dit à quoi ça sert');
      assert.equal(button.previousElementSibling.classList.contains('mirage-sound-button') && button.nextElementSibling.classList.contains('mirage-fullscreen-button'), true, 'rangé entre SON et PLEIN ÉCRAN');

      // Écran du choix du mode : le même réglage en toutes lettres.
      const intro = await waitForIntroStep(node, 'mode');
      const modeSwitch = intro.querySelector('.mirage-graphics-switch');
      assert.ok(modeSwitch, 'le réglage figure sur l’écran du choix du mode');
      assert.deepEqual(choicesOf(modeSwitch).map((choice) => squash(choice.textContent)), ['NORMAUX', 'BAISSÉS']);
      assert.equal(activeChoice(modeSwitch), 'NORMAUX');
      assert.match(squash(modeSwitch.textContent), /moins de lag, même jeu/, 'la raison d’être de l’option est dite');
      assert.equal(intro.querySelectorAll('.mirage-mode-action').length, 4, 'les quatre boutons de mode restent les seuls boutons de départ');

      // 2. Le bouton de la barre.
      await click(button);
      assert.deepEqual(shown(node), LOW, 'le bouton baisse les graphismes');
      assert.equal(stored(), 'low', 'et le mémorise');
      assert.equal(activeChoice(modeSwitch), 'BAISSÉS', 'le réglage en toutes lettres suit');
      await click(button);
      assert.deepEqual(shown(node), NORMAL, 'un second clic rétablit');
      assert.equal(stored(), 'normal');
      assert.equal(activeChoice(modeSwitch), 'NORMAUX');
      // … et chacun des deux choix en toutes lettres.
      await click(choiceOf(modeSwitch, 'BAISSÉS'));
      assert.deepEqual(shown(node), LOW);
      assert.equal(stored(), 'low');
      await click(choiceOf(modeSwitch, 'BAISSÉS'));
      assert.deepEqual(shown(node), LOW, 'choisir deux fois « baissés » ne le défait pas : ce sont des choix, pas un interrupteur');
      await click(choiceOf(modeSwitch, 'NORMAUX'));
      assert.deepEqual(shown(node), NORMAL);
      assert.equal(stored(), 'normal');

      // 3. En pleine course.
      await openStage(node, 0);
      const world = worldOf(node);
      assert.ok(world, 'le moteur 3D est monté');
      await click(startOf(node));
      await waitForCountdown(node);
      await waitForRace(node);
      assert.deepEqual(shown(node), NORMAL);
      await click(buttonOf(node));
      assert.deepEqual(shown(node), LOW, 'la bascule se fait en pleine course');
      assert.equal(worldOf(node) === world, true, 'le monde 3D n’est pas reconstruit : même nœud, la course continue');
      assert.ok(node.querySelector('.mirage-hud') && !node.querySelector('.mirage-pause-overlay') && !node.querySelector('.mirage-countdown-overlay'), 'pas de pause ni de compte à rebours : la course suit son cours');
      assert.equal(shellOf(node).classList.contains('is-running'), true);
      await click(buttonOf(node));
      assert.deepEqual(shown(node), NORMAL);
      await click(buttonOf(node));
      assert.deepEqual(shown(node), LOW);
      assert.equal(worldOf(node) === world, true, 'aucune reconstruction non plus après plusieurs bascules');

      // En pause : le réglage est aussi sur l'écran de pause.
      await click(pauseOf(node));
      const pause = await waitForPause(node);
      const pauseSwitch = pause.querySelector('.mirage-graphics-switch');
      assert.ok(pauseSwitch, 'l’écran de pause porte le réglage');
      assert.equal(activeChoice(pauseSwitch), 'BAISSÉS');
      assert.deepEqual(shown(node), LOW);
      await click(choiceOf(pauseSwitch, 'NORMAUX'));
      assert.deepEqual(shown(node), NORMAL, 'depuis la pause aussi');
      assert.equal(stored(), 'normal');
      assert.ok(node.querySelector('.mirage-pause-overlay'), 'rester sur la pause : changer de réglage ne reprend pas la course');
      assert.equal(worldOf(node) === world, true);
      await click(buttonOf(node));
      assert.equal(activeChoice(pauseSwitch), 'BAISSÉS', 'le bouton de la barre met l’écran de pause à jour');
      await click(pauseOf(node));
      await until(() => !node.querySelector('.mirage-pause-overlay') && node.querySelector('.mirage-hud'), 'la reprise');
      assert.deepEqual(shown(node), LOW, 'la reprise garde le réglage');

      // Retour au choix du mode : le réglage est toujours là.
      await click(backOf(node));
      const back = await waitForIntroStep(node, 'mode');
      assert.deepEqual(shown(node), LOW);
      assert.equal(activeChoice(back.querySelector('.mirage-graphics-switch')), 'BAISSÉS');
      await unmount();
    }

    // ── 4. Mémorisation ───────────────────────────────────────────────────
    {
      resetDevice('low');
      const { node, unmount } = await mountPage('/jeu');
      assert.deepEqual(shown(node), LOW, 'un choix mémorisé s’applique dès l’ouverture de la page');
      assert.equal(activeChoice(node.querySelector('.mirage-intro-overlay .mirage-graphics-switch')), 'BAISSÉS');

      // Un changement fait dans un autre onglet.
      await otherTab('normal');
      assert.deepEqual(shown(node), NORMAL, 'un autre onglet rétablit : cette page le suit');
      await otherTab('low');
      assert.deepEqual(shown(node), LOW);
      // Un évènement d'une autre clé ne relit rien : le réglage ne bouge pas, même si le nôtre a
      // changé en douce dans le stockage ; l'évènement de notre clé, lui, le relit.
      window.localStorage.setItem(GRAPHICS_STORAGE_KEY, 'normal');
      await act(async () => { window.dispatchEvent(new window.StorageEvent('storage', { key: 'letsplay_autre_cle', newValue: 'x' })); });
      assert.deepEqual(shown(node), LOW, 'une autre clé du stockage ne touche à rien');
      await act(async () => { window.dispatchEvent(new window.StorageEvent('storage', { key: GRAPHICS_STORAGE_KEY, newValue: 'normal' })); });
      assert.deepEqual(shown(node), NORMAL, 'l’évènement de notre clé relit le stockage');
      // Stockage vidé en bloc (`key` nul).
      await click(buttonOf(node));
      assert.deepEqual(shown(node), LOW);
      window.localStorage.clear();
      await act(async () => { window.dispatchEvent(new window.StorageEvent('storage', { key: null })); });
      assert.deepEqual(shown(node), NORMAL, 'stockage vidé : retour aux graphismes normaux');
      await unmount();

      // Valeur illisible : normal, et la page ne plante pas.
      for (const junk of ['ultra', '', '{"quality":"low"}', 'LOW', 'null']) {
        resetDevice(junk);
        const page = await mountPage('/jeu');
        assert.deepEqual(shown(page.node), NORMAL, `valeur mémorisée « ${junk} » : graphismes normaux`);
        await click(buttonOf(page.node));
        assert.deepEqual(shown(page.node), LOW, 'et le bouton fonctionne quand même');
        await page.unmount();
      }
    }

    // ── 5. Stockage refusé ────────────────────────────────────────────────
    {
      resetDevice(null);
      const original = window.Storage.prototype.setItem;
      window.Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
      try {
        const { node, unmount } = await mountPage('/jeu');
        await click(buttonOf(node));
        assert.deepEqual(shown(node), LOW, 'navigation privée : le choix tient pour cet onglet');
        assert.equal(stored(), null, 'rien n’a pu être écrit');
        await click(buttonOf(node));
        assert.deepEqual(shown(node), NORMAL);
        await unmount();
      } finally {
        window.Storage.prototype.setItem = original;
      }
    }

    // ── 6. Le focus ───────────────────────────────────────────────────────
    {
      resetDevice(null);
      const { node, unmount } = await mountPage('/jeu');
      const button = buttonOf(node);
      button.focus();
      assert.equal(document.activeElement === button, true);
      await pointerClick(button);
      assert.deepEqual(shown(node), LOW);
      assert.equal(document.activeElement === button, false, 'après un clic, le bouton rend le focus (Espace et Entrée ne le rebasculent pas)');
      button.focus();
      await click(button);
      assert.deepEqual(shown(node), NORMAL);
      assert.equal(document.activeElement === button, true, 'au clavier (detail 0), le focus reste : on peut continuer à naviguer');
      const choice = choiceOf(node.querySelector('.mirage-intro-overlay .mirage-graphics-switch'), 'BAISSÉS');
      choice.focus();
      await pointerClick(choice);
      assert.deepEqual(shown(node), LOW);
      assert.equal(document.activeElement === choice, false, 'même chose pour les choix en toutes lettres');
      await unmount();
    }

    // ── 7. Course en ligne : fenêtre de course ────────────────────────────
    timers.restore();
    // Même méthode que check:mirage-scoreboard : on avance l'horloge du salon d'un coup plutôt
    // que d'attendre les 5 s de départ.
    const realNow = Date.now.bind(Date);
    let skew = 0;
    Date.now = () => realNow() + skew;
    resetLocalRoomsForTests({ seed: false });
    resetDevice(null);
    const online = await mountPage('/jeu?mode=online');
    try {
      const byText = (selector, text) => [...online.node.querySelectorAll(selector)].find((el) => squash(el.textContent).includes(text));
      await click(byText('button', 'CRÉER ROOM'));
      await click(byText('button', 'CRÉER LA ROOM'));
      await until(() => online.node.querySelector('.mirage-room-header-panel'), 'le salon est créé', 8000);
      await click(byText('button', 'SE METTRE PRÊT'));
      const launch = await until(() => {
        const button = online.node.querySelector('.mirage-launch-party-btn');
        return button && !button.disabled ? button : null;
      }, 'le bouton de lancement est actif', 8000);
      await click(launch);
      await until(() => online.node.querySelector('.mirage-game-popup'), 'la fenêtre de course s’ouvre', 8000);
      skew = 6000;
      await until(() => squash(online.node.querySelector('.mirage-game-popup')?.textContent).includes('COURSE EN COURS'), 'la course démarre', 8000);

      const popup = () => online.node.querySelector('.mirage-game-popup');
      const backdrop = () => popup().parentElement;
      const popupButton = () => popup().querySelector('.mirage-popup-actions .mirage-graphics-button');
      const popupState = () => ({
        shell: popup().querySelector('.mirage-game-shell').classList.contains('is-low-graphics'),
        backdrop: backdrop().classList.contains('is-low-graphics'),
        pressed: popupButton().getAttribute('aria-pressed'),
      });
      assert.ok(popupButton(), 'la barre de la fenêtre de course porte le bouton Graphismes');
      assert.equal(popupButton().getAttribute('aria-label'), 'Graphismes baissés');
      assert.equal(popupButton() === popup().querySelector('.mirage-popup-actions').firstElementChild, true, 'groupé avec « QUITTER LA ROOM » et « Plein écran », en tête');
      assert.deepEqual(popupState(), { shell: false, backdrop: false, pressed: 'false' }, 'normal par défaut');
      const world = worldOf(popup());
      assert.ok(world, 'le moteur 3D de la course est monté');

      await click(popupButton());
      assert.deepEqual(popupState(), { shell: true, backdrop: true, pressed: 'true' }, 'la bascule s’applique à la fenêtre et à son arrière-plan');
      assert.equal(stored(), 'low', 'et se mémorise comme sur la page solo');
      assert.equal(worldOf(popup()) === world, true, 'le monde 3D de la course n’est pas reconstruit');
      assert.ok(squash(popup().textContent).includes('COURSE EN COURS'), 'la course en ligne continue');
      await click(popupButton());
      assert.deepEqual(popupState(), { shell: false, backdrop: false, pressed: 'false' });
      assert.equal(stored(), 'normal');
      assert.equal(worldOf(popup()) === world, true);
      await otherTab('low');
      assert.deepEqual(popupState(), { shell: true, backdrop: true, pressed: 'true' }, 'un autre onglet baisse aussi les graphismes de la course en ligne');

      // L'arrivée ferme la fenêtre : les résultats s'ouvrent, sans reste de la bascule.
      await act(async () => {
        worldProbe.props.onFinish({ mode: 'online', score: 2150, gems: 12, duration: 50, distance: 800, lane: 1, jump: 0 });
      });
      await until(() => online.node.querySelector('.mirage-results-dialog'), 'la fenêtre de résultats s’ouvre', 8000);
      await settle();
      assert.ok(!online.node.querySelector('.mirage-game-popup'), 'la fenêtre de course a disparu');
    } finally {
      Date.now = realNow;
      await online.unmount();
    }
  } finally {
    timers.restore();
    window.localStorage.clear();
  }
}
