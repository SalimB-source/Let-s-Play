import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-mana-essai-smoke.jsx', outDir: 'node_modules/.cache/rpg-mana-essai', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Aucun périphérique audio réel dans le banc d'essai jsdom.
for (const methode of ['play', 'pause', 'load']) {
  dom.window.HTMLMediaElement.prototype[methode] = () => (methode === 'play' ? Promise.resolve() : undefined);
}
try {
  const { checkManaEssaiUi } = await import('../node_modules/.cache/rpg-mana-essai/rpg-mana-essai-smoke.js');
  await checkManaEssaiUi(assert);
} finally {
  dom.window.close();
}

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');
assert.match(styles, /grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\)/,
  'la jauge reste une rangée de dix boules sur tous les écrans');
const supportOrbes = styles.match(/\.rpg-battle\[data-mode-mana="essai"\] \.card-table > \.rpg-flux-track\s*\{[^}]*\}/)?.[0] ?? '';
assert.match(supportOrbes, /border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/,
  'le grand fond rectangulaire disparaît, seul le rail des orbes reste');
const barreMana = styles.match(/\.rpg-flux-track__bar\s*\{[^}]*\}/)?.[0] ?? '';
const compteurMana = styles.match(/\.rpg-flux-track__reserve\s*\{[^}]*\}/)?.[0] ?? '';
assert.match(barreMana, /background:\s*rgba\(0, 0, 0, \.92\);/, 'la barre a un fond noir');
assert.match(compteurMana, /background:\s*#080a0b;/, 'le compteur suit la barre noire');
assert.doesNotMatch(page, /className="rpg-flux-track__title"/,
  'ni « Votre mana » ni « acquis » ne sont imprimés au-dessus de la jauge');
const fenetreChoix = styles.match(/\.rpg-flux-choix__panel\s*\{[^}]*\}/)?.[0] ?? '';
assert.match(fenetreChoix, /overflow-y:\s*auto;[\s\S]*?padding:\s*32px;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/,
  'le panneau transparent garde de la place pour la rotation, sans scrollbar au survol');
const voileChoix = styles.match(/\.rpg-flux-choix\s*\{[^}]*\}/)?.[0] ?? '';
assert.match(voileChoix, /inset:\s*0;[\s\S]*?background:\s*rgba\(0, 0, 0, \.5\);/,
  'un voile noir translucide couvre le plateau pendant le choix');
const fondChoix = styles.match(/\.rpg-flux-choix__option\s*\{[^}]*\}/)?.[0] ?? '';
assert.match(fondChoix, /flex:\s*0 0 clamp\(90px, 13vw, 138px\);[\s\S]*?aspect-ratio:\s*1;[\s\S]*?place-items:\s*center;[\s\S]*?border-radius:\s*50%;/,
  'les choix sont des ronds compacts aux icônes centrées');
assert.match(styles, /\.rpg-flux-choix__option \.rpg-emblem\s*\{[^}]*width:\s*clamp\(44px, 6vw, 64px\);[^}]*height:\s*clamp\(44px, 6vw, 64px\);/,
  'réduire les ronds ne réduit pas les emblèmes');
assert.doesNotMatch(styles, /\.rpg-flux-choix__option::before\s*\{/, 'pas de seconde bordure dans les ronds');
assert.match(styles, /\.rpg-flux-choix__option:hover\s*\{\s*outline:\s*none;/,
  'le survol n’ajoute pas de deuxième contour');
assert.match(fondChoix, /border:\s*2px solid color-mix\(in srgb, var\(--mana-color\) 65%, transparent\);/,
  'le contour un peu plus épais reprend la couleur du mana');
assert.match(styles, /\.rpg-flux-choix__option:focus-visible\s*\{[^}]*border-color:\s*var\(--mana-color\);/,
  'le contour se renforce dans sa couleur au survol');
assert.match(styles, /\.rpg-flux-choix__option:focus-visible:not\(:hover\)\s*\{\s*outline:\s*2px solid var\(--mana-color\);/,
  'le focus clavier reste visible dans la couleur du mana');
assert.match(fondChoix, /background:\s*rgba\(0, 0, 0, \.68\);/, 'chaque rond a un fond noir translucide');
assert.match(fondChoix, /transition:\s*transform \.3s ease-in-out;/, 'le pivot se fait progressivement et revient au repos');
assert.match(styles, /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\)\s*\{\s*\.rpg-flux-choix__option:hover\s*\{\s*transform:\s*rotate\(30deg\);/,
  'une souris fait pivoter le choix de 30 degrés dans le sens horaire');
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-flux-choix__option\s*\{\s*transition:\s*none;/,
  'la préférence de mouvement réduit désactive la transition');
assert.match(styles, /\.rpg-flux-choix__option:focus-visible\s*\{[^}]*background:\s*rgba\(0, 0, 0, \.82\);/,
  'le fond reste noir au survol');
assert.doesNotMatch(styles, /--choix-(?:fond|survol):/, 'aucune couleur ne recolore le fond des choix');
assert.doesNotMatch(page, /rpg-flux-choix__retour|<small>\+1 ·/, 'le choix se limite aux couleurs');
for (const couleur of ['sable', 'neige', 'eau', 'braise']) {
  const optionCouleur = styles.match(new RegExp(`\\.rpg-flux-choix__option--${couleur}\\s*\\{[^}]*\\}`))?.[0] ?? '';
  assert.match(optionCouleur, /--mana-color:\s*#[0-9a-f]+;/,
    `l’icône ${couleur} garde sa couleur`);
  assert.ok(styles.includes(`.rpg-flux-track__slot--${couleur} { --mana-color:`),
    `la boule ${couleur} a sa propre teinte`);
}
assert.match(styles, /\.rpg-flux-track__slot\s*\{[^}]*border-radius:\s*2px;/s,
  'les emplacements des icônes ne sont plus des boules');
assert.match(styles, /\.rpg-flux-track__slot\.is-lit\s*\{[^}]*drop-shadow\(0 0 3px var\(--mana-halo\)\)/s,
  'les icônes acquises gardent leur halo élémentaire');
assert.doesNotMatch(styles, /#fff8df/, 'aucun halo blanc sur les icônes, même en fin d’animation');
assert.match(styles, /\.rpg-flux-track__slot\.is-spent\s*\{[^}]*grayscale/s,
  'les icônes dépensées restent visibles mais assombries');
assert.match(styles, /\.rpg-battle\[data-mode-mana="essai"\]:not\(\.rpg-battle--touch\) \.card-table > \.rpg-flux-track--joueur\s*\{\s*top:\s*calc\(67% \+ 64px\);[^}]*left:\s*14px;/s,
  'sur ordinateur, le mana du joueur suit sa plaque comme celui du sorcier');
assert.match(styles, /\.rpg-battle\[data-mode-mana="essai"\]\.rpg-battle--touch \.card-table > \.rpg-flux-track--joueur\s*\{\s*grid-area:\s*player;[^}]*align-self:\s*end;/s,
  'au doigt, le mana reste sous le nom du joueur dans sa colonne');
assert.match(page, /const noterEvenementDuel = \(evenement\) => \{\s*if \(duelRef\.current\?\.modeMana === RPG_MODE_MANA_ESSAI\) return;/,
  'toutes les actions du duel d’essai restent sans événement économique');
assert.match(page, /onClick=\{\(\) => nouvellePartie\(duel\.modeMana === RPG_MODE_MANA_ESSAI \? \{ etageId: null, essaiManaId: duel\.essaiDeckId \} : \{\}\)\}/,
  'rejouer une victoire relance bien le mode essai et pas le duel historique');
// Cinq emplacements de créatures dessinés de chaque côté du plateau.
assert.match(styles, /\.rpg-creature-slots\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/s,
  'les emplacements de créatures forment une rangée de cinq cases');
assert.match(styles, /\.rpg-creature-slot\s*\{[^}]*border:\s*2px dashed/s,
  'les emplacements libres sont dessinés en pointillés');
assert.match(styles, /\.rpg-creature-slot\.is-occupied\s*\{[^}]*border-style:\s*solid;/s,
  'les emplacements occupés se ferment en trait plein');
assert.match(page, /<CreatureSlots camp=\{duel\.sorcier\} cote="ennemi" \/>/,
  'le camp du sorcier dessine ses cinq emplacements');
assert.match(page, /<CreatureSlots camp=\{duel\.joueur\} cote="joueur" \/>/,
  'le camp du joueur dessine ses cinq emplacements');
// Plateau plein : fenêtre du sacrifice (Sacrifier / Annuler), puis déchirement.
assert.match(page, /Sacrifier une créature \?/, 'la sixième créature ouvre la fenêtre du sacrifice');
assert.match(page, /rpg-sacrifice-choix__sacrifier/, 'le choix « Sacrifier » est proposé');
assert.match(page, /rpg-sacrifice-choix__annuler/, 'le choix « Annuler » est proposé');
assert.match(page, /sacrificeEntiteId/, 'la pose transmet la créature sacrifiée au moteur');
assert.match(styles, /\.rpg-card-tear-fx__half--gauche\s*\{[^}]*clip-path:\s*polygon/s,
  'la moitié gauche de la carte sacrifiée est rognée en dents de scie');
assert.match(styles, /@keyframes rpg-tear-left\s*\{/, 'la moitié gauche s’écarte en pivotant');
assert.match(styles, /@keyframes rpg-tear-right\s*\{/, 'la moitié droite s’écarte en pivotant');
assert.match(styles, /\.rpg-card\.is-sacrifice-target\s*\{[^}]*animation:\s*rpg-sacrifice-pulse/s,
  'les créatures sacrificiables pulsent sur la table');
// Main de départ de trois cartes et défausse de fin de tour au-delà de cinq.
assert.match(page, /rpgPreparerDefausseFinDeTour\(duel, 'joueur'\)/,
  'la fin du tour ouvre la défausse obligatoire au-delà de cinq cartes');
console.log('Banc d’essai mana : interface, séquence du mulligan et isolation économique vérifiées.');
