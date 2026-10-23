/**
 * Le Souk branché sur le duel — vérification de source.
 *
 * Ce que ce script tient : que le lot 2 du dossier 13 soit **branché** dans
 * `RpgDuelPage.jsx`, et que ses gardes ne se perdent pas au prochain passage.
 * Il lit le code, il ne l'exécute pas : les règles, elles, sont dans
 * `tests/rpg-evenements.test.js` (`npm run check:rpg-evenements`), et l'écran
 * complet du Souk aura son propre smoke au lot 3.
 *
 * Trois familles de vérifications :
 *
 *   1. **Le contrat d'événements** — chaque type est émis au point qui le
 *      concerne, et les événements de carte passent bien par `cardId` (c'est le
 *      module qui lit le catalogue, pas l'écran) ;
 *   2. **Les gardes d'unicité** — un duel gagné ne paie qu'une fois par session,
 *      et les dégâts se comptent sur les PV du sorcier, pas au point d'appel ;
 *   3. **Le jeton de bourse** — le solde et la pastille sont rendus, et le
 *      hook est appelé après `useRpgStory` (ses quêtes lisent la progression).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── Le smoke : la boucle montée pour de vrai ────────────────────────────────
// Une sonde qui utilise le hook tel quel, dans jsdom. Aucune minuterie, aucune
// animation : ce smoke ne peut pas dépendre du rythme de la machine.
const environnementPrecedent = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-souk-bourse-smoke.jsx', outDir: 'node_modules/.cache/rpg-souk-bourse', emptyOutDir: true },
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

const { checkRpgSouk } = await import('../node_modules/.cache/rpg-souk-bourse/rpg-souk-bourse-smoke.js');
try {
  await checkRpgSouk(assert);
} finally {
  dom.window.close();
}

// ── Les gardes de source ────────────────────────────────────────────────────
const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');

const page = lire('src/games/RpgDuelPage.jsx');
const hook = lire('src/games/useSablierBourse.js');
const evenements = lire('src/games/rpgEvenementsDuel.js');
const css = lire('src/games/rpg-battle.css');

// ── 1. Le contrat d'événements, émis au bon endroit ─────────────────────────
const emissions = {
  'duel-gagne': /noterEvenementDuel\(\{ type: 'duel-gagne', mode: 'histoire'/,
  'etage-deblaye': /noterEvenementDuel\(\{ type: 'etage-deblaye'/,
  // Les terrains ne se posent plus : « terrain-pose » a quitté le contrat et
  // `normaliserEvenementDuel` le refuse — le reste des gestes tient toujours.
  'creature-invoquee': /noterEvenementDuel\(\{ type: 'creature-invoquee', cardId: carteId \}\)/,
  'magie-lancee': /noterEvenementDuel\(\{ type: 'magie-lancee', cardId: carteId \}\)/,
  'arme-jouee': /noterEvenementDuel\(\{ type: 'arme-jouee', cardId: carteId \}\)/,
  'carte-jouee': /noterEvenementDuel\(\{ type: 'carte-jouee', cardId/,
  'degats-infliges': /noterEvenementDuel\(\{ type: 'degats-infliges', montant \}\)/,
};
for (const [type, motif] of Object.entries(emissions)) {
  assert.match(page, motif, `« ${type} » est émis au point qui le concerne`);
}
assert.equal((page.match(/type: 'carte-jouee'/g) ?? []).length, 4,
  '« carte-jouee » accompagne les quatre gestes de carte, et rien d’autre');

// Le contrat du module couvre exactement ces types (plus celui du lot 4).
for (const type of Object.keys(emissions)) {
  assert.match(evenements, new RegExp(`'${type}',`), `« ${type} » est au contrat du module`);
}
assert.match(evenements, /'booster-ouvert',/, '« booster-ouvert » est au contrat, réservé au lot 4');

// ── 2. Les gardes d'unicité ─────────────────────────────────────────────────
assert.match(page, /const libreVictoireMarqueeRef = useRef\(null\)/,
  'un duel libre a son propre témoin de victoire');
assert.match(page, /libreVictoireMarqueeRef\.current === session[\s\S]{0,120}?libreVictoireMarqueeRef\.current = session/,
  'un duel libre gagné ne paie qu’une fois par session');
assert.match(page, /if \(histoireVictoireMarqueeRef\.current === session\) return;/,
  'un étage gagné ne paie qu’une fois par session');
assert.match(page, /const premiere = !etageEstVaincu\(progressionHistoireRef\.current, histoireEtageId\);\s*\n\s*const tourId/,
  'le premier déblayage est lu AVANT d’enregistrer la victoire');
assert.match(page, /if \(premiere\) noterEvenementDuel\(\{ type: 'etage-deblaye'/,
  '« etage-deblaye » ne tombe que sur un premier déblayage');
assert.match(page, /duelCourant\.sorcier\.degatsRecus \?\? 0/,
  'les dégâts se comptent sur le cumul des dégâts reçus, donc sur toutes leurs sources');
assert.match(page, /degatsSorcierRef = useRef\(\{ duel: null, annonces: 0 \}\)/,
  'le compteur de dégâts repart à chaque duel');
assert.match(evenements, /export const EVENEMENTS_PAYANTS = Object\.freeze\(\['duel-gagne'\]\)/,
  'un seul événement paie des crédits');

// ── 3. Le jeton de bourse ───────────────────────────────────────────────────
// Depuis le lot 3, le jeton vit **sur l'onglet du Souk** plutôt que dans une
// pastille à part : même chiffre, même rôle, un seul endroit à lire.
assert.match(page, /data-souk-bourse=\{credits\}/, 'le solde de crédits est rendu dans le menu');
assert.match(page, /data-souk-a-reclamer=\{aReclamer\}/, 'ce qui attend d’être réclamé est rendu');
assert.match(page, /aReclamer > 0 && \(/, 'la pastille ne s’affiche que s’il y a quelque chose à réclamer');
assert.match(page, /aria-label=\{`Le Souk — \$\{credits\} crédits/, 'l’onglet est décrit pour les lecteurs d’écran');
assert.ok(
  css.includes('@media (prefers-reduced-motion: reduce) {\n  .rpg-mode-menu__bourse-pastille { animation: none; }\n}'),
  'l’animation de la pastille est coupée par prefers-reduced-motion',
);

// Le hook est branché APRÈS le récit : ses quêtes du jour lisent la progression.
const positionRecit = page.indexOf('} = useRpgStory();');
const positionBourse = page.indexOf('} = useSablierBourse({');
assert.ok(positionRecit > 0 && positionBourse > positionRecit,
  'la bourse est branchée après useRpgStory (ses quêtes lisent la progression)');
assert.match(page, /progression: progressionHistoireRef\.current/, 'et elle reçoit bien cette progression');

// ── 4. La bourse tient ses promesses de la maison ──────────────────────────
assert.match(hook, /export function useSablierBourse/, 'le hook est exporté');
assert.match(hook, /ouvrirJournee\(\{ etat: etatRef\.current\.quetes/, 'le jour est réouvert au réveil de l’onglet');
assert.match(hook, /fusionnerPortefeuilles\(chargerPortefeuille\(\), fusion\.etat\.bourse\)\.portefeuille/,
  'la bourse se fusionne avec le compte, en relisant le stockage de l’appareil');
assert.match(hook, /fusionnerQuetes\(chargerEtatQuetes\(\), fusion\.etat\.quetes\)\.etat/,
  'les quêtes aussi, du même geste');
assert.match(hook, /fusionnerEtatsSablier\(\{ local: etatLocalComplet\(\) \}\)/, 'l’état poussé au compte est entier');
assert.match(hook, /if \(suite\.bourse !== avant\.bourse \|\| suite\.quetes !== avant\.quetes\)/,
  'un geste sans effet ne recopie pas l’état (stabilité référentielle)');
assert.match(lire('src/games/useDecksSablier.js'), /bourse: chargerPortefeuille\(\),/,
  'l’autre hook transporte l’économie sans la modifier');
assert.match(lire('src/games/rpgDeckBuilder.js'), /const bourse = fusionnerPortefeuilles\(local\?\.bourse, distant\?\.bourse\)\.portefeuille/,
  'la fusion de compte range la bourse par sa propre règle');

console.log('Le Souk (lot 2) est branché : 9 événements au contrat, 1 seul payant,');
console.log('le solde et la pastille rendus, et l’économie qui voyage avec le compte.');
