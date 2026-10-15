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
import { youTubeThumbUrl } from '../src/lib/videoThumbnails.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'daily-news-smoke');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const keys = Object.keys(dailyStories);
const youtubeThumbHost = new URL(youTubeThumbUrl('abc123defgh')).hostname;
// Clé d'un univers : les actus cinéma et tech sont préfixées, le gaming ne l'est
// pas. Les hubs et la une de l'accueil se servent par préfixe, pas par position —
// l'édition du 15.10.2026 compte deux actus gaming.
const universeOf = (key) => (key.startsWith('cinema/') ? 'cinema' : key.startsWith('tech/') ? 'tech' : 'gaming');
const keyOf = (universe) => keys.find((key) => universeOf(key) === universe);
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

assert.equal(keys.length, 4, 'deux actus gaming, une actu cinéma et une actu tech');
assert.equal(dailyNewsListing.length, 4);
assert.deepEqual(keys.map(universeOf), ['gaming', 'gaming', 'cinema', 'tech'], 'les univers de l’édition, dans l’ordre');
// La première entrée ouvre la une de l'accueil et le hub gaming : c'est la
// bande-annonce de lancement de GTA VI, publiée le jour même par Rockstar.
assert.equal(keys[0], 'gta-6-trailer-de-lancement', 'l’actu gaming du jour ouvre l’édition');
const gtaStory = dailyStories['gta-6-trailer-de-lancement'];
assert.ok(gtaStory.title.length <= 20, 'GTA VI : titre dans le budget de 20 caractères');
assert.ok(gtaStory.accent.length <= 24, 'GTA VI : accent dans le budget de 24 caractères');
assert.ok(gtaStory.title.length + 1 + gtaStory.accent.length <= 40, 'GTA VI : titre complet dans le budget de 40 caractères');
const gtaWordCount = ['dek', 'lead', 'intro', 'p1', 'p2', 'p3', 'p4', 'takeText']
  .map((field) => gtaStory[field] || '').join(' ').trim().split(/\s+/).filter(Boolean).length;
assert.ok(gtaWordCount <= 120, `GTA VI : brève de 120 mots maximum (${gtaWordCount})`);
assert.equal(editionDate, '15.10.2026');
assert.equal(editionIsoDate, '2026-10-15');
assert.doesNotMatch(JSON.stringify(dailyStories), /mistral/i, 'le sujet écarté par l’utilisateur n’est pas publié');

// Vidéo officielle attendue par article : identifiant YouTube et chaîne qui l'a
// publiée, contrôlés le 15.10.2026 (oEmbed pour Rockstar Games, Nintendo of
// America et Netflix). L'actu tech n'en a pas : son entrée porte une mention
// d'absence, vérifiée plus bas.
const EXPECTED_VIDEOS = {
  'gta-6-trailer-de-lancement': { id: 'rz1B4B2yBZY', channel: 'Rockstar Games' },
  'zelda-ocarina-of-time-nouvelle-presentation': { id: '8v8eDMh1o3g', channel: 'Nintendo of America' },
  'cinema/narnia-gerwig-chronologie-esthetique': { id: 'gDJ-ini7fF0', channel: 'Netflix' },
};

// Miniatures provenant des vidéos Rockstar / Nintendo / Netflix et du portail officiel Free.
const imageUrl = (image) => /^https?:\/\//.test(image) ? image : `/Let-s-Play/${image}`;
for (const [key, story] of Object.entries(dailyStories)) {
  assert.equal(story.date, editionDate);
  assert.equal(story.image, story.thumbnail);
  if (/^https?:\/\//.test(story.image)) {
    assert.ok([youtubeThumbHost, 'portail.free.fr'].includes(new URL(story.image).hostname));
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
    const { id: expectedId, channel: expectedChannel } = EXPECTED_VIDEOS[key];
    assert.equal(entry.items[0].id, expectedId, `${key} : vidéo officielle`);
    assert.equal(entry.items[0].channel, expectedChannel, `${key} : chaîne officielle`);
    assert.equal(entry.items[0].verified, editionDate);
    assert.ok(story.image.includes(`/vi/${expectedId}/`));
    assert.ok(story.fallbackImage.endsWith('/hqdefault.jpg'));
    assert.ok(!entry.pending);
  }
  assert.equal(dailySeoEntries[`/news/${key}`].published, editionIsoDate);
  assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`));
}
assert.ok(read('src/components/SEO.jsx').includes('...dailySeoEntries'));
assert.ok(read('src/main.jsx').includes('path="/news/gta-6-trailer-de-lancement"'));
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
assert.equal(cards.length, 4, 'les quatre articles de l’édition ouvrent le hub Actus');
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
  assert.equal(doc.querySelector('.article-byline').children[1].textContent, story.readTime || '4 MIN DE LECTURE', `${key} : temps de lecture`);
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
const gtaDoc = pages.get('/news/gta-6-trailer-de-lancement');
assert.equal(getArticleTrailerEntry('gta-6-trailer-de-lancement').items.length, 1, 'GTA VI : seul le trailer de lancement est intégré');
assert.equal(gtaDoc.querySelectorAll('.article-gallery-item').length, 3, 'GTA VI : trois photogrammes du trailer');

// Chaque hub d'univers met en avant sa première actu de l'édition : les clés se
// lisent par préfixe, l'édition du 15.10.2026 comptant deux actus gaming.
for (const category of ['gaming', 'cinema', 'tech']) {
  const key = keyOf(category);
  assert.ok(key, `${category} : une actu du jour dans cet univers`);
  const doc = pages.get(`/news/${category}`);
  const featured = doc.querySelector('.news-featured-story');
  assert.equal(featured.querySelector('.daily-news-copy').getAttribute('href'), `/news/${key}`);
  assert.equal(featured.querySelector('img').getAttribute('src'), imageUrl(dailyStories[key].thumbnail));
  assert.ok(featured.querySelector('.news-kicker').textContent.includes(editionDate));
  assertTrailerFlag(featured, key);
  assert.ok(doc.querySelector('.section-label').textContent.includes(editionDate));
}
// La deuxième actu gaming de l'édition reste publiée dans la grille du hub,
// juste après la une.
const gamingHub = pages.get('/news/gaming');
for (const key of keys.filter((candidate) => universeOf(candidate) === 'gaming').slice(1)) {
  const card = gamingHub.querySelector(`.news-carousel-card[href="/news/${key}"]`);
  assert.ok(card, `${key} : carte dans la grille du hub gaming`);
  assert.equal(card.querySelector('h2').textContent, `${dailyStories[key].title} ${dailyStories[key].accent}`);
  assertTrailerFlag(card, `/news/${key}`);
}
const home = pages.get('/').querySelector('.home-news-card');
assert.equal(home.querySelector('.daily-news-copy').getAttribute('href'), `/news/${keys[0]}`);
assert.equal(home.querySelector('img').getAttribute('src'), `/Let-s-Play/${dailyStories[keys[0]].thumbnail}`);
assert.ok(home.querySelector('.news-kicker').textContent.includes(editionDate));

// EN et AR conservent aussi la date de publication et les quatre cartes.
for (const lang of ['en', 'ar']) {
  const html = renderPages(lang).find((page) => page.route === '/news').html;
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll('#actus-du-jour .news-carousel-card').length, 4);
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

console.log('Édition du 15.10.2026 : OK — 4 articles, hubs, accueil, archives, recherche et SEO.');
