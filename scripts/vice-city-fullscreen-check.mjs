import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « ViceCityWorld » (la page de Vice City Rush).
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-fullscreen-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/vice-city-fullscreen', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityFullscreen } = await import('../node_modules/.cache/vice-city-fullscreen/vice-city-fullscreen-smoke.js');
try { await checkViceCityFullscreen(assert); } finally { dom.window.close(); }

// ── Le hub de préparation n'est pas une fenêtre défilante ────────────────────
// jsdom ne calcule pas la mise en page : on garde donc ici l'invariant de
// feuille de style. Pendant la préparation (`is-intro`, posée par la page), la
// fenêtre de jeu prend la hauteur de son contenu et le hub revient dans le
// flux — sinon les vignettes de mode repassent sous la ligne de flottaison dans
// une zone défilante. Le plein écran garde, lui, son défilement de secours.
const cinematic = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-cinematic.css'), 'utf8');

/** Déclarations de la première règle dont la liste de sélecteurs contient `selector`. */
function declarationsOf(source, selector) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.replace(/\s+/g, ' ').trim());
    if (selectors.includes(selector)) return match[2].replace(/\s+/g, ' ').trim();
  }
  return '';
}

/** Corps d'une règle @media identifiée par ses conditions normalisées. */
function mediaBodyOf(source, conditions) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const expected = conditions.replace(/\s+/g, ' ').trim();
  const media = [...withoutComments.matchAll(/@media\s*([^{}]+)\{/g)]
    .find((match) => match[1].replace(/\s+/g, ' ').trim() === expected);
  if (!media) return '';

  const open = media.index + media[0].lastIndexOf('{');
  let depth = 0;
  for (let index = open; index < withoutComments.length; index += 1) {
    if (withoutComments[index] === '{') depth += 1;
    else if (withoutComments[index] === '}') {
      depth -= 1;
      if (depth === 0) return withoutComments.slice(open + 1, index);
    }
  }
  return '';
}

const stage = declarationsOf(cinematic, '.city-rush-page .city-rush-viewport.is-intro');
assert.match(stage, /(^|;)\s*height:\s*auto/, 'la fenêtre de jeu prend la hauteur du hub pendant la préparation');
assert.match(stage, /(^|;)\s*min-height:/, 'elle garde une hauteur minimale de fenêtre');
const hub = declarationsOf(cinematic, '.city-rush-page .city-rush-viewport.is-intro > .city-rush-intro:not(.city-rush-story-cinematic)');
assert.match(hub, /(^|;)\s*position:\s*relative/, 'le hub de préparation revient dans le flux');
assert.match(hub, /(^|;)\s*overflow:\s*visible/, 'plus de zone défilante dans la fenêtre');
const fullscreenHub = declarationsOf(cinematic, '.city-rush-shell.is-immersive .city-rush-viewport.is-intro > .city-rush-intro:not(.city-rush-story-cinematic)');
assert.match(fullscreenHub, /(^|;)\s*position:\s*absolute/, 'en plein écran, le hub reste une surimpression plein écran');
assert.match(fullscreenHub, /(^|;)\s*overflow-y:\s*auto/, 'et garde un défilement de secours si l’écran est plus court que le hub');

// Les petits portables restent sans défilement imbriqué en mode plein écran :
// les vignettes sont resserrées pour tenir entre le titre et les commandes.
const shortDesktop = mediaBodyOf(cinematic, '(max-height: 840px) and (hover: hover), (max-height: 840px) and (min-device-width: 601px)');
assert.ok(shortDesktop, 'les portables à faible hauteur ont leur mise en page compacte');
const compactGarage = declarationsOf(shortDesktop, '.city-rush-page .city-rush-car-card');
assert.match(compactGarage, /(^|;)\s*min-height:\s*190px/, 'le garage compact tient aussi sur un portable');

// Sur les téléphones portrait courts, on évite que le flex fasse se chevaucher
// les cartes et les commandes au lieu de faire défiler la page.
const shortPhone = mediaBodyOf(cinematic, '(max-height: 720px) and (max-width: 700px), (max-height: 720px) and (hover:none) and (pointer:coarse) and (max-device-width:600px)');
assert.ok(shortPhone, 'les téléphones de faible hauteur ont leur mise en page compacte');
const compactPhoneHub = declarationsOf(shortPhone, '.city-rush-page .city-rush-mode-picker');
assert.match(compactPhoneHub, /(^|;)\s*flex-shrink:\s*0/, 'le carrousel ne se comprime pas sous les commandes');
const compactPhoneCard = declarationsOf(shortPhone, '.city-rush-page .city-rush-mode-card');
assert.match(compactPhoneCard, /(^|;)\s*min-height:\s*128px/, 'les vignettes gardent leur contenu sur un téléphone court');

console.log('check:vice-city-fullscreen ✓ — plein écran et parcours des vignettes de Vice City Rush : mode → course → garage → lancement direct par la voiture (pilote sélectionnable avant le départ), bannière histoire cliquable ; plein écran conservé pendant les écrans et la course, raccourcis F et Échap, pause à la sortie navigateur ; téléphone et application Android : le tap sur une voiture lance la course et ouvre le plein écran dans le geste ; écran de préparation : les vignettes de mode ne sont plus enfermées dans une fenêtre défilante (la coque prend la hauteur du hub, les petits écrans sont compactés et le plein écran garde son défilement de secours).');
// Rien ne garde le processus en vie : on sort explicitement (jsdom peut retenir des timers).
process.exit(0);
