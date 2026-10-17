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

// ── Le sceau : forme de famille et couleur de la carte ──────────────────────
for (const couleur of ['braise', 'eau', 'sable', 'neige']) {
  const badge = battleCss.match(new RegExp(`\\.rpg-card-element-badge--${couleur}\\s*\\{([^}]*)\\}`))?.[1];
  const teintes = badge?.match(/radial-gradient\(circle at 34% 24%, (#[\da-f]+), (#[\da-f]+) 72%\)/)?.slice(1);
  const sceau = battleCss.match(new RegExp(`\\.rpg-sort-sceau--element-${couleur}\\s*\\{([^}]*)\\}`))?.[1];
  assert.ok(teintes && sceau, `le repère et le sceau ${couleur} sont déclarés`);
  assert.ok(sceau.includes(`--rpg-sort-sceau-clair: ${teintes[0]};`)
    && sceau.includes(`--rpg-sort-sceau-sombre: ${teintes[1]};`),
    `le sceau ${couleur} reprend les deux teintes du badge de couleur de la carte`);
}
assert.match(signatureSource, /const couleurs = cardColors\(carte\);[\s\S]*?rpg-sort-sceau--element-\$\{couleurs\[0\] \?\? 'sable'\}/,
  'la couleur du jeton vient de chaque carte, indépendamment de sa famille');
assert.match(cartesSource, /export function cardHybridGradient\(cardOrId\)[\s\S]*?CARD_FRAME_COLORS\[couleur\]\?\.color[\s\S]*?linear-gradient\(135deg, \$\{bandes\.join\(', '\)\}\)/,
  'le dégradé partagé peint chaque élément côte à côte avec sa teinte de cadre');
assert.match(signatureSource, /'--rpg-sort-sceau-fond-hybride': cardHybridGradient\(carte\)/,
  'le sceau des magies hybrides réutilise le même dégradé que leur coût');
assert.match(battleCss, /\.rpg-sort-sceau--hybride\s*\{[^}]*--rpg-sort-sceau-fond:\s*var\(--rpg-sort-sceau-fond-hybride\)/,
  'la teinte hybride remplace le dégradé monochrome sur les deux formes');
assert.match(battleCss, /\.rpg-sort-sceau--rapide::before\s*\{[^}]*background:\s*var\(--rpg-sort-sceau-fond\);/,
  'l’intérieur du losange prend la couleur de la carte');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*background:\s*var\(--rpg-sort-sceau-fond\);/,
  'le médaillon rond prend la même couleur de carte');
assert.match(battleCss, /\.rpg-card-catalogue__sort,\s*\.rpg-atelier__carte-sort\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*8px;[^}]*left:\s*8px;[^}]*width:\s*var\(--rpg-card-marker-size, 38px\);/s,
  'le sceau des vignettes se pose au coin libre, en face du galet du coût, à l’échelle du repère');
assert.match(battleCss, /\.rpg-sort-sceau--rapide\s*\{[^}]*clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/s,
  'le jeton de la Magie Rapide est un losange : c’est lui qui porte la forme, maintenant que les socles se ressemblent');
assert.match(battleCss, /\.rpg-sort-sceau--rapide::before\s*\{[^}]*clip-path:\s*polygon\(/s,
  'l’arête claire du jeton est peinte dans la découpe — un liseré de bord serait coupé, lui, avec les coins du carré');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*border-radius:\s*50%;/s,
  'le jeton de la Sorcellerie reste un médaillon rond — la forme du repère dit la famille');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-mulligan__sceau rpg-mulligan__sort" \/>/,
  'la carte du mulligan monte le sceau aligné avec la couleur');
assert.match(battleCss, /\.rpg-sort-sceau\s*\{[^}]*display:\s*grid;[^}]*aspect-ratio:\s*1;/s,
  'le jeton garde son carré : sans `aspect-ratio`, le losange s’ovaliserait');
assert.match(battleCss, /\.rpg-hover-card-preview__sceau,\s*\.rpg-hover-card-preview__sort,\s*\.rpg-mulligan__sceau,\s*\.rpg-mulligan__sort\s*\{[^}]*bottom:\s*var\(--rpg-card-element-marker-top,\s*5%\);[^}]*left:\s*var\(--rpg-card-element-marker-left,\s*6%\);[^}]*width:\s*var\(--rpg-card-marker-size,\s*38px\);/s,
  'le sceau de l’aperçu et du mulligan prend la taille et l’alignement des repères de la carte, comme la pastille de couleur');
assert.match(atelierCss, /\.rpg-atelier__carte-art\s*\{[^}]*--rpg-card-marker-size:\s*30px;/s,
  'l’atelier annonce son repère : le sceau de sa collection suit la même échelle');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-card-catalogue__sort" \/>/,
  'la vignette du catalogue monte le sceau');

// ── La lueur de jouabilité : l'azur pour ce qui se pose, la famille pour un sort ─
// Le halo de la main garde une seule règle d'allumage — `is-playable`, posé sur
// le même verdict que le clic et le glisser-déposer, mana compris —, mais sa
// teinte suit la famille : l'or pour la Magie Rapide, l'améthyste pour la
// Sorcellerie, l'azur pour tout ce qui se POSE — créature, héros, terrain,
// arme. Les deux familles déclarent leur teinte une fois, avec leur signature ;
// l'azur, lui, n'est écrit qu'en repli de la règle commune, celle que lit toute
// face sans famille.
const haloMain = battleCss.match(/\.rpg-hand__card\.is-playable\s*\{([^}]*)\}/s)?.[1] ?? '';
const haloSurvol = battleCss.match(/\.rpg-hand__card\.is-playable:hover:not\(:disabled\)\s*\{([^}]*)\}/s)?.[1] ?? '';
assert.ok(haloMain && haloSurvol, 'la main allume ses cartes jouables, au repos comme au survol');
assert.match(haloMain, /rgba\(var\(--rpg-play-halo-clair, 176, 197, 255\), \.98\)/,
  'l’anneau du halo lit le reflet clair de la famille, l’azur pâle en repli — c’est lui que reçoivent créatures, terrains et armes');
assert.match(haloMain, /rgba\(var\(--rpg-play-halo, 77, 125, 255\), \.92\)/,
  'le flou extérieur suit la même variable, presque opaque : un halo, une teinte');
assert.match(haloSurvol, /rgba\(var\(--rpg-play-halo-clair, 176, 197, 255\), 1\)/,
  'le survol éclaircit l’anneau dans le reflet clair de la famille, densité pleine');
assert.doesNotMatch(haloMain + haloSurvol, /border-color:/,
  'le halo ne repeint jamais la bordure : la couleur du cadre reste celle de l’élément');
const haloDeFamille = (famille) => battleCss.match(new RegExp(`\\.rpg-hand__card--famille-${famille}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
const triplet = (nom, bloc) => bloc.match(new RegExp(`--${nom}:\\s*(\\d+), (\\d+), (\\d+);`))?.slice(1).map(Number) ?? null;
// L'azur des cartes qui se POSENT n'est déclaré nulle part : c'est le repli de
// la règle commune, celui que lit toute face sans famille.
const repli = (nom, bloc) => bloc.match(
  new RegExp(`--${nom}, (\\d+), (\\d+), (\\d+)`),
)?.slice(1).map(Number) ?? null;
const azur = repli('rpg-play-halo', haloMain);
const azurClair = repli('rpg-play-halo-clair', haloMain);
const or = triplet('rpg-play-halo', haloDeFamille('rapide'));
const orClair = triplet('rpg-play-halo-clair', haloDeFamille('rapide'));
const amethyste = triplet('rpg-play-halo', haloDeFamille('sorcellerie'));
const amethysteClair = triplet('rpg-play-halo-clair', haloDeFamille('sorcellerie'));
assert.ok(azur && azurClair && or && orClair && amethyste && amethysteClair,
  'les trois lueurs sont déclarées : l’azur en repli, l’or et l’améthyste par les familles');
assert.ok(azur[2] > azur[0] && azur[2] > azur[1],
  `la lueur des cartes qui se posent est bleue (reçu : ${azur.join(', ')})`);
assert.ok(or[0] > or[2] && or[1] > or[2],
  `la lueur de la Magie Rapide est jaune (reçu : ${or.join(', ')})`);
assert.ok(amethyste[0] > amethyste[1] && amethyste[2] > amethyste[1],
  `la lueur de la Sorcellerie est violette (reçu : ${amethyste.join(', ')})`);
assert.notDeepEqual(or, amethyste,
  'les deux familles ne s’allument pas de la même couleur');
assert.notDeepEqual(azur, or,
  'la Magie Rapide ne s’allume pas du bleu des cartes qui se posent');
assert.deepEqual(or, teinteRapide.slice(1).map(Number),
  'la Magie Rapide s’allume de l’or de son socle : le socle dit la famille, la lueur aussi');
assert.deepEqual(azur, [77, 125, 255],
  'et l’azur des cartes qui se posent est celui que la Magie Rapide portait avant l’échange');
assert.deepEqual(or, [255, 214, 25],
  'l’or de la Magie Rapide étant, lui, celui qui servait de repli avant l’échange');
assert.deepEqual(amethyste, teinteSorcellerie.slice(1).map(Number),
  'l’améthyste de la lueur est celle du socle et du jeton : une famille, une teinte');
const clarte = ([rouge, vert, bleu]) => 0.299 * rouge + 0.587 * vert + 0.114 * bleu;
assert.ok(clarte(azurClair) > clarte(azur) && clarte(orClair) > clarte(or) && clarte(amethysteClair) > clarte(amethyste),
  'les trois reflets de survol sont plus clairs que la teinte qu’ils éclairent');

// La cascade réelle : jsdom relit la feuille et rend la teinte que reçoit chaque face.
const cascadeHalo = new JSDOM(
  `<!doctype html><html><head><style>${battleCss}</style></head><body>
    <button class="rpg-hand__card is-playable rpg-hand__card--famille-rapide" data-test="rapide"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--famille-sorcellerie" data-test="sorcellerie"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-creature" data-test="creature"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-terrain" data-test="terrain"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-arme" data-test="arme"></button>
  </body></html>`,
  { pretendToBeVisual: true },
);
const teinteRecue = (test) => cascadeHalo.window.getComputedStyle(
  cascadeHalo.window.document.querySelector(`[data-test="${test}"]`),
).getPropertyValue('--rpg-play-halo').replaceAll(' ', '');
assert.equal(teinteRecue('rapide'), or.join(','),
  'une Magie Rapide jouable reçoit l’or de sa famille, pas le bleu des cartes qui se posent');
assert.equal(teinteRecue('sorcellerie'), amethyste.join(','),
  'une Sorcellerie jouable reçoit l’améthyste de la sienne');
for (const type of ['creature', 'terrain']) {
  assert.equal(teinteRecue(type), '255,255,255', `${type} : la lueur est blanche`);
  assert.equal(cascadeHalo.window.getComputedStyle(
    cascadeHalo.window.document.querySelector(`[data-test="${type}"]`),
  ).getPropertyValue('--rpg-play-halo-clair').replaceAll(' ', ''), '255,255,255',
  `${type} : le reflet au survol reste blanc`);
}
assert.equal(teinteRecue('arme'), '', 'les armes gardent l’azur en repli');
cascadeHalo.window.close();

// ── Un seul halo, le même contraste pour toute la main ──────────────────────
// La règle commune de `is-playable` décide de tout : l'allumage, l'empreinte et
// la densité. Un Désert, un Fennec et une Magie Rapide reçoivent donc le même
// box-shadow au pixel près — seule la teinte change, par les deux triplets de
// famille. Aucune règle ne rejoue la lueur d'une famille « plus fort » : ce
// serait deux contrastes dans la même main.
assert.doesNotMatch(battleCss, /\.rpg-hand__card--famille-(rapide|sorcellerie)[^{]*\{[^}]*box-shadow/,
  'aucune famille de sorts ne rejoue son propre halo : le contraste est celui de la main entière');
assert.equal((battleCss.match(/\.rpg-hand__card\.is-playable\s*\{/g) ?? []).length, 1,
  'une seule règle dessine le halo d’une carte jouable, quelle que soit sa famille');
assert.equal((battleCss.match(/\.rpg-hand__card\.is-playable:hover:not\(:disabled\)\s*\{/g) ?? []).length, 1,
  'une seule règle le renforce au survol');
// Les couches de teinte : anneau (`flou` 0), auréole rapprochée, flou extérieur.
// La teinte a un repli d'azur (`var(--rpg-play-halo, 77, 125, 255)`), celle des
// familles est nue : le motif accepte l'un et l'autre, sinon la comparaison
// porterait sur zéro couche et passerait toute seule.
const couchesHalo = (bloc) => [...bloc.matchAll(
  /0 0 (\d+)px(?: (\d+)px)? rgba\(var\(--rpg-play-halo(?:-clair)?(?:, [\d, ]+)?\), (\d*\.?\d+)\)/g,
)].map(([, flou, etalement, densite]) => ({
  flou: +flou,
  etalement: +(etalement ?? 0),
  densite: +densite,
}));
const envergure = (couches) => Math.max(...couches.map(({ flou, etalement }) => flou + etalement));
const couchesMain = couchesHalo(haloMain);
const couchesSurvol = couchesHalo(haloSurvol);
assert.equal(couchesMain.length, 3,
  'le halo d’une carte jouable pose trois couches : l’anneau, l’auréole rapprochée et le flou extérieur');
assert.equal(envergure(couchesMain), 22,
  `le halo porte loin de 22 px (18 px de flou, 4 px d’étalement), comme avant la hausse de contraste (reçu : ${envergure(couchesMain)} px)`);
assert.equal(envergure(couchesSurvol), 30,
  `au survol, les rayons restent ceux d’origine : 24 px de flou et 6 px d’étalement (reçu : ${envergure(couchesSurvol)} px)`);
assert.ok(Math.min(...couchesMain.map(({ densite }) => densite)) >= 0.8,
  `chaque couche du halo est presque opaque : c’est le contraste qui rend le voyant lisible (reçu : ${couchesMain.map(({ densite }) => densite).join(', ')})`);
assert.ok(Math.min(...couchesSurvol.map(({ densite }) => densite)) >= 0.9,
  `au survol, la lueur est pleine (reçu : ${couchesSurvol.map(({ densite }) => densite).join(', ')})`);
assert.match(haloMain, /0 0 6px 1px rgba\(var\(--rpg-play-halo-clair, 176, 197, 255\), \.82\)/,
  'une auréole rapprochée sature le bord de la carte, dans le reflet clair de la famille');
assert.match(haloMain, /0 0 18px 4px rgba\(var\(--rpg-play-halo, 77, 125, 255\), \.92\)/,
  'le flou extérieur garde ses 18 px et gagne en densité');
assert.match(haloMain, /0 6px 16px rgba\(0, 0, 0, \.62\)/,
  'l’ombre portée s’assombrit pour que la lueur paraisse plus claire');
assert.doesNotMatch(haloMain + haloSurvol, /border-color:/,
  'le halo ne repeint jamais la bordure : la couleur du cadre reste celle de l’élément');

// ── Le sceau remplace la ligne de type sur les faces (main, aperçu, mulligan) ─
assert.match(pageSource, /const familleSort = magieFamille\(carte\);\s*const peutRepondre = reponseActive && carte\.instant;/,
  'la main calcule la famille de la carte une seule fois, avant ses règles de jeu');
assert.match(pageSource, /familleSort \? `rpg-hand__card--famille-\$\{familleSort\}` : '',/,
  'la face en main porte la classe de sa famille');
assert.match(pageSource, /\{familleSort && <SortSceau carte=\{carte\} className="rpg-hand__sceau rpg-hand__sort" \/>\}\s*\{estCreature && \(/,
  'en main, un sort porte son sceau coloré et aucune carte n’imprime de ligne de type');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-hover-card-preview__sceau rpg-hover-card-preview__sort" \/>/,
  'la face de l’aperçu — survol, appui long, fiche, annonce — porte le même sceau');
assert.match(pageSource, /className=\{`rpg-hover-card-preview__type\$\{ligneFamille\}`\}/,
  'la ligne de type de l’aperçu prend la teinte de la famille');
assert.match(pageSource, /className=\{`rpg-card-catalogue__type\$\{classeLigneFamille\(carte\)\}`\}/,
  'la ligne de type du catalogue prend la même teinte');
assert.match(pageSource, /<SortSceau carte=\{carte\} className="rpg-mulligan__sceau rpg-mulligan__sort" \/>/,
  'les sorts du mulligan portent le même sceau que la face de l’aperçu');
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

assert.match(smokeSource, /le sceau est là si et seulement si/, 'le scénario tient l’équivalence, dans les deux sens');
