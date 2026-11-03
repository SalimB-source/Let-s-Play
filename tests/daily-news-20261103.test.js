import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, dailySeoEntries, gamingNews, editionDate, editionIsoDate } from '../src/news/daily/2026-11-03.js';
import { dailySeoEntries as indexedSeo } from '../src/news/daily/seo-index.js';
import { getArticleTrailerEntry, leadTrailer } from '../src/articleTrailers.js';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('édition du 3 novembre : trois univers, sources, SEO et miniatures officielles', () => {
  assert.equal(editionDate, '03.11.2026');
  assert.equal(editionIsoDate, '2026-11-03');
  assert.equal(dailyNewsListing.length, 3);
  assert.equal(gamingNews.length, 1);
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/cinema/')));
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/tech/')));
  assert.equal(new Set(dailyNewsListing.map(s => s.to)).size, 3);
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.equal(story.date, editionDate);
    assert.equal(new URL(story.sourceUrl).protocol, 'https:');
    assert.equal(new URL(story.thumbnail).hostname, 'i.ytimg.com');
    assert.ok(fs.existsSync(new URL(`../public/${story.fallbackImage}`, import.meta.url)));
    for (const field of ['dek', 'lead', 'intro', 'h2', 'p1', 'p2', 'h2b', 'p3', 'p4', 'takeText', 'imageAlt', 'credit']) assert.ok(story[field], `${key}: ${field}`);
    assert.equal(dailySeoEntries[`/news/${key}`].published, editionIsoDate);
    const trailer = leadTrailer(`/news/${key}`);
    assert.ok(trailer);
    assert.ok(story.thumbnail.includes(trailer.id));
    assert.equal(trailer.verified, editionDate);
    assert.ok(trailer.note);
    assert.equal(getArticleTrailerEntry(key).items.length, 1);
  }
});

test('annonces antérieures et première à venir explicitement distinguées', () => {
  const ps = leadTrailer('/news/ps-plus-novembre-2026-disponibilite-3-novembre');
  assert.equal(ps.channel, 'PlayStation Access');
  assert.ok(ps.note.includes('28 octobre'));
  const bass = leadTrailer('/news/cinema/bass-x-machina-netflix-3-novembre-2026');
  assert.equal(bass.channel, 'Netflix');
  assert.ok(bass.note.includes('14 octobre'));
  const stm = leadTrailer('/news/tech/stm32-summit-3-novembre-2026');
  assert.equal(stm.channel, 'STMicroelectronics');
  assert.ok(stm.note.includes('première à venir'));
  assert.ok(dailyStories['tech/stm32-summit-3-novembre-2026'].p4.includes('écran d’attente'));
});

test('tous les consommateurs utilisent la nouvelle édition sans retirer les archives', () => {
  for (const file of ['src/pages/News.jsx', 'src/pages/Home.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/pages/AllNews.jsx', 'src/pages/CurrentNews.jsx', 'src/search/searchIndex.js']) {
    assert.ok(read(file).includes("from '../news/daily/2026-11-03'"), file);
  }
  assert.ok(read('src/components/SEO.jsx').includes("from '../news/daily/seo-index'"));
  for (const [route, entry] of Object.entries(dailySeoEntries)) assert.deepEqual(indexedSeo[route], entry);
  const news = read('src/pages/News.jsx');
  assert.match(news, /yesterdayStories, editionDate as yesterdayDate.*2026-11-02/);
  assert.ok(news.includes('<span>{yesterdayDate}</span>'));
  for (const file of ['src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) {
    assert.ok(read(file).includes("from '../news/daily/2026-11-01'"));
    assert.ok(read(file).includes("from '../news/daily/2026-11-02'"));
  }
});
