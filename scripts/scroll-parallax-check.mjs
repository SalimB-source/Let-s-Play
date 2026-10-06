/**
 * Vérifications du parallax de l'accueil — `npm run check:home-motion`.
 * Rejoue le calcul du mouvement dans un DOM minimal et vérifie les garde-fous
 * de l'autoplay différé de la une.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initScrollParallax } from '../src/lib/scrollParallax.js';

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

const makeElement = ({ top, height, speed, limit }) => {
  const values = new Map();
  return {
    dataset: { parallax: String(speed), parallaxLimit: String(limit) },
    isConnected: true,
    style: {
      setProperty: (name, value) => values.set(name, value),
      removeProperty: (name) => values.delete(name),
      getPropertyValue: (name) => values.get(name) || '',
    },
    getBoundingClientRect: () => ({ top, bottom: top + height, height, width: 200, left: 0, right: 200 }),
  };
};
const centered = makeElement({ top: 300, height: 200, speed: 0.1, limit: 18 });
const nearTop = makeElement({ top: 50, height: 100, speed: 0.1, limit: 18 });
const outside = makeElement({ top: 820, height: 100, speed: 0.1, limit: 18 });
const elements = [centered, nearTop, outside];
const rootNode = { querySelectorAll: (selector) => selector === '[data-parallax]' ? elements : [] };
const flushFrames = () => {
  const callbacks = [...pendingFrames.values()];
  pendingFrames.clear();
  callbacks.forEach((callback) => callback());
};

console.log('\n[1/2] parallax : calcul, limite, éléments hors écran et préférence motion\n');
const cleanup = initScrollParallax(rootNode);
flushFrames();
check('un élément centré ne dérive pas', centered.style.getPropertyValue('--parallax-y'), '0.0px');
check('le déplacement est borné à la limite définie', nearTop.style.getPropertyValue('--parallax-y'), '18.0px');
check('un élément hors écran ne bouge pas', outside.style.getPropertyValue('--parallax-y'), '0.0px');

const lazyCard = makeElement({ top: 0, height: 100, speed: 0.05, limit: 18 });
mutationObserverInstance?.callback([{
  type: 'childList',
  addedNodes: [{
    nodeType: 1,
    matches: () => false,
    querySelectorAll: () => [lazyCard],
  }],
}]);
flushFrames();
check('une carte ajoutée après le chargement reçoit le parallax', lazyCard.style.getPropertyValue('--parallax-y'), '17.5px');

motionPreference.matches = true;
motionChange?.({ matches: true });
check('prefers-reduced-motion retire les offsets', nearTop.style.getPropertyValue('--parallax-y'), '');
motionPreference.matches = false;
motionChange?.({ matches: false });
flushFrames();
check('le parallax reprend quand la préférence est désactivée', nearTop.style.getPropertyValue('--parallax-y'), '18.0px');
cleanup();
check('le nettoyage retire le listener scroll', listeners.get('scroll')?.size || 0, 0);
check('le nettoyage efface les offsets', nearTop.style.getPropertyValue('--parallax-y'), '');
check('le nettoyage détache aussi l’observateur des cartes lazy', mutationObserverInstance?.disconnected, true);

console.log('\n[2/2] vidéo à la une : chargement seulement à l’entrée dans le viewport\n');
const home = readFileSync(path.join(root, 'src/pages/Home.jsx'), 'utf8');
const video = readFileSync(path.join(root, 'src/components/ScrollAutoplayVideo.jsx'), 'utf8');
const layout = readFileSync(path.join(root, 'src/components/Layout.jsx'), 'utf8');
const parallax = readFileSync(path.join(root, 'src/lib/scrollParallax.js'), 'utf8');
check('la une utilise le lecteur à autoplay différé', home.includes('<ScrollAutoplayVideo'), true);
check('aucun iframe autoplay avant le seuil de visibilité', /\{started\s*&&\s*\(\s*<iframe/.test(video), true);
check('l’autoplay est muet et inline pour les règles navigateur', /autoplay:\s*true,\s*muted:\s*true,\s*playsinline:\s*true/.test(video), true);
check('le lecteur attend au moins 42 % de visibilité', video.includes('intersectionRatio >= VIEW_THRESHOLD'), true);
check('le parallax est initialisé globalement dans le site', layout.includes('useEffect(() => initScrollParallax(), [])'), true);
check('les cartes chargées plus tard sont aussi observées', parallax.includes('mutation.addedNodes'), true);
check('la carte actu à la une est animée comme un bloc', /daily-news-card home-news-card" data-parallax/.test(home), true);
check('les cartes épisodes ont des vitesses parallax différenciées', /data-parallax=\{index === 1/.test(home), true);

console.log(`\n  ${failures === 0 ? 'OK' : `${failures} échec(s)`} — effets de scroll de l'accueil\n`);
if (failures > 0) process.exitCode = 1;
