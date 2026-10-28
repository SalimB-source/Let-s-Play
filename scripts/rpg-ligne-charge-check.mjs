/**
 * La ligne de charge : avant le bond, un trait de sable relie l'attaquant à sa
 * cible, pour lire QUI frappe QUI avant l'impact.
 * node scripts/rpg-ligne-charge-check.mjs
 *
 * Effet purement visuel : le moteur ne sait rien de la ligne. La page fige la
 * géométrie sur l'instantané d'avant combat (centre de l'attaquant vers une
 * créature ou la plaque du sorcier), puis trace un trait en `scaleX` de 220 ms
 * qui s'efface avant la fin du geste (420 ms au total). Transform et opacity
 * seulement, minuteurs annulables, rien en mouvement réduit, et jamais de
 * porte sur les actions : le bond part en même temps, la ligne ne l'attend pas.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

function extraireBloc(texte, marqueur) {
  const debut = texte.indexOf(marqueur);
  assert.ok(debut >= 0, `${marqueur} existe`);
  let profondeur = 0;
  let fin = -1;
  for (let i = texte.indexOf('{', debut); i < texte.length; i += 1) {
    if (texte[i] === '{') profondeur += 1;
    if (texte[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) { fin = i; break; }
    }
  }
  assert.ok(fin > debut, `${marqueur} forme un bloc fermé`);
  return texte.slice(debut, fin + 1);
}

// ── 1. Les trois variantes, rendues pour de vrai ───────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-ligne-charge-smoke.jsx', outDir: 'node_modules/.cache/rpg-ligne-charge', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const smoke = await import('../node_modules/.cache/rpg-ligne-charge/rpg-ligne-charge-smoke.js');

function verifierLigne(html, cote, cibleType, depart) {
  const { window } = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  try {
    const racine = window.document.querySelector('.rpg-ligne-charge');
    assert.ok(racine, 'le calque de la ligne est rendu');
    assert.equal(racine.getAttribute('data-rpg-charge-fx'), '', 'il se nomme pour les contrôles et la feuille');
    assert.equal(racine.getAttribute('data-rpg-charge-cote'), cote, 'le camp attaquant est nommé');
    assert.equal(racine.getAttribute('data-rpg-charge-cible'), cibleType, 'la nature de la cible est nommée');
    assert.ok(racine.classList.contains(`rpg-ligne-charge--${cote}`), 'le modificateur de camp est posé');
    assert.ok(racine.classList.contains(`rpg-ligne-charge--${cibleType}`), 'le modificateur de cible est posé');
    assert.equal(racine.getAttribute('aria-hidden'), 'true',
      'la ligne est décorative : le journal et les autres retours annoncent déjà l’attaque');

    const style = racine.getAttribute('style') ?? '';
    assert.match(style, new RegExp(`left:\\s*${depart.x}px`), 'le point de départ (centre de l’attaquant) est figé');
    assert.match(style, new RegExp(`top:\\s*${depart.y}px`), 'le point de départ vertical aussi');
    assert.match(style, /--charge-longueur:\s*\d+(\.\d+)?px/, 'la longueur est exposée à la feuille');
    assert.match(style, /rotate\(-?\d+(\.\d+)?deg\)/, 'l’angle pointe vers la cible sans calcul au rendu');

    assert.ok(racine.querySelector('.rpg-ligne-charge__trait'), 'le trait de sable est dessiné');
    assert.ok(racine.querySelector('.rpg-ligne-charge__pointe'), 'la pointe qui mène le tracé est dessinée');
  } finally {
    window.close();
  }
}
verifierLigne(smoke.rendreLigneVersCreature(), 'joueur', 'creature', { x: 160, y: 430 });
verifierLigne(smoke.rendreLigneVersPlaque(), 'joueur', 'sorcier', { x: 160, y: 430 });
verifierLigne(smoke.rendreLigneEnnemie(), 'sorcier', 'sorcier', { x: 240, y: 170 });

// ── 2. La feuille : tracé 220 ms, sable, sans layout, hors des slices gardés ─
const positionBloc = css.indexOf('.rpg-ligne-charge {');
assert.ok(positionBloc > css.indexOf("Les flèches d'attaque et de blocage"),
  'le bloc est après les flèches, hors du slice gardé par le check éclair');
assert.ok(positionBloc < css.indexOf('LA TEMPÊTE DE SABLE'),
  'le bloc est avant la tempête, hors du slice gardé par le check tempête/balance');
const blocRacine = extraireBloc(css, '.rpg-ligne-charge {');
assert.match(blocRacine, /position:\s*absolute;/, 'la ligne est un calque absolu de la table');
assert.match(blocRacine, /z-index:\s*55;/, 'elle passe sous le fil du Tribut (56), la tempête (57) et la balance (58)');
assert.match(blocRacine, /pointer-events:\s*none;/, 'elle ne capte aucun geste de la table');
// Le div est tourné : son origine doit être son EXTRÉMITÉ mesurée, sinon la
// rotation autour du milieu détache la ligne de l'attaquant (jusqu'à plusieurs
// centaines de pixels sur une attaque diagonale) et elle balaie l'écran.
assert.match(blocRacine, /transform-origin:\s*0 0;|transform-origin:\s*0 50%;/,
  'la ligne se tourne autour de son extrémité, pas de son milieu : elle relie vraiment l’attaquant à sa cible');
assert.match(css, /\.rpg-ligne-charge__trait\s*\{[^}]*animation:\s*rpg-ligne-de-charge-trace calc\(\.42s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.7, \.35, 1\) both;/s,
  'le tracé vit 420 ms au total (220 ms de tracé, puis tenue et fondu)');
assert.match(css, /\.rpg-ligne-charge__pointe\s*\{[^}]*animation:\s*rpg-ligne-de-charge-pointe calc\(\.42s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.7, \.35, 1\) both;/s,
  'la pointe suit la même enveloppe de temps que le trait');
const keyframesTrace = extraireBloc(css, '@keyframes rpg-ligne-de-charge-trace');
const keyframesPointe = extraireBloc(css, '@keyframes rpg-ligne-de-charge-pointe');
for (const keyframes of [keyframesTrace, keyframesPointe]) {
  assert.doesNotMatch(keyframes, /(top|left|right|bottom|width|height|margin|padding):/,
    'aucune propriété de mise en page animée');
}
assert.match(keyframesTrace, /scaleX\(0\)/, 'le trait part de l’attaquant…');
assert.match(keyframesTrace, /52% \{ transform: scaleX\(1\)/, '…et atteint la cible à 220 ms (52 % de 420 ms)');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-ligne-charge__trait,\s*\.rpg-ligne-charge__pointe \{ animation: none; opacity: 0; \}\s*\}/,
  'en mouvement réduit, la ligne ne se trace pas : le choc et le bond restent les seuls retours');
assert.match(css, /\.rpg-ligne-charge,\s*\.rpg-ligne-charge \* \{ animation: none !important; transition: none !important; \}/,
  'le bloc global de mouvement réduit couvre aussi la ligne');

// ── 3. La page : géométrie figée, déclenchement avant le bond, annulation ───
assert.match(page, /const DUREE_LIGNE_CHARGE = 420;/, 'le geste tient sous la seconde de décision');
assert.match(page, /const \[lignesCharge, setLignesCharge\] = useState\(\[\]\);/, 'l’état est une liste, une ligne par attaquant');
assert.match(page, /const chargeTimersRef = useRef\(\[\]\);/, 'les minuteries sont mémorisées pour être annulées');
assert.match(page, /const geometrieLigneCharge = \(attaquantId, cible, cote, instantane\) => \{/,
  'la géométrie est calculée dans un helper dédié, à partir de l’instantané d’avant combat');
const blocGeometrie = page.slice(page.indexOf('const geometrieLigneCharge'), page.indexOf('const declencherLignesCharge'));
assert.match(blocGeometrie, /if \(cible === 'sorcier'\)/, 'une attaque directe vise la plaque du sorcier défenseur');
assert.match(blocGeometrie, /\.rpg-wizard-plate--ennemi'/, 'un attaquant joueur pointe vers la plaque ennemie');
assert.match(blocGeometrie, /\.rpg-wizard-plate--joueur'/, 'un attaquant adverse pointe vers la plaque du joueur');
assert.match(blocGeometrie, /instantane\.find\(\(entite\) => entite\.entityId === entiteId && !entite\.isTerrain\)/,
  'les centres des créatures viennent de l’instantané, pas d’un nouveau mesurage pendant le bond');
assert.match(blocGeometrie, /Math\.hypot\(arrivee\.x - depart\.x, arrivee\.y - depart\.y\)/, 'la longueur est la distance réelle');
assert.match(blocGeometrie, /Math\.atan2\(arrivee\.y - depart\.y, arrivee\.x - depart\.x\)/, 'l’angle oriente la ligne vers la cible');

assert.match(page, /const declencherLignesCharge = \(cote, attaquantsIds, ciblesParId, instantane\) => \{/,
  'le déclencheur est unique, partagé par les deux résolutions de combat');
assert.match(page, /if \(animationsReduites\(\) \|\| !Array\.isArray\(attaquantsIds\) \|\| !attaquantsIds\.length\) return;/,
  'pas de ligne en mouvement réduit, pas de ligne sans attaquant, et jamais d’effet sur l’action');
assert.match(page, /const cible = ciblesParId\?\.\[attaquantId\] \?\? 'sorcier';/,
  'sans cible nommée, la ligne va à la plaque : une attaque directe reste lisible');
assert.match(page, /cibleType: cible === 'sorcier' \? 'sorcier' : 'creature'/, 'la nature de cible est conservée pour la feuille');
assert.match(page, /window\.setTimeout\(\(\) => \{[\s\S]*?setLignesCharge\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effet\.effectId\)\);[\s\S]*?\}, dureeAnimation\(DUREE_LIGNE_CHARGE\)\);/,
  'chaque ligne se retire toute seule au bout du geste');
assert.match(page, /chargeTimersRef\.current\.forEach\(\(id\) => window\.clearTimeout\(id\)\);/,
  'le démontage de la page annule toutes les minuteries');
assert.match(page, /setLignesCharge\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde rattrape les lignes figées par une mise en veille d’onglet');

// Les deux résolutions tracent la ligne AVANT le bond (animerModificationsChamp).
const blocJoueur = page.slice(page.indexOf("const ciblesChargeJoueur"), page.indexOf("animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);", page.indexOf("const ciblesChargeJoueur")));
assert.match(blocJoueur, /combat\.ciblesAttaque\?\.\[id\] \?\? blocages\[id\]\?\.\[0\] \?\? 'sorcier'/,
  'côté joueur : cible désignée, puis premier bloqueur, puis la plaque');
assert.match(blocJoueur, /declencherLignesCharge\('joueur', attaquantsVivants, ciblesChargeJoueur, champAvantAttaque\);/,
  'la ligne du joueur part sur l’instantané d’avant combat, avant le bond');
const blocEnnemi = page.slice(page.indexOf("const ciblesChargeEnnemie"), page.indexOf("animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);", page.indexOf("const ciblesChargeEnnemie")));
assert.match(blocEnnemi, /combatEntrant\.ciblesAttaque\?\.\[id\] \?\? blocages\[id\]\?\.\[0\] \?\? 'sorcier'/,
  'côté sorcier : même ordre de priorité des cibles');
assert.match(blocEnnemi, /declencherLignesCharge\('sorcier', attaquantsVivants, ciblesChargeEnnemie, champAvantAttaque\);/,
  'les attaques ennemies annoncent elles aussi leur cible avant le bond');

const blocReset = page.slice(page.indexOf('setLignesCharge([]);') - 200, page.indexOf('setLignesCharge([]);') + 180);
assert.match(blocReset, /chargeTimersRef\.current\.forEach\(\(id\) => window\.clearTimeout\(id\)\);/,
  'un duel neuf annule les minuteries');
assert.match(page, /\{lignesCharge\.map\(\(effet\) => \(\s*<LigneCharge key=\{effet\.effectId\} effet=\{effet\} \/>\s*\)\)\}/,
  'les lignes sont rendues dans la table, à côté du fil du Tribut');

// ── 4. Le moteur reste vierge de tout déclencheur visuel ───────────────────
assert.equal(engine.includes('LigneCharge'), false, 'aucun composant visuel dans le moteur');
assert.equal(engine.includes('rpg-ligne'), false, 'aucune classe d’animation dans le moteur');
assert.equal(engine.includes('ligne de charge'), false, 'le moteur ne connaît pas la ligne : il produit l’attaque, la page l’illustre');

console.log('✓ Ligne de charge : à chaque résolution de combat, un trait ocre se trace de l’attaquant vers sa cible (créature désignée, premier bloqueur ou plaque du sorcier) en 220 ms sur 420 ms de vie, avant le bond, dans les deux camps — géométrie figée sur l’instantané d’avant combat, transform/opacité seulement, aucun changement moteur, minuteurs annulés au démontage, au reset et par le chien de garde, rien en mouvement réduit');
