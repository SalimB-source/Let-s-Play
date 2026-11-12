// Régression des reviews originales de Chaft : cartes, articles, images,
// attribution, recherche et métadonnées, sans perdre les contrôles Ace et MW4.
// npm run check:written-review
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'written-review-smoke');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'vite', 'build', '--ssr', 'scripts/written-review-smoke.jsx',
  '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error',
], { cwd: root, stdio: 'inherit' });

const { getTest, getArticleGallery, searchContent, renderReviewPage, ReviewSeo } = await import(
  path.join(outDir, 'written-review-smoke.js')
);
const slug = 'call-of-duty-modern-warfare-4';
const route = `/reviews/${slug}`;
const review = getTest(slug);
const gallery = getArticleGallery(slug);
assert.equal(review.route, route);
assert.equal(review.score, 8);
assert.match(review.byline, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(review.testContext, /PC.*9 heures.*difficulté élevée/);
assert.match(review.testContext, /uniquement le mode solo/);
assert.equal(review.sourceUrl, undefined, 'une review originale ne doit pas être créditée à un autre média');
assert.equal(gallery.items.length, 3);
assert.ok(gallery.items.every((item) => item.alt && item.caption));
assert.match(gallery.credit, /Activision.*Infinity Ward/);
assert.ok(gallery.creditSources.some(({ href }) => new URL(href).hostname === 'www.callofduty.com'));
for (const image of ['reviews/modern-warfare-4.webp', ...gallery.items.map(({ src }) => src)]) {
  assert.ok(fs.statSync(path.join(root, 'public', image)).size > 0, `image absente : ${image}`);
}

const listing = new JSDOM(renderReviewPage('/reviews')).window.document;
const cards = [...listing.querySelectorAll('.written-review-link')];
const card = cards.find((link) => link.getAttribute('href') === route);
assert.equal(card?.getAttribute('href'), route);
assert.match(card.textContent, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(card.textContent, /8\s*\/10/);
assert.ok(listing.querySelector('#short-review'), 'le short review existant reste visible');
assert.ok(listing.querySelector('#dossiers-tests'), 'les dossiers existants restent visibles');
assert.ok(listing.querySelector('#reels-tests'), 'les reels existants restent visibles');

const article = new JSDOM(renderReviewPage(route)).window.document;
assert.match(article.querySelector('h1').textContent, /MODERN WARFARE 4/);
assert.match(article.querySelector('.article-byline').textContent, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(article.querySelector('.review-test-context').textContent, /PC.*9 heures/);
assert.match(article.querySelector('.review-score-card').textContent, /8\s*\/10/);
assert.equal(article.querySelectorAll('.article-gallery-open').length, 3);
assert.ok(article.querySelector('.article-gallery-credit a[href^="https://www.callofduty.com/"]'));
assert.equal(article.querySelector('.article-source'), null, 'pas de source ActuGaming pour la review de Chaft');

const previous = new JSDOM(renderReviewPage('/reviews/wolverine')).window.document;
assert.match(previous.querySelector('.article-source a').href, /^https:\/\/www\.actugaming\.net\//);
assert.ok(searchContent('Chaft').some((entry) => entry.route === route));
assert.ok(fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8').includes(`${route}</loc>`));

const aceSlug = 'ace-combat-8-wings-of-theve';
const aceRoute = `/reviews/${aceSlug}`;
const ace = getTest(aceSlug);
const aceGallery = getArticleGallery(aceSlug);
assert.equal(ace.route, aceRoute);
assert.equal(ace.score, 9);
assert.match(ace.byline, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.equal(ace.testContextLabel, 'REPÈRES');
assert.match(ace.testContext, /Sorti le 2 octobre 2026 sur PC, PS5 et Xbox Series X\|S/);
assert.match(ace.testContext, /environ 30 missions.*15 à 25 heures/);
assert.match(ace.testContext, /ONLINE.*progression.*distincte/);
assert.doesNotMatch(ace.testContext, /test[ée].*(?:sur|en)\s+(?:PC|PS5|Xbox|\d)/i, 'ne pas inventer les conditions du test');
assert.equal(ace.sourceUrl, undefined, 'une review originale ne doit pas être créditée à un autre média');
assert.equal(aceGallery.items.length, 3);
assert.ok(aceGallery.items.every((item) => item.alt && item.caption));
assert.match(aceGallery.credit, /promotionnelles officielles.*Bandai Namco/);
assert.match(aceGallery.credit, /ne proviennent pas de la partie de Chaft/);
assert.ok(aceGallery.creditSources.some(({ href }) => new URL(href).hostname === 'www.bandainamcoent.com'));
assert.ok(aceGallery.creditSources.some(({ href }) => new URL(href).hostname === 'en.bandainamcoent.eu'));
for (const image of ['reviews/ace-combat-8.webp', ...aceGallery.items.map(({ src }) => src)]) {
  assert.ok(fs.statSync(path.join(root, 'public', image)).size > 0, `image absente : ${image}`);
}
assert.ok(fs.existsSync(path.join(root, 'public/screenshots/ace-combat-8/credits.md')));

const aceCard = cards.find((link) => link.getAttribute('href') === aceRoute);
// Tous les tests utilisent exactement le même gabarit de carte, sans variante
// « secondaire » qui réduirait l’image ou la typographie de l’un d’eux.
assert.ok(cards.length >= 3);
for (const link of cards) {
  assert.equal(link.closest('article').className, 'written-review-card');
  for (const selector of [
    '.written-review-image img', '.written-review-image-credit', '.written-review-score',
    '.written-review-kicker', '.written-review-copy h2', '.written-review-copy > p',
    '.written-review-meta', '.written-review-read',
  ]) assert.equal(link.querySelectorAll(selector).length, 1, `${selector} manquant dans une carte`);
  assert.equal(link.querySelectorAll('.written-review-meta span').length, 2);
  assert.ok(link.querySelector('.written-review-image img').getAttribute('alt'));
}
assert.match(aceCard.textContent, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(aceCard.textContent, /9\s*\/10/);
assert.match(aceCard.textContent, /BANDAI NAMCO/);
assert.match(aceCard.querySelector('.written-review-score').getAttribute('aria-label'), /Note du jeu/);
assert.match(card.querySelector('.written-review-score').getAttribute('aria-label'), /Note de la campagne/);

const aceArticle = new JSDOM(renderReviewPage(aceRoute)).window.document;
assert.match(aceArticle.querySelector('h1').textContent, /ACE COMBAT 8/);
assert.match(aceArticle.querySelector('.article-byline').textContent, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(aceArticle.querySelector('.review-test-context').textContent, /REPÈRES.*30 missions.*15 à 25 heures/);
assert.match(aceArticle.querySelector('.review-score-card').textContent, /9\s*\/10/);
const aceBody = aceArticle.querySelector('.article-body').textContent;
for (const subject of [/campagne/i, /ACE COMBAT ONLINE/, /MRP/, /cross-play/i, /PSVR2/, /9\/10/]) {
  assert.match(aceBody, subject);
}
assert.equal(aceArticle.querySelectorAll('.article-gallery-open').length, 3);
assert.ok(aceArticle.querySelector('.article-gallery-credit a[href^="https://www.bandainamcoent.com/"]'));
assert.ok(aceArticle.querySelector('.article-gallery-credit a[href^="https://en.bandainamcoent.eu/"]'));
assert.equal(aceArticle.querySelector('.article-source'), null);

const phantomSlug = 'phantom-blade-zero';
const phantomRoute = `/reviews/${phantomSlug}`;
const phantom = getTest(phantomSlug);
const phantomGallery = getArticleGallery(phantomSlug);
assert.equal(phantom.route, phantomRoute);
assert.equal(phantom.score, 8.5);
assert.match(phantom.byline, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.equal(phantom.testContextLabel, 'REPÈRES');
assert.match(phantom.testContext, /PC et PS5.*aventure solo.*Chaft estime.*environ 40 heures/i);
assert.doesNotMatch(phantom.testContext, /test[ée].*(?:sur|en)\s+(?:PC|PS5|Xbox|\d)/i, 'ne pas inventer les conditions du test');
assert.equal(phantom.sourceUrl, undefined, 'le texte est un test original de Chaft');
assert.equal(phantomGallery.items.length, 3);
assert.ok(phantomGallery.items.every((item) => item.alt && item.caption));
assert.match(phantomGallery.credit, /promotionnelles officielles.*S-GAME/);
assert.match(phantomGallery.credit, /ne proviennent pas de la partie de Chaft/);
for (const image of ['reviews/phantom-blade-zero.webp', ...phantomGallery.items.map(({ src }) => src)]) {
  assert.ok(fs.statSync(path.join(root, 'public', image)).size > 0, `image absente : ${image}`);
}
assert.ok(fs.existsSync(path.join(root, 'public/screenshots/phantom-blade-zero/credits.md')));
assert.equal(cards[0]?.getAttribute('href'), phantomRoute, 'le nouveau test est à la une');
assert.equal(cards[1]?.getAttribute('href'), aceRoute, 'Ace reste visible');
assert.equal(cards[2]?.getAttribute('href'), route, 'MW4 reste visible');
const phantomCard = cards[0];
assert.match(phantomCard.textContent, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(phantomCard.textContent, /8,5\s*\/10/);
assert.match(phantomCard.textContent, /S-GAME.*PLAYSTATION/);
assert.match(phantomCard.querySelector('.written-review-score').getAttribute('aria-label'), /Note du jeu/);

const phantomArticle = new JSDOM(renderReviewPage(phantomRoute)).window.document;
assert.match(phantomArticle.querySelector('h1').textContent, /PHANTOM BLADE ZERO/);
assert.match(phantomArticle.querySelector('.article-byline').textContent, /CHAFT.*RÉDACTEUR EN CHEF/);
assert.match(phantomArticle.querySelector('.review-test-context').textContent, /REPÈRES.*Chaft estime.*40 heures/i);
assert.match(phantomArticle.querySelector('.review-score-card').textContent, /8,5\s*\/10/);
const phantomBody = phantomArticle.querySelector('.article-body').textContent;
for (const subject of [/66 jours/i, /wuxia/i, /Sha-Chi/i, /parade/i, /esquive/i, /Donnie Yen/i,
  /armes principales/i, /lames spectrales/i, /Metroidvania/i, /New Game Plus/i, /quatre fins/i,
  /verrouillage/i, /infiltration/i, /baisses de fluidité.*PS5|PS5.*baisses de fluidité/i, /8,5\/10/]) {
  assert.match(phantomBody, subject);
}
assert.match(phantomBody, /ne considère pas forcément cela comme un défaut/i, 'la difficulté reste nuancée');
assert.equal(phantomArticle.querySelectorAll('.article-gallery-open').length, 3);
assert.ok(phantomArticle.querySelector('.article-gallery-credit a[href^="https://store.playstation.com/"]'));
assert.ok(phantomArticle.querySelector('.article-gallery-credit a[href^="https://blog.playstation.com/"]'));
assert.ok(phantomArticle.querySelector('.article-gallery-credit a[href="https://store.epicgames.com/p/phantom-blade-zero-e78a35"]'));
assert.equal(phantomArticle.querySelector('.article-source'), null);
assert.ok(searchContent('Phantom Blade Zero').some((entry) => entry.route === phantomRoute));
assert.ok(searchContent('Chaft').some((entry) => entry.route === phantomRoute));
assert.ok(fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8').includes(`${phantomRoute}</loc>`));

// Bandes-annonces publiées par les chaînes officielles, intégrées sans
// lecture automatique et accompagnées d'un lien direct de secours.
for (const [doc, test, id, channel, label] of [
  [phantomArticle, phantom, 'qgJBFa952mY', 'Phantom Blade Zero · S-GAME', 'Bande-annonce de lancement'],
  [aceArticle, ace, 'F54vGYxj0ts', 'Bandai Namco Entertainment America', 'Bande-annonce de lancement'],
  [article, review, 'yLFRQaQT0qM', 'Call of Duty', 'Bande-annonce de la campagne'],
]) {
  assert.deepEqual(test.video, { id, label, channel });
  const frame = doc.querySelector('.article-video iframe');
  assert.ok(frame, `lecteur vidéo absent : ${test.name}`);
  const embed = new URL(frame.getAttribute('src'));
  assert.equal(embed.origin, 'https://www.youtube.com');
  assert.equal(embed.pathname, `/embed/${id}`);
  assert.equal(embed.searchParams.get('enablejsapi'), '1');
  assert.equal(embed.searchParams.has('autoplay'), false);
  assert.equal(frame.getAttribute('loading'), 'lazy');
  assert.ok(frame.getAttribute('title').includes(label));
  assert.ok(frame.getAttribute('title').includes(channel));
  const caption = doc.querySelector('.article-video figcaption');
  assert.ok(caption.textContent.includes(label));
  assert.ok(caption.textContent.includes(channel));
  assert.equal(caption.querySelector('a').href, `https://www.youtube.com/watch?v=${id}`);
}
assert.ok(searchContent('Ace Combat 8').some((entry) => entry.route === aceRoute));
assert.ok(searchContent('Chaft').some((entry) => entry.route === aceRoute));
assert.ok(fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8').includes(`${aceRoute}</loc>`));

// Vérifier les métadonnées réellement installées par l'effet React, pas
// seulement la présence de chaînes dans le code source.
const seoDom = new JSDOM('<!doctype html><html><head></head><body><div id="seo-root"></div></body></html>', {
  url: 'https://salimb-source.github.io/Let-s-Play/',
});
globalThis.window = seoDom.window;
globalThis.document = seoDom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const seoRoot = createRoot(document.getElementById('seo-root'));
for (const [seoRoute, title, image, date] of [
  [phantomRoute, /Phantom Blade Zero.*Chaft/i, 'reviews/phantom-blade-zero.webp', '2026-10-29'],
  [aceRoute, /Ace Combat 8.*Chaft/i, 'reviews/ace-combat-8.webp', '2026-11-04'],
  [route, /Modern Warfare 4.*Chaft/i, 'reviews/modern-warfare-4.webp', '2026-10-29'],
]) {
  // Une nouvelle clé remonte MemoryRouter avec la bonne route initiale.
  await React.act(async () => seoRoot.render(React.createElement(ReviewSeo, { path: seoRoute, key: seoRoute })));
  assert.match(document.title, title);
  assert.equal(document.querySelector('meta[property="og:type"]').content, 'article');
  assert.equal(document.querySelector('meta[name="author"]').content, 'Chaft');
  assert.ok(document.querySelector('meta[property="og:image"]').content.endsWith(image));
  assert.ok(document.querySelector('link[rel="canonical"]').href.endsWith(seoRoute));
  const articleData = JSON.parse(document.querySelector('#seo-jsonld').textContent)['@graph'].find((node) => node['@type'] === 'NewsArticle');
  assert.equal(articleData.author.name, 'Chaft');
  assert.equal(articleData.datePublished, date);
}
await React.act(async () => seoRoot.unmount());
seoDom.window.close();
delete globalThis.window;
delete globalThis.document;
delete globalThis.IS_REACT_ACT_ENVIRONMENT;

console.log('Reviews Phantom Blade Zero, Ace Combat 8 et MW4 : cartes homogènes, vidéos officielles, notes, galeries, crédits, SEO et recherche OK.');
