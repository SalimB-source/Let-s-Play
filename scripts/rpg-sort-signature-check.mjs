/**
 * La signature des familles de sorts — Magie Rapide et Sorcellerie.
 *
 * Deux volets : les assertions de source (les trois canaux du repère — forme,
 * teinte, mot — et le fait qu'aucune autre famille de carte ne les porte), puis
 * le scénario JSDOM qui monte le duel, le mulligan et le catalogue réels.
 *
 * La feuille est lue ici comme un contrat de lecture : le socle doit suivre
 * `--rpg-card-marker-size` (le repère de couleur de chaque face) au lieu d'une
 * mesure parallèle, et la règle « sans cadre au doigt » ne doit pas l'emporter
 * avec les bordures.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const lire = (chemin) => readFile(new URL(`../${chemin}`, import.meta.url), 'utf8');

const [battleCss, mobileCss, atelierCss, pageSource, cartesSource, signatureSource, smokeSource] = await Promise.all([
  lire('src/games/rpg-battle.css'),
  lire('src/games/rpg-mobile.css'),
  lire('src/games/rpg-deck-atelier.css'),
  lire('src/games/RpgDuelPage.jsx'),
  lire('src/games/rpgCards.js'),
  lire('src/games/rpgSortSignature.jsx'),
  lire('scripts/rpg-sort-signature-smoke.jsx'),
]);

// ── Le registre du catalogue : deux familles, et rien d'autre ────────────────
assert.match(cartesSource, /export const RPG_SORT_FAMILIES = \{\s*rapide: \{ key: 'rapide', label: 'Magie Rapide'/s,
  'la famille rapide se nomme comme le catalogue l’imprime — « Magie Rapide »');
assert.match(cartesSource, /sorcellerie: \{ key: 'sorcellerie', label: 'Sorcellerie'/,
  'la seconde famille se nomme « Sorcellerie »');
assert.match(cartesSource, /export function magieFamille\(carte\) \{\s*if \(carte\?\.kind !== 'magie' \|\| carteEstArme\(carte\)\) return null;\s*return carte\.instant \? 'rapide' : 'sorcellerie';/s,
  'la famille suit le drapeau `instant` du moteur, et exclut la magie qui se présente comme une arme');
assert.match(pageSource, /import \{ SortSceau, SortSocle, classeLigneFamille \} from '\.\/rpgSortSignature\.jsx';/,
  'le duel emprunte la signature à son module, comme l’atelier');
assert.match(signatureSource, /export function SortSocle\(/, 'le module partagé expose le socle');
assert.match(signatureSource, /export function SortSceau\(/, 'le module partagé expose le sceau');
assert.equal((signatureSource.match(/if \(!famille\) return null;/g) ?? []).length, 2,
  'le socle et le sceau ne rendent rien hors sort : c’est ce silence qui fait le repère');

// ── Le socle : forme, teinte, mot — trois canaux indépendants ────────────────
const socleRapide = battleCss.match(/\.rpg-sort-socle--rapide\s*\{([^}]*)\}/)?.[1] ?? '';
const socleSorcellerie = battleCss.match(/\.rpg-sort-socle--sorcellerie\s*\{([^}]*)\}/)?.[1] ?? '';
assert.match(socleRapide, /clip-path:\s*polygon\(/, 'la Magie Rapide se reconnaît à son chanfrein, même en noir et blanc');
assert.match(socleSorcellerie, /border-radius:\s*5\d% 5\d% 0 0/, 'la Sorcellerie se reconnaît à son arche');
assert.doesNotMatch(socleRapide, /border-radius:/, 'les deux familles ne partagent pas la même forme');
const teinteRapide = socleRapide.match(/rgba\((\d+), (\d+), (\d+)/);
const teinteSorcellerie = socleSorcellerie.match(/rgba\((\d+), (\d+), (\d+)/);
assert.ok(teinteRapide && teinteSorcellerie, 'chaque socle porte sa teinte');
assert.notDeepEqual(teinteRapide.slice(1), teinteSorcellerie.slice(1),
  'l’or de la Magie Rapide et l’améthyste de la Sorcellerie ne sont pas la même couleur');
assert.match(battleCss, /\.rpg-sort-socle\s*\{[^}]*height:\s*22%;[^}]*font:\s*800 calc\(var\(--rpg-card-marker-size, 24px\)/s,
  'le socle suit le repère de couleur de sa face — 22 px en main au doigt, 56 px sur la fiche — au lieu d’une mesure parallèle');
assert.match(battleCss, /\.rpg-sort-socle__mot\s*\{[^}]*text-overflow:\s*ellipsis;/s,
  'le mot du socle ne déborde jamais de la carte, si étroite soit-elle');
for (const [surface, regle] of [
  ['la main', /\.rpg-hand__card--img\s*\{\s*--rpg-card-marker-size:\s*28px;\s*\}/],
  ['la face au doigt', /\.rpg-battle--touch \.rpg-hand__card--img\s*\{\s*--rpg-card-marker-size:\s*22px;\s*\}/],
  ['l’aperçu et le catalogue', /\.rpg-hover-card-preview__face,\s*\.rpg-card-catalogue__art\s*\{\s*--rpg-card-marker-size:\s*38px;\s*\}/],
]) {
  assert.match(battleCss + mobileCss, regle, `${surface} annonce le repère que le socle suit`);
}

// ── Le sceau rond : les vignettes et le mulligan ─────────────────────────────
assert.match(battleCss, /\.rpg-sort-sceau--rapide\s*\{[^}]*radial-gradient\(circle at 34% 24%, #f8e69d, #8a5f0d/s,
  'le sceau de la Magie Rapide reprend l’or des pastilles du jeu');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*radial-gradient\(circle at 34% 24%, #e3d7fb, #4b3676/s,
  'le sceau de la Sorcellerie reprend l’améthyste');
assert.match(battleCss, /\.rpg-card-catalogue__sort,\s*\.rpg-atelier__carte-sort\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*8px;[^}]*left:\s*8px;[^}]*width:\s*var\(--rpg-card-marker-size, 38px\);/s,
  'le sceau des vignettes se pose au coin libre, en face du galet du coût, à l’échelle du repère');
assert.match(battleCss, /\.rpg-sort-sceau--rapide\s*\{[^}]*clip-path:\s*polygon\(/s,
  'le jeton de la Magie Rapide est chanfreiné, comme le socle : le repère se lit sans couleur');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*border-radius:\s*50%;/s,
  'le jeton de la Sorcellerie reste un médaillon rond — la forme du repère dit la famille');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-mulligan__sceau" \/>/,
  'la carte du mulligan monte le sceau, au-dessus de sa ligne de type');
assert.match(battleCss, /\.rpg-sort-sceau\s*\{[^}]*display:\s*grid;[^}]*aspect-ratio:\s*1;/s,
  'le jeton garde le carré : sans `aspect-ratio`, un chanfrein large s’ovaliserait');
assert.match(battleCss, /\.rpg-mulligan__sceau\s*\{\s*width:\s*clamp\(16px, 15cqw, 30px\);\s*font-size:\s*clamp\(9px, 7cqw, 15px\);\s*\}/s,
  'le sceau du mulligan prend la taille des repères de la carte, comme le coût et la pastille de couleur');
assert.match(atelierCss, /\.rpg-atelier__carte-art\s*\{[^}]*--rpg-card-marker-size:\s*30px;/s,
  'l’atelier annonce son repère : le sceau de sa collection suit la même échelle');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-card-catalogue__sort" \/>/,
  'la vignette du catalogue monte le sceau');

// ── Le mot écrit une seule fois : le socle remplace la ligne de type des sorts ─
assert.match(pageSource, /const familleSort = magieFamille\(carte\);\s*const peutRepondre = reponseActive && carte\.instant;/,
  'la main calcule la famille de la carte une seule fois, avant ses règles de jeu');
assert.match(pageSource, /familleSort \? `rpg-hand__card--famille-\$\{familleSort\}` : '',/,
  'la face en main porte la classe de sa famille');
assert.match(pageSource, /\{familleSort && <SortSocle carte=\{carte\} \/>\}\s*\{!estCreature && !familleSort && <span className="rpg-hand__type">\{cardFaceTypeLine\(carte\)\}<\/span>\}/,
  'en main, un sort porte le socle et n’imprime plus la petite ligne de type ; un terrain la garde');
assert.match(pageSource, /<SortSocle carte=\{carte\} \/>\s*<\/div>\s*\);\s*return \(\s*<aside/,
  'la face de l’aperçu — survol, appui long, fiche, annonce — porte le même socle');
assert.match(pageSource, /className=\{`rpg-hover-card-preview__type\$\{ligneFamille\}`\}/,
  'la ligne de type de l’aperçu prend la teinte de la famille');
assert.match(pageSource, /className=\{`rpg-card-catalogue__type\$\{classeLigneFamille\(carte\)\}`\}/,
  'la ligne de type du catalogue prend la même teinte');
assert.match(pageSource, /className=\{`rpg-mulligan__type\$\{familleSort \? ` rpg-mulligan__type--\$\{familleSort\}` : ''\}`\}/,
  'la ligne de type du mulligan prend la teinte et le fond de sa famille');
assert.match(pageSource, /className=\{`rpg-spell-played__eyebrow\$\{contre \? '' : classeLigneFamille\(carte\)\}`\}/,
  'l’annonce d’un sort joué prend la teinte de sa famille — un contre garde son or');

// ── Le repère survit au doigt : la règle « sans cadre » ne l’emporte pas ─────
const sansCadre = mobileCss.match(/\.rpg-battle\.rpg-battle--touch \[class\*="rpg-card--frame-"\]\[class\]\s*\{[^}]*\}/s)?.[0] ?? '';
assert.ok(sansCadre, 'la règle « sans cadre » des faces au doigt existe toujours');
assert.doesNotMatch(sansCadre, /rpg-sort-(socle|sceau|sigil)/,
  'le socle et le sceau ne sont pas des cadres : ils restent quand l’anneau part, au doigt comme dans l’APK');
assert.doesNotMatch(battleCss + mobileCss, /\.rpg-sort-(socle|sceau)[^{]*\{[^}]*display:\s*none/,
  'aucune surface n’éteint la signature des sorts');

// ── Le scénario réel : le duel, le mulligan et le catalogue ──────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-sort-signature-smoke.jsx', outDir: 'node_modules/.cache/rpg-sort-signature', emptyOutDir: true },
});
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

try {
  const { checkRpgSortSignature } = await import('../node_modules/.cache/rpg-sort-signature/rpg-sort-signature-smoke.js');
  await checkRpgSortSignature(assert);
} finally {
  dom.window.close();
}

assert.match(smokeSource, /le socle est là si et seulement si/, 'le scénario tient l’équivalence, dans les deux sens');
