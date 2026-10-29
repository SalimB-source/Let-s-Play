import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Plein écran du Sablier : la page réelle montée dans jsdom (menu, mode
// Histoire, duel) avec une Fullscreen API de remplacement, plus la lecture des
// sources pour les règles qui ne se jouent pas dans un rendu.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/rpg-fullscreen', emptyOutDir: true },
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

const { checkRpgFullscreen } = await import('../node_modules/.cache/rpg-fullscreen/rpg-fullscreen-smoke.js');
try {
  await checkRpgFullscreen(assert);
} finally {
  dom.window.close();
}

// ── Au doigt, le plein écran est obligatoire ; à la souris, il reste un choix ─
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
// Le verrou suit la coque tactile : la même condition que `rpg-battle--touch`.
assert.match(page, /const pleinEcranVerrouille = viewport\.mobile;/,
  'le plein écran obligatoire suit exactement la condition du duel tactile (téléphone, tablette, APK)');
// La couche immersive est posée d’elle-même, mais seulement sous ce verrou.
assert.match(page, /if \(!pleinEcranVerrouille\) return undefined;\s*\n\s*\/\/ 1\. La couche immersive[\s\S]*?entrerPleinEcran\(\{ pinned: true, native: false \}\);/,
  'au doigt seulement, la couche immersive est posée au montage — sans geste, et sans demande native');
// Le natif, lui, part dans un geste : le navigateur l’exige.
assert.match(page, /const demanderNatif = \(\) => \{ entrerPleinEcran\(\{ pinned: true \}\); \};\s*\n\s*window\.addEventListener\('pointerdown', demanderNatif, true\);/,
  'le plein écran natif part au premier appui, et repart s’il a été refermé');
// Une sortie imposée par le navigateur est rattrapée côté hook.
assert.match(page, /onNativeExit: \(\) => \{\s*\n\s*if \(mobileRef\.current\) rentrerPleinEcranRef\.current\?\.\(\);/,
  'une sortie imposée par le navigateur (geste « retour ») repose la couche immersive au doigt');
// Aucune sortie : ni bouton au menu, ni bouton dans la barre du duel, ni touche F.
assert.match(page, /onToggleFullscreen=\{pleinEcranVerrouille \? null : basculerPleinEcran\}/,
  'au doigt, le menu ne reçoit aucune bascule : son bouton plein écran n’existe pas');
assert.match(page, /\{onToggleFullscreen && \(\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*className=\{`rpg-mode-menu__fullscreen/,
  'le bouton du menu n’est monté que si une bascule existe');
assert.match(page, /\{!pleinEcranVerrouille && \(\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*className=\{`rpg-duel-nav__fullscreen/,
  'celui de la barre du duel non plus');
assert.match(page, /if \(pleinEcranVerrouille\) return undefined;\s*\n\s*const surTouche = \(event\) => \{/,
  'au doigt, la touche F ne referme plus le plein écran');
// À la souris, rien ne change : la touche F, la bascule et le lancement.
assert.match(page, /const demanderPleinEcranEtPaysage = \(\) => \{\s*\n\s*const veutPaysage = Boolean\(window\.LetsPlayAndroid\)\s*\n\s*\|\| Boolean\(window\.matchMedia\?\.\('\(pointer: coarse\)'\)\.matches\);\s*\n\s*if \(veutPaysage\) entrerPleinEcran\(\);\s*\n\s*landscapeRef\.current\?\.enter\(\{ fullscreen: false \}\);/,
  'au doigt, lancer une partie demande le plein écran natif dans le geste puis verrouille le paysage ; sur ordinateur, rien');
console.log('check:rpg-fullscreen ✓ — le Sablier s’ouvre dans la page à la souris (plein écran à la demande, touche F) ; au doigt, il est plein écran du premier au dernier écran, sans aucune sortie.');
process.exit(0);
