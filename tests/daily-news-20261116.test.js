import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, gamingNews, dailySeoEntries, editionDate, editionIsoDate } from '../src/news/daily/2026-11-16.js';
import { dailySeoEntries as seo } from '../src/news/daily/seo-index.js';
import { articleFooterSource, officialSourceUrl } from '../src/lib/articleSources.js';
import { leadTrailer, getArticleTrailerEntry } from '../src/articleTrailers.js';
import { dailyStories as previous } from '../src/news/daily/2026-11-15.js';
const read = path => fs.readFileSync(path, 'utf8');
const doomKey = 'doom-dark-ages-revelations-slaughter-mode-16-novembre';
const stepsKey = 'cinema/steps-netflix-sortie-20-novembre';
const appleKey = 'tech/app-store-connect-descripteurs-age-16-novembre';

test('16 novembre : trois articles complets, officiels et sans collision', () => {
  assert.equal(editionDate, '16.11.2026');
  assert.equal(editionIsoDate, '2026-11-16');
  assert.equal(dailyNewsListing.length, 3);
  assert.equal(gamingNews.length, 1);
  assert.deepEqual(Object.keys(dailyStories), [doomKey, stepsKey, appleKey]);
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

test('nouvelle une, ordre des archives et intégration recherche/hubs', () => {
  for (const page of ['Home', 'News']) assert.ok(read(`src/pages/${page}.jsx`).includes("from '../news/daily/2026-11-16'"));
  for (const file of ['src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/search/searchIndex.js']) {
    const text = read(file);
    for (const day of ['16', '15', '14', '13', '12']) assert.ok(text.includes(`from '../news/daily/2026-11-${day}'`));
    assert.ok(text.indexOf("from '../news/daily/2026-11-16'") < text.indexOf("from '../news/daily/2026-11-15'"));
  }
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
  assert.equal(dailyNewsListing[0].to, `/news/${doomKey}`);
});

test('Bethesda autorisé comme éditeur, pas son imitation ni la republication IGN', () => {
  assert.ok(officialSourceUrl(dailyStories[doomKey].sourceUrl));
  for (const url of ['https://bethesda.net.evil.example/news', 'https://www.youtube.com/watch?v=46iBb-vTRGw', 'http://slayersclub.bethesda.net/news']) assert.equal(officialSourceUrl(url), null);
  assert.equal(leadTrailer(doomKey).id, 'RwtRHiZ8zkE');
  assert.equal(leadTrailer(doomKey).channel, 'Bethesda Softworks');
  assert.match(leadTrailer(doomKey).note, /12 novembre/);
  assert.match(leadTrailer(doomKey).note, /vérification d’âge/);
  assert.match(dailyStories[doomKey].intro, /ne signifie pas.*seul jeu de base/);
  assert.match(dailyStories[doomKey].intro, /sans affirmer avoir vérifié son déploiement/);
});

test('Steps : sélection à venir et ancien trailer clairement datés', () => {
  assert.equal(dailyStories[stepsKey].sourceDate, '2026-10-15');
  assert.equal(leadTrailer(stepsKey).id, 'tNV4i3BqUGY');
  assert.equal(leadTrailer(stepsKey).channel, 'Netflix');
  assert.match(dailyStories[stepsKey].intro, /pas d’une annonce inédite du jour/);
  assert.match(dailyStories[stepsKey].dek, /20 novembre/);
  assert.match(dailyStories[stepsKey].p3, /pas de déduire.*doublage français/);
});

test('Apple : entrée en vigueur, échéance et exceptions régionales distinguées', () => {
  const story = dailyStories[appleKey];
  assert.equal(story.sourceDate, '2026-11-02');
  assert.match(story.intro, /12 janvier 2027/);
  assert.match(story.p2, /peut ne pas modifier.*certaines régions/);
  assert.match(story.p3, /A16.*A18/);
  assert.match(story.imageCredit, /pas une capture des nouveaux champs/);
  assert.equal(leadTrailer(appleKey), null);
  assert.ok(getArticleTrailerEntry(appleKey).pending);
});
