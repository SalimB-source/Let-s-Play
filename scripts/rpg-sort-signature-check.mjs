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

// ── Le sceau : forme et couleur de la famille, jamais de l'élément ──────────
const sceauRapide = battleCss.match(/\.rpg-sort-sceau--rapide\s*\{([^}]*)\}/)?.[1] ?? '';
const sceauSorcellerie = battleCss.match(/\.rpg-sort-sceau--sorcellerie\s*\{([^}]*)\}/)?.[1] ?? '';
assert.match(sceauRapide, /--rpg-sort-sceau-sombre:\s*#ffd619;/,
  'le losange de Magie Rapide est jaune, avec la teinte #ffd619 de sa famille');
assert.match(sceauSorcellerie, /--rpg-sort-sceau-sombre:\s*#b39ae0;/,
  'le médaillon de Sorcellerie est violet, avec la teinte #b39ae0 de sa famille');
assert.match(sceauRapide, /--rpg-sort-sceau-encre:\s*#3b2c00;/,
  'l’éclair garde une encre sombre et lisible sur le jaune');
assert.match(sceauSorcellerie, /--rpg-sort-sceau-encre:\s*#321d4d;/,
  'l’étincelle garde une encre sombre et lisible sur le violet');
assert.match(battleCss, /\.rpg-sort-sigil\s*\{[^}]*fill:\s*currentColor;/,
  'le dessin SVG reçoit bien l’encre contrastée de son sceau');
assert.match(signatureSource, /import \{ magieFamilleInfo \} from '\.\/rpgCards\.js';/,
  'le sceau ne consulte plus les couleurs élémentaires de la carte');
assert.doesNotMatch(signatureSource, /cardColors|cardFrameColor|cardHybridGradient|rpg-sort-sceau--element|rpg-sort-sceau--hybride/,
  'aucun élément ni dégradé hybride ne pilote plus la couleur du sceau');
assert.doesNotMatch(battleCss, /\.rpg-sort-sceau--(?:element|hybride)/,
  'les anciennes variantes élémentaires et hybrides du sceau sont retirées');
assert.match(battleCss, /\.rpg-sort-sceau--rapide::before\s*\{[^}]*background:\s*var\(--rpg-sort-sceau-fond\);/,
  'l’intérieur du losange prend le jaune de sa famille');
assert.match(battleCss, /\.rpg-sort-sceau--sorcellerie\s*\{[^}]*background:\s*var\(--rpg-sort-sceau-fond\);/,
  'le médaillon rond prend le violet de sa famille');
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

// ── La lueur de jouabilité : l'azur pour toute la main, l'or pour les mythiques
// Le halo de la main garde une seule règle d'allumage — `is-playable`, posé sur
// le même verdict que le clic et le glisser-déposer, mana compris —, et sa
// teinte ne dépend plus ni du type ni de la famille de la carte : l'azur est
// déclaré par la règle commune, donc c'est la lueur de toute la main (créature,
// héros, terrain, arme, Magie Rapide, Sorcellerie). C'est le cyan des cartes
// jouables de MTG Arena, serré contre la face. La SEULE autre teinte de la
// feuille est l'or d'une carte mythique jouable.
const haloMain = battleCss.match(/\.rpg-hand__card\.is-playable\s*\{([^}]*)\}/s)?.[1] ?? '';
const haloSurvol = battleCss.match(/\.rpg-hand__card\.is-playable:hover:not\(:disabled\)\s*\{([^}]*)\}/s)?.[1] ?? '';
assert.ok(haloMain && haloSurvol, 'la main allume ses cartes jouables, au repos comme au survol');
assert.match(haloMain, /rgba\(var\(--rpg-play-halo-clair\), 1\)/,
  'l’anneau du halo lit la teinte commune : la lueur ne dit plus la famille, seulement « cette carte part »');
assert.match(haloMain, /rgba\(var\(--rpg-play-halo\), \.9\)/,
  'le halo extérieur suit la même variable, presque opaque : un halo, une teinte');
assert.match(haloSurvol, /rgba\(var\(--rpg-play-halo-clair\), 1\)/,
  'le survol éclaircit l’anneau, densité pleine');
assert.doesNotMatch(haloMain + haloSurvol, /border-color:/,
  'le halo ne repeint jamais la bordure : la couleur du cadre reste celle de l’élément');

// Les lueurs de famille ont disparu : plus d'or de Magie Rapide, plus
// d'améthyste de Sorcellerie dans le halo de la main.
assert.doesNotMatch(battleCss, /\.rpg-hand__card--famille-(rapide|sorcellerie)\s*\{[^}]*--rpg-play-halo/s,
  'aucune famille de sorts ne déclare plus sa teinte de halo : la main s’allume d’une seule couleur');
assert.doesNotMatch(battleCss, /--rpg-play-halo[^;]*\b179, 154, 224/,
  'l’améthyste de la Sorcellerie a quitté la lueur de jouabilité');
assert.doesNotMatch(battleCss, /--rpg-play-halo[^;]*\b255, 255, 255/,
  'le blanc n’est plus la lueur de la main : l’azur de l’arène l’a remplacé');

const triplet = (nom, bloc) => bloc.match(new RegExp(`--${nom}:\\s*(\\d+), (\\d+), (\\d+);`))?.slice(1).map(Number) ?? null;
const azur = triplet('rpg-play-halo', haloMain);
const azurClair = triplet('rpg-play-halo-clair', haloMain);
assert.deepEqual(azur, [0, 180, 255],
  `la lueur de la main est l’azur des cartes jouables de MTG Arena (reçu : ${azur?.join(', ')})`);
assert.deepEqual(azurClair, [130, 238, 255], 'et son reflet de survol un cyan plus clair');
// C’est bien un CYAN : le bleu domine, le vert le suit de près, le rouge s’efface.
assert.ok(azur[2] > 200 && azur[1] > 150 && azur[0] < 60,
  'l’azur de la lueur est un cyan franc — ni un bleu marine, ni du blanc');

// L'or mythique : la seule seconde teinte, et elle n'appartient qu'aux mythiques.
const haloMythique = battleCss.match(/\.rpg-hand__card\.is-mythique-jouable\.is-playable\s*\{([^}]*)\}/s)?.[1] ?? '';
assert.ok(haloMythique, 'une carte mythique jouable porte sa propre règle de lueur');
const orMythique = triplet('rpg-play-halo', haloMythique);
const orMythiqueClair = triplet('rpg-play-halo-clair', haloMythique);
assert.ok(orMythique && orMythiqueClair, 'la lueur mythique déclare ses deux triplets');
assert.ok(orMythique[0] > 200 && orMythique[1] > 120 && orMythique[2] < 80,
  `la lueur mythique est jaune-orange (reçu : ${orMythique.join(', ')})`);
assert.notDeepEqual(orMythique, azur, 'une mythique ne s’allume pas de l’azur de la main');
const clarte = ([rouge, vert, bleu]) => 0.299 * rouge + 0.587 * vert + 0.114 * bleu;
assert.ok(clarte(orMythiqueClair) > clarte(orMythique),
  'le reflet de survol de la lueur mythique est plus clair que son or');
assert.doesNotMatch(haloMythique, /border-color:/,
  'la lueur d’or ne repeint pas la bordure : le filet garde la couleur de l’élément');
assert.match(battleCss, /@keyframes rpg-mythique-halo-pulse\s*\{/,
  'la lueur mythique respire — une animation d’or, pas l’ancien chakra orange');
assert.doesNotMatch(battleCss, /rpg-mythique-kyubi-pulse|251, 113, 22/,
  'l’orange de l’ancienne lueur « Kyûbi » a disparu');
// Une seule règle par état : la lueur mythique n'est pas rejouée en double.
assert.equal((battleCss.match(/\.rpg-hand__card\.is-mythique-jouable\.is-playable\s*\{/g) ?? []).length, 2,
  'deux règles seulement pour la lueur mythique : au repos (et son animation), et sous `prefers-reduced-motion`');

// La cascade réelle : jsdom relit la feuille et rend la teinte que reçoit chaque face.
const cascadeHalo = new JSDOM(
  `<!doctype html><html><head><style>${battleCss}</style></head><body>
    <button class="rpg-hand__card is-playable rpg-hand__card--famille-rapide" data-test="rapide"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--famille-sorcellerie" data-test="sorcellerie"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-creature" data-test="creature"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-terrain" data-test="terrain"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-arme" data-test="arme"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-magie rpg-hand__card--famille-rapide is-mythique-jouable" data-test="mythique-magie"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-creature is-mythique-jouable" data-test="mythique-creature"></button>
    <button class="rpg-hand__card is-playable rpg-hand__card--type-creature rpg-card--mythique" data-test="mythique-non-jouable"></button>
  </body></html>`,
  { pretendToBeVisual: true },
);
const elementHalo = (test) => cascadeHalo.window.document.querySelector(`[data-test="${test}"]`);
const teinteRecue = (test) => cascadeHalo.window.getComputedStyle(elementHalo(test))
  .getPropertyValue('--rpg-play-halo').replaceAll(' ', '');
// Toute la main — le sort, l'arme, la créature, le terrain : azur.
for (const face of ['rapide', 'sorcellerie', 'creature', 'terrain', 'arme']) {
  assert.equal(teinteRecue(face), azur.join(','),
    `${face} : la lueur de jouabilité est l’azur commun`);
  assert.equal(cascadeHalo.window.getComputedStyle(elementHalo(face))
    .getPropertyValue('--rpg-play-halo-clair').replaceAll(' ', ''), azurClair.join(','),
  `${face} : le reflet au survol reste le cyan clair`);
}
// La rareté, et elle seule, passe à l'or — quel que soit le type.
for (const face of ['mythique-magie', 'mythique-creature']) {
  assert.equal(teinteRecue(face), orMythique.join(','),
    `${face} : une mythique jouable s’allume d’or`);
}
assert.equal(teinteRecue('mythique-non-jouable'), azur.join(','),
  'une mythique INJOUABLE ne porte pas la classe : elle garde l’azur de la règle commune, sans lueur d’or');
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
// La teinte est portée par les deux triplets de la règle commune, sans repli
// écrit dans `var()`.
// Trois formes de couche : l'anneau (`0 0 0 2px`, un aplat collé au bord), le
// liseré et le halo (`0 0 Npx`, éventuellement étalé de `Mpx`).
const couchesHalo = (bloc) => [...bloc.matchAll(
  /0 0 (?:0 (\d+)px|(\d+)px(?: (\d+)px)?) rgba\(var\(--rpg-play-halo(?:-clair)?(?:, [\d, ]+)?\), (\d*\.?\d+)\)/g,
)].map(([, anneau, flou, etalement, densite]) => ({
  flou: anneau ? 0 : +flou,
  etalement: anneau ? +anneau : +(etalement ?? 0),
  densite: +densite,
}));
const envergure = (couches) => Math.max(...couches.map(({ flou, etalement }) => flou + etalement));
const couchesMain = couchesHalo(haloMain);
const couchesSurvol = couchesHalo(haloSurvol);
assert.equal(couchesMain.length, 3,
  'le halo d’une carte jouable pose trois couches : l’anneau, le liseré rapproché et le halo extérieur');
// Concentré, comme dans MTG Arena : la lueur meurt à une dizaine de pixels de la
// face. L’ancien halo s’étalait sur 22 px au repos et 30 px au survol.
assert.equal(envergure(couchesMain), 10,
  `le halo se serre contre la carte : 9 px de flou, 1 px d’étalement (reçu : ${envergure(couchesMain)} px)`);
assert.equal(envergure(couchesSurvol), 17,
  `au survol, il s’élargit à peine : 15 px de flou et 2 px d’étalement (reçu : ${envergure(couchesSurvol)} px)`);
assert.ok(envergure(couchesMain) <= 12 && envergure(couchesSurvol) <= 20,
  'concentré : jamais les 22 px d’avant, ni les 30 px du survol d’avant');

// La mythique, elle aussi, reste concentrée : l’or respire, il ne s’étale pas.
const couchesMythique = couchesHalo(haloMythique);
assert.ok(couchesMythique.length >= 3, 'la lueur mythique pose ses couches comme la commune');
assert.ok(envergure(couchesMythique) <= 20,
  `la lueur mythique reste concentrée (reçu : ${envergure(couchesMythique)} px, plafond 20)`);
assert.ok(envergure(couchesMythique) > envergure(couchesMain),
  'la mythique respire un cran plus large que la main, sans jamais rayonner');
assert.ok(Math.min(...couchesMain.map(({ densite }) => densite)) >= 0.8,
  `chaque couche du halo est presque opaque : c’est le contraste qui rend le voyant lisible (reçu : ${couchesMain.map(({ densite }) => densite).join(', ')})`);
assert.ok(Math.min(...couchesSurvol.map(({ densite }) => densite)) >= 0.9,
  `au survol, la lueur est pleine (reçu : ${couchesSurvol.map(({ densite }) => densite).join(', ')})`);
assert.match(haloMain, /0 0 3px rgba\(var\(--rpg-play-halo-clair\), \.95\)/,
  'un liseré de 3 px sature le bord de la carte, dans le reflet clair de la main');
assert.match(haloMain, /0 0 9px 1px rgba\(var\(--rpg-play-halo\), \.9\)/,
  'le halo extérieur tient en 9 px : concentré, pas un projecteur');
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
