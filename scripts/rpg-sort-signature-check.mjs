/**
 * La signature des familles de sorts — Magie Rapide et Sorcellerie.
 *
 * Deux volets : les assertions de source (les trois canaux du repère — forme
 * du **jeton**, teinte, mot — et le fait qu'aucune autre famille de carte ne
 * les porte), puis le scénario JSDOM qui monte le duel, le mulligan et le
 * catalogue réels.
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

// ── Le socle et le jeton : forme, teinte, mot — trois canaux indépendants ────
const socleRapide = battleCss.match(/\.rpg-sort-socle--rapide\s*\{([^}]*)\}/)?.[1] ?? '';
const socleSorcellerie = battleCss.match(/\.rpg-sort-socle--sorcellerie\s*\{([^}]*)\}/)?.[1] ?? '';
assert.match(socleSorcellerie, /border-radius:\s*58% 58% 0 0 \/ 30% 30% 0 0/,
  'le socle de la Sorcellerie est une voûte');
assert.match(socleRapide, /border-radius:\s*58% 58% 0 0 \/ 30% 30% 0 0/,
  'et celui de la Magie Rapide la même voûte — même traitement, liseré d’or');
assert.doesNotMatch(socleRapide, /clip-path:/,
  'plus de chanfrein au socle : son liseré d’or suivait la seule arête haute et coupait la carte en travers');
assert.match(socleRapide, /box-shadow:\s*inset 0 1px 0 var\(--rpg-sort-teinte\)/,
  'le liseré d’or suit donc la courbe, comme le liseré d’améthyste de la Sorcellerie');
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

// ── Le sceau : le losange de la Magie Rapide, le médaillon de la Sorcellerie ─
assert.match(battleCss, /\.rpg-sort-sceau--rapide::before\s*\{[^}]*radial-gradient\(circle at 34% 24%, #f8e69d, #8a5f0d/s,
  'la nappe du losange reprend l’or des pastilles du jeu — peinte dans la découpe, sous l’éclair');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*radial-gradient\(circle at 34% 24%, #e3d7fb, #4b3676/s,
  'le sceau de la Sorcellerie reprend l’améthyste');
assert.match(battleCss, /\.rpg-card-catalogue__sort,\s*\.rpg-atelier__carte-sort\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*8px;[^}]*left:\s*8px;[^}]*width:\s*var\(--rpg-card-marker-size, 38px\);/s,
  'le sceau des vignettes se pose au coin libre, en face du galet du coût, à l’échelle du repère');
assert.match(battleCss, /\.rpg-sort-sceau--rapide\s*\{[^}]*clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/s,
  'le jeton de la Magie Rapide est un losange : c’est lui qui porte la forme, maintenant que les socles se ressemblent');
assert.match(battleCss, /\.rpg-sort-sceau--rapide::before\s*\{[^}]*clip-path:\s*polygon\(/s,
  'l’arête claire du jeton est peinte dans la découpe — un liseré de bord serait coupé, lui, avec les coins du carré');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*border-radius:\s*50%;/s,
  'le jeton de la Sorcellerie reste un médaillon rond — la forme du repère dit la famille');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-mulligan__sceau" \/>/,
  'la carte du mulligan monte le sceau, au-dessus de sa ligne de type');
assert.match(battleCss, /\.rpg-sort-sceau\s*\{[^}]*display:\s*grid;[^}]*aspect-ratio:\s*1;/s,
  'le jeton garde son carré : sans `aspect-ratio`, le losange s’ovaliserait');
assert.match(battleCss, /\.rpg-mulligan__sceau\s*\{\s*width:\s*clamp\(16px, 15cqw, 30px\);\s*font-size:\s*clamp\(9px, 7cqw, 15px\);\s*\}/s,
  'le sceau du mulligan prend la taille des repères de la carte, comme le coût et la pastille de couleur');
assert.match(atelierCss, /\.rpg-atelier__carte-art\s*\{[^}]*--rpg-card-marker-size:\s*30px;/s,
  'l’atelier annonce son repère : le sceau de sa collection suit la même échelle');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-card-catalogue__sort" \/>/,
  'la vignette du catalogue monte le sceau');

// ── La lueur de jouabilité : l'or pour ce qui se pose, la famille pour un sort ─
// Le halo de la main garde une seule règle d'allumage — `is-playable`, posé sur
// le même verdict que le clic et le glisser-déposer, mana compris —, mais sa
// teinte suit la famille : azur pour la Magie Rapide, améthyste pour la
// Sorcellerie, l'or pour tout le reste. La teinte est déclarée une fois, avec
// la signature des familles ; la règle du halo ne fait que la lire.
const haloMain = battleCss.match(/\.rpg-hand__card\.is-playable\s*\{([^}]*)\}/s)?.[1] ?? '';
const haloSurvol = battleCss.match(/\.rpg-hand__card\.is-playable:hover:not\(:disabled\)\s*\{([^}]*)\}/s)?.[1] ?? '';
assert.ok(haloMain && haloSurvol, 'la main allume ses cartes jouables, au repos comme au survol');
assert.match(haloMain, /rgba\(var\(--rpg-play-halo, 255, 214, 25\), \.58\)/,
  'l’anneau du halo lit la teinte de la famille, l’or en repli — c’est lui que reçoivent créatures, terrains et armes');
assert.match(haloMain, /rgba\(var\(--rpg-play-halo, 255, 214, 25\), \.62\)/,
  'le flou extérieur suit la même variable : un halo, une teinte');
assert.match(haloSurvol, /rgba\(var\(--rpg-play-halo-clair, 255, 239, 156\), \.92\)/,
  'le survol éclaircit l’anneau dans le reflet clair de la famille');
assert.doesNotMatch(haloMain + haloSurvol, /border-color:/,
  'le halo ne repeint jamais la bordure : la couleur du cadre reste celle de l’élément');
const haloDeFamille = (famille) => battleCss.match(new RegExp(`\\.rpg-hand__card--famille-${famille}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
const triplet = (nom, bloc) => bloc.match(new RegExp(`--${nom}:\\s*(\\d+), (\\d+), (\\d+);`))?.slice(1).map(Number) ?? null;
const azur = triplet('rpg-play-halo', haloDeFamille('rapide'));
const azurClair = triplet('rpg-play-halo-clair', haloDeFamille('rapide'));
const amethyste = triplet('rpg-play-halo', haloDeFamille('sorcellerie'));
const amethysteClair = triplet('rpg-play-halo-clair', haloDeFamille('sorcellerie'));
assert.ok(azur && azurClair && amethyste && amethysteClair,
  'chaque famille annonce la teinte de sa lueur et le reflet clair de son survol');
assert.ok(azur[2] > azur[0] && azur[2] > azur[1],
  `la lueur de la Magie Rapide est bleue (reçu : ${azur.join(', ')})`);
assert.ok(amethyste[0] > amethyste[1] && amethyste[2] > amethyste[1],
  `la lueur de la Sorcellerie est violette (reçu : ${amethyste.join(', ')})`);
assert.notDeepEqual(azur, amethyste,
  'les deux familles ne s’allument pas de la même couleur');
assert.notDeepEqual(azur, teinteRapide.slice(1).map(Number),
  'la Magie Rapide quitte l’or de son socle pour l’azur : le socle dit la famille, la lueur dit l’état');
assert.deepEqual(amethyste, teinteSorcellerie.slice(1).map(Number),
  'l’améthyste de la lueur est celle du socle et du jeton : une famille, une teinte');
const clarte = ([rouge, vert, bleu]) => 0.299 * rouge + 0.587 * vert + 0.114 * bleu;
assert.ok(clarte(azurClair) > clarte(azur) && clarte(amethysteClair) > clarte(amethyste),
  'les deux reflets de survol sont plus clairs que la teinte qu’ils éclairent');

// La cascade réelle : jsdom relit la feuille et rend la teinte que reçoit chaque face.
const cascadeHalo = new JSDOM(
  `<!doctype html><html><head><style>${battleCss}</style></head><body>
    <button class="rpg-hand__card is-playable rpg-hand__card--famille-rapide" data-test="rapide"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--famille-sorcellerie" data-test="sorcellerie"></button>
    <button class="rpg-hand__card is-playable" data-test="creature"></button>
  </body></html>`,
  { pretendToBeVisual: true },
);
const teinteRecue = (test) => cascadeHalo.window.getComputedStyle(
  cascadeHalo.window.document.querySelector(`[data-test="${test}"]`),
).getPropertyValue('--rpg-play-halo').replaceAll(' ', '');
assert.equal(teinteRecue('rapide'), azur.join(','),
  'une Magie Rapide jouable reçoit l’azur de sa famille, pas l’or des cartes qui se posent');
assert.equal(teinteRecue('sorcellerie'), amethyste.join(','),
  'une Sorcellerie jouable reçoit l’améthyste de la sienne');
assert.equal(teinteRecue('creature'), '',
  'une créature, un terrain ou une arme ne déclarent aucune teinte : ils gardent l’or écrit dans la règle du halo');
cascadeHalo.window.close();

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
