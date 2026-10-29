// Régression de l’édition du 18.10.2026 : images, routes, cartes, vidéos et
// recherche. Les éditions des 16 et 17.10.2026, ajoutées dans la même fournée,
// sont contrôlées en même temps (les éditions des 16 et 17 comptent deux
// articles gaming, un cinéma et un tech ; celle du 18 compte gaming ×2 et cinéma ×1).
// Les contrôles du sélecteur de vidéos et de la mention d’absence rejouent aussi
// les entrées historiques (11.10.2026).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { dailyStories, dailyNewsListing, dailySeoEntries, editionDate, editionIsoDate } from '../src/news/daily/2026-10-18.js';
import { dailyStories as cultureTechStories20261029, dailyNewsListing as cultureTechListing20261029, dailySeoEntries as cultureTechSeo20261029 } from '../src/news/daily/2026-10-29-cinema-tech.js';
import { dailyStories as gamingStories20261029, dailyNewsListing as gamingListing20261029, dailySeoEntries as gamingSeo20261029, editionDate as gamingDate20261029 } from '../src/news/daily/2026-10-29-gaming.js';
import { dailyStories as dailyStories20261011, dailyNewsListing as dailyNewsListing20261011, dailySeoEntries as dailySeoEntries20261011, editionDate as editionDate20261011, editionIsoDate as editionIsoDate20261011 } from '../src/news/daily/2026-10-11.js';
import { dailyStories as dailyStories20261014, dailyNewsListing as dailyNewsListing20261014, dailySeoEntries as dailySeoEntries20261014, editionDate as editionDate20261014, editionIsoDate as editionIsoDate20261014 } from '../src/news/daily/2026-10-14.js';
import { dailyStories as dailyStories20261015, dailyNewsListing as dailyNewsListing20261015, dailySeoEntries as dailySeoEntries20261015, editionDate as editionDate20261015, editionIsoDate as editionIsoDate20261015 } from '../src/news/daily/2026-10-15.js';
import { dailyStories as dailyStories20261016, dailyNewsListing as dailyNewsListing20261016, dailySeoEntries as dailySeoEntries20261016, editionDate as editionDate20261016, editionIsoDate as editionIsoDate20261016 } from '../src/news/daily/2026-10-16.js';
import { dailyStories as dailyStories20261017, dailyNewsListing as dailyNewsListing20261017, dailySeoEntries as dailySeoEntries20261017, editionDate as editionDate20261017, editionIsoDate as editionIsoDate20261017 } from '../src/news/daily/2026-10-17.js';
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
// chaque édition compte deux actus gaming.
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

assert.equal(keys.length, 3, 'deux actus gaming et une actu cinéma');
assert.equal(dailyNewsListing.length, 3);
assert.deepEqual(keys.map(universeOf), ['gaming', 'gaming', 'cinema'], 'les univers de l’édition, dans l’ordre');
// La première entrée ouvre la une de l'accueil et le hub gaming : c'est la
// présentation des options d'affichage d'Ocarina of Time sur Switch 2.
assert.equal(keys[0], 'zelda-ocarina-of-time-switch-2-affichages-hud', 'l’actu gaming du jour ouvre l’édition');
const opener = dailyStories[keys[0]];
assert.ok(opener.title.length <= 20, 'ouverture : titre dans le budget de 20 caractères');
assert.ok(opener.accent.length <= 24, 'ouverture : accent dans le budget de 24 caractères');
assert.ok(opener.title.length + 1 + opener.accent.length <= 40, 'ouverture : titre complet dans le budget de 40 caractères');
const openerWordCount = ['dek', 'lead', 'intro', 'p1', 'p2', 'p3', 'p4', 'takeText']
  .map((field) => opener[field] || '').join(' ').trim().split(/\s+/).filter(Boolean).length;
assert.ok(openerWordCount >= 120 && openerWordCount <= 500, `ouverture : brève complète entre 120 et 500 mots (${openerWordCount})`);
// Les trois nouvelles éditions (16, 17 et 18.10.2026) partagent les budgets de
// titres et la brève complète (dek + chapô + intro + corps + à retenir).
const newEditions = [
  { date: editionDate20261016, iso: editionIsoDate20261016, stories: dailyStories20261016 },
  { date: editionDate20261017, iso: editionIsoDate20261017, stories: dailyStories20261017 },
  { date: editionDate, iso: editionIsoDate, stories: dailyStories },
];
for (const { date, stories } of newEditions) {
  const expectedUniverses = date === editionDate ? ['gaming', 'gaming', 'cinema'] : ['gaming', 'gaming', 'cinema', 'tech'];
  assert.deepEqual(Object.keys(stories).map(universeOf), expectedUniverses, `${date} : les univers, dans l’ordre`);
  for (const [key, story] of Object.entries(stories)) {
    assert.ok(story.title.length <= 20, `${key} : titre dans le budget de 20 caractères`);
    assert.ok(story.accent.length <= 24, `${key} : accent dans le budget de 24 caractères`);
    assert.ok(story.title.length + 1 + story.accent.length <= 40, `${key} : titre complet dans le budget de 40 caractères`);
    const wordCount = ['dek', 'lead', 'intro', 'p1', 'p2', 'p3', 'p4', 'takeText']
      .map((field) => story[field] || '').join(' ').trim().split(/\s+/).filter(Boolean).length;
    assert.ok(wordCount >= 120 && wordCount <= 500, `${key} : brève complète entre 120 et 500 mots (${wordCount})`);
    assert.ok(story.quote && story.quoteBy && story.take && story.takeText, `${key} : éditorial au gabarit (citation, à retenir)`);
    assert.ok(story.keywords && story.readTime, `${key} : mots-clés et temps de lecture`);
  }
}
assert.equal(editionDate, '18.10.2026');
assert.equal(editionIsoDate, '2026-10-18');
assert.doesNotMatch(JSON.stringify(dailyStories), /minami/i, 'le sujet écarté faute de vidéo officielle n’est pas publié');
assert.ok(!keys.includes('gta-6-trailer-de-lancement'), 'GTA VI, déjà couvert le 15.10.2026, n’est pas republié');

// Vidéo officielle attendue par article de l'édition du jour : identifiant
// YouTube et chaîne qui l'a publiée, contrôlés le 18.10.2026.
const EXPECTED_VIDEOS = {
  'zelda-ocarina-of-time-switch-2-affichages-hud': { id: '8v8eDMh1o3g', channel: 'Nintendo of America' },
  'peak-console-edition-crossplay-22-octobre': { id: 'OsO0Dpt9OPs', channel: 'Aggro Crab' },
  'cinema/ramayana-rise-of-a-legend-nouvelle-bande-annonce': { id: 'AYkPRN874m8', channel: 'Sony Pictures Entertainment' },
};

// Miniatures : vidéos officielles (i.ytimg.com, via la fabrique du site),
// portail Free pour les visuels officiels, ou fichiers locaux de public/.
const imageUrl = (image) => (/^https?:\/\//.test(image) ? image : `/Let-s-Play/${image}`);
for (const [key, story] of Object.entries(dailyStories)) {
  assert.equal(story.date, editionDate);
  assert.equal(story.image, story.thumbnail);
  if (/^https?:\/\//.test(story.image)) {
    assert.ok([youtubeThumbHost, 'portail.free.fr'].includes(new URL(story.image).hostname));
  } else {
    assert.ok(fs.statSync(path.join(root, 'public', story.image)).size > 10000);
  }
  assert.ok(story.source && story.credit && story.imageAlt && story.dek);
  const sourceUrl = new URL(story.sourceUrl);
  assert.equal(sourceUrl.protocol, 'https:', `${key} : source officielle en https`);
  assert.ok(sourceUrl.hostname.includes('.'), `${key} : hébergeur de la source`);
  const entry = getArticleTrailerEntry(key);
  assert.ok(entry, `${key} : entrée du lecteur (vidéo ou mention)`);
  const entryItems = entry.items || [];
  if (key.startsWith('tech/')) {
    assert.ok(entry.pending, 'absence de vidéo officielle explicitée');
    assert.equal(entryItems.length, 0);
  } else {
    const { id: expectedId, channel: expectedChannel } = EXPECTED_VIDEOS[key];
    assert.equal(entryItems[0].id, expectedId, `${key} : vidéo officielle`);
    assert.equal(entryItems[0].channel, expectedChannel, `${key} : chaîne officielle`);
    assert.equal(entryItems[0].verified, editionDate);
    assert.ok(story.image.includes(`/vi/${expectedId}/`));
    assert.ok(story.fallbackImage.endsWith('/hqdefault.jpg'));
    assert.ok(!entry.pending);
  }
  assert.equal(dailySeoEntries[`/news/${key}`].published, editionIsoDate);
  assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`));
}
// Les éditions des 16 et 17.10.2026 suivent les mêmes règles de structure :
// image = miniature, visuel référencé ou local vérifié, entrée de lecteur pour
// chaque article (vidéo officielle ou mention d'absence), route au sitemap.
for (const edition of newEditions.slice(0, 2)) {
  const { date, iso, stories } = edition;
  const listing = date === editionDate20261016 ? dailyNewsListing20261016 : dailyNewsListing20261017;
  const seoEntries = date === editionDate20261016 ? dailySeoEntries20261016 : dailySeoEntries20261017;
  assert.equal(listing.length, 4, `${date} : quatre cartes`);
  for (const [key, story] of Object.entries(stories)) {
    assert.equal(story.date, date);
    assert.equal(story.image, story.thumbnail);
    if (/^https?:\/\//.test(story.image)) {
      assert.ok([youtubeThumbHost, 'portail.free.fr'].includes(new URL(story.image).hostname), `${key} : hébergeur d’image officiel`);
    } else {
      assert.ok(fs.statSync(path.join(root, 'public', story.image)).size > 10000, `${key} : fichier local de public/`);
    }
    assert.ok(story.source && story.credit && story.imageAlt && story.dek, `${key} : source, crédit et légende`);
    const sourceUrl = new URL(story.sourceUrl);
    assert.equal(sourceUrl.protocol, 'https:', `${key} : source officielle en https`);
    const entry = getArticleTrailerEntry(key);
    const items = (entry && entry.items) || [];
    if (items.length) {
      assert.ok(items[0].id && items[0].channel, `${key} : vidéo officielle identifiée`);
      assert.ok(items[0].verified, `${key} : contrôle de la vidéo tracé`);
      if (!/^https?:\/\//.test(story.image)) assert.ok(story.image.includes(`/vi/${items[0].id}/`), `${key} : miniature de la vidéo officielle`);
    } else {
      assert.ok(entry && entry.pending && entry.pending.length > 40, `${key} : mention d’absence explicite`);
    }
    assert.equal(seoEntries[`/news/${key}`].published, iso);
    assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`), `${key} : route au sitemap`);
  }
}
// Les éditions antérieures (11, 14 et 15.10.2026) gardent leurs contrôles de
// structure : image = miniature, visuel référencé ou local, source en https.
for (const [date, stories, iso, seoEntries] of [
  [editionDate20261011, dailyStories20261011, editionIsoDate20261011, dailySeoEntries20261011],
  [editionDate20261014, dailyStories20261014, editionIsoDate20261014, dailySeoEntries20261014],
  [editionDate20261015, dailyStories20261015, editionIsoDate20261015, dailySeoEntries20261015],
]) {
  for (const [key, story] of Object.entries(stories)) {
    assert.equal(story.date, date);
    assert.equal(story.image, story.thumbnail);
    if (/^https?:\/\//.test(story.image)) {
      assert.ok([youtubeThumbHost, 'portail.free.fr'].includes(new URL(story.image).hostname), `${key} : hébergeur d’image officiel`);
    } else {
      assert.ok(fs.statSync(path.join(root, 'public', story.image)).size > 10000, `${key} : fichier local de public/`);
    }
    assert.ok(story.source && story.credit && story.imageAlt && story.dek);
    assert.equal(new URL(story.sourceUrl).protocol, 'https:');
    const entry = getArticleTrailerEntry(key);
    const items = (entry && entry.items) || [];
    if (items.length) {
      assert.ok(story.image.includes(`/vi/${items[0].id}/`) || !/^https?:\/\//.test(story.image), `${key} : miniature de la vidéo officielle`);
    }
    assert.equal(seoEntries[`/news/${key}`].published, iso, `${key} : date de publication au SEO`);
    assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`), `${key} : route au sitemap`);
  }
}
assert.ok(read('src/components/SEO.jsx').includes('...dailySeoEntries'));
for (const key of keys) {
  if (!key.includes('/')) assert.ok(read('src/main.jsx').includes(`path="/news/${key}"`), `${key} : route gaming explicite`);
}
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
const todayListing = [gamingListing20261029[0], cultureTechListing20261029.find((story) => story.to.startsWith('/news/cinema/')), cultureTechListing20261029.find((story) => story.to.startsWith('/news/tech/'))];
assert.equal(cards.length, 3, 'les trois articles de l’édition ouvrent le hub Actus');
assert.match(read('src/news-carousel.css'), /\.news-hub-section\s+\.news-hub-headlines\s+\.news-carousel\.is-grid\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/, 'les trois actus du jour de la page Actus remplissent les 3 colonnes');
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
  assert.doesNotMatch(card.querySelector('img').getAttribute('src'), /\/Let-s-Play\/\/\/Let-s-Play\//, 'pas de double préfixe de miniature');
}
for (const [index, story] of todayListing.entries()) {
  const archiveCard = archive.querySelector(`.news-carousel-card[href="${story.to}"]`);
  assert.ok(archiveCard);
  assert.equal(archiveCard.innerHTML, cards[index].innerHTML, `${story.to} : même carte que dans les actualités du jour`);
}
assert.ok(expectedRoutes.some((route) => route.startsWith('/news/cinema/')));
assert.ok(expectedRoutes.some((route) => route.startsWith('/news/tech/')));
assert.ok(autoSearchEntries.length > 0);
assert.ok(archive.querySelector('.arrow-link[href="/news"]'), 'retour au hub');
assert.ok(hub.querySelector('.section-label').textContent.includes(gamingDate20261029));
assert.deepEqual(cards.map((card) => card.getAttribute('href')), todayListing.map((story) => story.to));
for (const [index, card] of cards.entries()) {
  const story = todayListing[index];
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
const zeldaDoc = pages.get('/news/zelda-ocarina-of-time-switch-2-affichages-hud');
assert.equal(getArticleTrailerEntry('zelda-ocarina-of-time-switch-2-affichages-hud').items.length, 1, 'Ocarina of Time : seule la présentation officielle est intégrée');
assert.equal(zeldaDoc.querySelectorAll('.article-gallery-item').length, 3, 'Ocarina of Time : trois photogrammes de la présentation');
const ramayanaDoc = pages.get('/news/cinema/ramayana-rise-of-a-legend-nouvelle-bande-annonce');
assert.equal(getArticleTrailerEntry('cinema/ramayana-rise-of-a-legend-nouvelle-bande-annonce').items.length, 3, 'Ramayana : nouvelle bande-annonce et deux vidéos de contexte');
assert.equal(ramayanaDoc.querySelectorAll('.article-gallery-item').length, 3, 'Ramayana : trois photogrammes de la nouvelle bande-annonce');

// Les hubs cinéma et tech ouvrent sur leurs nouvelles actus du 29 octobre.
for (const category of ['cinema', 'tech']) {
  const story = cultureTechListing20261029.find((item) => item.to.startsWith(`/news/${category}/`));
  const doc = pages.get(`/news/${category}`);
  const featured = doc.querySelector('.news-featured-story');
  assert.equal(featured.querySelector('.daily-news-copy').getAttribute('href'), story.to);
  assert.equal(featured.querySelector('img').getAttribute('src'), imageUrl(story.image));
  assert.ok(featured.querySelector('.news-kicker').textContent.includes(gamingDate20261029));
  assertTrailerFlag(featured, story.to);
  assert.ok(doc.querySelector('.section-label').textContent.includes(gamingDate20261029));
}
for (const [key, story] of Object.entries(cultureTechStories20261029)) {
  const route = `/news/${key}`;
  const doc = pages.get(route);
  assert.equal(doc.querySelector('h1').textContent, `${story.title}${story.accent}`);
  assert.equal(doc.querySelector('.article-cover img').getAttribute('src'), story.thumbnail);
  assert.ok(doc.querySelector(`a[href="${story.sourceUrl}"]`));
  const entry = getArticleTrailerEntry(key);
  assert.ok(entry?.items?.length);
  assert.equal(doc.querySelector('.article-trailer iframe').getAttribute('src'), youTubeEmbedUrl(entry.items[0].id));
  assert.ok(doc.querySelector(`a[href="${trailerWatchUrl(entry.items[0].id)}"]`));
  assert.ok(archive.querySelector(`.news-carousel-card[href="${route}"]`));
  assert.ok(searchContent(story.cover.split(' · ')[0]).some((result) => result.route === route));
  assert.equal(cultureTechSeo20261029[route].published, '2026-10-29');
  assert.ok(read('public/sitemap.xml').includes(`${route}</loc>`));
  assert.equal(story.date, gamingDate20261029);
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
// La sélection gaming du 29 est accessible dans le hub, l'accueil et l'archive.
const newKeys = Object.keys(gamingStories20261029);
assert.equal(newKeys.length, 4);
assert.equal(gamingHub.querySelector('.news-featured-story .daily-news-copy').getAttribute('href'), `/news/${newKeys[0]}`);
for (const [key, story] of Object.entries(gamingStories20261029)) {
  const route = `/news/${key}`;
  const doc = pages.get(route);
  assert.equal(doc.querySelector('h1').textContent, `${story.title}${story.accent}`);
  assert.ok(doc.querySelector(`a[href="${story.sourceUrl}"]`));
  assert.ok(archive.querySelector(`.news-carousel-card[href="${route}"]`));
  assert.ok(searchContent(story.cover.split(' · ')[0]).some((result) => result.route === route));
  assert.equal(gamingSeo20261029[route].published, '2026-10-29');
  assert.ok(read('public/sitemap.xml').includes(`${route}</loc>`));
  assert.match(story.thumbnail, /^https:\/\//, `${key} : visuel officiel distant`);
  assert.equal(story.image, story.thumbnail);
  assert.ok(story.imageCredit.includes('OFFICIEL'));
  if (story.fallbackImage && !/^https?:\/\//.test(story.fallbackImage)) assert.ok(fs.existsSync(path.join(root, 'public', story.fallbackImage)));
  assert.equal(doc.querySelector('.article-cover img').getAttribute('src'), story.thumbnail);
  const entry = getArticleTrailerEntry(key);
  assert.ok(entry?.items?.length, `${key} : vidéo officielle déclarée`);
  const player = doc.querySelector('.article-trailer iframe');
  assert.ok(player, `${key} : lecteur vidéo intégré`);
  assert.equal(player.getAttribute('src'), youTubeEmbedUrl(entry.items[0].id));
  assert.ok(doc.querySelector(`a[href="${trailerWatchUrl(entry.items[0].id)}"]`));
  assertTrailerFlag(archive.querySelector(`.news-carousel-card[href="${route}"]`), route);
  assert.equal(story.date, gamingDate20261029);
}
const home = pages.get('/').querySelector('.home-news-card');
assert.equal(home.querySelector('.daily-news-copy').getAttribute('href'), `/news/${newKeys[0]}`);
assert.equal(home.querySelector('img').getAttribute('src'), gamingStories20261029[newKeys[0]].thumbnail);
assert.ok(home.querySelector('.news-kicker').textContent.includes(gamingDate20261029));

// EN et AR conservent aussi la date de publication et les trois cartes.
for (const lang of ['en', 'ar']) {
  const html = renderPages(lang).find((page) => page.route === '/news').html;
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll('#actus-du-jour .news-carousel-card').length, 3);
  assert.ok(doc.querySelector('#actus-du-jour .section-label').textContent.includes(gamingDate20261029));
  const button = doc.querySelector('#actus-du-jour .news-headlines-all');
  assert.equal(button.getAttribute('href'), '/news/articles');
  assert.ok(button.textContent.includes(lang === 'en' ? 'View all articles' : 'عرض كل المقالات'));
}

// Le sélecteur bascule vraiment d'une vidéo officielle à l'autre.
const dom = new JSDOM('<!doctype html><html><body><div id="video"></div></body></html>', { url: 'https://letsplay.test/Let-s-Play/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { act } = React;
const renderer = createRoot(document.querySelector('#video'));
const ramayana = getArticleTrailerEntry('cinema/ramayana-rise-of-a-legend-nouvelle-bande-annonce');
await act(async () => renderer.render(React.createElement(ArticleTrailer, ramayana)));
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(ramayana.items[0].id));
const choices = document.querySelectorAll('.article-trailer-choice');
assert.equal(choices.length, 3);
await act(async () => choices[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.equal(document.querySelectorAll('iframe').length, 1);
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(ramayana.items[1].id));
assert.equal(choices[1].getAttribute('aria-pressed'), 'true');
assert.equal(choices[0].getAttribute('aria-pressed'), 'false');
assert.ok(document.querySelector('.article-trailer-note').textContent.includes('Première bande-annonce'));
await act(async () => renderer.unmount());

// Le sélecteur de l’anime historique bascule lui aussi (deux teasers : version
// anglaise et japonaise du même teaser officiel).
const legendsRoot = createRoot(document.querySelector('#video'));
const legends = getArticleTrailerEntry('ghost-tsushima-legends-anime-2028');
await act(async () => legendsRoot.render(React.createElement(ArticleTrailer, legends)));
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(legends.items[0].id));
const legendsChoices = document.querySelectorAll('.article-trailer-choice');
assert.equal(legendsChoices.length, 2);
await act(async () => legendsChoices[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.equal(document.querySelectorAll('iframe').length, 1);
assert.equal(document.querySelector('iframe').getAttribute('src'), youTubeEmbedUrl(legends.items[1].id));
assert.equal(legendsChoices[1].getAttribute('aria-pressed'), 'true');
assert.equal(legendsChoices[0].getAttribute('aria-pressed'), 'false');
assert.ok(document.querySelector('.article-trailer-note').textContent.includes('version japonaise'));
await act(async () => legendsRoot.unmount());

// Le sélecteur d'une actu sans vidéo officielle affiche la mention d'absence.
const anthropic = getArticleTrailerEntry('tech/anthropic-claude-faux-indice-philadelphie');
const anthropicRoot = createRoot(document.querySelector('#video'));
await act(async () => anthropicRoot.render(React.createElement(ArticleTrailer, anthropic)));
assert.equal(document.querySelectorAll('iframe').length, 0);
assert.ok(document.querySelector('.article-trailer-pending').textContent.includes('Aucune vidéo officielle'));
await act(async () => anthropicRoot.unmount());

console.log('Éditions gaming du 29 et archives des 16–18.10.2026 : OK — articles, hubs, accueil, archives, recherche, SEO et lecteurs.');
