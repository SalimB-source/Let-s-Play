/**
 * Le Bouclier se voit, veille, puis encaisse.
 * node scripts/rpg-bouclier-check.mjs
 *
 * La Lance de givre donne désormais +1/+1, Envol et un bouclier de 1. Ce
 * point de bouclier vit sur l'arme tant qu'il n'est pas absorbé : il encaisse
 * en premier et son reliquat repart avec la Lance si elle est remplacée,
 * sans jamais voler un bouclier venu d'ailleurs.
 *
 * Sur la table, une égide animée cerne toute créature protégée — glacée pour
 * un bouclier ordinaire, dorée pour un bouclier de lumière. Quand un coup
 * est absorbé, un impact séparé rejoue le choc : l'écu se cabre, et il se
 * fissure en perdant ses éclats si le bouclier tombe à zéro. Entièrement
 * absorbé, le coup ne déclenche plus le clignotement de blessure ; en
 * mouvement réduit, l'égide reste lisible mais immobile et l'impact se tait.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { armeById } from '../src/games/rpgCards.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const moteur = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. La nouvelle Lance de givre, telle qu'imprimée ────────────────────────
const lance = armeById('lance-de-givre');
assert.ok(lance, 'la Lance de givre est bien au catalogue des armes');
assert.deepEqual(lance.bonus, { atk: 1, def: 1 }, 'elle donne exactement +1/+1');
assert.equal(lance.donne?.envol, true, 'elle donne Envol');
assert.equal(lance.donne?.bouclier, 1, 'et un bouclier de 1');
assert.match(lance.text, /\+1\/\+1, Envol et un bouclier de 1/,
  'son texte annonce les trois dons, sans retour au +3/+1');
assert.doesNotMatch(lance.text, /\+3\/\+1/, 'l’ancienne Lance a bien disparu');

// ── 2. Les états visuels, rendus pour de vrai ───────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-bouclier-smoke.jsx', outDir: 'node_modules/.cache/rpg-bouclier', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartesBouclier } = await import('../node_modules/.cache/rpg-bouclier/rpg-bouclier-smoke.js');
const rendu = rendreCartesBouclier();
const carteDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-card') };
};

{
  const { dom, racine } = carteDom(rendu.neutre);
  try {
    assert.ok(racine, 'la créature sans bouclier se rend sur la table');
    assert.equal(racine.classList.contains('has-bouclier'), false, 'sans bouclier, pas d’état protégé');
    assert.equal(racine.querySelector('.rpg-bouclier-egide'), null, 'aucune égide ne veille');
    assert.equal(racine.querySelector('.rpg-bouclier-impact'), null, 'et aucun impact n’est joué');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.lance);
  try {
    assert.ok(racine.classList.contains('has-bouclier'), 'la porteuse de la Lance nomme son bouclier');
    assert.equal(racine.getAttribute('data-bouclier'), '1', 'la carte expose le point encore en place');
    assert.equal(racine.getAttribute('data-armes'), 'lance-de-givre', 'la Lance équipe bien la créature');
    assert.match(racine.getAttribute('aria-label') ?? '', /Bouclier 1/, 'la description lue nomme le bouclier de 1');
    const egide = racine.querySelector('.rpg-bouclier-egide');
    assert.ok(egide, 'l’égide animée cerne la créature protégée');
    assert.equal(egide.getAttribute('data-bouclier'), '1', 'le calque porte la valeur encore debout');
    assert.equal(egide.getAttribute('aria-hidden'), 'true', 'pure décoration : la valeur vit dans l’icône et le libellé');
    assert.equal(egide.querySelectorAll('.rpg-bouclier-egide__anneau').length, 0,
      'aucun reflet rotatif ne tourne autour de la face');
    assert.ok(egide.querySelector('.rpg-bouclier-egide__reflet'), 'un reflet balaie l’égide');
    assert.ok(egide.querySelector('.rpg-bouclier__ecu'), 'un écu veille au cœur de la carte');
    assert.ok(racine.querySelector('.rpg-card-icone[data-effet="bouclier"]'), 'l’icône Bouclier reste affichée');
    assert.equal(racine.querySelector('.rpg-bouclier-impact'), null, 'aucun choc tant qu’aucun coup n’est encaissé');
    const enfants = [...racine.children];
    assert.ok(enfants.indexOf(egide) < enfants.indexOf(racine.querySelector('.rpg-card__title')),
      'l’égide est montée avant le titre, sous les repères de jeu');
    assert.ok(enfants.indexOf(egide) < enfants.indexOf(racine.querySelector('.rpg-card__foot')),
      'et avant ATQ/DÉF, qui restent au-dessus');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.impactPartiel);
  try {
    assert.ok(racine.querySelector('.rpg-bouclier-egide'), 'le bouclier entamé continue de veiller');
    const impact = racine.querySelector('.rpg-bouclier-impact');
    assert.ok(impact, 'le choc absorbé est rendu par-dessus la face');
    assert.equal(impact.classList.contains('is-brise'), false, 'deux points restent : l’écu ne se brise pas');
    assert.equal(impact.getAttribute('data-bouclier-absorbe'), '1', 'l’impact dit ce qui vient d’être absorbé');
    assert.equal(impact.getAttribute('data-bouclier-restant'), '2', 'et ce qu’il reste du bouclier');
    assert.equal(impact.querySelectorAll('.rpg-bouclier-impact__anneau').length, 2, 'deux ondes sortent du point de choc');
    assert.equal(impact.querySelectorAll('.rpg-bouclier-impact__eclat').length, 6, 'six éclats s’arrachent de l’égide');
    assert.equal(impact.querySelectorAll('.rpg-bouclier__ecu-fissure').length, 0, 'sans fissure tant que le bouclier tient');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.impactBrise);
  try {
    assert.equal(racine.getAttribute('data-bouclier'), null, 'le point de la Lance est bien tombé');
    assert.equal(racine.querySelector('.rpg-bouclier-egide'), null, 'l’égide persistante a disparu');
    const impact = racine.querySelector('.rpg-bouclier-impact');
    assert.ok(impact, 'le choc qui a brisé le bouclier survit à sa chute le temps de l’animation');
    assert.ok(impact.classList.contains('is-brise'), 'à zéro, l’impact joue la rupture');
    assert.equal(impact.getAttribute('data-bouclier-absorbe'), '1');
    assert.equal(impact.getAttribute('data-bouclier-restant'), '0');
    assert.equal(impact.querySelectorAll('.rpg-bouclier__ecu-fissure').length, 2, 'l’écu se fissure avant de s’effacer');
    assert.equal(impact.querySelectorAll('.rpg-bouclier-impact__eclat').length, 6, 'et perd ses éclats');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.lumiere);
  try {
    assert.equal(racine.getAttribute('data-bouclier-lumiere'), 'true', 'Salem expose son bouclier de lumière');
    const egide = racine.querySelector('.rpg-bouclier-egide--lumiere');
    assert.ok(egide, 'la même égide veille, dans sa teinte dorée');
    assert.equal(egide.getAttribute('data-bouclier'), 'lumiere', 'le calque se distingue du bouclier chiffré');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.lumiereTouchee);
  try {
    assert.equal(racine.querySelector('.rpg-bouclier-egide'), null, 'le bouclier de lumière touché ne veille plus');
    const impact = racine.querySelector('.rpg-bouclier-impact--lumiere');
    assert.ok(impact, 'mais son choc lumineux est encore rendu');
    assert.ok(impact.classList.contains('is-brise'), 'un bouclier de lumière touché se brise toujours');
    assert.equal(impact.getAttribute('data-bouclier-lumiere'), 'true');
  } finally {
    dom.window.close();
  }
}

// ── 3. Le moteur : le point vit sur l'arme, encaisse, puis repart ───────────
assert.match(moteur, /function absorberBouclier\(entite, montant\) \{[\s\S]*?entite\.arme\.bouclier = Math\.max\(0, entite\.arme\.bouclier - absorbes\);/,
  'un seul absorbeur fait payer d’abord la part portée par l’arme');
assert.match(moteur, /const bouclierDonne = Math\.max\(0, Math\.floor\(Number\(carteArme\.donne\?\.bouclier\) \|\| 0\)\);[\s\S]*?entite\.arme\.bouclier = bouclierDonne;[\s\S]*?entite\.bouclier = \(entite\.bouclier \?\? 0\) \+ bouclierDonne;/,
  'l’attachement dresse le bouclier donné et garde sa part sur l’arme');
assert.match(moteur, /const bouclierRestant = Math\.max\(0, Number\(entite\.arme\?\.bouclier\) \|\| 0\);[\s\S]*?entite\.bouclier = Math\.max\(0, \(entite\.bouclier \?\? 0\) - bouclierRestant\);/,
  'le retrait ne reprend que le reliquat de l’arme, rien d’autre');
assert.equal([...moteur.matchAll(/const absorbes = absorberBouclier\(entite,/g)].length, 2,
  'le combat simultané et la blessure directe passent par le même absorbeur');

// ── 4. La page : avant/après, deux rangées, piles repliées ─────────────────
assert.match(page, /const DUREE_IMPACT_BOUCLIER = 850;/, 'l’impact a sa durée propre, lisible');
assert.match(page, /function EgideBouclier\(/, 'l’égide persistante a son composant');
assert.match(page, /function ImpactBouclier\(/, 'le choc éphémère aussi');
assert.match(page, /\(\(entite\.bouclier \?\? 0\) > 0 \|\| entite\.bouclierLumiere\) && \(\s*<EgideBouclier/,
  'TableCard dresse l’égide dès qu’un bouclier tient encore');
assert.match(page, /bouclierLumiere: Boolean\(entite\.bouclierLumiere\),\s*armeId: entite\.arme\?\.carteId \?\? null,/,
  'l’instantané d’avant-action relève le bouclier de lumière et l’arme portée');
assert.match(page, /const armeChangee = \(apres\.arme\?\.carteId \?\? null\) !== \(entite\.armeId \?\? null\);[\s\S]*?absorbesParBouclier > 0 && !armeChangee/,
  'un reliquat reparti avec une arme remplacée ne joue pas un faux impact');
assert.match(page, /else if \(toucheeAuxPv\) touches\.push\(entite\.entityId\);/,
  'un coup entièrement absorbé ne rejoue pas le clignotement de blessure');
assert.match(page, /declencherImpactsBouclier\(impactsBouclier\);/, 'la comparaison avant/après allume les chocs');
assert.equal([...page.matchAll(/bouclierFx=\{bouclierDeCarte\(entite, pile, deployee\)\}/g)].length, 2,
  'les deux rangées de la table branchent le choc de bouclier');
assert.match(page, /const bouclierDeCarte = \(entite, pile, deployee\) => boucliersVisibles\[entite\.id\][\s\S]*?pile\.entites/,
  'la tête d’une pile repliée porte le choc d’un exemplaire caché');
assert.match(page, /\.\.\.Object\.keys\(boucliersVisibles \?\? \{\}\)/,
  'l’impact compte dans les actions encore en cours sur la carte');
assert.match(page, /if \(donne\.bouclier\) effets\.push\(`Bouclier \$\{donne\.bouclier\}`\);/,
  'les aperçus nomment le bouclier accordé par l’arme');

// ── 5. La feuille : reflet, choc, rupture, mouvement réduit ────────────────
assert.match(css, /\.rpg-bouclier-egide,\s*\.rpg-bouclier-impact \{[\s\S]*?pointer-events: none;/,
  'l’égide et son impact sont des calques non interactifs');
assert.match(css, /\.rpg-bouclier-egide \{[\s\S]*?z-index: 2;[\s\S]*?animation: rpg-bouclier-entre/,
  'l’égide entre en se formant, sous les repères venus après elle');
assert.match(css, /--rpg-bouclier-teinte: 142, 224, 255;/, 'le bouclier ordinaire est glacé');
assert.match(css, /\.rpg-bouclier-egide--lumiere,[\s\S]*?--rpg-bouclier-teinte: 255, 222, 130;/,
  'le bouclier de lumière passe à l’or pâle');
assert.doesNotMatch(css, /\.rpg-bouclier-egide__anneau|rpg-bouclier-orbite|conic-gradient\(from 0deg,\s*transparent 0 63%/,
  'le reflet rotatif a été retiré de l’égide, calque et orbite compris');
assert.match(css, /\.rpg-bouclier-egide__reflet \{[\s\S]*?animation: rpg-bouclier-reflet 3\.1s/,
  'un reflet traverse la protection');
assert.match(css, /\.rpg-bouclier-impact \{[\s\S]*?z-index: 12;[\s\S]*?animation: rpg-bouclier-impact-vie \.85s/,
  'l’impact vit 850 ms par-dessus la face');
assert.match(css, /\.rpg-bouclier-impact\.is-brise \.rpg-bouclier__ecu \{[\s\S]*?animation-name: rpg-bouclier-impact-brise;/,
  'à zéro, l’écu joue sa rupture');
assert.match(css, /\.rpg-bouclier__ecu-fissure \{[\s\S]*?animation: rpg-bouclier-fissure/,
  'les fissures se dessinent dans l’écu brisé');
assert.match(css, /\.rpg-bouclier-impact__eclat \{[\s\S]*?animation: rpg-bouclier-eclat/,
  'les éclats s’envolent');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-bouclier-egide \{ opacity: \.88; \}[\s\S]*?\.rpg-bouclier-impact \{ display: none; \}/,
  'les mouvements réduits gardent l’égide, immobile, et taisent le choc');
assert.match(page, /if \(!mouvementReduit && \(lumiereAbsorbee \|\| \(absorbesParBouclier > 0 && !armeChangee\)\)\)/,
  'la page ne déclenche pas l’impact quand le mouvement est réduit');

console.log('✓ Bouclier animé : la Lance de givre donne +1/+1, Envol et Bouclier 1 ; le point encaisse et repart proprement avec l’arme, l’égide glacée (ou dorée) veille sur la table, et son choc — fissuré quand elle tombe — se voit même à zéro.');
