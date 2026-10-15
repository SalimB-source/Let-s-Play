// Régression de l’édition du 15.10.2026 : images, routes, cartes, vidéos et recherche.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { dailyStories, dailyNewsListing, dailySeoEntries, editionDate, editionIsoDate } from '../src/news/daily/2026-10-15.js';
import { getArticleTrailerEntry, trailerFlagLabel, trailerWatchUrl } from '../src/articleTrailers.js';
import { youTubeEmbedUrl } from '../src/lib/videoPlayback.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'daily-news-smoke');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const keys = Object.keys(dailyStories);
// Pastille de vidéo : « BANDE-ANNONCE »/« TEASER » quand l'article a une vidéo
// officielle, pas de pastille quand il n'en a pas (l'article le dit alors dans
// son corps, via la mention d'absence de son lecteur).
const assertTrailerFlag = (card, route) => {
  const label = trailerFlagLabel(route);
  const flag = card.querySelector('.news-trailer-flag');
  if (label) {
    assert.ok(flag, `${route} : pastille de vidéo`);
    assert.equal(flag.textContent.trim(), label, `${route} : nature de la vidéo`);
  } else {
    assert.equal(flag, null, `${route} : aucune pastille sans vidéo officielle`);
  }
};

assert.equal(keys.length, 3, 'une actualité dans chacun des trois univers');
assert.equal(dailyNewsListing.length, 3);
assert.equal(editionDate, '15.10.2026');
assert.equal(editionIsoDate, '2026-10-15');
assert.doesNotMatch(JSON.stringify(dailyStories), /mistral/i, 'le sujet écarté par l’utilisateur n’est pas publié');

// Miniatures provenant des vidéos Nintendo / Netflix et du portail officiel Free.
const imageUrl = (image) => /^https?:\/\//.test(image) ? image : `/Let-s-Play/${image}`;
for (const [key, story] of Object.entries(dailyStories)) {
  assert.equal(story.date, editionDate);
  assert.equal(story.image, story.thumbnail);
  if (/^https?:\/\//.test(story.image)) {
    assert.ok(['i.ytimg.com', 'portail.free.fr'].includes(new URL(story.image).hostname));
  } else {
    assert.ok(fs.statSync(path.join(root, 'public', story.image)).size > 10000);
  }
  assert.ok(story.source && story.credit && story.imageAlt && story.dek);
  assert.equal(new URL(story.sourceUrl).hostname, 'www.journaldugeek.com');
  const entry = getArticleTrailerEntry(key);
  if (key.startsWith('tech/')) {
    assert.ok(entry.pending, 'absence de vidéo officielle Free explicitée');
    assert.equal(entry.items.length, 0);
    assert.equal(new URL(story.image).hostname, 'portail.free.fr');
  } else {
    const expectedId = key.startsWith('cinema/') ? 'gDJ-ini7fF0' : '8v8eDMh1o3g';
    assert.equal(entry.items[0].id, expectedId);
    assert.equal(entry.items[0].channel, key.startsWith('cinema/') ? 'Netflix' : 'Nintendo of America');
    assert.equal(entry.items[0].verified, editionDate);
    assert.ok(story.image.includes(`/vi/${expectedId}/`));
    assert.ok(story.fallbackImage.endsWith('/hqdefault.jpg'));
    assert.ok(!entry.pending);
  }
  assert.equal(dailySeoEntries[`/news/${key}`].published, editionIsoDate);
  assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`));
}
assert.ok(read('src/components/SEO.jsx').includes('...dailySeoEntries'));
assert.ok(read('src/main.jsx').includes('path="/news/sonic-racing-crossworlds-annee-2"'));
assert.ok(read('src/main.jsx').includes('path="/news/tekken-8-roger-jr-ace-combat-8-million"'));
assert.ok(read('src/main.jsx').includes('path="/news/ghost-tsushima-legends-anime-2028"'));
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
assert.match(read('src/news-carousel.css'), /\.news-hub-section\s+\.news-hub-headlines\s+\.news-carousel\.is-grid\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/, 'les actus du jour de la page Actus sont sur 4 colonnes');
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
  assert.equal(card.querySelector('img').getAttribute('src'), imageUrl(story.image));
  assert.equal(card.querySelector('img').getAttribute('alt'), story.alt);
  assertTrailerFlag(card, story.to);
}

for (const [key, story] of Object.entries(dailyStories)) {
  const doc = pages.get(`/news/${key}`);
  assert.equal(doc.querySelector('h1').textContent, `${story.title}${story.accent}`, `${key} : vrai article, pas une 404`);
  assert.equal(doc.querySelector('.article-cover img').getAttribute('src'), imageUrl(story.thumbnail));
  const entry = getArticleTrailerEntry(key);
  if (entry.pending) {
    // Une actu sans vidéo officielle doit le dire dans le corps de l'article.
    assert.equal(doc.querySelectorAll('.article-trailer iframe').length, 0, `${key} : aucun lecteur sans vidéo`);
    assert.equal(doc.querySelector('.article-trailer-pending').textContent.includes(entry.pending), true, `${key} : mention d’absence`);
  } else {
    const first = entry.items[0];
    const players = doc.querySelectorAll('.article-trailer iframe');
    assert.equal(players.length, 1, `${key} : un seul lecteur`);
    assert.equal(players[0].getAttribute('src'), youTubeEmbedUrl(first.id));
    assert.ok(doc.querySelector(`a[href="${trailerWatchUrl(first.id)}"]`));
  }
  assert.ok(doc.querySelector(`a[href="${story.sourceUrl}"]`), `${key} : source cliquable`);
  assert.ok(searchContent(story.cover.split(' · ')[0]).some((result) => result.route === `/news/${key}`), `${key} : recherche`);
}

for (const [category, key] of [['gaming', keys[0]], ['cinema', keys[1]], ['tech', keys[2]]]) {
  const doc = pages.get(`/news/${category}`);
  const featured = doc.querySelector('.news-featured-story');
  assert.equal(featured.querySelector('.daily-news-copy').getAttribute('href'), `/news/${key}`);
  assert.equal(featured.querySelector('img').getAttribute('src'), imageUrl(dailyStories[key].thumbnail));
  assert.ok(featured.querySelector('.news-kicker').textContent.includes(editionDate));
  assertTrailerFlag(featured, key);
  assert.ok(doc.querySelector('.section-label').textContent.includes(editionDate));
}
const home = pages.get('/').querySelector('.home-news-card');
assert.equal(home.querySelector('.daily-news-copy').getAttribute('href'), `/news/${keys[0]}`);
assert.equal(home.querySelector('img').getAttribute('src'), `/Let-s-Play/${dailyStories[keys[0]].thumbnail}`);
assert.ok(home.querySelector('.news-kicker').textContent.includes(editionDate));

// EN et AR conservent aussi la date de publication et les six cartes.
for (const lang of ['en', 'ar']) {
  const html = renderPages(lang).find((page) => page.route === '/news').html;
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll('#actus-du-jour .news-carousel-card').length, 3);
  assert.ok(doc.querySelector('#actus-du-jour .section-label').textContent.includes(editionDate));
  const button = doc.querySelector('#actus-du-jour .news-headlines-all');
  assert.equal(button.getAttribute('href'), '/news/articles');
  assert.ok(button.textContent.includes(lang === 'en' ? 'View all articles' : 'عرض كل المقالات'));
}

// Le sélecteur de l’anime bascule vraiment de la version anglaise à la
// version japonaise du même teaser officiel.
const dom = new JSDOM('<!doctype html><html><body><div id="video"></div></body></html>', { url: 'https://letsplay.test/Let-s-Play/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { act } = React;
const renderer = createRoot(document.querySelector('#video'));
const legends = getArticleTrailerEntry('ghost-tsushima-legends-anime-2028');
await act(async () => renderer.render(React.createElement(ArticleTrailer, legends)));
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(legends.items[0].id));
const choices = document.querySelectorAll('.article-trailer-choice');
assert.equal(choices.length, 2);
await act(async () => choices[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.equal(document.querySelectorAll('iframe').length, 1);
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(legends.items[1].id));
assert.equal(choices[1].getAttribute('aria-pressed'), 'true');
assert.equal(choices[0].getAttribute('aria-pressed'), 'false');
assert.ok(document.querySelector('.article-trailer-note').textContent.includes('version japonaise'));
await act(async () => renderer.unmount());

// Le sélecteur d'une actu sans vidéo officielle affiche la mention d'absence.
const pendingRoot = createRoot(document.querySelector('#video'));
const anthropic = getArticleTrailerEntry('tech/anthropic-claude-faux-indice-philadelphie');
await act(async () => pendingRoot.render(React.createElement(ArticleTrailer, anthropic)));
assert.equal(document.querySelectorAll('iframe').length, 0);
assert.ok(document.querySelector('.article-trailer-pending').textContent.includes('Aucune vidéo officielle'));
await act(async () => pendingRoot.unmount());

console.log('Édition du 15.10.2026 : OK — 3 articles, hubs, accueil, archives, recherche et SEO.');
