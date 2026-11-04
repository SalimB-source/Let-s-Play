import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, dailySeoEntries, gamingNews, editionDate, editionIsoDate } from '../src/news/daily/2026-11-04.js';
import { dailySeoEntries as seoIndex } from '../src/news/daily/seo-index.js';
import { getArticleTrailerEntry, leadTrailer } from '../src/articleTrailers.js';
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('4 novembre : trois univers, articles complets et SEO cohérent', () => {
  assert.equal(editionDate, '04.11.2026');
  assert.equal(editionIsoDate, '2026-11-04');
  assert.equal(dailyNewsListing.length, 3);
  assert.equal(gamingNews.length, 1);
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/cinema/')));
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/tech/')));
  assert.equal(new Set(dailyNewsListing.map(s => s.to)).size, 3);
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.equal(story.date, editionDate);
    assert.equal(new URL(story.sourceUrl).protocol, 'https:');
    assert.equal(new URL(story.image).protocol, 'https:');
    assert.ok(fs.existsSync(new URL(`../public/${story.fallbackImage}`, import.meta.url)));
    for (const field of ['dek', 'lead', 'intro', 'h2', 'p1', 'p2', 'h2b', 'p3', 'p4', 'takeText', 'imageAlt', 'credit']) assert.ok(story[field], `${key}: ${field}`);
    assert.deepEqual(seoIndex[`/news/${key}`], dailySeoEntries[`/news/${key}`]);
    assert.equal(seoIndex[`/news/${key}`].published, editionIsoDate);
    assert.ok(story.source.includes('consultée le 04.11.2026'));
  }
});

test('médias officiels : deux trailers vérifiés, pas de fausse retransmission Apple', () => {
  const expected = {
    'lightyear-frontier-1-0-4-novembre-2026': ['YlFr76IUmrk', 'Lightyear Frontier'],
    'cinema/godzilla-minus-zero-sortie-france-4-novembre-2026': ['t3ou5N7e9M0', 'All The Anime, France'],
  };
  for (const [key, [id, channel]] of Object.entries(expected)) {
    const trailer = leadTrailer(`/news/${key}`);
    assert.equal(trailer.id, id);
    assert.equal(trailer.channel, channel);
    assert.equal(trailer.verified, editionDate);
    assert.ok(trailer.note);
    assert.ok(dailyStories[key].thumbnail.includes(id));
  }
  const key = 'tech/siri-ai-developer-preview-labs-4-novembre-2026';
  assert.equal(leadTrailer(`/news/${key}`), null);
  assert.ok(getArticleTrailerEntry(key).pending.includes('Aucune vidéo officielle'));
  assert.equal(new URL(dailyStories[key].image).hostname, 'devimages-cdn.apple.com');
  assert.ok(dailyStories[key].intro.includes('18 h à 19 h à Alger'));
  assert.ok(dailyStories[key].p3.includes('au printemps'));
});

test('édition courante partout et édition du 3 novembre conservée dans Hier et archives', () => {
  for (const file of ['src/pages/News.jsx', 'src/pages/Home.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/pages/AllNews.jsx', 'src/pages/CurrentNews.jsx', 'src/search/searchIndex.js']) {
    assert.ok(read(file).includes("from '../news/daily/2026-11-04'"), file);
  }
  assert.match(read('src/pages/News.jsx'), /yesterdayStories, editionDate as yesterdayDate.*2026-11-03/);
  for (const file of ['src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) assert.ok(read(file).includes("from '../news/daily/2026-11-03'"));
});
