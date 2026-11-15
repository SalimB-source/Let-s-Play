import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, editionDate } from '../src/news/daily/2026-11-12.js';
import { articleFooterSource } from '../src/lib/articleSources.js';
import { leadTrailer, getArticleTrailerEntry } from '../src/articleTrailers.js';
import { dailySeoEntries } from '../src/news/daily/seo-index.js';
const read = path => fs.readFileSync(path, 'utf8');

test('12 novembre : trois articles, images officielles, routes et sources autorisées', () => {
  assert.equal(editionDate, '12.11.2026');
  assert.equal(dailyNewsListing.length, 3);
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.equal(story.date, editionDate);
    assert.ok(articleFooterSource(story).href);
    assert.match(story.image, /^https:\/\//);
    assert.ok(fs.existsSync(`public/${story.fallbackImage}`));
    assert.ok(dailySeoEntries[`/news/${key}`]);
    assert.ok(read('public/sitemap.xml').includes(`/news/${key}`));
    for (const field of ['lead', 'intro', 'p1', 'p2', 'p3', 'p4', 'takeText']) assert.ok(story[field].length > 70);
  }
});

test('dates originales et limites du préchargement explicites', () => {
  const gta = dailyStories['gta-6-prechargement-codes-boite-12-novembre'];
  assert.equal(gta.sourceDate, '2026-11-10');
  assert.match(gta.intro, /ne permet pas de jouer avant/);
  assert.match(gta.p1, /0 h GMT/);
  assert.match(gta.p2, /pas une garantie de stock/);
  assert.match(gta.p3, /pas de mesures/);
  assert.match(leadTrailer('gta-6-prechargement-codes-boite-12-novembre').note, /15 octobre/);
});

test('trailer Netflix officiel et preview Gemini sans vidéo générique', () => {
  assert.equal(leadTrailer('cinema/ray-gunn-netflix-deuxieme-trailer').id, 'oAmCTknTA6I');
  assert.match(dailyStories['cinema/ray-gunn-netflix-deuxieme-trailer'].intro, /pas.*programmation cinéma française ou algérienne/);
  assert.equal(dailyStories['tech/gemini-data-cloud-connecteurs-preview'].sourceDate, '2026-11-06');
  assert.ok(getArticleTrailerEntry('tech/gemini-data-cloud-connecteurs-preview').pending);
});

test('édition du 12 conservée dans les archives après le rattrapage', () => {
  for (const page of ['CurrentNews', 'AllNews']) assert.ok(read(`src/pages/${page}.jsx`).includes("from '../news/daily/2026-11-12'"));
  for (const page of ['GamingNews', 'CinemaNews', 'TechNews', 'CurrentNews', 'AllNews']) {
    const text = read(`src/pages/${page}.jsx`);
    for (const day of ['12', '11', '10', '09']) assert.ok(text.includes(`from '../news/daily/2026-11-${day}'`));
  }
  assert.ok(!read('src/pages/News.jsx').includes('actus-hier'));
});
