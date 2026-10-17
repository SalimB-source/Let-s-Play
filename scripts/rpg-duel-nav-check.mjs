import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Menu hamburger du duel : la page réelle montée dans jsdom avec un pointeur
// grossier, puis la cascade réelle de `rpg-battle.css` et `rpg-mobile.css` sur
// le panneau et son bouton. `npm run check:rpg-duel-nav`.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-duel-nav-smoke.jsx', outDir: 'node_modules/.cache/rpg-duel-nav', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom n'implémente pas `matchMedia` : sans la doublure, la page se croit à
// la souris et la barre ne se replie jamais.
window.matchMedia = (query) => ({
  matches: /pointer:\s*coarse/.test(String(query)),
  media: String(query),
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() { return false; },
});

const { checkRpgDuelNav } = await import('../node_modules/.cache/rpg-duel-nav/rpg-duel-nav-smoke.js');
try {
  await checkRpgDuelNav(assert);
} finally {
  dom.window.close();
}

// ── Le contrat de visibilité des feuilles ────────────────────────────────────
// jsdom applique la cascade des deux feuilles : on vérifie le panneau tel que
// le joueur le voit, sans navigateur. Le panneau est replié sans `is-open`,
// déplié avec ; à la souris, il se fond dans la barre et le hamburger reste
// caché.
const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');

const cascade = new JSDOM(`<!doctype html><html><head><style>${battleCss}\n${mobileCss}</style></head><body>
  <div class="rpg-battle rpg-battle--touch"><div class="card-table"><nav class="rpg-duel-nav">
    <div class="rpg-duel-nav__menu" id="menu-tactile"><button type="button">Menu</button></div>
    <button type="button" class="rpg-duel-nav__burger">☰</button>
  </nav></div></div>
</body></html>`);
try {
  const doc = cascade.window.document;
  const menu = doc.querySelector('#menu-tactile');
  const burger = doc.querySelector('.rpg-duel-nav__burger');
  assert.equal(cascade.window.getComputedStyle(menu).display, 'none',
    'au doigt, le panneau reste replié tant qu’il n’a pas `is-open`');
  assert.notEqual(cascade.window.getComputedStyle(burger).display, 'none',
    'au doigt, le hamburger est visible dans la barre');
  menu.classList.add('is-open');
  assert.equal(cascade.window.getComputedStyle(menu).display, 'grid',
    'au doigt, `is-open` déplie le panneau sous la barre');
} finally {
  cascade.window.close();
}

const bureau = new JSDOM(`<!doctype html><html><head><style>${battleCss}</style></head><body>
  <div class="rpg-battle"><nav class="rpg-duel-nav">
    <div class="rpg-duel-nav__menu" id="menu-bureau"><button type="button">Menu</button></div>
    <button type="button" class="rpg-duel-nav__burger">☰</button>
  </nav></div>
</body></html>`);
try {
  const doc = bureau.window.document;
  assert.equal(bureau.window.getComputedStyle(doc.querySelector('#menu-bureau')).display, 'contents',
    'à la souris, le panneau se fond dans la barre : les six commandes restent déroulées');
  assert.equal(bureau.window.getComputedStyle(doc.querySelector('.rpg-duel-nav__burger')).display, 'none',
    'à la souris, le bouton hamburger ne s’affiche pas');
} finally {
  bureau.window.close();
}

console.log('check:rpg-duel-nav ✓ — au doigt, le hamburger déplie les trois modes et les trois réglages ; un geste hors de la barre le referme ; Deck mène à son écran.');
process.exit(0);
