// Vérification des soins du Sablier : chaque gain de vie réel — d'un sorcier
// ou d'une créature, des deux camps — se voit (éclat vert, « +N ») et
// s'entend (soin_vie / soin_vie_adverse). Rendu jsdom réel, puis lectures du
// source et de la feuille de style.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-soins-smoke.jsx', outDir: 'node_modules/.cache/rpg-soins', emptyOutDir: true },
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
  const { checkRpgSoins } = await import('../node_modules/.cache/rpg-soins/rpg-soins-smoke.js');
  await checkRpgSoins(assert);
} finally {
  dom.window.close();
}

const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const soinsCss = readFileSync(new URL('../src/games/rpg-soins.css', import.meta.url), 'utf8');

// ── Le relevé du journal : avant tout retour anticipé, sans rejouer d'ancien soin
const releve = battlePage.indexOf('const soins = rpgConsommerSoins(duelCourant);');
assert.ok(releve > 0, 'la page relève le journal des soins du moteur');
assert.ok(releve < battlePage.indexOf("if (ecran !== 'partie') {"),
  'le relevé vit avant les retours anticipés du rendu : il tourne aussi depuis le menu, sans planter');
assert.match(battlePage, /if \(soinsDuelRef\.current !== duelCourant \|\| ecran !== 'partie'\) \{\s*soinsDuelRef\.current = duelCourant;\s*return;\s*\}/,
  'un duel neuf, restauré ou quitté vide son journal sans rien rejouer');
assert.match(battlePage, /const son = sonDuSoin\(soins\);\s*if \(son\) jouerSfx\(son\);/,
  'un seul bruitage par lot de soins');
assert.match(battlePage, /setImpactEcran\(null\);\s*effacerSoinsVisibles\(\);/,
  'une partie neuve éteint les éclats de soin en cours');
assert.doesNotMatch(battlePage, /'soin_long'/,
  'le lancement d’un sort de soin garde le son commun des magies : le carillon suit le vrai gain');
assert.match(battlePage, /const soinPur = apres\.pv > entite\.pv/,
  'un soin pur n’ajoute pas la lueur dorée des renforts à son propre éclat');

// ── Le rendu : plaques et créatures ──────────────────────────────────────────
assert.match(battlePage, /\{soinSorcier && <EclatSoin key=\{soinSorcier\.token\} \/>\}/,
  'la plaque adverse rend l’éclat de son soin');
assert.match(battlePage, /\{soinJoueur && <EclatSoin key=\{soinJoueur\.token\} \/>\}/,
  'la plaque du joueur rend l’éclat de son soin');
assert.equal((battlePage.match(/soin=\{soinDeCarte\(entite, pile, deployee\)\}/g) ?? []).length, 2,
  'les créatures des deux camps reçoivent leur soin');
assert.match(battlePage, /import '\.\/rpg-soins\.css';/, 'la feuille des soins est chargée par la page du duel');

// ── La feuille : vert chaud, sans geste capté, mouvement réduit respecté ─────
assert.match(soinsCss, /\.rpg-soin\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*pointer-events:\s*none;/s,
  'l’éclat recouvre sa cible sans capter un geste');
assert.match(soinsCss, /\.rpg-soin-ecran\s*\{[^}]*z-index:\s*499;[^}]*pointer-events:\s*none;/s,
  'le voile vert de la table passe juste sous le voile rouge des coups');
assert.match(soinsCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-soin__mote,[\s\S]*?display: none;/,
  'en mouvement réduit, les motes et le voile ne montent plus');
assert.doesNotMatch(soinsCss, /@media[^{]*max-width/,
  'aucune requête de largeur : la feuille vaut pour tous les écrans');
assert.doesNotMatch(soinsCss, /#72e6d0/i, 'le vert du soin ne reprend pas le cyan du ciblable');

console.log('✓ Soins : chaque gain de vie réel illumine la plaque ou la créature soignée (halo, voile, motes, « +N »), verdit la table pour vos PV, se dit aux lecteurs d’écran et sonne une fois — la vie monte même au-dessus de 25');
