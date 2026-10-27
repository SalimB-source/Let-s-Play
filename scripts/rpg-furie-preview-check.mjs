/**
 * La Furie se voit dans la preview de la carte.
 * node scripts/rpg-furie-preview-check.mjs
 *
 * Tant qu'une créature avec Furie reste sous sa DEF de base, elle change
 * de visuel sur la table : peinture « furie » pleine page, sans cadre, et
 * attaque renforcée (+X/+0). Sa preview — survol, appui long, fiche du clic
 * droit — doit montrer ce même visuel, pas la carte d'avant la blessure.
 * La carte posée étiquette donc son état (`data-furie-*`, comme ses armes
 * en `data-armes`), chaque geste de consultation le transmet, et l'aperçu
 * rapide, d'ordinaire texte seul, rend sa face à la créature en Furie.
 *
 * Les quatre porteurs humains sont livrés en photoréaliste fantaisiste :
 * la face intacte et son double ensanglanté partagent le format 4:5 de la
 * carte et, sauf la face de base du Berserk repeinte calme et sans sang,
 * une même révision de cache. Le Loup des neiges garde son huile :
 * même meute, chef ensanglanté, et le Corbeau des neuf nuits donne les deux
 * faces de Furie de son Berserk du crépuscule et de sa Valkyrie des neuf nuits.
 * L'Ifrit d'encre, seul porteur de Furie de la Tour oubliée (hors catalogue),
 * est contrôlé à part avec la même exigence de ratio et de révision.
 * Une vignette rouge animée serre les bords de
 * la créature en Furie, sur la table comme dans sa preview.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const artSource = readFileSync(new URL('../src/games/rpgCardArt.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const glossaire = readFileSync(new URL('../src/games/effetIcons.js', import.meta.url), 'utf8');

const REVISION_PHOTOREALISTE = 'furie-photorealiste-v1';
const REVISION_BERSERK_BASE = 'berserk-meme-visage-sans-sang-v1';
const REVISION_LOUP_FURIE = 'loup-furie-huile-v1';
const REVISION_VALKYRIE_FURIE = 'valkyrie-vol-plongeon-enragee-v4';
// Le Corbeau des neuf nuits : deux cartes du set hybride portent la Furie et
// ont leur propre double ensanglanté, daté séparément.
const REVISIONS_CORBEAU_FURIE = {
  'berserk-du-crepuscule-furie': 'corbeau-furie-crepuscule-v1',
  'valkyrie-des-neuf-nuits-furie': 'corbeau-furie-neuf-nuits-v1',
};
// La Tour Oubliée est hors catalogue : son Ifrit d'encre porte Furie 1 et
// contrôle donc sa face déclenchée à part, sous sa propre révision.
const REVISION_TOUR_FURIE = 'tour-furie-encre-v1';
const CARTES_PHOTOREALISTES = [
  'guerrier-au-bouclier-rond',
  'berserk-des-trois-hivers',
  'jarl-au-marteau-de-guerre',
  'maitre-du-marteau',
];

/** Largeur et hauteur d'un JPEG, lues dans son en-tête SOF. */
function dimensionsJpeg(url) {
  const octets = readFileSync(url);
  if (octets[0] !== 0xff || octets[1] !== 0xd8) throw new Error(`${url} n’est pas un JPEG`);
  for (let i = 2; i + 9 < octets.length;) {
    if (octets[i] !== 0xff) { i += 1; continue; }
    const balise = octets[i + 1];
    const estSof = balise >= 0xc0 && balise <= 0xcf
      && ![0xc4, 0xc8, 0xcc].includes(balise);
    if (estSof) return [octets.readUInt16BE(i + 7), octets.readUInt16BE(i + 5)];
    i += 2 + octets.readUInt16BE(i + 2);
  }
  throw new Error(`dimensions introuvables dans ${url}`);
}

// ── 1. Les aperçus, rendus pour de vrai ─────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-furie-preview-smoke.jsx', outDir: 'node_modules/.cache/rpg-furie-preview', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreApercusFurie } = await import('../node_modules/.cache/rpg-furie-preview/rpg-furie-preview-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendreApercusFurie()}</body></html>`);
const document = window.document;
const cas = (nom) => document.querySelector(`[data-cas="${nom}"]`);
const aUnCadre = (element) => [...(element?.classList ?? [])].some((classe) => classe.startsWith('rpg-card--frame-'));
const statsDe = (racine) => [
  racine.querySelector('.rpg-hover-card-preview__face .rpg-card__stat--atk .rpg-stat-value')?.textContent,
  racine.querySelector('.rpg-hover-card-preview__face .rpg-card__pt .rpg-stat-value')?.textContent,
];

try {
  const normal = cas('normal-catalogue');
  const faceNormale = normal.querySelector('.rpg-hover-card-preview__face');
  assert.ok(faceNormale, 'la fiche du Jarl intact montre sa face');
  assert.match(faceNormale.querySelector('img').getAttribute('src') ?? '', /cards\/jarl-au-marteau-de-guerre\.jpg/,
    'avant la blessure, la preview garde la peinture normale');
  assert.match(faceNormale.querySelector('img').getAttribute('src') ?? '', new RegExp(`jarl-au-marteau-de-guerre\\.jpg\\?v=${REVISION_PHOTOREALISTE}`),
    'sous sa révision photoréaliste, pour écarter l’ancien visuel du cache');
  assert.ok(aUnCadre(faceNormale), 'et son cadre d’élément');
  assert.deepEqual(statsDe(normal), ['3', '5'], 'les statistiques imprimées restent celles de la carte neuve');
  assert.equal(normal.querySelector('.rpg-hover-card-preview__furie'), null,
    'aucune Furie n’est annoncée tant que ses PV atteignent sa DEF de base');
  assert.equal(normal.querySelector('.rpg-furie-vignette'), null,
    'et aucune vignette rouge ne voile la carte intacte');

  const furie = cas('furie-catalogue');
  const racineFurie = furie.querySelector('.rpg-hover-card-preview');
  const faceFurie = furie.querySelector('.rpg-hover-card-preview__face');
  assert.ok(faceFurie, 'la fiche du Jarl en Furie montre sa face');
  assert.match(faceFurie.querySelector('img').getAttribute('src') ?? '', /cards\/jarl-au-marteau-de-guerre-furie\.jpg/,
    'la preview affiche la peinture furie, celle de la table');
  assert.match(faceFurie.querySelector('img').getAttribute('src') ?? '', new RegExp(`jarl-au-marteau-de-guerre-furie\\.jpg\\?v=${REVISION_PHOTOREALISTE}`),
    'et cette peinture est elle aussi datée contre les caches');
  assert.ok(faceFurie.classList.contains('is-furie'), 'la face se nomme en Furie');
  assert.equal(faceFurie.getAttribute('data-furie-declenchee'), 'true', 'et expose son état');
  const vignetteFurie = faceFurie.querySelector('.rpg-furie-vignette');
  assert.ok(vignetteFurie, 'la vignette rouge de la Furie voile les bords de la face');
  assert.equal(vignetteFurie.getAttribute('aria-hidden'), 'true', 'pure décoration : rien à lire dessus');
  assert.equal(aUnCadre(faceFurie), false, 'aucune classe de cadre ne rogne la peinture pleine page');
  assert.ok(racineFurie.classList.contains('rpg-hover-card-preview--furie'),
    'le panneau entier quitte le cadre de la carte intacte');
  assert.deepEqual(statsDe(furie), ['5', '4'], 'la face imprime +3/+0 : seule l’attaque a grandi');
  assert.match(furie.querySelector('.rpg-hover-card-preview__furie')?.textContent ?? '', /Furie déclenchée — 5\/4/,
    'les détails nomment l’état et ses statistiques du moment');
  assert.match(racineFurie.getAttribute('aria-label') ?? '', /Furie déclenchée, attaque 5, défense 4/,
    'la lecture accessible suit le même visuel');

  const rapideNormal = cas('normal-rapide').querySelector('.rpg-hover-card-preview');
  assert.ok(rapideNormal.classList.contains('rpg-hover-card-preview--texte-seul'),
    'l’aperçu rapide d’une carte intacte reste texte seul');
  assert.equal(rapideNormal.querySelector('.rpg-hover-card-preview__face'), null,
    'sans illustration, comme avant');

  for (const nom of ['furie-rapide', 'furie-appui-long']) {
    const rapideFurie = cas(nom).querySelector('.rpg-hover-card-preview');
    assert.equal(rapideFurie.classList.contains('rpg-hover-card-preview--texte-seul'), false,
      `${nom} : la Furie rend sa face à la preview rapide`);
    const faceRapide = rapideFurie.querySelector('.rpg-hover-card-preview__face');
    assert.match(faceRapide?.querySelector('img').getAttribute('src') ?? '', /-furie\.jpg/,
      `${nom} : le changement de visuel se voit dès la preview`);
    assert.deepEqual(statsDe(rapideFurie), ['5', '4'], `${nom} : avec les statistiques du moment`);
    assert.ok(faceRapide?.querySelector('.rpg-furie-vignette'), `${nom} : la vignette rouge pulse aussi dans la preview rapide`);
  }

  const carteTableNormale = cas('normal-table').querySelector('.rpg-card');
  assert.ok(carteTableNormale, 'le Jarl intact se rend aussi sur la table');
  assert.equal(carteTableNormale.classList.contains('is-furie'), false,
    'sans la classe Furie tant que la blessure n’a pas enflammé la créature');
  assert.match(carteTableNormale.querySelector('.rpg-card__img').getAttribute('src') ?? '', new RegExp(`jarl-au-marteau-de-guerre\\.jpg\\?v=${REVISION_PHOTOREALISTE}`),
    'la table montre le nouveau visuel intact, sous sa révision');
  assert.equal(carteTableNormale.querySelector('.rpg-furie-vignette'), null,
    'et ses bords restent libres de toute vignette rouge');

  const carteTableFurie = cas('furie-table').querySelector('.rpg-card');
  assert.ok(carteTableFurie, 'le Jarl déclenché se rend sur la table');
  assert.ok(carteTableFurie.classList.contains('is-furie'), 'la carte posée se nomme en Furie');
  assert.match(carteTableFurie.querySelector('.rpg-card__img').getAttribute('src') ?? '', new RegExp(`jarl-au-marteau-de-guerre-furie\\.jpg\\?v=${REVISION_PHOTOREALISTE}`),
    'avec son double ensanglanté, daté comme dans la preview');
  assert.ok(carteTableFurie.querySelector('.rpg-furie-vignette'),
    'la vignette rouge pulse donc aussi sur la créature posée');

  const loupTableNormal = cas('loup-normal-table').querySelector('.rpg-card');
  assert.ok(loupTableNormal, 'le Loup intact se rend sur la table');
  assert.equal(loupTableNormal.classList.contains('is-furie'), false,
    'à sa DEF de base, il garde sa face ordinaire');
  assert.match(loupTableNormal.querySelector('.rpg-card__img').getAttribute('src') ?? '', /cards\/loup-des-neiges\.jpg\?v=peintures-definitives-v3/,
    'avec l’huile intacte de la meute, datée par le set Neige');

  const loupTableFurie = cas('loup-furie-table').querySelector('.rpg-card');
  assert.ok(loupTableFurie, 'le Loup blessé se rend sur la table');
  assert.ok(loupTableFurie.classList.contains('is-furie'), 'sa Furie 1 est active sous sa DEF de base');
  assert.equal(loupTableFurie.getAttribute('data-furie-atk'), '3', 'le Loup passe de 2 à 3 d’attaque');
  assert.equal(loupTableFurie.getAttribute('data-furie-def'), '1', 'sans gagner le moindre point de défense');
  assert.ok((loupTableFurie.querySelector('.rpg-card__img').getAttribute('src') ?? '')
    .includes(`loup-des-neiges-furie.jpg?v=${REVISION_LOUP_FURIE}`),
    'avec le chef de meute ensanglanté, sous sa révision dédiée');
  assert.ok(loupTableFurie.querySelector('.rpg-furie-vignette'),
    'la vignette rouge serre aussi la meute en Furie');
} finally {
  window.close();
}

// ── 2. Chaque carte à Furie a sa peinture alternative ──────────────────────
const cartesFurie = RPG_DUEL_CARDS.filter((carte) => carte.furie);
assert.equal(cartesFurie.length, 8,
  'quatre humains, le Loup, la Valkyrie au corbeau, le Berserk du crépuscule et la Valkyrie des neuf nuits portent la Furie');
for (const carte of cartesFurie) {
  const artId = carte.art ?? carte.id;
  assert.ok(existsSync(new URL(`../public/cards/${artId}-furie.jpg`, import.meta.url)),
    `${carte.id} a sa peinture furie (${artId}-furie.jpg)`);
}

// Les huit visuels photoréalistes validés sont livrés au format exact de la
// face, et leurs URL sont datées : une peinture remplacée sous le même nom
// de fichier ne doit jamais revenir d'un cache sous son ancien visage.
for (const carteId of CARTES_PHOTOREALISTES) {
  const carte = cartesFurie.find((candidate) => candidate.id === carteId);
  assert.ok(carte, `${carteId} fait partie des cartes à Furie du catalogue`);
  const artId = carte.art ?? carte.id;
  assert.equal(artId, carteId, `${carteId} affiche son illustration dédiée`);
  for (const illustration of [artId, `${artId}-furie`]) {
    const url = new URL(`../public/cards/${illustration}.jpg`, import.meta.url);
    assert.ok(existsSync(url), `${illustration}.jpg est livré avec le jeu`);
    assert.deepEqual(dimensionsJpeg(url), [1024, 1280],
      `${illustration}.jpg est au format exact 4:5 de la face`);
    const revision = illustration === 'berserk-des-trois-hivers'
      ? REVISION_BERSERK_BASE
      : REVISION_PHOTOREALISTE;
    assert.match(artSource, new RegExp(`'${illustration}': '${revision}'`),
      `${illustration}.jpg est daté dans l’URL sous ${revision}`);
  }
}

// Le Loup ne rejoint pas la dérogation photoréaliste, mais son double
// ensanglanté est livré au même format exact et daté séparément.
const loupFurie = new URL('../public/cards/loup-des-neiges-furie.jpg', import.meta.url);
assert.deepEqual(dimensionsJpeg(loupFurie), [1024, 1280],
  'loup-des-neiges-furie.jpg est au format exact 4:5 de la face');
assert.match(artSource, new RegExp(`'loup-des-neiges-furie': '${REVISION_LOUP_FURIE}'`),
  `loup-des-neiges-furie.jpg est daté dans l’URL sous ${REVISION_LOUP_FURIE}`);

// La Valkyrie repart de sa scène intacte : enragée et ensanglantée, épée levée,
// elle vole dans le ciel et plonge vers sa cible avec son corbeau noir.
const valkyrieFurie = new URL('../public/cards/valkyrie-au-corbeau-furie.jpg', import.meta.url);
assert.deepEqual(dimensionsJpeg(valkyrieFurie), [1024, 1280],
  'valkyrie-au-corbeau-furie.jpg est au format exact 4:5 de la face');
assert.match(artSource, new RegExp(`'valkyrie-au-corbeau-furie': '${REVISION_VALKYRIE_FURIE}'`),
  `valkyrie-au-corbeau-furie.jpg est daté sous ${REVISION_VALKYRIE_FURIE}`);

// Le Corbeau des neuf nuits donne lui aussi ses deux faces de Furie : chacune
// reprend la composition de sa peinture intacte, ensanglantée et enragée, au
// format exact de la face et sous sa propre révision.
for (const [illustration, revision] of Object.entries(REVISIONS_CORBEAU_FURIE)) {
  const url = new URL(`../public/cards/${illustration}.jpg`, import.meta.url);
  assert.ok(existsSync(url), `${illustration}.jpg est livré avec le jeu`);
  assert.deepEqual(dimensionsJpeg(url), [1024, 1280],
    `${illustration}.jpg est au format exact 4:5 de la face`);
  assert.match(artSource, new RegExp(`'${illustration}': '${revision}'`),
    `${illustration}.jpg est daté sous ${revision}`);
}

// L'Ifrit d'encre n'est pas dans `RPG_DUEL_CARDS` (set de la Tour oubliée,
// absent du catalogue), mais il porte Furie 1 : son double se vérifie ici
// comme les huit porteurs du catalogue — même ratio, même révision dédiée.
const ifritFurie = new URL('../public/cards/ifrit-d-encre-furie.jpg', import.meta.url);
assert.ok(existsSync(ifritFurie), 'ifrit-d-encre-furie.jpg est livré avec le jeu');
assert.deepEqual(dimensionsJpeg(ifritFurie), [1024, 1280],
  'ifrit-d-encre-furie.jpg est au format exact 4:5 de la face');
assert.match(artSource, new RegExp(`'ifrit-d-encre-furie': '${REVISION_TOUR_FURIE}'`),
  `ifrit-d-encre-furie.jpg est daté sous ${REVISION_TOUR_FURIE}`);

// ── 3. La table étiquette, les gestes transmettent, la feuille dénude ──────
assert.match(glossaire, /Tant que sa défense actuelle est inférieure à sa DEF de base/,
  'le glossaire compare les PV à la DEF imprimée, pas au plafond renforcé');
assert.doesNotMatch(page, /défense pleine|sous son plein/,
  'aucune règle visible ne parle encore de défense pleine');
assert.match(page, /data-furie-declenchee=\{entite\.furieDeclenchee \? 'true' : undefined\}/,
  'la créature posée étiquette sa Furie déclenchée');
assert.match(page, /data-furie-atk=\{entite\.furieDeclenchee \? entite\.atk : undefined\}[\s\S]*?data-furie-def=\{entite\.furieDeclenchee \? entite\.pv : undefined\}/,
  'avec ses statistiques du moment, attaque et PV restants');
assert.match(page, /function etatFurieDepuisHote\(hote\) \{[\s\S]*?dataset\?\.furieDeclenchee !== 'true'/,
  'un seul lecteur pour l’étiquette Furie des hôtes');
assert.match(page, /const furie = etatFurieDepuisHote\(event\.currentTarget\);[\s\S]*?entiteId,[\s\S]*?armesIds: armes,\s*furie,/,
  'le survol retient l’entité survolée et sa Furie');
assert.match(page, /const furieDeLaCarte = etatFurieDepuisHote\(hote\);[\s\S]*?setApercuAppuiFurie\(furieDeLaCarte\);/,
  'l’appui long transmet la Furie de la créature pressée');
assert.match(page, /furie: etatFurieDepuisHote\(hote\),/,
  'le clic droit transmet la Furie à la fiche');
assert.equal([...page.matchAll(/statsFurie=\{apercuSurvol\.furie\}/g)].length, 2,
  'les deux rendus du survol (menu et duel) branchent la Furie');
// Trois surfaces de duel se partagent désormais la page (menu, duel local et
// salon en ligne) : chacune branche la Furie de l’appui long et de la fiche.
assert.equal([...page.matchAll(/statsFurie=\{apercuAppuiFurie\}/g)].length, 3,
  'les trois rendus de l’appui long branchent la Furie');
assert.equal([...page.matchAll(/statsFurie=\{apercuCatalogueFurie\}/g)].length, 3,
  'et les trois rendus de la fiche');
assert.match(page, /src=\{estEnFurie \? cardArtFurie\(carte\) : cardArt\(carte\)\}/,
  'la face de l’aperçu choisit la peinture selon l’état, comme la table');
assert.match(css, /\.rpg-hover-card-preview__face\.is-furie\s*\{\s*border-width:\s*0;\s*background-image:\s*none;\s*\}/,
  'la feuille retire tout anneau à la face Furie de la preview');
assert.match(css, /\.rpg-hover-card-preview__furie\s*\{/,
  'l’état Furie a sa ligne dans les détails');
assert.match(page, /function VignetteFurie\(\) \{\s*return <span className="rpg-furie-vignette" aria-hidden="true" \/>;\s*\}/,
  'la vignette rouge est un calque décoratif partagé, sans texte à lire');
assert.match(page, /entite\.furieDeclenchee \? 'is-furie' : ''/,
  'la carte posée nomme son état Furie dans ses classes');
assert.match(page, /\{entite\.furieDeclenchee && <VignetteFurie \/>\}/,
  'et reçoit la vignette dès que la Furie est déclenchée');
assert.match(page, /\{estEnFurie && <VignetteFurie \/>\}/,
  'la preview reçoit le même voile écarlate');
assert.match(css, /\.rpg-furie-vignette \{[^}]*background: radial-gradient\([^;]*rgba\(214, 32, 42, \.58\)[^}]*pointer-events: none;[^}]*animation: rpg-furie-vignette 1\.55s ease-in-out infinite alternate;/s,
  'la feuille serre un halo rouge non interactif sur les bords et le fait pulser');
assert.match(css, /@keyframes rpg-furie-vignette \{\s*from \{\s*opacity: \.55;[\s\S]*?to \{\s*opacity: 1;/,
  'le pouls de la vignette respire entre ses deux intensités');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-furie-vignette \{ animation: none; opacity: \.82; \}\s*\}/,
  'les mouvements réduits figent la vignette sans la faire disparaître');

console.log('✓ Furie en jeu : les quatre humains photoréalistes, la Valkyrie au corbeau, le Loup, le Berserk du crépuscule, la Valkyrie des neuf nuits et l’Ifrit d’encre de la Tour oubliée ont leur double de bataille en 1024×1280, daté contre les caches ; tant que l’état est actif, la peinture furie pleine page et la vignette rouge animée paraissent sur la table comme dans la preview, avec +X/+0 seulement.');
