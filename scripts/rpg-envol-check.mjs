/**
 * Le vol des créatures avec Envol.
 * node scripts/rpg-envol-check.mjs
 *
 * Une créature qui possède Envol — imprimé sur sa carte ou donnée par une arme
 * — lévite au-dessus de la table : la carte monte et descend, avance et recule
 * d'un souffle, grossit d'un pour cent au sommet et s'incline d'un demi-degré,
 * tandis qu'un souffle de lumière traverse lentement la face. Le contrôle
 * tient que ce vol reste possible : il n'utilise que des propriétés
 * indépendantes de `transform` (donc l'inclinaison, le survol et les
 * cinématiques de combat survivent), il ne remue pas la rangée, il est
 * désynchronisé par entité, et il se tait en mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── 0. Le rendu réel ────────────────────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-envol-smoke.jsx', outDir: 'node_modules/.cache/rpg-envol', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartesEnvol } = await import('../node_modules/.cache/rpg-envol/rpg-envol-smoke.js');
const rendu = rendreCartesEnvol();

const carteDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-card') };
};

const phases = [];
for (const [nom, cas] of [['envol', rendu.envol], ['parArme', rendu.parArme]]) {
  const { dom, racine } = carteDom(cas.html);
  try {
    assert.ok(racine.classList.contains('is-envol'), `${nom} : la carte reçoit l’état visuel de l’Envol`);
    const calque = racine.querySelector('.rpg-card__envol');
    assert.ok(calque, `${nom} : le calque du souffle est rendu`);
    assert.equal(calque.getAttribute('aria-hidden'), 'true',
      `${nom} : le souffle est décoratif, rien à lire ni à sélectionner`);
    assert.ok(calque.querySelector('.rpg-card__envol-souffle'),
      `${nom} : le souffle lui-même est dans le calque`);
    const phase = calque.getAttribute('style') ?? '';
    assert.match(phase, /--rpg-envol-phase:-?\d+\.\d+s/, `${nom} : la phase est posée par carte`);
    phases.push(phase);
    // Le souffle passe sous les repères : il est monté avant le titre et les
    // statistiques (donc avant les icônes et les valeurs ATQ/DEF).
    const enfants = [...racine.children];
    assert.ok(enfants.indexOf(calque) < enfants.indexOf(racine.querySelector('.rpg-card__title')),
      `${nom} : le souffle se peint sous le titre de la carte`);
    assert.ok(enfants.indexOf(calque) < enfants.indexOf(racine.querySelector('.rpg-card__foot')),
      `${nom} : et sous les statistiques`);
  } finally {
    dom.window.close();
  }
}

const { dom: domNeutre, racine: carteNeutre } = carteDom(rendu.neutre.html);
try {
  assert.equal(carteNeutre.classList.contains('is-envol'), false,
    'une créature sans Envol ne reçoit pas l’état de vol');
  assert.equal(carteNeutre.querySelector('.rpg-card__envol'), null,
    'sans Envol, aucun calque de souffle');
} finally {
  domNeutre.window.close();
}

// Deux voisines ne lévitent pas à l'unisson.
const phaseDe = (html) => /--rpg-envol-phase:(-?\d+\.\d+)s/.exec(html)?.[1];
assert.notEqual(phaseDe(rendu.envol.html), phaseDe(rendu.envolVoisine.html),
  'deux créatures avec Envol ont des phases différentes : elles ne montent jamais ensemble');
assert.equal(phaseDe(rendu.envol.html), phaseDe(rendreCartesEnvol().envol.html),
  'la même entité garde toujours sa phase — pas de tirage au rendu');

// ── 1. Le source : trois propriétés composées, jamais la mise en page ───────
const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const duel = lire('RpgDuelPage.jsx');
const battleCss = lire('rpg-battle.css');

assert.match(duel, /const VOL_ENVOL = Object\.freeze\(\{\s*duree: 7200,/,
  'le vol dure 7,2 s : une lévitation, pas un tressautement');
const images = duel.slice(duel.indexOf('const VOL_ENVOL'), duel.indexOf('/** La phase du vol'));
for (const propriete of ['translate', 'rotate', 'scale']) {
  assert.match(images, new RegExp(`\\{ [^}]*${propriete}:`),
    `le vol anime \`${propriete}\``);
}
assert.doesNotMatch(images, /\b(left|top|width|height|margin|transform):/,
  'le vol ne touche ni la mise en page ni `transform` (l’inclinaison et le combat gardent la leur)');
assert.match(duel, /element\.animate\(\s*VOL_ENVOL\.images,/,
  'la carte joue le vol du catalogue');
assert.match(duel, /delay: -phaseVol\(entite\) \* VOL_ENVOL\.duree,/,
  'un départ négatif plonge chaque carte au milieu de son cycle');
assert.match(duel, /iterations: Infinity,/,
  'le vol ne s’arrête pas au bout d’un cycle');
assert.match(duel, /const phaseVol = \(entite\) => \(empreinteEntite\(entite\) % 1000\) \/ 1000;/,
  'la phase du vol vient de l’empreinte stable de l’entité');
assert.match(duel, /function empreinteEntite\(entite\)[\s\S]*?empreinte \* 31[\s\S]*?% 9973;/,
  'l’empreinte est calculée une fois, sans hasard au rendu');
assert.match(duel, /if \(!entite\.envol \|\| mouvementReduit \|\| typeof element\?\.animate !== 'function'\) return undefined;/,
  'sans Envol, en mouvement réduit ou sans Web Animations, le vol ne démarre pas');
assert.match(duel, /return \(\) => vol\.cancel\(\);/,
  'quitter la table (ou perdre l’Envol) arrête le vol proprement');
assert.doesNotMatch(duel, /\{ left: '-2px' \}, \{ left: '2px' \}/,
  'l’ancien va-et-vient sur `left` — une animation de mise en page — a disparu');

// ── 2. La feuille : hauteur au repos, souffle, silence en mouvement réduit ──
const debut = battleCss.indexOf('/* ── Envol : la créature lévite au-dessus de la table');
const fin = battleCss.indexOf("/* Sous la souris, l'illustration des créatures respire");
assert.ok(debut > 0, 'la feuille porte un bloc consacré à l’Envol');
assert.ok(fin > debut, 'le bloc de l’Envol précède les états de survol');
const envolCss = battleCss.slice(debut, fin);

assert.match(envolCss, /\.rpg-card\.is-envol\s*\{[^}]*z-index:\s*2;[^}]*translate:\s*0 -6px;[^}]*drop-shadow\(0 17px 11px rgba\(0, 0, 0, \.42\)\)/s,
  'au repos la carte est levée, son ombre s’éloigne et prend une lueur froide');
assert.match(envolCss, /\.rpg-card__envol\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*overflow:\s*hidden;[^}]*border-radius:\s*inherit;[^}]*pointer-events:\s*none;/s,
  'le souffle couvre la face, garde l’arrondi et ne capte aucun geste');
assert.doesNotMatch(envolCss, /\.rpg-card__envol\s*\{[^}]*\n\s*z-index:/s,
  'le calque ne crée pas de groupe isolé : le souffle peut se fondre dans l’art');
assert.match(envolCss, /\.rpg-card__envol-souffle\s*\{[^}]*mix-blend-mode:\s*screen;[^}]*animation:\s*rpg-envol-souffle 6\.5s ease-in-out var\(--rpg-envol-phase, 0s\) infinite;/s,
  'le souffle traverse la face sur son propre cycle, décalé par carte');
assert.match(envolCss, /@keyframes rpg-envol-souffle\s*\{[\s\S]*?translateX\(330%\)/,
  'le souffle glisse d’un bord à l’autre');
const imagesCles = envolCss.slice(envolCss.indexOf('@keyframes rpg-envol-souffle'));
assert.doesNotMatch(imagesCles.slice(0, imagesCles.indexOf('}')), /(top|left|width|height|filter|background):/,
  'le souffle n’anime que `transform` et `opacity`');
assert.equal((battleCss.match(/@keyframes rpg-envol-souffle/g) ?? []).length, 1,
  'la table ne déclare qu’un seul cycle de souffle');
assert.match(envolCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card__envol-souffle\s*\{\s*animation:\s*none;\s*display:\s*none;/,
  'en mouvement réduit, la carte reste levée mais immobile, sans souffle');
assert.doesNotMatch(envolCss, /@media[^{]*max-width/,
  'aucune requête de largeur : le vol vaut pour tous les écrans');

// ── 3. Le vol de la carte jouée : de la main jusqu'à sa destination ─────────
const volDebut = battleCss.indexOf("/* Le vol d'une carte jouée, en trois temps.");
const volFin = battleCss.indexOf('/* Sur téléphone, le tremblement de toute la table');
assert.ok(volDebut > 0, 'la feuille décrit le vol de la carte jouée');
assert.ok(volFin > volDebut, 'son bloc précède celui du tremblement de table');
const volCss = battleCss.slice(volDebut, volFin);
assert.match(volCss, /calc\(var\(--rpg-flight-dy\) \* \.46 - 34px\)/,
  'la trajectoire bombe vers le haut : la carte passe au-dessus de la table');
assert.match(volCss, /filter: brightness\(1\.14\) drop-shadow\(0 18px 16px rgba\(0, 0, 0, \.5\)\);/,
  'au sommet du vol, l’ombre s’éloigne : la carte est haute');
assert.match(volCss, /100%\s*\{[^}]*translate3d\(var\(--rpg-flight-dx\), var\(--rpg-flight-dy\), 0\)/s,
  'la pose se cale exactement sur la destination');
assert.match(battleCss, /\.rpg-card-flight\.is-flying\s*\{\s*animation:\s*rpg-card-flight-to-table \.68s/,
  'la durée du vol ne change pas : le moteur libère la carte sur ce métronome');

console.log('✓ Envol : la créature lévite — monte, dérive, grossit d’un pour cent et s’incline d’un demi-degré sur 7,2 s — sans toucher la mise en page ni `transform`, un souffle de lumière traverse sa face, chaque carte a sa phase, et tout se tait en mouvement réduit ; la carte jouée, elle, décolle de la main, bombe au-dessus de la table et se pose exactement sur son emplacement, en 0,68 s comme avant');
