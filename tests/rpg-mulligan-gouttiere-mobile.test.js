/** Mulligan du Duel sur mobile : les cinq cartes ne doivent plus se toucher.
 *
 *  Décision utilisateur : portée = **Duel classique seulement**, écart = « bien
 *  aéré » (~14–16 px). Le PC et le mulligan MOBA gardent leurs valeurs.
 *  La rangée ne défile jamais : agrandir la gouttière DOIT réduire la largeur
 *  des cartes du même montant, via le `4 * var(--rpg-mulligan-gap)` déjà présent
 *  dans le calcul de `grid-auto-columns`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');
const battle = lire('src/games/rpg-battle.css');
const mobile = lire('src/games/rpg-mobile.css');
const moba = lire('src/games/rpg-moba.css');
const demo = lire('scripts/rpg-mulligan-gouttiere.html');

const regle = (css, selecteur) => {
  const debut = css.indexOf(selecteur);
  assert.ok(debut >= 0, `${selecteur} existe`);
  return css.slice(debut, css.indexOf('}', debut) + 1);
};
const cardsRule = battle.slice(battle.indexOf('.rpg-mulligan__cards {'), battle.indexOf('.rpg-mulligan__card {'));

/** Les bornes de la gouttière au doigt, lues dans la feuille (pas recopiées). */
const bornes = /--rpg-mulligan-gap:\s*clamp\(([\d.]+)px,\s*([\d.]+)vw,\s*([\d.]+)px\)/.exec(mobile);
const [gapMin, gapVw, gapMax] = bornes.slice(1).map(Number);
const gouttiereMobile = (largeur) => Math.min(Math.max(largeur * gapVw / 100, gapMin), gapMax);
/** La gouttière de référence du PC : clamp(4px, 1vh, 11px). */
const gouttierePc = (hauteur) => Math.min(Math.max(hauteur / 100, 4), 11);

test('la gouttière de référence du PC reste inchangée', () => {
  assert.match(regle(battle, '.rpg-mulligan {'), /--rpg-mulligan-gap:\s*clamp\(4px, 1vh, 11px\);/);
  assert.doesNotMatch(battle, /\.rpg-battle--touch \.rpg-mulligan\s*\{[^}]*--rpg-mulligan-gap/s,
    'la surcharge vit dans la feuille tactile, pas dans la feuille commune');
});

test('au doigt, la gouttière du mulligan du Duel passe à 14–16 px', () => {
  assert.ok(bornes, 'la valeur est un clamp lisible');
  assert.ok(gapMin >= 14 && gapMax <= 16, `bornes 14–16 px (lu : ${gapMin}–${gapMax})`);
  assert.ok(gapVw > 0, 'la valeur suit la largeur entre les deux bornes');
  const surcharge = regle(mobile, '.rpg-battle--touch .rpg-mulligan {');
  assert.match(surcharge, /--rpg-mulligan-gap:\s*clamp\(14px, 1\.8vw, 16px\);/);
  // Un seul sélecteur de surcharge, scope strictement au mulligan du Duel.
  assert.equal((mobile.match(/\.rpg-battle--touch \.rpg-mulligan \{/g) ?? []).length, 1);
  assert.doesNotMatch(mobile, /\.moba__mulligan[^{]*--rpg-mulligan-gap/);
  for (const largeur of [568, 640, 844, 1024]) {
    const valeur = gouttiereMobile(largeur);
    assert.ok(valeur >= 14 && valeur <= 16, `${largeur} px : ${valeur} px`);
    assert.ok(valeur - gouttierePc(390) >= 9, `${largeur} px : écart nettement plus grand que les 4 px d’avant`);
  }
});

test('la cascade donne la grande gouttière au doigt, la petite au PC', () => {
  const css = `${regle(battle, '.rpg-mulligan {')}\n${regle(mobile, '.rpg-battle--touch .rpg-mulligan {')}`;
  const dom = new JSDOM(`<!doctype html><style>${css}</style>
    <div class="rpg-battle"><div class="rpg-mulligan" id="pc"></div></div>
    <div class="rpg-battle rpg-battle--touch"><div class="rpg-mulligan" id="touch"></div></div>`,
  { virtualConsole: new VirtualConsole() });
  try {
    const lireGap = (id) => dom.window.getComputedStyle(dom.window.document.getElementById(id))
      .getPropertyValue('--rpg-mulligan-gap').trim();
    // jsdom renormalise les espaces des propriétés personnalisées :
    // `clamp(4px,1vh,11px)`. Peu importe, la valeur et l'ordre comptent.
    assert.match(lireGap('pc'), /clamp\(4px,\s*1vh,\s*11px\)/);
    assert.match(lireGap('touch'), /clamp\(14px,\s*1\.8vw,\s*16px\)/,
      'la surcharge tactile gagne la cascade sur la valeur commune');
  } finally { dom.window.close(); }
});

test('les quatre gouttières sont soustraites de la largeur des cartes, même en repli WebView', () => {
  // Règle principale (requêtes de conteneur) ET règle de repli (100vw/100dvh) :
  // les deux doivent réserver les quatre écarts, sinon la rangée déborde quand
  // la gouttière grandit sur mobile.
  const colonnes = [...cardsRule.matchAll(/grid-auto-columns:\s*([^;]+);/g)].map((m) => m[1]);
  assert.equal(colonnes.length, 2, 'une règle de repli + une règle à conteneur');
  for (const colonne of colonnes) {
    assert.match(colonne, /4 \* var\(--rpg-mulligan-gap\)/, 'quatre gouttières réservées');
    assert.match(colonne, /\/ 5\)/, 'cinq cartes');
  }
  assert.match(cardsRule, /100cqw/);
  assert.match(cardsRule, /100cqh/);
  assert.match(cardsRule, /gap:\s*var\(--rpg-mulligan-gap\);/);
  assert.match(cardsRule, /grid-auto-flow:\s*column;/);
  assert.doesNotMatch(cardsRule, /overflow:\s*(auto|scroll)/, 'la rangée ne défile jamais');
  assert.doesNotMatch(cardsRule, /grid-template-columns/, 'pas de repli en deux colonnes');
});

test('les cinq cartes restent entières, touchables et à peine plus petites', () => {
  for (const [largeur, hauteur] of [[568, 320], [640, 360], [844, 390], [1024, 500]]) {
    // Largeur utile conservative de la scène : on retire le rembourrage du
    // volet, celui du panneau (6 px en paysage court) et la réserve des pierres.
    const margeVolet = Math.min(Math.max(hauteur * .014, 6), 18);
    const margePanneau = 6;
    const margeScene = Math.min(Math.max(largeur * .02, 12), 24);
    const stage = largeur - 2 * (margeVolet + margePanneau + margeScene);
    const avant = gouttierePc(hauteur);
    const apres = gouttiereMobile(largeur);
    const largeurAvant = (stage - 4 * avant) / 5;
    const largeurApres = (stage - 4 * apres) / 5;
    assert.ok(5 * largeurApres + 4 * apres <= stage + .001,
      `${largeur}×${hauteur} : la rangée tient dans la scène`);
    assert.ok(largeurApres >= 90, `${largeur}×${hauteur} : chaque carte reste ≥ 90 px (bien au-delà des 44 px tactiles)`);
    assert.ok(largeurAvant - largeurApres <= 12,
      `${largeur}×${hauteur} : l’aération coûte moins de 12 px par carte`);
    assert.ok(apres > avant + 8, `${largeur}×${hauteur} : l’écart est vraiment plus grand`);
  }
});

test('le mulligan MOBA et le reste du volet ne sont pas touchés', () => {
  assert.match(moba, /--moba-mulligan-gap:\s*clamp\(12px, 1\.2vw, 16px\)/);
  assert.doesNotMatch(moba, /--rpg-mulligan-gap/);
  assert.match(battle, /\.rpg-mulligan__stage\s*\{[^}]*container-type:\s*size;/s);
  assert.match(battle, /\.rpg-mulligan__card\s*\{[^}]*aspect-ratio:\s*4 \/ 5;/s);
  assert.match(battle, /\.rpg-mulligan__card\s*\{[^}]*overflow:\s*hidden;/s);
});

test('une démo avant/après montre les deux gouttières avec les vraies cartes', () => {
  assert.match(demo, /rpg-battle\.css/, 'la démo charge la feuille commune');
  assert.match(demo, /rpg-mobile\.css/, 'et la feuille tactile');
  assert.match(demo, /rpg-battle--touch/, 'le mode mobile est simulé');
  assert.match(demo, /--rpg-mulligan-gap:\s*4px/, 'la scène « avant » force les 4 px');
  assert.match(demo, /data-demo="apres"/, 'la scène « après » utilise la surcharge réelle');
  assert.match(demo, /cards\/tojiro-le-pourfendeur\.jpg/, 'illustrations du jeu, aucun asset nouveau');
  assert.equal((demo.match(/class="rpg-mulligan__card"/g) ?? []).length, 10,
    'cinq cartes dans chaque scène');
  // La démo ne triche pas : en injectant les deux vraies règles, la scène
  // « avant » garde ses 4 px (style en ligne) et la scène « après » reçoit bien
  // la surcharge tactile par la seule cascade.
  const sansLiens = demo.replace(/<link[^>]*>/g, '');
  const dom = new JSDOM(sansLiens, { virtualConsole: new VirtualConsole() });
  try {
    const feuille = dom.window.document.createElement('style');
    feuille.textContent = `${regle(battle, '.rpg-mulligan {')}\n${regle(mobile, '.rpg-battle--touch .rpg-mulligan {')}`;
    dom.window.document.head.appendChild(feuille);
    const gap = (selecteur) => dom.window.getComputedStyle(
      dom.window.document.querySelector(selecteur)).getPropertyValue('--rpg-mulligan-gap').trim();
    assert.equal(gap('[data-demo="avant"]'), '4px');
    assert.match(gap('[data-demo="apres"]'), /clamp\(14px,\s*1\.8vw,\s*16px\)/);
  } finally { dom.window.close(); }
});
