// Traduction des articles — `npm run check:localized`.
//
// Le contrat de la couche de traduction, vérifié sur les vrais fichiers :
//
//   1. chaque fichier de `src/news/localized/<lang>/` est bien chargé et
//      enregistré (corps et métadonnées de liste) ;
//   2. un article traduit affiche son titre, son chapô et son corps dans la
//      langue demandée — `fr`, `en` et `ar` incluses ;
//   3. un article NON traduit reste lisible en français, avec
//      `translated: false` (c'est cette valeur qui déclenche le bandeau
//      « Version française » dans `ArticleLanguageNotice`) ;
//   4. les listings générés (`index.js`) décrivent exactement les fichiers de
//      corps présents — un article ajouté à la main sans régénérer l'index ne
//      doit pas passer inaperçu ;
//   5. la recherche affiche le titre traduit, et retombe proprement sur le
//      français quand il n'y a pas de traduction.
//
// Le contrôle tourne sur un build SSR : certains modules de données du site
// s'importent sans extension (convention Vite), ce que Node ne résout pas seul.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'localized-check');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/localized-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const {
  TRANSLATED_LANGS, loadArticleListings, loadArticleBody, countLocalized,
  localizeListing, localizeStory, searchTextFor, searchContent, renderArticle,
  renderPage, PAGE_ROUTES,
} = await import(pathToFileURL(path.join(outDir, 'localized-smoke.js')).href);
const { JSDOM } = await import('jsdom');

// ---------------------------------------------------------------- inventaire
const langDir = (lang) => path.join(root, 'src', 'news', 'localized', lang);

function bodyFiles(lang) {
  const base = langDir(lang);
  const found = [];
  const walk = (dir, prefix = '') => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'index.js') continue;
      if (prefix === '' && entry.name === 'media') continue; // bloc vidéo, pas un corps
      if (entry.isDirectory()) walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      else if (entry.name.endsWith('.js')) found.push(`${prefix}${entry.name.replace(/\.js$/, '')}`);
    }
  };
  walk(base);
  return found.sort();
}

const missingDirs = TRANSLATED_LANGS.filter((lang) => !fs.existsSync(langDir(lang)));
assert.deepEqual(missingDirs, [], 'un dossier par langue traduite (en, ar)');

let bodyCount = 0;
for (const lang of TRANSLATED_LANGS) {
  const files = bodyFiles(lang);
  assert.ok(files.length > 0, `${lang} : au moins un article traduit`);
  bodyCount += files.length;

  await loadArticleListings(lang);
  // Chaque fichier de corps doit se charger et livrer des champs exploitables :
  // c'est le seul moyen de voir un fichier corrompu avant le visiteur.
  for (const file of files) {
    const body = await loadArticleBody(`/news/${file}`, lang);
    assert.ok(body, `${lang} : ${file} se charge`);
    assert.ok(Object.keys(body).length >= 3, `${lang} : ${file} contient des champs`);
  }
  const { listings, bodies } = countLocalized(lang);
  assert.deepEqual(
    [...bodies.keys()].sort(), files.map((file) => `/news/${file}`).sort(),
    `${lang} : tous les corps attendus sont enregistrés`,
  );
  assert.ok(listings.length > 0, `${lang} : métadonnées de liste enregistrées`);
  assert.ok(
    listings.length <= bodies.size,
    `${lang} : aucun listing sans corps (${listings.length} listings, ${bodies.size} corps)`,
  );
}

// --------------------------------------------------- article traduit, 3 langues
const KEY = '/news/lightyear-frontier-1-0-4-novembre-2026';
const FRENCH = {
  to: KEY,
  title: 'LIGHTYEAR FRONTIER',
  accent: 'LE CAP DE LA 1.0.',
  dek: 'La version 1.0 est annoncée pour ce 4 novembre sur Steam et Xbox Series X|S.',
  p1: 'Sandswept Highlands et Hollow Marsh étendent les terrains à explorer.',
  category: 'GAMING · EXPLORATION & FERME',
};

const french = localizeStory(FRENCH, 'fr');
assert.equal(french.translated, true, 'français : toujours considéré comme traduit');
assert.equal(french.title, FRENCH.title, 'français : le titre d’origine est rendu tel quel');

for (const lang of TRANSLATED_LANGS) {
  await loadArticleListings(lang);
  const story = localizeStory(FRENCH, lang);
  assert.equal(story.translated, true, `${lang} : article traduit reconnu`);
  assert.equal(story.contentLang, lang, `${lang} : langue du corps`);
  // Un nom propre (« LIGHTYEAR FRONTIER ») peut rester identique : c'est le
  // titre complet, accent compris, qui doit changer de langue.
  assert.notEqual(`${story.title} ${story.accent}`, `${FRENCH.title} ${FRENCH.accent}`, `${lang} : le titre complet change de langue`);
  assert.notEqual(story.dek, FRENCH.dek, `${lang} : le chapô change vraiment de langue`);
  if (lang === 'ar') {
    // L'arabe doit être écrit en caractères arabes, pas translittéré.
    assert.match(`${story.title} ${story.accent}`, /[\u0600-\u06FF]/, 'ar : titre complet en caractères arabes');
    assert.match(story.dek, /[\u0600-\u06FF]/, 'ar : chapô en caractères arabes');
  } else {
    assert.doesNotMatch(story.title, /[\u0600-\u06FF]/, 'en : pas de caractères arabes dans le titre');
  }
  // Le corps complet arrive par un fichier séparé, chargé à l'ouverture.
  const body = await loadArticleBody(KEY, lang);
  assert.ok(body, `${lang} : corps de l’article chargé`);
  assert.ok(body.p1 || body.lead || body.intro, `${lang} : corps exploitable`);
  if (body.p1) assert.notEqual(body.p1, FRENCH.p1, `${lang} : premier paragraphe traduit`);
}

// ---------------------------------------- article non traduit : repli français
const UNTRANSLATED = {
  to: '/news/zelda-ocarina-of-time-switch-2-affichages-hud',
  title: 'ZELDA OCARINA OF TIME',
  accent: 'TROIS AFFICHAGES.',
  dek: 'Résumé en français.',
};
for (const lang of TRANSLATED_LANGS) {
  const story = localizeStory(UNTRANSLATED, lang);
  assert.equal(story.translated, false, `${lang} : article non traduit signalé comme tel`);
  assert.equal(story.title, UNTRANSLATED.title, `${lang} : repli sur le titre français`);
  assert.equal(story.dek, UNTRANSLATED.dek, `${lang} : repli sur le chapô français`);
  assert.equal(await loadArticleBody(UNTRANSLATED.to, lang), null, `${lang} : pas de corps inventé`);
}

// Les cartes suivent la même règle que les articles.
const card = localizeListing({ to: KEY, title: 'LIGHTYEAR FRONTIER LE CAP DE LA 1.0.', excerpt: 'fr', alt: 'fr' }, 'en');
assert.equal(card.translated, true, 'carte : traduction appliquée');
assert.notEqual(card.title, 'LIGHTYEAR FRONTIER LE CAP DE LA 1.0.', 'carte : titre traduit');
assert.ok(card.title.length <= 90, 'carte : titre de carte resté compact');
const fallbackCard = localizeListing({ to: UNTRANSLATED.to, title: 'TITRE FR', excerpt: 'fr' }, 'en');
assert.equal(fallbackCard.title, 'TITRE FR', 'carte non traduite : titre français conservé');

// ---------------------------------------------------------------- recherche
for (const lang of TRANSLATED_LANGS) {
  await loadArticleListings(lang);
  const results = searchContent('lightyear').filter((item) => item.type === 'news');
  assert.ok(results.length > 0, `${lang} : « lightyear » trouve l’article, même traduit`);
  const shown = searchTextFor(results[0], lang);
  assert.notEqual(shown.title, results[0].title, `${lang} : la recherche affiche le titre traduit`);
  // Une actu non traduite reste trouvable et s'affiche en français.
  const zelda = searchContent('zelda').filter((item) => item.type === 'news')[0];
  if (zelda) {
    const stillFrench = searchTextFor(zelda, lang);
    assert.equal(stillFrench.title, zelda.title, `${lang} : actu non traduite affichée en français`);
  }
}

// Le français ne doit rien changer du tout.
const frenchResults = searchContent('lightyear');
assert.equal(searchTextFor(frenchResults[0], 'fr').title, frenchResults[0].title, 'fr : recherche inchangée');

// ------------------------------------- la page article ne parle plus français
//
// Le vrai test : ce que le VISITEUR voit. On rend la page article en anglais et
// en arabe, et on refuse tout mot-outil français (ou toute lettre accentuée
// française) dans l'en-tête, le corps et le bloc de réactions. Les données
// éditoriales (titres, textes) sont traduites ; les libellés d'interface
// viennent du dictionnaire. Ce contrôle a été ajouté après avoir trouvé, sur un
// article pourtant « traduit », du français resté dans la bande-annonce, le
// bouton de source et le bloc de réactions.
// `plus` est volontairement absent : c’est aussi un mot anglais (« plus hot
// news »), il ferait échouer une page pourtant traduite.
const FRENCH_WORDS = /\b(le|la|les|du|des|une|dans|pour|avec|sur|est|sont|qui|que|aux|cette|ces|nous|vous|après|avant|entre|comme|tout|être|fait|selon|également|déjà)\b|[àâçéèêëîïôûùœ]/i;

async function untranslatedTexts(lang, key) {
  const html = await renderArticle(lang, key);
  const document = new JSDOM(html).window.document;
  const found = new Set();
  for (const selector of ['.article-hero', '.article-body', '.article-engagement']) {
    const root = document.querySelector(selector);
    if (!root) continue;
    const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.replace(/\s+/g, ' ').trim();
      const parent = walker.currentNode.parentElement;
      if (text.length < 4 || !parent) continue;
      // Le bandeau de langue cite volontairement le français (« Lire en
      // français ») et les noms de marque restent tels quels.
      if (parent.closest('[lang="fr"], script, style')) continue;
      if (FRENCH_WORDS.test(text)) found.add(text.slice(0, 80));
    }
  }
  return [...found];
}

for (const lang of TRANSLATED_LANGS) {
  for (const key of ['lightyear-frontier-1-0-4-novembre-2026', 'cinema/godzilla-minus-zero-sortie-france-4-novembre-2026']) {
    const leftovers = await untranslatedTexts(lang, key);
    assert.deepEqual(
      leftovers, [],
      `${lang} / ${key} : plus aucun texte français dans la page article`,
    );
  }
}

// Un article NON traduit doit, lui, rester en français : c'est le contrat.
const frenchFallback = await renderArticle('en', 'zelda-ocarina-of-time-switch-2-affichages-hud');
assert.match(new JSDOM(frenchFallback).window.document.querySelector('.article-dek').textContent, /[àâçéèêëîïôûùœ]/i,
  'en / article non traduit : le contenu reste en français (et le bandeau le dit)');


// ------------------------------------- pages liste : le chrome suit la langue
//
// Deuxième garde-fou, né d'un vrai ratage : les traductions d'articles
// existaient, mais les pages liste d'une nouvelle édition restaient en
// français pour tout le chrome (pastille « PRÉSENTATION », libellés de
// section, lien « Voir tous les reels »…). On rend chaque page liste en
// anglais et en arabe dans le chromium de jsdom, on écarte les cartes
// d'articles non traduits — leur français est le repli assumé — et on refuse
// tout mot-outil français ailleurs.
async function pageFrenchLeftovers(lang, route) {
  const html = await renderPage(lang, route);
  const document = new JSDOM(html).window.document;
  const root = document.querySelector('main') || document.body;
  const found = new Set();
  const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent) continue;
    // Cartes d'articles : le titre/chapô français d'un article non traduit est
    // le comportement attendu. Les libellés de carte (badge, pastille) sont
    // vérifiés séparément ci-dessous.
    if (parent.closest('.news-carousel-card, a[href*="/news/"], [lang="fr"], script, style')) continue;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (text.length < 5) continue;
    if (FRENCH_WORDS.test(text)) found.add(text.slice(0, 80));
  }
  return [...found];
}

for (const lang of TRANSLATED_LANGS) {
  for (const route of PAGE_ROUTES) {
    assert.deepEqual(
      await pageFrenchLeftovers(lang, route),
      [],
      `${lang} ${route} : plus de chrome français sur la page`,
    );
  }
  // La pastille de vidéo des cartes est du chrome : elle doit être traduite
  // même quand l'article, lui, n'a pas de traduction.
  const archive = new JSDOM(await renderPage(lang, '/news/articles')).window.document;
  for (const flag of archive.querySelectorAll('.news-trailer-flag')) {
    const label = flag.textContent.replace(/\s+/g, ' ').trim();
    assert.ok(label.length > 0, `${lang} /news/articles : pastille de vidéo vide`);
    assert.ok(!FRENCH_WORDS.test(label), `${lang} /news/articles : pastille de vidéo encore en français (« ${label} »)`);
  }
}

console.log(`OK — traductions d’articles : ${TRANSLATED_LANGS.join(', ')} · ${bodyCount} corps, repli français, recherche, page article et pages liste sans français résiduel.\n`);
