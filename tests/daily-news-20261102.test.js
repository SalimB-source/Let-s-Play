import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, dailySeoEntries, gamingNews, editionDate } from '../src/news/daily/2026-11-02.js';

test('édition du 2 novembre : trois univers, sources, visuels locaux et SEO cohérents', () => {
  assert.equal(editionDate, '02.11.2026');
  assert.equal(dailyNewsListing.length, 3);
  assert.equal(gamingNews.length, 1);
  assert.equal(new Set(dailyNewsListing.map(s => s.to)).size, 3);
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/cinema/')));
  assert.ok(dailyNewsListing.some(s => s.to.startsWith('/news/tech/')));
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.equal(story.date, editionDate);
    assert.equal(new URL(story.sourceUrl).protocol, 'https:');
    assert.ok(fs.existsSync(`public/${story.image}`));
    for (const field of ['dek', 'lead', 'intro', 'h2', 'p1', 'p2', 'h2b', 'p3', 'p4', 'takeText', 'imageAlt']) assert.ok(story[field], `${key}: ${field}`);
    assert.equal(dailySeoEntries[`/news/${key}`].published, '2026-11-02');
  }
});
