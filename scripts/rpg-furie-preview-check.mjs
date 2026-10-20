/**
 * La Furie se voit dans la preview de la carte.
 * node scripts/rpg-furie-preview-check.mjs
 *
 * Quand une créature avec Furie est blessée et survit, elle change de
 * visuel sur la table : peinture « furie » pleine page, sans cadre, et
 * statistiques grandies. Sa preview — survol, appui long, fiche du clic
 * droit — doit montrer ce même visuel, pas la carte d'avant la blessure.
 * La carte posée étiquette donc son état (`data-furie-*`, comme ses armes
 * en `data-armes`), chaque geste de consultation le transmet, et l'aperçu
 * rapide, d'ordinaire texte seul, rend sa face à la créature en Furie.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

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
  assert.ok(aUnCadre(faceNormale), 'et son cadre d’élément');
  assert.deepEqual(statsDe(normal), ['3', '4'], 'les statistiques imprimées restent celles de la carte neuve');
  assert.equal(normal.querySelector('.rpg-hover-card-preview__furie'), null,
    'aucune Furie n’est annoncée tant qu’elle ne s’est pas enflammée');

  const furie = cas('furie-catalogue');
  const racineFurie = furie.querySelector('.rpg-hover-card-preview');
  const faceFurie = furie.querySelector('.rpg-hover-card-preview__face');
  assert.ok(faceFurie, 'la fiche du Jarl en Furie montre sa face');
  assert.match(faceFurie.querySelector('img').getAttribute('src') ?? '', /cards\/jarl-au-marteau-de-guerre-furie\.jpg/,
    'la preview affiche la peinture furie, celle de la table');
  assert.ok(faceFurie.classList.contains('is-furie'), 'la face se nomme en Furie');
  assert.equal(faceFurie.getAttribute('data-furie-declenchee'), 'true', 'et expose son état');
  assert.equal(aUnCadre(faceFurie), false, 'aucune classe de cadre ne rogne la peinture pleine page');
  assert.ok(racineFurie.classList.contains('rpg-hover-card-preview--furie'),
    'le panneau entier quitte le cadre de la carte intacte');
  assert.deepEqual(statsDe(furie), ['6', '6'], 'la face imprime les statistiques gagnées par la Furie');
  assert.match(furie.querySelector('.rpg-hover-card-preview__furie')?.textContent ?? '', /Furie déclenchée — 6\/6/,
    'les détails nomment l’état et ses statistiques du moment');
  assert.match(racineFurie.getAttribute('aria-label') ?? '', /Furie déclenchée, attaque 6, défense 6/,
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
    assert.deepEqual(statsDe(rapideFurie), ['6', '6'], `${nom} : avec les statistiques du moment`);
  }
} finally {
  window.close();
}

// ── 2. Chaque carte à Furie a sa peinture alternative ──────────────────────
const cartesFurie = RPG_DUEL_CARDS.filter((carte) => carte.furie);
assert.ok(cartesFurie.length >= 4, 'le catalogue compte ses cartes à Furie');
for (const carte of cartesFurie) {
  const artId = carte.art ?? carte.id;
  assert.ok(existsSync(new URL(`../public/cards/${artId}-furie.jpg`, import.meta.url)),
    `${carte.id} a sa peinture furie (${artId}-furie.jpg)`);
}

// ── 3. La table étiquette, les gestes transmettent, la feuille dénude ──────
assert.match(page, /data-furie-declenchee=\{entite\.furieDeclenchee \? 'true' : undefined\}/,
  'la créature posée étiquette sa Furie déclenchée');
assert.match(page, /data-furie-atk=\{entite\.furieDeclenchee \? entite\.atk : undefined\}[\s\S]*?data-furie-def=\{entite\.furieDeclenchee \? entite\.pv : undefined\}/,
  'avec ses statistiques du moment, attaque et PV restants');
assert.match(page, /function etatFurieDepuisHote\(hote\) \{[\s\S]*?dataset\?\.furieDeclenchee !== 'true'/,
  'un seul lecteur pour l’étiquette Furie des hôtes');
assert.match(page, /const furie = etatFurieDepuisHote\(event\.currentTarget\);[\s\S]*?entiteId,\s*armesIds: armes,\s*furie,/,
  'le survol retient l’entité survolée et sa Furie');
assert.match(page, /const furieDeLaCarte = etatFurieDepuisHote\(hote\);[\s\S]*?setApercuAppuiFurie\(furieDeLaCarte\);/,
  'l’appui long transmet la Furie de la créature pressée');
assert.match(page, /furie: etatFurieDepuisHote\(hote\),/,
  'le clic droit transmet la Furie à la fiche');
assert.equal([...page.matchAll(/statsFurie=\{apercuSurvol\.furie\}/g)].length, 2,
  'les deux rendus du survol (menu et duel) branchent la Furie');
assert.equal([...page.matchAll(/statsFurie=\{apercuAppuiFurie\}/g)].length, 2,
  'les deux rendus de l’appui long aussi');
assert.equal([...page.matchAll(/statsFurie=\{apercuCatalogueFurie\}/g)].length, 2,
  'et les deux rendus de la fiche');
assert.match(page, /src=\{estEnFurie \? cardArtFurie\(carte\) : cardArt\(carte\)\}/,
  'la face de l’aperçu choisit la peinture selon l’état, comme la table');
assert.match(css, /\.rpg-hover-card-preview__face\.is-furie\s*\{\s*border-width:\s*0;\s*background-image:\s*none;\s*\}/,
  'la feuille retire tout anneau à la face Furie de la preview');
assert.match(css, /\.rpg-hover-card-preview__furie\s*\{/,
  'l’état Furie a sa ligne dans les détails');

console.log('✓ Furie en preview : la créature enflammée se consulte sous sa peinture furie pleine page, sans cadre, avec ses statistiques du moment — au survol, à l’appui long et sur la fiche du clic droit ; la carte intacte garde son aperçu d’avant.');
