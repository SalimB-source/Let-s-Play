/**
 * L'animation de l'Honneur : la petite boule de feu.
 * node scripts/rpg-honneur-check.mjs
 *
 * Une créature qui meurt en emportant une cible laisse une braise filer de son
 * image d'adieu vers la créature frappée. Le contrôle tient le trajet de bout
 * en bout : le moteur note le jet (unités vérifiées dans
 * `tests/rpg-honneur-jet.test.js`), la page le relève et mesure les deux
 * cartes, le composant rendu calcule l'angle et la distance, et la feuille les
 * anime — sans mouvement quand le joueur le demande.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── 0. Le composant, rendu pour de vrai ─────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-honneur-smoke.jsx', outDir: 'node_modules/.cache/rpg-honneur', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreJets } = await import('../node_modules/.cache/rpg-honneur/rpg-honneur-smoke.js');
const rendu = rendreJets();
assert.ok(rendu.duree >= 900 && rendu.duree <= 1200,
  'le vol et son nettoyage tiennent dans une seconde : la table ne reste pas occupée');

const lireJet = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const racine = dom.window.document.querySelector('.rpg-honneur-jet');
  assert.ok(racine, 'la boule de feu est rendue');
  const style = racine.getAttribute('style') ?? '';
  const valeur = (nom) => Number(new RegExp(`--${nom}:(-?[\\d.]+)`).exec(style)?.[1]);
  return {
    dom,
    racine,
    style,
    angle: valeur('rpg-jet-angle'),
    distance: valeur('rpg-jet-distance'),
    dx: valeur('rpg-jet-dx'),
    dy: valeur('rpg-jet-dy'),
  };
};

const bas = lireJet(rendu.versLeBas);
try {
  const { racine } = bas;
  assert.equal(racine.getAttribute('aria-hidden'), 'true', 'la braise est décorative');
  assert.equal(racine.dataset.honneurSource, 'mort-1', 'la source est portée par le calque');
  assert.equal(racine.dataset.honneurCible, 'vivant-9', 'la cible aussi');
  assert.equal(racine.dataset.honneurMontant, '2', 'les dégâts sont connus de la table');
  assert.ok(racine.querySelector('.rpg-honneur-jet__vol'), 'le conteneur de vol existe');
  assert.ok(racine.querySelector('.rpg-honneur-jet__orbe'), 'l’orbe existe');
  assert.ok(racine.querySelector('.rpg-honneur-jet__sillage'), 'le sillage existe');
  assert.ok(racine.querySelector('.rpg-honneur-jet__impact'), 'l’éclat d’arrivée existe');
  // La carte morte est en haut à droite de sa cible : la braise descend et
  // part vers la gauche — un angle obtus, une distance de l'ordre de la table.
  assert.ok(bas.dx < 0 && bas.dy > 0, 'le vecteur pointe de la morte vers la frappée');
  assert.ok(bas.angle > 90 && bas.angle < 180, `angle attendu vers le bas-gauche, reçu ${bas.angle}`);
  assert.ok(bas.distance > 300, 'la distance est celle des deux centres');
  assert.match(bas.style, /left:\s*475px/, 'le calque est ancré au centre de la carte morte');
  assert.match(bas.style, /top:\s*154px/, 'sur les deux axes');
} finally {
  bas.dom.window.close();
}

const haut = lireJet(rendu.versLeHaut);
try {
  assert.ok(haut.dx > 0 && haut.dy < 0, 'l’autre trajet monte vers la droite');
  assert.ok(haut.angle < 0 && haut.angle > -90, `angle attendu vers le haut-droite, reçu ${haut.angle}`);
} finally {
  haut.dom.window.close();
}

// ── 0 bis. Le calcul du trajet, dans les quatre directions ─────────────────
const { trajets } = rendu;
const proche = (a, b) => Math.abs(a - b) < 0.01;
assert.ok(proche(trajets.basGauche.distance, Math.hypot(220, 360)),
  'la distance est celle des deux centres, pas des bords');
assert.ok(proche(trajets.memeColonne.angle, 90), 'à la verticale, la braise tombe droit');
assert.ok(proche(trajets.memeLigne.angle, 0), 'à l’horizontale, elle file droit');
assert.ok(proche(trajets.hautDroite.angle, Math.atan2(-340, 320) * 180 / Math.PI),
  'vers le haut, l’angle est négatif côté écran');
assert.ok(proche(trajets.basGauche.depart.x, 475) && proche(trajets.basGauche.depart.y, 154),
  'le départ est le centre de la carte morte');

// ── 1. Le moteur note le trajet, la page le relève ─────────────────────────
const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const duelEngine = lire('rpgDuel.js');
const page = lire('RpgDuelPage.jsx');
const battleCss = lire('rpg-battle.css');

assert.match(duelEngine, /export function rpgConsommerJetsHonneur\(duel\)/,
  'le moteur expose le journal des jets d’Honneur');
assert.match(duelEngine, /journaliserJetHonneur\(duel, cote, entite, cible, honneur\);\s*rpgBlesserCreature\(duel, adversaire, cible\.id, honneur/,
  'le jet est noté AVANT la blessure : une cible qui meurt à son tour garde son trajet');
assert.match(page, /const jets = rpgConsommerJetsHonneur\(duelCourant\);/,
  'la page relève le journal après le rendu');
assert.match(page, /if \(jetsDuelRef\.current !== duelCourant \|\| ecran !== 'partie'\) \{/,
  'un duel neuf ou quitté vide le journal sans rien rejouer');
assert.match(page, /jouerSfx\('honneur_jet'\);/,
  'un seul bruitage par lot de jets');
assert.match(page, /querySelectorAll\('\.rpg-card\[data-entity-id\], \.rpg-card-destruction-fx\[data-rpg-destroyed-id\]'\)/,
  'la page mesure les cartes vivantes ET l’image d’adieu de la morte');
assert.match(page, /const de = rectsEntitesRef\.current\.get\(jet\.entityId\);/,
  'le départ vient de la position connue de la créature qui meurt');
assert.match(page, /\{jetsHonneur\.map\(\(jet\) => <JetHonneur key=\{jet\.id\} jet=\{jet\} \/>\)\}/,
  'les braises sont rendues sur la table');
assert.match(page, /effacerJetsHonneur\(\);/,
  'une partie neuve éteint les braises en cours');

// ── 2. Le bruitage dédié ───────────────────────────────────────────────────
const audio = lire('rpgAudio.js');
assert.match(audio, /'honneur_jet',/,
  'le catalogue déclare le bruitage de l’Honneur');
assert.match(audio, /case 'honneur_jet':[\s\S]*?slideTo: 'A4'/,
  'la braise s’élance d’un souffle qui monte');

// ── 3. La feuille : le vol, l’arrivée, le repos ────────────────────────────
const debut = battleCss.indexOf('/* ── Honneur : la petite boule de feu');
const fin = battleCss.indexOf('/* La véritable carte en main quitte sa rangée');
assert.ok(debut > 0, 'la feuille porte un bloc consacré à l’Honneur');
assert.ok(fin > debut, 'le bloc de l’Honneur précède celui du vol de carte');
const honneurCss = battleCss.slice(debut, fin);

assert.match(honneurCss, /\.rpg-honneur-jet\s*\{[^}]*position:\s*fixed;[^}]*width:\s*0;[^}]*height:\s*0;[^}]*pointer-events:\s*none;/s,
  'le calque est un point d’ancrage fixe qui ne capte aucun geste');
assert.match(honneurCss, /\.rpg-honneur-jet__vol\s*\{[^}]*animation:\s*rpg-honneur-vol 720ms/s,
  'le vol dure 720 ms');
assert.match(honneurCss, /\.rpg-honneur-jet__impact\s*\{[^}]*animation:\s*rpg-honneur-impact 320ms ease-out 620ms both;/s,
  'l’éclat s’allume à l’arrivée, quand la braise touche sa cible');
assert.match(honneurCss, /@keyframes rpg-honneur-vol\s*\{[\s\S]*?translateX\(calc\(var\(--rpg-jet-distance, 0px\) \* \.55\)\)[\s\S]*?translateY\(-9px\)[\s\S]*?translateX\(var\(--rpg-jet-distance, 0px\)\)/,
  'la braise avance sur l’axe des deux cartes, en bombant à mi-course');
assert.doesNotMatch(honneurCss.slice(honneurCss.indexOf('@keyframes rpg-honneur-vol'), honneurCss.indexOf('@keyframes rpg-honneur-impact')),
  /(top|left|width|height|filter|background):/,
  'le vol n’anime que `transform` et `opacity`');
assert.match(honneurCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-honneur-jet__vol\s*\{\s*animation:\s*none;\s*opacity:\s*0;/,
  'en mouvement réduit, la braise ne traverse pas la table');
assert.match(honneurCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.rpg-honneur-jet__impact\s*\{\s*animation:\s*rpg-honneur-impact-fixe/,
  'seul l’éclat d’arrivée reste, immobile');
assert.equal((battleCss.match(/@keyframes rpg-honneur-vol/g) ?? []).length, 1,
  'la table ne déclare qu’un seul vol d’Honneur');

console.log('✓ Honneur : une boule de feu quitte la carte de la créature qui meurt, file sur l’axe des deux cartes en bombant, sillage derrière elle, et s’allume sur la cible à l’arrivée — notée par le moteur avant la blessure, relevée après le rendu, sonore une fois par lot, et immobile en mouvement réduit');
