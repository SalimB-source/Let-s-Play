// Vérification du choix du mana du Sablier : sur un deck hybride qui contient
// la Neige, le rond du choix dessine le flocon des cartes Neige — trois axes,
// six pointes —, et la jauge reprend le même emblème. Rendu jsdom réel, puis
// lecture du composant d'emblèmes (boîtiers, filtre et choix partagent un seul
// dessin).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-mana-flocon-smoke.jsx', outDir: 'node_modules/.cache/rpg-mana-flocon', emptyOutDir: true },
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

try {
  const { checkRpgManaFlocon } = await import('../node_modules/.cache/rpg-mana-flocon/rpg-mana-flocon-smoke.js');
  await checkRpgManaFlocon(assert);
} finally {
  dom.window.close();
}

// ── Le dessin : un seul emblème Neige, le flocon, pour toutes les surfaces ──
const boxSource = readFileSync(new URL('../src/games/RpgDeckBox.jsx', import.meta.url), 'utf8');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const neigeEmblem = boxSource.slice(boxSource.indexOf('  neige: ('), boxSource.indexOf('  // Ténèbres'));
assert.ok(neigeEmblem.includes('[0, 60, 120].map'),
  'les trois axes du flocon sont tournés tous les 60°');
assert.ok(neigeEmblem.includes('[0, 60, 120, 180, 240, 300].map'),
  'une pointe en V ferme chacune des six branches');
assert.ok(neigeEmblem.includes('strokeLinecap="round"') && neigeEmblem.includes('fill="none"'),
  'le flocon se dessine en traits arrondis, sans surface pleine');
assert.doesNotMatch(neigeEmblem, /M12 1\.3 4\.9 5\.6v9\.6L12 22\.7/,
  'le prisme hexagonal qui figurait la Neige a disparu');
assert.match(battlePage, /const ELEMENT_GLYPHS = \{ braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '⚖️', hybride: '🔥⏳' \};/,
  'l’icône des cartes Neige reste le flocon ❄️ : l’emblème du choix le rejoint');
assert.match(battlePage, /className=\{`rpg-flux-choix__option rpg-flux-choix__option--\$\{couleur\}`\}[\s\S]{0,900}?<ElementEmblem element=\{couleur\} \/>/,
  'chaque rond du choix du mana dessine l’emblème de sa couleur, Neige comprise');
assert.match(battlePage, /rpg-flux-track__slot--\$\{couleur\}[\s\S]{0,1200}?\{couleur \? <ElementEmblem element=\{couleur\} \/> : '◇'\}/,
  'la jauge allume le même emblème pour la source acquise');

console.log('✓ Choix du mana : la Neige d’un deck hybride s’annonce en flocon — trois axes et six pointes, le dessin des cartes ❄️ — dans le rond du choix puis dans la jauge du camp');
