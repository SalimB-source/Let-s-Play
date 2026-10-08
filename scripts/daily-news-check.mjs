// Régression de l’édition du 08.10.2026 : images, routes, cartes, vidéos et recherche.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { dailyStories, dailyNewsListing, dailySeoEntries, editionDate, editionIsoDate } from '../src/news/daily/2026-10-08.js';
import { getArticleTrailerEntry, trailerFlagLabel, trailerWatchUrl } from '../src/articleTrailers.js';
import { youTubeEmbedUrl } from '../src/lib/videoPlayback.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'daily-news-smoke');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const keys = Object.keys(dailyStories);

assert.equal(keys.length, 3, 'une actualité dans chacun des trois univers');
assert.equal(dailyNewsListing.length, 3);
assert.equal(editionDate, '08.10.2026');
assert.equal(editionIsoDate, '2026-10-08');
assert.doesNotMatch(JSON.stringify(dailyStories), /mistral/i, 'le sujet écarté par l’utilisateur n’est pas publié');

// Dimensions JPEG sans dépendance d’imagerie : trouver un segment SOF.
function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'image JPEG réelle');
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset], 0xff);
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  assert.fail('JPEG sans dimensions lisibles');
}

const hashes = new Set();
for (const [key, story] of Object.entries(dailyStories)) {
  assert.equal(story.date, editionDate);
  assert.equal(story.image, story.thumbnail);
  assert.ok(story.image.startsWith('news/2026-10-08/'));
  assert.match(story.sourceUrl, /^https?:\/\//);
  assert.ok(story.source && story.credit && story.imageAlt && story.dek);
  const bytes = fs.readFileSync(path.join(root, 'public', story.thumbnail));
  assert.ok(bytes.length > 10_000 && bytes.length < 250_000, `${key} : miniature exploitable et compressée`);
  const { width, height } = jpegSize(bytes);
  assert.ok(width >= 900 && Math.abs(width / height - 16 / 9) < 0.01, `${key} : format 16:9`);
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
  const trailer = getArticleTrailerEntry(key);
  assert.ok(trailer.items.length >= 1, `${key} : vidéo officielle déclarée`);
  assert.ok(trailer.items.every((item) => item.verified === editionDate));
  assert.equal(dailySeoEntries[`/news/${key}`].published, editionIsoDate);
  assert.equal(dailySeoEntries[`/news/${key}`].image, story.thumbnail);
  assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`), `${key} : sitemap`);
}
assert.equal(hashes.size, 3, 'trois miniatures distinctes');
assert.ok(read('src/components/SEO.jsx').includes('...dailySeoEntries'));
assert.ok(read('src/main.jsx').includes('path="/news/hellraiser-revival-sortie"'));
assert.ok(read('src/main.jsx').includes('slugPrefix="cinema/"'));
assert.ok(read('src/main.jsx').includes('slugPrefix="tech/"'));

execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'vite', 'build', '--ssr', 'scripts/daily-news-smoke.jsx',
  '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error',
], { cwd: root, stdio: 'inherit' });

const { React, ArticleTrailer, renderPages, searchContent, searchIndex, autoSearchEntries, NewsArchiveFlow } = await import(path.join(outDir, 'daily-news-smoke.js'));
const pages = new Map(renderPages().map(({ route, html }) => [route, new JSDOM(html).window.document]));

const hub = pages.get('/news').querySelector('#actus-du-jour');
const cards = [...hub.querySelectorAll('.news-carousel-card')];
assert.equal(cards.length, 3);
const archiveLink = hub.querySelector('.news-headlines-head .news-headlines-all');
assert.ok(archiveLink, 'bouton dans l’en-tête des actualités du jour');
assert.equal(archiveLink.textContent.replace('↗', '').trim(), 'Voir tous les articles');
assert.equal(archiveLink.getAttribute('href'), '/news/articles');
assert.ok(read('src/main.jsx').includes('path="/news/articles" element={<AllNews />}'));
assert.ok(read('src/components/SEO.jsx').includes("'/news/articles':"));
assert.ok(read('public/sitemap.xml').includes('/news/articles</loc>'));
const archive = pages.get('/news/articles');
const archiveCards = [...archive.querySelectorAll('.news-carousel-card')];
const expectedRoutes = [...new Set([...searchIndex, ...autoSearchEntries].filter((item) => item.type === 'news').map((item) => item.route))];
assert.deepEqual(archiveCards.map((card) => card.getAttribute('href')), expectedRoutes, 'toutes les actus, sans doublons ni tests/dossiers');
assert.ok(archive.querySelector('.news-carousel.is-grid'), 'même grille que les autres pages Actus');
assert.equal(archive.querySelectorAll('.news-grid-cell').length, expectedRoutes.length);
assert.equal(archive.querySelectorAll('.search-result-card').length, 0, 'aucune carte de recherche dans l’archive');
for (const card of archiveCards) {
  for (const selector of ['.news-carousel-image img', '.news-feature-badge', '.news-feature-arrow', '.news-sentiment', '.news-carousel-copy', '.news-kicker', 'h2', 'p', '.read-link']) {
    assert.ok(card.querySelector(selector), `${card.getAttribute('href')} : ${selector}`);
  }
  assert.equal(card.querySelector('img').getAttribute('loading'), 'lazy');
  assert.doesNotMatch(card.querySelector('img').getAttribute('src'), /\/Let-s-Play\/\/Let-s-Play\//, 'pas de double préfixe de miniature');
}
for (const [index, story] of dailyNewsListing.entries()) {
  const archiveCard = archive.querySelector(`.news-carousel-card[href="${story.to}"]`);
  assert.ok(archiveCard);
  assert.equal(archiveCard.innerHTML, cards[index].innerHTML, `${story.to} : même carte que dans les actualités du jour`);
}
assert.ok(expectedRoutes.some((route) => route.startsWith('/news/cinema/')));
assert.ok(expectedRoutes.some((route) => route.startsWith('/news/tech/')));
assert.ok(autoSearchEntries.length > 0);
assert.ok(archive.querySelector('.arrow-link[href="/news"]'), 'retour au hub');
assert.ok(hub.querySelector('.section-label').textContent.includes(editionDate));
assert.deepEqual(cards.map((card) => card.getAttribute('href')), dailyNewsListing.map((story) => story.to));
for (const [index, card] of cards.entries()) {
  const story = dailyNewsListing[index];
  assert.equal(card.querySelector('img').getAttribute('src'), `/Let-s-Play/${story.image}`);
  assert.equal(card.querySelector('img').getAttribute('alt'), story.alt);
  assert.equal(card.querySelector('.news-trailer-flag').textContent.trim(), trailerFlagLabel(story.to));
}

for (const [key, story] of Object.entries(dailyStories)) {
  const doc = pages.get(`/news/${key}`);
  assert.equal(doc.querySelector('h1').textContent, `${story.title}${story.accent}`, `${key} : vrai article, pas une 404`);
  assert.equal(doc.querySelector('.article-cover img').getAttribute('src'), `/Let-s-Play/${story.thumbnail}`);
  const first = getArticleTrailerEntry(key).items[0];
  const players = doc.querySelectorAll('.article-trailer iframe');
  assert.equal(players.length, 1, `${key} : un seul lecteur`);
  assert.equal(players[0].getAttribute('src'), youTubeEmbedUrl(first.id));
  assert.ok(doc.querySelector(`a[href="${trailerWatchUrl(first.id)}"]`));
  assert.ok(doc.querySelector(`a[href="${story.sourceUrl}"]`), `${key} : source cliquable`);
  assert.ok(searchContent(story.cover.split(' · ')[0]).some((result) => result.route === `/news/${key}`), `${key} : recherche`);
}

for (const [category, key] of [['gaming', keys[0]], ['cinema', keys[1]], ['tech', keys[2]]]) {
  const doc = pages.get(`/news/${category}`);
  const featured = doc.querySelector('.news-featured-story');
  assert.equal(featured.querySelector('.daily-news-copy').getAttribute('href'), `/news/${key}`);
  assert.equal(featured.querySelector('img').getAttribute('src'), `/Let-s-Play/${dailyStories[key].thumbnail}`);
  assert.ok(featured.querySelector('.news-kicker').textContent.includes(editionDate));
  assert.equal(featured.querySelector('.news-trailer-flag').textContent.trim(), trailerFlagLabel(key));
  assert.ok(doc.querySelector('.section-label').textContent.includes(editionDate));
}
const home = pages.get('/').querySelector('.home-news-card');
assert.equal(home.querySelector('.daily-news-copy').getAttribute('href'), `/news/${keys[0]}`);
assert.equal(home.querySelector('img').getAttribute('src'), `/Let-s-Play/${dailyStories[keys[0]].thumbnail}`);
assert.ok(home.querySelector('.news-kicker').textContent.includes(editionDate));

// EN et AR conservent aussi la date de publication et les trois cartes.
for (const lang of ['en', 'ar']) {
  const html = renderPages(lang).find((page) => page.route === '/news').html;
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll('#actus-du-jour .news-carousel-card').length, 3);
  assert.ok(doc.querySelector('#actus-du-jour .section-label').textContent.includes(editionDate));
  const button = doc.querySelector('#actus-du-jour .news-headlines-all');
  assert.equal(button.getAttribute('href'), '/news/articles');
  assert.ok(button.textContent.includes(lang === 'en' ? 'View all articles' : 'عرض كل المقالات'));
}

// Le sélecteur Nuri bascule vraiment du clip embarqué vers le replay.
const dom = new JSDOM('<!doctype html><html><body><div id="video"></div></body></html>', { url: 'https://letsplay.test/Let-s-Play/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { act } = React;
const renderer = createRoot(document.querySelector('#video'));
const nuri = getArticleTrailerEntry('tech/nuri-cinquieme-vol-satellites');
await act(async () => renderer.render(React.createElement(ArticleTrailer, nuri)));
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(nuri.items[0].id));
const choices = document.querySelectorAll('.article-trailer-choice');
assert.equal(choices.length, 2);
await act(async () => choices[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.equal(document.querySelectorAll('iframe').length, 1);
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(nuri.items[1].id));
assert.equal(choices[1].getAttribute('aria-pressed'), 'true');
assert.equal(choices[0].getAttribute('aria-pressed'), 'false');
assert.ok(document.querySelector('.article-trailer-note').textContent.includes('ne s’agit pas d’un direct'));
await act(async () => renderer.unmount());

// Un vrai clic du lien du hub doit ouvrir l’archive, puis permettre le retour.
const navigation = createRoot(document.querySelector('#video'));
await act(async () => navigation.render(React.createElement(NewsArchiveFlow)));
await act(async () => document.querySelector('.news-headlines-all').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
assert.ok(document.querySelector('.news-archive h1').textContent.includes('ARTICLES.'));
assert.equal(document.querySelectorAll('.news-archive .news-carousel-card').length, expectedRoutes.length);
await act(async () => document.querySelector('.news-archive .arrow-link').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
assert.equal(document.querySelectorAll('#actus-du-jour .news-carousel-card').length, 3);
assert.ok(document.querySelector('#actus-du-jour .news-headlines-all'));
await act(async () => navigation.unmount());
dom.window.close();

console.log('Édition du 08.10.2026 : OK — 3 articles, 3 miniatures locales, 4 vidéos officielles, hubs, accueil, routes, recherche, SEO, bouton d’archives, cartes Actus partagées et sélection du replay.');
