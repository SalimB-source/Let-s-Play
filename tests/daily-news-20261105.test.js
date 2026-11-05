import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, dailySeoEntries, gamingNews, editionDate, editionIsoDate } from '../src/news/daily/2026-11-05.js';
import { dailySeoEntries as seoIndex } from '../src/news/daily/seo-index.js';
import { leadTrailer, getArticleTrailerEntry } from '../src/articleTrailers.js';
const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('5 novembre : trois univers, sources, visuels de repli et SEO', () => {
  assert.equal(editionDate, '05.11.2026');
  assert.equal(editionIsoDate, '2026-11-05');
  assert.equal(dailyNewsListing.length, 6);
  assert.equal(gamingNews.length, 4);
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/cinema/')));
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/tech/')));
  assert.equal(new Set(dailyNewsListing.map(s => s.to)).size, 6);
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.equal(story.date, editionDate);
    assert.equal(new URL(story.sourceUrl).protocol, 'https:');
    if (story.image.startsWith('https://')) assert.equal(new URL(story.image).protocol, 'https:');
    else assert.ok(fs.existsSync(new URL(`../public/${story.image}`, import.meta.url)));
    assert.ok(fs.existsSync(new URL(`../public/${story.fallbackImage}`, import.meta.url)));
    for (const f of ['dek', 'lead', 'intro', 'h2', 'p1', 'p2', 'h2b', 'p3', 'p4', 'takeText', 'imageAlt', 'credit']) assert.ok(story[f], `${key}: ${f}`);
    assert.deepEqual(seoIndex[`/news/${key}`], dailySeoEntries[`/news/${key}`]);
    assert.equal(dailySeoEntries[`/news/${key}`].published, editionIsoDate);
  }
});

test('vidéos officielles datées et absence explicite de vidéo d’acquisition', () => {
  for (const [key, id, channel] of [
    ['zelda-ocarina-of-time-sortie-switch-2-5-novembre', '8v8eDMh1o3g', 'Nintendo of America'],
    ['cinema/black-doves-saison-2-netflix-5-novembre', 'MOU2thjq6Z0', 'Netflix'],
  ]) {
    const trailer = leadTrailer(`/news/${key}`);
    assert.equal(trailer.id, id);
    assert.equal(trailer.channel, channel);
    assert.equal(trailer.verified, editionDate);
    assert.ok(trailer.note);
    assert.ok(dailyStories[key].thumbnail.includes(id));
  }
  const key = 'tech/openai-pierre-acquisition-codex-5-novembre';
  assert.equal(leadTrailer(`/news/${key}`), null);
  assert.ok(getArticleTrailerEntry(key).pending.includes('Aucune vidéo officielle'));
  assert.ok(dailyStories[key].intro.includes('pas encore finalisé'));
  assert.ok(dailyStories[key].credit.includes('Visuel de contexte Git'));
});

test('accueil et hubs ouvrent sur le 5 novembre, Hier sur le 4 novembre', () => {
  for (const f of ['src/pages/Home.jsx', 'src/pages/News.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) assert.ok(read(f).includes("from '../news/daily/2026-11-05'"), f);
  assert.match(read('src/pages/News.jsx'), /yesterdayStories, editionDate as yesterdayDate.*2026-11-04/);
  for (const f of ['src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) assert.ok(read(f).includes("from '../news/daily/2026-11-04'"));
});

test('compléments Laufey et GTA : dates, réserves commerciales et vidéos d’archive', () => {
  const laufey = dailyStories['god-of-war-laufey-report-20-mai-2027'];
  const gta = dailyStories['gta-6-precommandes-estimations-sensor-tower-novembre'];
  assert.match(laufey.dek, /16 février.*20 mai 2027/);
  assert.match(laufey.lead, /4 novembre/);
  assert.match(read('src/releasesData.js'), /slug: 'god-of-war-laufey', year: 2027, month: 5, day: 20/);
  assert.match(gta.dek, /estimations.*Sensor Tower.*751 millions/);
  assert.match(gta.dek, /Rockstar n’a pas confirmé/);
  assert.match(gta.p3, /pas un résultat acquis/);
  assert.equal(new URL(gta.sourceUrl).hostname, 'www.frandroid.com');
  for (const [key, id, channel] of [
    ['god-of-war-laufey-report-20-mai-2027', 'CQve7-PraCM', 'PlayStation'],
    ['gta-6-precommandes-estimations-sensor-tower-novembre', 'QdBZY2fkU-0', 'Rockstar Games'],
  ]) {
    const trailer = leadTrailer(key);
    assert.equal(trailer.id, id);
    assert.equal(trailer.channel, channel);
    assert.equal(trailer.verified, editionDate);
    assert.match(trailer.note, /illustr/);
    assert.match(trailer.note, /Ce n’est pas une/);
  }
  assert.match(read('src/pages/News.jsx'), /const todayStories = dailyNewsListing;/);
});

test('AGA : partenariat transparent, date exacte et affiche sans données Facebook', () => {
  const key = 'algeria-game-awards-2027-lets-play-sponsor-platinum';
  const story = dailyStories[key];
  assert.match(story.dek, /Platinum.*6ᵉ.*22 janvier 2027/);
  assert.match(story.intro, /non une couverture indépendante/);
  assert.match(story.source, /date exacte.*pas visible/);
  assert.match(story.p4, /ni le lieu, ni les horaires/);
  assert.equal(story.thumbnail, 'news/2026-11-05/algeria-game-awards-lets-play-platinum.jpg');
  assert.equal(leadTrailer(key), null);
  assert.match(getArticleTrailerEntry(key).pending, /pas de vidéo/);
});
