/**
 * Le Bouclier se voit, veille, puis encaisse.
 * node scripts/rpg-bouclier-check.mjs
 *
 * Les boucliers actuels viennent des arrivées (le Guerrier au bouclier rond),
 * des sorts (la Parade de verre) et des boucliers de lumière (Salem). La Lance
 * de givre ne donne plus de bouclier : elle donne +1/−1 et Envol.
 *
 * Sur la table, une égide animée cerne toute créature protégée — glacée pour
 * un bouclier ordinaire, dorée pour un bouclier de lumière. Quand un coup
 * est absorbé, un impact séparé rejoue le choc : l'écu se cabre, et il se
 * fissure en perdant ses éclats si le bouclier tombe à zéro. Une fois tombé,
 * son icône et tout son texte se grisent dans l'aperçu, comme la Tenacité
 * déjà déclenchée du Maître du marteau. Entièrement absorbé, le coup ne
 * déclenche plus le clignotement de blessure ; en mouvement réduit, l'égide
 * reste lisible mais immobile et l'impact se tait.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { armeById } from '../src/games/rpgCards.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const moteur = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const iconesCss = readFileSync(new URL('../src/games/effet-icons.css', import.meta.url), 'utf8');
const reglesCss = readFileSync(new URL('../src/games/rpg-card-rules.css', import.meta.url), 'utf8');

// ── 1. La Lance de givre actuelle : +1/−1 et Envol, sans bouclier ───────────
const lance = armeById('lance-de-givre');
assert.ok(lance, 'la Lance de givre est bien au catalogue des armes');
assert.deepEqual(lance.bonus, { atk: 1, def: -1 }, 'elle donne exactement +1/−1');
assert.equal(lance.donne?.envol, true, 'elle donne Envol');
assert.equal(lance.donne?.bouclier, undefined, 'elle ne donne aucun bouclier');
assert.match(lance.text, /\+1\/−1 et Envol/, 'son texte annonce ses deux dons');
assert.doesNotMatch(lance.text, /bouclier/i, 'aucun bouclier dans son texte');

// ── 2. Les états visuels, rendus pour de vrai ───────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-bouclier-smoke.jsx', outDir: 'node_modules/.cache/rpg-bouclier', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartesBouclier, rendreApercusEffetsEpuises } = await import('../node_modules/.cache/rpg-bouclier/rpg-bouclier-smoke.js');
const rendu = rendreCartesBouclier();
const apercus = rendreApercusEffetsEpuises();
const carteDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-card') };
};
const apercuDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-hover-card-preview') };
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
  const { dom, racine } = carteDom(rendu.guerrier);
  try {
    assert.ok(racine.classList.contains('has-bouclier'), 'le Guerrier nomme son bouclier');
    assert.equal(racine.getAttribute('data-bouclier'), '1', 'la carte expose le point encore en place');
    assert.equal(racine.getAttribute('data-effets-epuises'), null, 'un bouclier debout n’est pas épuisé');
    assert.match(racine.getAttribute('aria-label') ?? '', /bouclier 1/i, 'la description lue nomme le bouclier de 1');
    const egide = racine.querySelector('.rpg-bouclier-egide');
    assert.ok(egide, 'l’égide animée cerne la créature protégée');
    assert.equal(egide.getAttribute('data-bouclier'), '1', 'le calque porte la valeur encore debout');
    assert.equal(egide.getAttribute('aria-hidden'), 'true', 'pure décoration : la valeur vit dans l’icône et le libellé');
    assert.equal(egide.querySelectorAll('.rpg-bouclier-egide__anneau').length, 0,
      'aucun reflet rotatif ne tourne autour de la face');
    assert.ok(egide.querySelector('.rpg-bouclier-egide__reflet'), 'un reflet balaie l’égide');
    assert.ok(egide.querySelector('.rpg-bouclier__ecu'), 'un écu veille au cœur de la carte');
    const badge = racine.querySelector('.rpg-card-icone[data-effet="bouclier"]');
    assert.ok(badge, 'l’icône Bouclier reste affichée');
    assert.equal(badge.classList.contains('is-epuisee'), false, 'et pleine couleur tant qu’il tient');
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
  const { dom, racine } = carteDom(rendu.lanceSansBouclier);
  try {
    assert.equal(racine.getAttribute('data-armes'), 'lance-de-givre', 'la Lance équipe bien la créature');
    assert.equal(racine.classList.contains('has-bouclier'), false, 'mais elle ne dresse aucun état de bouclier');
    assert.equal(racine.getAttribute('data-bouclier'), null, 'aucun point de bouclier exposé');
    assert.equal(racine.querySelector('.rpg-bouclier-egide'), null, 'aucune égide pour la Lance');
    assert.equal(racine.querySelector('.rpg-card-icone[data-effet="bouclier"]'), null,
      'et aucune icône Bouclier prêtée par l’arme');
    assert.ok(racine.querySelector('.rpg-card-icone[data-effet="envol"]'), 'l’Envol donné, lui, est bien là');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.impactPartiel);
  try {
    assert.ok(racine.querySelector('.rpg-bouclier-egide'), 'le bouclier entamé continue de veiller');
    const badge = racine.querySelector('.rpg-card-icone[data-effet="bouclier"]');
    assert.ok(badge, 'son icône reste affichée');
    assert.equal(badge.classList.contains('is-epuisee'), false, 'il reste des points : pas de grisaille');
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
    assert.equal(racine.getAttribute('data-bouclier'), null, 'le point du Guerrier est bien tombé');
    assert.equal(racine.getAttribute('data-effets-epuises'), 'bouclier',
      'la carte posée transmet son bouclier dépensé aux aperçus');
    assert.match(racine.getAttribute('aria-label') ?? '', /bouclier tombé/i,
      'la description lue dit le bouclier tombé');
    assert.equal(racine.querySelector('.rpg-bouclier-egide'), null, 'l’égide persistante a disparu');
    const badge = racine.querySelector('.rpg-card-icone[data-effet="bouclier"]');
    assert.ok(badge, 'l’icône Bouclier reste lisible sur la face');
    assert.ok(badge.classList.contains('is-epuisee'), 'mais grisée, puisque le bouclier est tombé');
    assert.equal(badge.getAttribute('data-effet-epuise'), 'true');
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
    assert.equal(racine.getAttribute('data-effets-epuises'), null, 'intact, il n’est pas épuisé');
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
    assert.equal(racine.getAttribute('data-effets-epuises'), 'bouclier',
      'le bouclier de lumière touché est transmis comme dépensé');
    assert.equal(racine.querySelector('.rpg-bouclier-egide'), null, 'le bouclier de lumière touché ne veille plus');
    const impact = racine.querySelector('.rpg-bouclier-impact--lumiere');
    assert.ok(impact, 'mais son choc lumineux est encore rendu');
    assert.ok(impact.classList.contains('is-brise'), 'un bouclier de lumière touché se brise toujours');
    assert.equal(impact.getAttribute('data-bouclier-lumiere'), 'true');
  } finally {
    dom.window.close();
  }
}

// ── 3. Les aperçus : icône et texte entiers se grisent une fois dépensés ───
{
  const { dom, racine } = apercuDom(apercus.guerrierActif);
  try {
    assert.ok(racine, 'l’aperçu du Guerrier se rend');
    assert.equal(racine.getAttribute('data-effets-epuises'), null, 'rien n’est dépensé hors table');
    assert.equal(racine.querySelector('.is-epuisee'), null, 'aucune grisaille sur une fiche neuve');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = apercuDom(apercus.guerrierEpuise);
  try {
    assert.equal(racine.getAttribute('data-effets-epuises'), 'bouclier');
    assert.match(racine.getAttribute('aria-label') ?? '', /Bouclier tombé/,
      'le libellé de l’aperçu ne repose pas sur la seule couleur');
    const pastille = racine.querySelector('.rpg-pastille[data-pastille="bouclier"]');
    assert.ok(pastille, 'la pastille Bouclier est rendue');
    assert.ok(pastille.classList.contains('is-epuisee'), 'icône et mot du Bouclier sont grisés');
    assert.equal(pastille.textContent, 'Bouclier 1',
      'le mot seul reste écrit : l’aperçu n’écrit plus d’explication sous le mot-clé');
    assert.equal(pastille.getAttribute('aria-label'), null,
      'la pastille ne nomme que son mot-clé, grisé avec le reste');
    const furie = racine.querySelector('.rpg-pastille[data-pastille="furie"]');
    assert.ok(furie, 'la Furie du Guerrier reste rendue');
    assert.equal(furie.classList.contains('is-epuisee'), false, 'seul le Bouclier est grisé');
    const ligne = racine.querySelector('.rpg-card-rules__ligne--epuisee[data-effet="bouclier"]');
    assert.ok(ligne, 'la ligne de règle du bouclier est grisée avec son icône');
    assert.match(ligne.textContent, /reçoit un bouclier de 1/);
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = apercuDom(apercus.maitreEpuise);
  try {
    assert.equal(racine.getAttribute('data-effets-epuises'), 'tenacite');
    assert.match(racine.getAttribute('aria-label') ?? '', /Tenacité déjà utilisée/);
    const tenacite = racine.querySelector('.rpg-pastille[data-pastille="tenacite"]');
    assert.ok(tenacite, 'la pastille Tenacité est rendue');
    assert.ok(tenacite.classList.contains('is-epuisee'), 'icône et mot de la Tenacité sont grisés');
    assert.equal(tenacite.textContent, 'Tenacité',
      'le mot seul, sans explication écrite dessous');
    for (const cle of ['overkill', 'furie']) {
      const pastille = racine.querySelector(`.rpg-pastille[data-pastille="${cle}"]`);
      assert.ok(pastille, `${cle} reste rendu`);
      assert.equal(pastille.classList.contains('is-epuisee'), false, `${cle} garde sa couleur`);
    }
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = apercuDom(apercus.salemEpuise);
  try {
    assert.equal(racine.getAttribute('data-effets-epuises'), 'bouclier');
    const lignes = racine.querySelectorAll('.rpg-card-rules__ligne--epuisee[data-effet="bouclier"]');
    assert.equal(lignes.length, 2, 'les deux phrases du bouclier de lumière se grisent');
    assert.match([...lignes].map((ligne) => ligne.textContent).join(' '), /bouclier de lumière/);
  } finally {
    dom.window.close();
  }
}

// ── 4. Le moteur : un absorbeur unique et un « tombé » explicite ───────────
assert.match(moteur, /function absorberBouclier\(entite, montant\) \{[\s\S]*?if \(absorbes > 0 && entite\.bouclier === 0 && !entite\.bouclierLumiere\) \{\s*entite\.bouclierEpuise = true;/,
  'le dernier point absorbé marque le bouclier comme tombé');
assert.match(moteur, /case 'bouclier-lumiere': \{[\s\S]*?entite\.bouclierLumiere = true;\s*entite\.bouclierEpuise = false;/,
  'accorder un bouclier de lumière réarme l’état');
assert.match(moteur, /case 'bouclier': \{[\s\S]*?entite\.bouclier = \(entite\.bouclier \?\? 0\) \+ \(effet\.amount \?\? 0\);[\s\S]*?if \(entite\.bouclier > 0\) entite\.bouclierEpuise = false;/,
  'accorder un bouclier chiffré réarme l’état');
assert.equal([...moteur.matchAll(/if \(!\(entite\.bouclier > 0\)\) entite\.bouclierEpuise = true;/g)].length, 2,
  'les deux chemins qui touchent un bouclier de lumière marquent sa chute');
assert.equal([...moteur.matchAll(/const absorbes = absorberBouclier\(entite,/g)].length, 2,
  'le combat simultané et la blessure directe passent par le même absorbeur');

// ── 5. La page : avant/après, deux rangées, piles repliées, aperçus ────────
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
assert.match(page, /data-effets-epuises=\{effetsEpuises\.length \? effetsEpuises\.join\(' '\) : undefined\}/,
  'la carte posée étiquette ses effets dépensés pour les gestes d’aperçu');
assert.equal([...page.matchAll(/effetsEpuisesDepuisHote\(/g)].length, 4,
  'survol, appui long et clic droit lisent la même étiquette (plus sa définition)');
assert.match(page, /<PastillesCarte[\s\S]*?effetsEpuises=\{effetsEpuisesActifs\}/,
  'l’aperçu transmet l’épuisement à ses pastilles');
assert.match(page, /<RpgCardRules carte=\{carte\} text=\{ligne\} effetsEpuises=\{effetsEpuisesActifs\} \/>/,
  'et à chacune de ses lignes de règle');

// ── 6. Les feuilles : reflet, choc, rupture, grisaille, mouvement réduit ──
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
assert.match(iconesCss, /\.rpg-pastille\.is-epuisee \{[\s\S]*?color: #a9a9a9;[\s\S]*?filter: grayscale\(1\);/,
  'une pastille dépensée passe entièrement au gris');
assert.doesNotMatch(iconesCss, /\.rpg-pastille__explication/,
  'plus aucune explication ne se déplie sous une pastille');
assert.match(iconesCss, /\.rpg-card-icone\.is-epuisee \{[\s\S]*?filter: grayscale\(1\);/,
  'le badge de la face suit le même état');
assert.match(reglesCss, /\.rpg-card-rules__ligne--epuisee \{[\s\S]*?color: #a9a9a9;[\s\S]*?filter: grayscale\(1\);/,
  'la ligne de règle dépensée se grise entièrement');

console.log('✓ Bouclier animé : la Lance de givre donne +1/−1 et Envol sans bouclier ; les boucliers du Guerrier, de la Parade et de Salem veillent et encaissent, puis leur icône et leur texte se grisent dans l’aperçu une fois tombés — comme la Tenacité déjà utilisée.');
