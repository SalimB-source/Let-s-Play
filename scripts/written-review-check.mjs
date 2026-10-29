// Régression de la review originale MW4 : carte, article, images et attribution.
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

const { getTest, getArticleGallery, searchContent, renderReviewPage } = await import(
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
const card = listing.querySelector('.written-review-link');
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
console.log('Review MW4 : carte, conditions, note, galerie, crédits, recherche et anciennes sources OK.');
