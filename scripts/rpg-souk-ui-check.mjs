/**
 * `npm run check:rpg-souk-ui` — l'écran du Souk, monté dans jsdom, plus les
 * gardes de source qui tiennent le branchement dans le menu.
 *
 * Le smoke (`scripts/rpg-souk-smoke.jsx`) est compilé par Vite en mode SSR et
 * exécuté ici : React est la vraie version, `act` compris. La graine des quêtes
 * est posée par le smoke lui-même, et rien ne dépend d'une minuterie.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── Le smoke : l'écran monté pour de vrai ───────────────────────────────────
const environnementPrecedent = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-souk-smoke.jsx', outDir: 'node_modules/.cache/rpg-souk-ui', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (environnementPrecedent === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = environnementPrecedent;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkRpgSoukEcran } = await import('../node_modules/.cache/rpg-souk-ui/rpg-souk-smoke.js');
try {
  await checkRpgSoukEcran(assert);
} finally {
  dom.window.close();
}

// ── Les gardes de source : le branchement dans le menu ──────────────────────
const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');
/** Le code sans ses commentaires : une garde de source ne doit pas lire la prose. */
const sansCommentaires = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const page = lire('src/games/RpgDuelPage.jsx');
const ecran = lire('src/games/RpgSouk.jsx');
const ecranCode = sansCommentaires(ecran);
const css = lire('src/games/rpg-souk.css');
const cssMenu = lire('src/games/rpg-battle.css');

// 1. L'onglet du menu : le solde, la pastille, et le chemin vers l'écran.
assert.match(page, /import RpgSouk from '\.\/RpgSouk\.jsx';/, 'l’écran est importé par la page');
assert.match(page, /className=\{`rpg-mode-menu__souk\$\{screen === 'souk' \? ' is-active' : ''\}`\}/,
  'le sixième onglet du menu est le Souk');
assert.match(page, /onChangeScreen\('souk'\)/, 'et il mène à l’écran');
assert.match(page, /data-souk-bourse=\{credits\}/, 'le solde ◈ est sur l’onglet');
assert.match(page, /data-souk-a-reclamer=\{aReclamer\}/, 'la pastille aussi');
assert.match(page, /aReclamer > 0 && \(/, 'et elle ne s’affiche que s’il y a quelque chose à réclamer');
assert.match(page, /aria-label=\{`Le Souk — \$\{credits\} crédits/, 'l’onglet est décrit pour les lecteurs d’écran');
assert.match(page, /\{aReclamer\} à réclamer|, \$\{aReclamer\} à réclamer/, 'la pastille compte à voix haute');
assert.ok(
  cssMenu.includes('@media (prefers-reduced-motion: reduce) {\n  .rpg-mode-menu__bourse-pastille { animation: none; }\n}'),
  'l’animation de la pastille est coupée par prefers-reduced-motion',
);

// 2. L'écran est rendu par le menu, et il reçoit de quoi vivre.
assert.match(page, /\) : screen === 'souk' \? \(\s*<RpgSouk/, 'l’écran du Souk est une branche du menu');
for (const prop of ['quetes={quetesSouk}', 'credits={credits}', 'onReclamerQuete={onReclamerQuete}', 'onReclamerCachet={onReclamerCachet}']) {
  assert.ok(page.includes(prop), `la page passe ${prop} à l’écran`);
}
assert.match(page, /reclamerUneQuete, reclamerLeCachet,\n  \} = useSablierBourse\(\{/,
  'les gestes de réclamation viennent du hook de bourse, pas de l’écran');

// 3. L'écran reste présentationnel : aucun stockage, aucune règle de crédits.
for (const interdit of ['localStorage', 'sauverPortefeuille', 'chargerPortefeuille', 'useSablierBourse']) {
  assert.ok(!ecranCode.includes(interdit), `l’écran ne touche pas à ${interdit} : la persistance vit dans le hook`);
}
assert.match(ecran, /import '\.\/rpg-souk\.css';/, 'et il porte sa propre feuille de style');

// 4. Ce que l'écran doit montrer, et que le smoke lit dans le DOM.
for (const marque of [
  'data-souk-solde', 'data-souk-quetes', 'data-souk-quete=', 'data-souk-quete-etat',
  'data-souk-progres', 'data-souk-reclamer=', 'data-souk-reste', 'data-souk-attente',
  'data-souk-cachet', 'data-souk-cachet-reclamer', 'data-souk-rayons', 'data-souk-retour',
]) {
  assert.ok(ecran.includes(marque), `l’écran expose ${marque}`);
}
// Le bouton Réclamer est désactivé tant que l’objectif n’est pas atteint, et le
// dit : c’est la règle D7 du dossier, et elle se vérifie à l’œil.
assert.match(ecran, /disabled=\{!terminee\}/, 'le bouton Réclamer est désactivé avant l’objectif');
assert.match(ecran, /title=\{terminee \? .* : `Il reste \$\{reste\} à faire`\}/, 'et il écrit ce qu’il reste');
assert.match(ecran, /import \{ GAINS \} from '\.\/rpgCredits\.js';/, 'le montant du Cachet vient du barème, pas d’un chiffre écrit ici');

// 5. Tactile et mouvement : les règles reprises des autres écrans.
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'le mouvement se coupe');
assert.ok(css.includes('@media (max-width: 480px)'), 'le portrait étroit est prévu');
assert.match(css, /min-height: 44px/, 'les boutons font leur taille au doigt');

// 6. L'écran annonce les rayons au lieu de les simuler (lot 4).
assert.match(ecran, /data-souk-rayons="bientot"/, 'les rayons disent qu’ils viendront');

console.log('L’écran du Souk (lot 3) est branché : sixième onglet, solde et pastille sur');
console.log('l’onglet, trois quêtes réclamables, Cachet du cycle, et les rayons annoncés.');
