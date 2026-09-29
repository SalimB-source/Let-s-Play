/**
 * Contrôle « les courses s'ouvrent en pop-up » — `npm run check:race-popup`.
 *
 * Sur téléphone, tablette et dans l'app Android, une manche de Mirage Rush
 * (Ruée, Duel) doit se jouer par-dessus la page, pas au milieu d'elle : un
 * balayage du doigt pour esquiver ne doit jamais faire défiler l'arrière-plan.
 * Ce script vérifie les trois pièces du mécanisme, sans navigateur :
 *
 * 1. **Décision** (`src/games/racePopup.js`) : l'intro reste dans la page, tout
 *    le reste (décompte, partie, pause, arrivée) s'ouvre en pop-up, et l'app
 *    Android est reconnue même quand la WebView est large (téléphone en
 *    paysage) — le pont `LetsPlayAndroid` fait office de signal.
 * 2. **Verrou de défilement** (`src/lib/usePageScrollLock.js`) : le corps de
 *    page est figé à sa position de défilement (`position: fixed` + `top:
 *    -<défilé>`), puis retrouve exactement ses styles d'avant et sa position
 *    (iOS Safari ignore `overflow: hidden`, d'où la technique complète). Dans
 *    l'app, le même verrou coupe le tirer-pour-rafraîchir natif
 *    (`LetsPlayAndroid.setPullToRefresh`, voir `src/lib/appBridge.js`) et ne le
 *    rend qu'au dernier déverrouillage.
 * 3. **Câblage** : la page décollée est la même fenêtre de jeu (aucun portail,
 *    donc aucun remontage de la scène 3D), les règles CSS du pop-up existent
 *    (plein écran, `position: fixed`, voile derrière, croix de fermeture), et
 *    la course en ligne gèle elle aussi le défilement.
 *
 *   npm run check:race-popup
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'race-popup');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Les modules de l'application s'importent sans extension : c'est Vite qui les
// résout. On compile donc une petite entrée pour les lire depuis Node.
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/race-popup-smoke.js', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

let failures = 0;
function check(label, actual, expected = true) {
  const sameObject = expected !== null && typeof expected === 'object'
    && JSON.stringify(actual) === JSON.stringify(expected);
  const ok = typeof expected === 'function'
    ? expected(actual)
    : sameObject || actual === expected;
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}\n       reçu : ${JSON.stringify(actual)}`); }
}

/**
 * Faux navigateur : `matchMedia` répond comme un appareil dont on décrit les
 * capacités — `touch` (hover:none + pointer:coarse), `narrow` (fenêtre de mise
 * en page ≤ 800 px, zoom de page compris), `smallScreen` (écran de téléphone,
 * `max-device-width` — insensible au zoom), `portrait`, et `app` (pont natif de
 * la WebView Android). Les requêtes média de l'application sont des listes
 * (`a, b`) : une seule partie qui correspond suffit, comme dans un navigateur.
 */
function makePage({ touch = false, narrow = false, smallScreen = false, portrait = false, app = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body></body></html>', { pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = (query) => {
    const matches = String(query).split(',').some((part) => {
      const condition = part.trim();
      if (condition.includes('orientation:portrait')) return touch && portrait;
      if (condition.includes('max-device-width:600px')) return touch && smallScreen;
      if (condition.includes('max-width:800px')) return narrow;
      if (condition.includes('pointer:coarse') || condition.includes('hover:none')) return touch;
      return false;
    });
    return {
      matches,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    };
  };
  if (app) window.LetsPlayAndroid = { setCallAudio() {} };
  return {
    window,
    document: window.document,
    install() { globalThis.window = window; globalThis.document = window.document; },
    restore() { globalThis.window = undefined; globalThis.document = undefined; dom.window.close(); },
  };
}

/* ------------------------------------------------------------------------ */
console.log('\n[1/3] décision : quelle manche, sur quelle machine\n');

const smoke = await import(path.join(outDir, 'race-popup-smoke.js'));
const {
  racePopupOpen, racePopupLayout, RACE_POPUP_MEDIA, RACE_POPUP_PHASES,
  HANDHELD_MEDIA, PHONE_LAYOUT_MEDIA, TOUCH_MEDIA,
  isAndroidApp, isHandheld, isPhoneLayout, isTouchDevice,
  lockPageScroll, hasAppBridge,
} = smoke;

check('l’intro (choix de la course) reste dans la page', RACE_POPUP_PHASES.includes('intro'), false);
for (const phase of ['countdown', 'playing', 'paused', 'finished']) {
  check(`« ${phase} » s’ouvre en pop-up sur téléphone`, racePopupOpen(phase, true));
  check(`« ${phase} » reste dans la page sur ordinateur`, racePopupOpen(phase, false), false);
}
check('une phase inconnue ne décolle rien', racePopupOpen('quelque-chose', true), false);
check('la requête média couvre le tactile', RACE_POPUP_MEDIA.includes(TOUCH_MEDIA));
check('… et la mise en page téléphone', RACE_POPUP_MEDIA.includes(PHONE_LAYOUT_MEDIA));
check('layout tactile → pop-up', racePopupLayout(true, false));
check('app Android large → pop-up quand même', racePopupLayout(false, true));
check('souris, fenêtre large → pas de pop-up', racePopupLayout(false, false), false);

const profiles = [
  {
    name: 'ordinateur 1440 px',
    options: { touch: false, narrow: false, smallScreen: false },
    expected: { touch: false, phone: false, handheld: false, app: false, popup: false },
  },
  {
    name: 'téléphone en portrait',
    options: { touch: true, narrow: true, smallScreen: true, portrait: true },
    expected: { touch: true, phone: true, handheld: true, app: false, popup: true },
  },
  {
    // Zoom de page Safari : la fenêtre est large, l'écran reste un téléphone.
    name: 'téléphone en portrait, fenêtre élargie (zoom)',
    options: { touch: true, narrow: false, smallScreen: true, portrait: true },
    expected: { touch: true, phone: true, handheld: true, app: false, popup: true },
  },
  {
    name: 'téléphone en paysage (844 px)',
    options: { touch: true, narrow: false, smallScreen: false },
    expected: { touch: true, phone: false, handheld: false, app: false, popup: true },
  },
  {
    // Tablette en paysage : ni « max-width », ni écran de téléphone — seule la
    // condition tactile la trahit, et c'est bien assez pour le pop-up.
    name: 'tablette tactile paysage',
    options: { touch: true, narrow: false, smallScreen: false },
    expected: { touch: true, phone: false, handheld: false, app: false, popup: true },
  },
  {
    // WebView large, souris Bluetooth appairée : `pointer:coarse` est faux,
    // seul le pont natif trahit l'app — le pop-up doit rester.
    name: 'app Android, WebView large sans tactile détecté',
    options: { touch: false, narrow: false, smallScreen: false, app: true },
    expected: { touch: false, phone: false, handheld: false, app: true, popup: true },
  },
];
for (const profile of profiles) {
  const probe = makePage(profile.options);
  probe.install();
  const detected = {
    touch: isTouchDevice(),
    phone: isPhoneLayout(),
    handheld: isHandheld(),
    app: isAndroidApp(),
    popup: racePopupLayout(isTouchDevice() || isPhoneLayout(), isAndroidApp()),
  };
  probe.restore();
  check(profile.name, detected, profile.expected);
}
// La liste média « téléphone » garde sa condition de taille d'écran : un
// téléphone dont le zoom a élargi la fenêtre doit aussi ouvrir le pop-up.
check('PHONE_LAYOUT_MEDIA garde « max-device-width »', PHONE_LAYOUT_MEDIA.includes('max-device-width:600px'));
check('HANDHELD_MEDIA garde la condition tactile', HANDHELD_MEDIA.includes('pointer:coarse'));

/* ------------------------------------------------------------------------ */
console.log('\n[2/3] verrou de défilement\n');

// Sans DOM : inerte, jamais d'exception.
check('sans navigateur, aucun verrou', lockPageScroll(null, null), (release) => typeof release === 'function');

const STYLE_KEYS = ['overflow', 'position', 'top', 'left', 'right', 'width'];
const readStyles = (style) => Object.fromEntries(STYLE_KEYS.map((key) => [key, style[key]]));

function scrollLockCase({ scrollY }) {
  const dom = new JSDOM('<!doctype html><html><body style="overflow: auto; position: relative; top: 3px"></body></html>');
  const body = dom.window.document.body;
  const before = readStyles(body.style);
  const calls = [];
  const fakeWindow = { scrollY, scrollTo: (x, y) => calls.push([x, y]) };
  const release = lockPageScroll(fakeWindow, dom.window.document);
  const locked = readStyles(body.style);
  release();
  const restored = readStyles(body.style);
  return { before, locked, restored, calls };
}

const scrolled = scrollLockCase({ scrollY: 420 });
check('corps figé : plus de défilement', scrolled.locked.overflow, 'hidden');
check('… collé à sa position de défilement', scrolled.locked.position, 'fixed');
check('… avec le décalage exact', scrolled.locked.top, '-420px');
check('la largeur ne bouge pas', scrolled.locked.width, '100%');
check('styles d’origine rendus', scrolled.restored.position, scrolled.before.position);
check('… y compris ceux de la feuille de style', scrolled.restored.overflow, scrolled.before.overflow);
check('… et le petit ajustement du corps', scrolled.restored.top, '3px');
check('position de défilement retrouvée', scrolled.calls, [[0, 420]]);

const atTop = scrollLockCase({ scrollY: 0 });
check('en haut de page : le corps garde sa position', atTop.locked.position, atTop.before.position);
check('… mais le défilement est quand même gelé', atTop.locked.overflow, 'hidden');
check('… et rien n’est réécrit à l’ouverture', atTop.restored, atTop.before);
check('… aucune position à rendre', atTop.calls.length, 0);

// Deux libérations : la seconde ne doit rien réécrire ni re-défiler.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const calls = [];
const release = lockPageScroll({ scrollY: 120, scrollTo: (x, y) => calls.push([x, y]) }, dom.window.document);
release();
dom.window.document.body.style.top = '10px';
release();
check('double libération sans effet', [calls.length, dom.window.document.body.style.top], [1, '10px']);

// Dans l'app Android, la page gelée n'a plus rien à faire défiler : le geste
// vers le bas irait au tirer-pour-rafraîchir natif et rechargerait la manche.
const appWindow = makePage({ touch: true, narrow: true, app: true });
const refreshCalls = [];
appWindow.window.LetsPlayAndroid.setPullToRefresh = (enabled) => refreshCalls.push(enabled);
const previousWindow = globalThis.window;
globalThis.window = appWindow.window;
check('pont de l’app détecté', hasAppBridge());
const appRelease = lockPageScroll({ scrollY: 640, scrollTo: () => {} }, appWindow.window.document);
check('… tirer-pour-rafraîchir coupé pendant la course', refreshCalls, [false]);
const secondLock = lockPageScroll({ scrollY: 0, scrollTo: () => {} }, appWindow.window.document);
appRelease();
check('… toujours coupé tant qu’un verrou tient', refreshCalls, [false]);
secondLock();
check('… rendu à la fermeture du dernier verrou', refreshCalls, [false, true]);
appWindow.restore();
globalThis.window = previousWindow;
// Sans pont (navigateur) : aucun effet, aucune exception.
check('navigateur : tirer-pour-rafraîchir intouché', smoke.setAppPullToRefresh(false), false);

/* ------------------------------------------------------------------------ */
console.log('\n[3/3] câblage de la page et du style\n');

const rushPage = read('src/games/MirageRushPage.jsx');
const online = read('src/games/MirageOnline.jsx');
const css = read('src/games/mirage-rush.css');

check('la page importe la décision de pop-up', /from '\.\/racePopup'/.test(rushPage));
check('… et le verrou de défilement', /usePageScrollLock/.test(rushPage) && /usePageScrollLock\(raceInPopup\)/.test(rushPage));
check('la racine porte l’état « en pop-up »', /is-race-popup/.test(rushPage));
check('la fenêtre de jeu devient un dialogue modal', /role=\{raceInPopup \? 'dialog' : undefined\}/.test(rushPage) && /aria-modal=\{raceInPopup \? 'true' : undefined\}/.test(rushPage));
check('une croix ferme la course en pop-up', /mirage-popup-close-button/.test(rushPage) && /aria-label="Fermer la course"/.test(rushPage));
check('le voile est posé derrière la fenêtre', /mirage-race-popup-backdrop/.test(rushPage));
// Pas de portail ni de seconde grille : la fenêtre de jeu doit rester à sa
// place dans le DOM, sinon React remonte MirageWorld (scène 3D et partie en
// cours perdues) à chaque ouverture du pop-up.
check('aucun portail React dans la page', /createPortal/.test(rushPage), false);
check('le pop-up n’est pas un second rendu de la grille', (rushPage.match(/<section[\s\S]{0,80}mirage-game-shell/g) || []).length, 1);

check('CSS : la fenêtre est décollée en plein écran', /\.mirage-page\.is-race-popup \.mirage-game-shell \{[\s\S]*?position: fixed; inset: 0;/.test(css));
check('CSS : voile plein écran derrière', /\.mirage-race-popup-backdrop \{[\s\S]*?position: fixed; inset: 0;/.test(css));
check('CSS : la piste prend la hauteur restante', /\.mirage-page\.is-race-popup \.mirage-viewport \{[\s\S]*?flex: 1 1 auto;/.test(css));
check('CSS : croix de fermeture dessinée', /\.mirage-popup-close-button \{/.test(css));
check('CSS : manettes tactiles gardées en pop-up', /\.mirage-page\.is-race-popup \.mirage-game-shell\.is-running \.mirage-mobile-controls \{ display: flex; \}/.test(css));
check('la course en ligne gèle aussi le défilement', /usePageScrollLock\(gameLaunched && !finished\)/.test(online));

if (failures) {
  console.error(`\n${failures} contrôle(s) en échec.\n`);
  process.exit(1);
}
console.log('\nOK — sur téléphone, tablette et dans l’app, la course s’ouvre en pop-up plein écran et le défilement est gelé.\n');
