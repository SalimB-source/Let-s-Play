/**
 * Le fil de sable du Tribut (set Ténèbres) : la créature qui touche le sorcier
 * adverse relie son emplacement à la plaque qui paye, et les PV remontent le
 * fil vers le camp bénéficiaire.
 * node scripts/rpg-tribut-fil-check.mjs
 *
 * Le moteur tient un journal dédié, jumeau de celui des transferts mais qui
 * nomme la créature collectrice (une pesée lancée depuis la main n'y figure
 * jamais). La page relève les événements après chaque rendu, fige la géométrie
 * une fois pour toutes (centre de la créature, centre de la plaque adverse,
 * longueur et angle) et trace un fil par créature. Geste pur : rien n'est écrit
 * dans l'état du duel, toutes les animations sont en transform/opacité, le
 * mouvement réduit supprime le fil et chaque minuterie est annulable.
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

// ── 1. Le fil, rendu pour de vrai, dans les deux camps ─────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-tribut-fil-smoke.jsx', outDir: 'node_modules/.cache/rpg-tribut-fil', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreFilJoueur, rendreFilSorcier } = await import('../node_modules/.cache/rpg-tribut-fil/rpg-tribut-fil-smoke.js');

function verifierFil(html, cote, modificateur, montant, depart) {
  const { window } = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  try {
    const racine = window.document.querySelector('.rpg-tribut-fil');
    assert.ok(racine, 'le calque du fil est rendu');
    assert.equal(racine.getAttribute('data-rpg-tribut-fx'), '', 'il se nomme pour les contrôles et la feuille');
    assert.equal(racine.getAttribute('data-rpg-tribut-cote'), cote, 'le camp collecteur est nommé');
    assert.ok(racine.classList.contains(modificateur), `il porte le modificateur ${modificateur}`);
    assert.equal(racine.getAttribute('role'), 'status', 'le transfert reste annoncé aux lecteurs d’écran');
    assert.match(racine.getAttribute('aria-label') ?? '', new RegExp(`Tribut : ${montant} point de vie`),
      'le message dit le montant déplacé');

    const style = racine.getAttribute('style') ?? '';
    assert.match(style, new RegExp(`left:\\s*${depart.x}px`), 'la position de départ est figée (centre de la créature)');
    assert.match(style, new RegExp(`top:\\s*${depart.y}px`), 'le point de départ vertical aussi');
    assert.match(style, /--fil-longueur:\s*247\.4px/, 'la longueur du fil est exposée à la feuille');
    assert.match(style, /rotate\(-?\d+(\.\d+)?deg\)/, 'l’angle relie créature et plaque sans calcul au rendu');

    assert.ok(racine.querySelector('.rpg-tribut-fil__trait'), 'le trait doré est dessiné');
    const grains = racine.querySelectorAll('.rpg-tribut-fil__grain');
    assert.equal(grains.length, 3, 'trois grains d’or remontent le fil');
    assert.deepEqual(
      [...grains].map((grain) => grain.getAttribute('style')),
      ['--d:0ms', '--d:60ms', '--d:120ms'],
      'les grains sont décalés de 60 ms pour remonter en file indienne',
    );
  } finally {
    window.close();
  }
}
verifierFil(rendreFilJoueur(), 'joueur', 'rpg-tribut-fil--joueur', 1, { x: 180, y: 420 });
verifierFil(rendreFilSorcier(), 'sorcier', 'rpg-tribut-fil--sorcier', 2, { x: 240, y: 180 });

// ── 2. La feuille : tension du trait et remontée des grains, sans layout ───
const blocFil = extraireBloc(css, '.rpg-tribut-fil {');
assert.match(blocFil, /position:\s*absolute;/, 'le fil est un calque absolu de la table');
assert.match(blocFil, /z-index:\s*56;/, 'il passe sous la balance (58) et la tempête (57), au-dessus des cartes');
assert.match(blocFil, /pointer-events:\s*none;/, 'il ne capte aucun geste de la table');
assert.match(css, /\.rpg-tribut-fil__trait\s*\{[^}]*animation:\s*rpg-tribut-fil-trait calc\(\.55s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.35, \.7, \.3, 1\) both;/s,
  'le trait se tend en 550 ms');
assert.match(css, /\.rpg-tribut-fil__grain\s*\{[^}]*animation:\s*rpg-tribut-fil-grain calc\(\.4s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.65, \.35, 1\) both;/s,
  'chaque grain parcourt le fil en 400 ms');
const keyframesTrait = extraireBloc(css, '@keyframes rpg-tribut-fil-trait');
const keyframesGrain = extraireBloc(css, '@keyframes rpg-tribut-fil-grain');
for (const keyframes of [keyframesTrait, keyframesGrain]) {
  assert.doesNotMatch(keyframes, /(top|left|right|bottom|width|height|margin|padding):/,
    'aucune propriété de mise en page animée');
}
assert.match(keyframesTrait, /scaleX\(0\)/, 'le trait part de rien…');
assert.match(keyframesTrait, /scaleX\(1\)/, '…et se tend jusqu’à la plaque');
assert.match(keyframesGrain, /translateX\(var\(--fil-longueur, 0px\)\)/, 'les grains partent de la plaque payeuse…');
assert.match(keyframesGrain, /translateX\(0\)/, '…et arrivent à la créature bénéficiaire');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-tribut-fil__trait \{ animation: none; transform: none; opacity: \.55; \}\s*\.rpg-tribut-fil__grain \{ animation: none; opacity: 0; \}\s*\}/,
  'en mouvement réduit, seul un filet statique subsiste, les grains s’effacent');
assert.match(css, /\.rpg-tribut-fil,\s*\.rpg-tribut-fil \* \{ animation: none !important; transition: none !important; \}/,
  'le bloc global de mouvement réduit couvre aussi le fil');

// ── 3. Le moteur : un journal dédié qui nomme la créature, pas les pesées ───
assert.match(engine, /const tributsParDuel = new WeakMap\(\);/, 'le journal vit hors de l’état JSON');
assert.match(engine, /export function rpgNombreTributs\(duel\) \{\s*return tributsParDuel\.get\(duel\)\?\.length \?\? 0;\s*\}/s,
  'la position de lecture est bornée comme les autres journaux');
assert.match(engine, /export function rpgTributsDepuis\(duel, position = 0\) \{/, 'les événements frais sont relus depuis une position');
assert.match(engine, /function journaliserTribut\(duel, cote, entiteId, montant\) \{\s*const journal = tributsParDuel\.get\(duel\) \?\? \[\];\s*journal\.push\(\{ entityId: entiteId, cote, montant \}\);/s,
  'chaque Tribut enregistre la créature, son camp et le montant');
const blocDeclencheur = extraireBloc(engine, 'function declencherTributs');
assert.match(blocDeclencheur, /journaliserTribut\(duel, cote, entite\.id, montant\);/,
  'le Tribut au contact remplit le journal, juste après le transfert de vie');
assert.equal(engine.split('journaliserTribut(').length - 1, 2,
  'la définition et un seul appel : les pesées sans créature ne peuvent pas y entrer');

// ── 4. La page : relève, géométrie figée, minuteurs annulables ─────────────
assert.match(page, /const DUREE_TRIBUT_FIL = 550;/, 'le geste tient sous la seconde de décision');
assert.match(page, /const \[filsTribut, setFilsTribut\] = useState\(\[\]\);/, 'l’état des fils est une liste, un fil par créature');
assert.match(page, /const tributsDuelRef = useRef\(\{ duel: null, position: 0 \}\);/, 'la position de lecture est mémorisée');
assert.match(page, /const geometrieFilTribut = \(entiteId, cote\) => \{/, 'la géométrie est calculée dans un helper dédié');
const blocGeometrie = page.slice(page.indexOf('const geometrieFilTribut'), page.indexOf('useEffect(() => {', page.indexOf('const geometrieFilTribut')));
assert.match(blocGeometrie, /\.rpg-wizard-plate--ennemi'/, 'une créature du joueur vise la plaque ennemie');
assert.match(blocGeometrie, /\.rpg-wizard-plate--joueur'/, 'une créature du sorcier vise la plaque du joueur');
assert.match(blocGeometrie, /Math\.hypot\(x2 - x1, y2 - y1\)/, 'la longueur est la distance réelle entre les deux centres');
assert.match(blocGeometrie, /Math\.atan2\(y2 - y1, x2 - x1\) \* 180 \/ Math\.PI/, 'l’angle oriente le fil vers la plaque');

const blocEffet = page.slice(page.indexOf('Ténèbres : le fil de sable du Tribut'), page.indexOf('Le bouton « Fin du tour » se retourne'));
assert.match(blocEffet, /tributsDuelRef\.current = \{ duel: duelCourant, position: rpgNombreTributs\(duelCourant\) \};/,
  'un duel neuf réarme la lecture sans rejouer les anciens Tributs');
assert.match(blocEffet, /if \(!frais\.length \|\| animationsReduites\(\)\) return;/,
  'pas de fil sans événement frais, et jamais en mouvement réduit');
assert.match(blocEffet, /setFilsTribut\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.nouveauxEffets\]\);/,
  'chaque Tribut simultané laisse son propre fil, les fantômes sont éliminés');
assert.match(blocEffet, /window\.setTimeout\(\(\) => \{[\s\S]*?setFilsTribut\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effet\.effectId\)\);[\s\S]*?\}, dureeAnimation\(DUREE_TRIBUT_FIL\)\);/,
  'chaque fil se retire tout seul au bout du geste');
assert.match(blocEffet, /tributTimersRef\.current\.forEach\(\(id\) => window\.clearTimeout\(id\)\);/,
  'le démontage de la page annule toutes les minuteries');
assert.match(blocEffet, /setFilsTribut\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde rattrape les fils figés par une mise en veille de l’onglet');

const blocReset = page.slice(page.indexOf('setFilsTribut([]);') - 200, page.indexOf('setFilsTribut([]);') + 220);
assert.match(blocReset, /tributTimersRef\.current\.forEach\(\(id\) => window\.clearTimeout\(id\)\);/,
  'un duel neuf annule les minuteries');
assert.match(blocReset, /tributsDuelRef\.current = \{ duel: null, position: 0 \};/,
  'un duel neuf réarme le journal : aucun fil hérité du duel précédent');
assert.match(page, /\{filsTribut\.map\(\(effet\) => \(\s*<TributFil key=\{effet\.effectId\} effet=\{effet\} \/>\s*\)\)\}/,
  'les fils sont rendus dans la table, à côté de la balance');

console.log('✓ Fil de sable du Tribut : le moteur journalise chaque contact au sorcier avec sa créature (les pesées sans créature restent hors jeu), la page fige la géométrie créature→plaque adverse et tend un fil doré de 550 ms où trois grains remontent du payeur vers le bénéficiaire — un fil par créature, transform/opacité seulement, minuterie annulée au démontage, au reset et par le chien de garde, rien en mouvement réduit');
