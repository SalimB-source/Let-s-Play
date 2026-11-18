import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, gamingNews, dailySeoEntries, editionDate, editionIsoDate } from '../src/news/daily/2026-11-17.js';
import { dailySeoEntries as seo } from '../src/news/daily/seo-index.js';
import { articleFooterSource, officialSourceUrl } from '../src/lib/articleSources.js';
import { leadTrailer, getArticleTrailerEntry } from '../src/articleTrailers.js';
import { dailyStories as previous } from '../src/news/daily/2026-11-16.js';
const read = path => fs.readFileSync(path, 'utf8');
const gtaKey = 'gta-6-discord-theme-vice-city';
const netflixKey = 'cinema/mike-ward-modeste-netflix-17-novembre';
const techKey = 'tech/gemini-notebook-sites-interactifs';

test('17 novembre : trois articles complets et officiels sans collision', () => {
  assert.equal(editionDate, '17.11.2026');
  assert.equal(editionIsoDate, '2026-11-17');
  assert.equal(dailyNewsListing.length, 3);
  assert.equal(gamingNews.length, 1);
  assert.deepEqual(Object.keys(dailyStories), [gtaKey, netflixKey, techKey]);
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.ok(!previous[key]);
    assert.equal(story.date, editionDate);
    assert.ok(story.sourceDate <= editionIsoDate);
    assert.equal(articleFooterSource(story)?.href, story.sourceUrl);
    assert.match(story.thumbnail, /^https:\/\//);
    assert.equal(story.thumbnail, story.image);
    assert.ok(story.imageCredit.length > 60);
    assert.ok(fs.existsSync(`public/${story.fallbackImage}`));
    for (const field of ['lead', 'intro', 'p1', 'p2', 'p3', 'p4', 'takeText']) assert.ok(story[field].length > 100, `${key}: ${field}`);
    const route = `/news/${key}`;
    assert.deepEqual(seo[route], dailySeoEntries[route]);
    assert.equal(seo[route].published, editionIsoDate);
    assert.equal(read('public/sitemap.xml').split(`<loc>https://salimb-source.github.io/Let-s-Play${route}</loc>`).length - 1, 1);
  }
});

test('édition du 17 en une, GTA en tête et archives conservées', () => {
  for (const page of ['Home', 'News']) assert.ok(read(`src/pages/${page}.jsx`).includes("from '../news/daily/2026-11-18'"));
  for (const file of ['src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/search/searchIndex.js']) {
    const text = read(file);
    for (const day of ['17', '16', '15', '14', '13', '12']) assert.ok(text.includes(`from '../news/daily/2026-11-${day}'`));
    assert.ok(text.indexOf("from '../news/daily/2026-11-17'") < text.indexOf("from '../news/daily/2026-11-16'"));
  }
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
  assert.equal(dailyNewsListing[0].to, `/news/${gtaKey}`);
});

test('seul le billet produit Discord vérifié est autorisé, pas les contenus communautaires', () => {
  const url = dailyStories[gtaKey].sourceUrl;
  assert.equal(officialSourceUrl(url), url);
  for (const bad of ['https://discord.com/invite/rockstargames', 'https://discord.com/servers/123', 'https://discord.com/blog/unreviewed', `${url}?unreviewed=true`, 'https://discord.com.evil.example/blog/vice-city-theme-available-in-discord']) assert.equal(officialSourceUrl(bad), null);
});

test('GTA : annonce Discord datée, conditions Nitro et quête distinctes', () => {
  const story = dailyStories[gtaKey];
  assert.equal(story.sourceDate, '2026-11-16');
  assert.match(story.lead, /pas de nouvelles mécaniques du jeu/);
  assert.match(story.p1, /hors Nitro Basic/);
  assert.match(story.p1, /13 décembre/);
  assert.match(story.p3, /se termine le 18 novembre/);
  assert.match(story.p3, /pas d’une clé de GTA VI/);
  assert.equal(leadTrailer(gtaKey).channel, 'Rockstar Games');
  assert.match(leadTrailer(gtaKey).note, /15 octobre/);
  assert.match(leadTrailer(gtaKey).note, /ni une vidéo du thème Discord/);
});

test('Netflix : sortie du 17, trailer natif reconnu sans copie YouTube', () => {
  const story = dailyStories[netflixKey];
  assert.equal(story.sourceDate, '2026-11-13');
  assert.match(story.lead, /17 novembre/);
  assert.match(story.p2, /TV-MA/);
  assert.match(story.p3, /minute et sept secondes/);
  assert.equal(leadTrailer(netflixKey), null);
  assert.match(getArticleTrailerEntry(netflixKey).pending, /fiche Netflix/);
});

test('Google : adultes, déploiement progressif web et limites non inventées', () => {
  const story = dailyStories[techKey];
  assert.equal(story.sourceDate, '2026-11-16');
  assert.match(story.intro, /progressif.*18 ans/);
  assert.match(story.intro, /mobile.*sans date précise/);
  assert.match(story.p3, /ne détaille pas les permissions/);
  assert.match(story.p4, /pas de tarif spécifique/);
  assert.equal(leadTrailer(techKey), null);
  assert.match(getArticleTrailerEntry(techKey).pending, /démonstration vidéo/);
});
