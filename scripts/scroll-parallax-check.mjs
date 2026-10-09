/**
 * Vérifications des effets de scroll — `npm run check:home-motion`.
 * Rejoue le calcul du parallax dans un DOM minimal et vérifie l'autoplay
 * différé du premier reel de l'accueil.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTO_PARALLAX_SELECTOR, initScrollParallax } from '../src/lib/scrollParallax.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` → ${actual} (attendu : ${expected})`}`);
}

const pendingFrames = new Map();
const listeners = new Map();
let frameId = 0;
let motionChange;
const motionPreference = {
  matches: false,
  addEventListener: (_type, handler) => { motionChange = handler; },
  removeEventListener: () => { motionChange = null; },
};
globalThis.window = {
  innerHeight: 800,
  requestAnimationFrame: (callback) => {
    const id = ++frameId;
    pendingFrames.set(id, callback);
    return id;
  },
  cancelAnimationFrame: (id) => pendingFrames.delete(id),
  addEventListener: (type, handler) => {
    const handlers = listeners.get(type) || new Set();
    handlers.add(handler);
    listeners.set(type, handlers);
  },
  removeEventListener: (type, handler) => listeners.get(type)?.delete(handler),
  matchMedia: () => motionPreference,
};
globalThis.document = { documentElement: { clientHeight: 800 } };
let mutationObserverInstance = null;
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; mutationObserverInstance = this; }
  observe() {}
  disconnect() { this.disconnected = true; }
};

const makeElement = ({ top, height, speed, limit, autoParallax = false, excluded = false }) => {
  const values = new Map();
  const attributes = new Map();
  if (speed !== undefined) attributes.set('data-parallax', String(speed));
  if (limit !== undefined) attributes.set('data-parallax-limit', String(limit));
  const element = {
    nodeType: 1,
    dataset: {
      ...(speed === undefined ? {} : { parallax: String(speed) }),
      ...(limit === undefined ? {} : { parallaxLimit: String(limit) }),
    },
    isConnected: true,
    parentElement: null,
    hasAttribute: (name) => attributes.has(name),
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    matches: (selector) => {
      if (selector === '[data-parallax]') return attributes.has('data-parallax');
      if (selector === '[data-scroll-parallax]') return attributes.has('data-scroll-parallax');
      if (selector === AUTO_PARALLAX_SELECTOR) return autoParallax;
      return false;
    },
    style: {
      setProperty: (name, value) => values.set(name, value),
      removeProperty: (name) => values.delete(name),
      getPropertyValue: (name) => values.get(name) || '',
    },
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top, bottom: top + height, height, width: 200, left: 0, right: 200 }),
  };
  element.closest = () => (excluded ? element : null);
  return element;
};
const centered = makeElement({ top: 300, height: 200, speed: 0.1, limit: 18 });
const nearTop = makeElement({ top: 50, height: 100, speed: 0.1, limit: 18 });
const outside = makeElement({ top: 820, height: 100, speed: 0.1, limit: 18 });
const autoCard = makeElement({ top: 50, height: 100, autoParallax: true });
const gamePanel = makeElement({ top: 50, height: 100, autoParallax: true, excluded: true });
const elements = [centered, nearTop, outside, autoCard, gamePanel];
const rootNode = {
  querySelectorAll: () => elements,
  documentElement: null,
};
const flushFrames = () => {
  const callbacks = [...pendingFrames.values()];
  pendingFrames.clear();
  callbacks.forEach((callback) => callback());
};

console.log('\n[1/3] parallax : calcul, portée globale, ajout dynamique et préférence motion\n');
const cleanup = initScrollParallax(rootNode);
flushFrames();
check('un élément centré ne dérive pas', centered.style.getPropertyValue('--parallax-y'), '0.0px');
check('le déplacement reste borné à sa limite', nearTop.style.getPropertyValue('--parallax-y'), '18.0px');
check('un élément hors écran ne bouge pas', outside.style.getPropertyValue('--parallax-y'), '0.0px');
check('une carte sans réglage reçoit le parallax global discret', autoCard.style.getPropertyValue('--parallax-y'), '7.5px');
check('les cartes automatiques reçoivent leur marqueur CSS', autoCard.hasAttribute('data-scroll-parallax'), true);
check('une zone de jeu peut être exclue du parallax', gamePanel.hasAttribute('data-scroll-parallax'), false);
check('une zone de jeu exclue ne reçoit aucun offset', gamePanel.style.getPropertyValue('--parallax-y'), '');

const lazyCard = makeElement({ top: 0, height: 100, speed: 0.05, limit: 18 });
const lazyAutoCard = makeElement({ top: 0, height: 100, autoParallax: true });
mutationObserverInstance?.callback([{
  type: 'childList',
  addedNodes: [{
    nodeType: 1,
    matches: () => false,
    querySelectorAll: () => [lazyCard, lazyAutoCard],
  }],
}]);
flushFrames();
check('une carte ajoutée après le chargement reçoit le parallax', lazyCard.style.getPropertyValue('--parallax-y'), '17.5px');
check('un bloc ajouté par une route lazy reçoit le parallax automatique', lazyAutoCard.style.getPropertyValue('--parallax-y'), '8.8px');

motionPreference.matches = true;
motionChange?.({ matches: true });
check('prefers-reduced-motion retire les offsets', nearTop.style.getPropertyValue('--parallax-y'), '');
check('prefers-reduced-motion retire aussi les offsets automatiques', autoCard.style.getPropertyValue('--parallax-y'), '');
motionPreference.matches = false;
motionChange?.({ matches: false });
flushFrames();
check('le parallax reprend quand la préférence est désactivée', nearTop.style.getPropertyValue('--parallax-y'), '18.0px');
cleanup();
check('le nettoyage retire le listener scroll', listeners.get('scroll')?.size || 0, 0);
check('le nettoyage efface les offsets explicites', nearTop.style.getPropertyValue('--parallax-y'), '');
check('le nettoyage retire les marqueurs automatiques', autoCard.hasAttribute('data-scroll-parallax'), false);
check('le nettoyage détache aussi l’observateur des cartes lazy', mutationObserverInstance?.disconnected, true);

console.log('\n[2/3] portée du parallax sur les routes du site\n');
const layout = readFileSync(path.join(root, 'src/components/Layout.jsx'), 'utf8');
const parallax = readFileSync(path.join(root, 'src/lib/scrollParallax.js'), 'utf8');
const styles = readFileSync(path.join(root, 'src/styles.css'), 'utf8');
check('sections, articles, cartes et footer sont ciblés globalement', [
  AUTO_PARALLAX_SELECTOR.includes('main section'),
  AUTO_PARALLAX_SELECTOR.includes('main article'),
  AUTO_PARALLAX_SELECTOR.includes('[class*="card"]'),
  AUTO_PARALLAX_SELECTOR.includes('footer.footer'),
].every(Boolean), true);
check('le coordinateur global est initialisé dans Layout', layout.includes('useEffect(() => initScrollParallax(), [])'), true);
check('les cartes chargées plus tard sont aussi observées', parallax.includes('mutation.addedNodes'), true);
check('les zones de jeu immersives restent hors parallax', parallax.includes('.mirage-page, .city-rush-page'), true);
check('le mouvement respecte prefers-reduced-motion', styles.includes('[data-scroll-parallax]{translate:none !important}'), true);

console.log('\n[3/3] premier reel : autoplay muet au défilement vers la section\n');
const home = readFileSync(path.join(root, 'src/pages/Home.jsx'), 'utf8');
const video = readFileSync(path.join(root, 'src/components/ScrollAutoplayVideo.jsx'), 'utf8');
const reelsStart = home.indexOf('id="reels"');
const liveStart = home.indexOf('id="live"');
const homeReels = home.slice(reelsStart, liveStart);
check('la vidéo à la une garde son lecteur à autoplay différé', home.includes('<ScrollAutoplayVideo'), true);
check('le premier reel utilise le lecteur à autoplay différé', /index === 0\s*\?\s*\(\s*<ScrollAutoplayVideo/.test(homeReels), true);
check('les autres reels restent sans autoplay et sont chargés paresseusement', homeReels.includes('loading="lazy"'), true);
check('aucun iframe autoplay avant le seuil de visibilité', /\{started\s*&&\s*\(\s*<iframe/.test(video), true);
check('l’autoplay est muet et inline pour les règles navigateur', /autoplay:\s*true,\s*muted:\s*true,\s*playsinline:\s*true/.test(video), true);
check('le lecteur attend au moins 42 % de visibilité', video.includes('intersectionRatio >= VIEW_THRESHOLD'), true);
check('la grille reel place correctement la miniature et le lecteur', readFileSync(path.join(root, 'src/reels-carousel.css'), 'utf8').includes('.reel-card .scroll-autoplay-video'), true);

console.log(`\n  ${failures === 0 ? 'OK' : `${failures} échec(s)`} — effets de scroll et autoplay\n`);
if (failures > 0) process.exitCode = 1;
