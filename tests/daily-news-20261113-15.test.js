import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov13 from '../src/news/daily/2026-11-13.js';
import * as nov14 from '../src/news/daily/2026-11-14.js';
import * as nov15 from '../src/news/daily/2026-11-15.js';
import { dailyStories as nov12 } from '../src/news/daily/2026-11-12.js';
import { dailySeoEntries } from '../src/news/daily/seo-index.js';
import { articleFooterSource } from '../src/lib/articleSources.js';
import { leadTrailer, getArticleTrailerEntry } from '../src/articleTrailers.js';
const read = path => fs.readFileSync(path, 'utf8');
const editions = [nov13, nov14, nov15];

for (const [i, edition] of editions.entries()) {
  test(`${13 + i} novembre : gaming, cinéma et tech complets et sourcés`, () => {
    assert.equal(edition.editionDate, `${13 + i}.11.2026`);
    assert.equal(edition.dailyNewsListing.length, 3);
    assert.equal(edition.gamingNews.length, 1);
    assert.equal(Object.keys(edition.dailyStories).filter(k => k.startsWith('cinema/')).length, 1);
    assert.equal(Object.keys(edition.dailyStories).filter(k => k.startsWith('tech/')).length, 1);
    for (const [key, story] of Object.entries(edition.dailyStories)) {
      assert.equal(story.date, edition.editionDate);
      assert.ok(story.sourceDate <= edition.editionIsoDate);
      assert.equal(articleFooterSource(story)?.href, story.sourceUrl);
      assert.match(story.image, /^https:\/\//);
      assert.ok(story.imageCredit.length > 50);
      assert.ok(fs.existsSync(`public/${story.fallbackImage}`));
      for (const field of ['lead', 'intro', 'p1', 'p2', 'p3', 'p4', 'takeText']) assert.ok(story[field].length > 100, `${key}: ${field}`);
      assert.ok(getArticleTrailerEntry(key));
      assert.deepEqual(dailySeoEntries[`/news/${key}`], edition.dailySeoEntries[`/news/${key}`]);
      const sitemap = read('public/sitemap.xml');
      assert.equal(sitemap.split(`<loc>https://salimb-source.github.io/Let-s-Play/news/${key}</loc>`).length - 1, 1);
    }
  });
}

test('neuf identifiants nouveaux sans collision avec le 12', () => {
  const keys = editions.flatMap(e => Object.keys(e.dailyStories));
  assert.equal(new Set(keys).size, 9);
  for (const key of keys) assert.ok(!nov12[key]);
});

test('15 novembre en une, anciennes éditions toujours intégrées', () => {
  for (const page of ['Home', 'News']) assert.ok(read(`src/pages/${page}.jsx`).includes("from '../news/daily/2026-11-15'"));
  for (const file of ['src/pages/AllNews.jsx', 'src/pages/CurrentNews.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/search/searchIndex.js']) {
    const text = read(file);
    for (const day of ['15', '14', '13', '12', '11']) assert.ok(text.includes(`from '../news/daily/2026-11-${day}'`), `${file}: ${day}`);
    assert.ok(text.indexOf("from '../news/daily/2026-11-15'") < text.indexOf("from '../news/daily/2026-11-14'"));
    assert.ok(text.indexOf("from '../news/daily/2026-11-14'") < text.indexOf("from '../news/daily/2026-11-13'"));
  }
  assert.ok(!read('src/pages/News.jsx').includes('actus-hier'));
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
  assert.equal(nov15.dailyNewsListing[0].to, '/news/gta-6-calendrier-xbox-semaine-16-20-novembre');
});

test('vidéos officielles vérifiées, dates et restrictions clairement indiquées', () => {
  for (const [key, id, channel] of [
    ['fable-deepwood-gameplay-podcast-xbox', 'RoIL8hDHF9A', 'XBOX'],
    ['cinema/dhindora-saison-2-trailer-netflix-20-novembre', 'AjGW8oxTars', 'Netflix India'],
    ['cinema/heartland-netflix-jessica-chastain-sortie', 'ziIz59enN1c', 'Netflix'],
    ['gta-6-calendrier-xbox-semaine-16-20-novembre', 'rz1B4B2yBZY', 'Rockstar Games'],
  ]) {
    assert.equal(leadTrailer(key).id, id);
    assert.equal(leadTrailer(key).channel, channel);
    assert.ok(leadTrailer(key).verified);
  }
  assert.match(leadTrailer('fable-deepwood-gameplay-podcast-xbox').note, /vérification d’âge/);
  assert.match(leadTrailer('cinema/heartland-netflix-jessica-chastain-sortie').note, /6 octobre/);
  for (const key of ['tech/antigravity-teamwork-recherche-google', 'xbox-25-classiques-pc-retrocompatibilite', 'tech/xbox-insiders-guide-droite-fonds-aleatoires', 'cinema/kpop-demon-hunters-golden-world-tour-2027', 'tech/xbox-playback-historique-compte-pays']) {
    assert.equal(leadTrailer(key), null);
    assert.ok(getArticleTrailerEntry(key).pending);
  }
});

test('conditions des produits et disponibilité régionale préservées', () => {
  assert.match(nov13.dailyStories['tech/antigravity-teamwork-recherche-google'].intro, /pas reproduit/);
  const classics = nov14.dailyStories['xbox-25-classiques-pc-retrocompatibilite'];
  assert.match(classics.intro, /Windows 11/);
  assert.match(classics.p2, /pas.*vingt-cinq.*chaque formule/);
  assert.match(nov14.dailyStories['tech/xbox-insiders-guide-droite-fonds-aleatoires'].intro, /pas.*date de disponibilité générale/);
  const playback = nov15.dailyStories['tech/xbox-playback-historique-compte-pays'];
  assert.match(playback.p3, /pas l’Algérie/);
  assert.match(playback.p3, /31 décembre 2026/);
  const gta = nov15.dailyStories['gta-6-calendrier-xbox-semaine-16-20-novembre'];
  assert.equal(gta.sourceDate, '2026-11-13');
  assert.match(gta.p2, /pas une promesse d’ouverture native/);
  assert.match(gta.p2, /pas une inclusion automatique dans Game Pass/);
  const tour = nov15.dailyStories['cinema/kpop-demon-hunters-golden-world-tour-2027'];
  assert.equal(tour.sourceDate, '2026-11-13');
  assert.match(tour.p3, /20 novembre à 10 h, heure locale/);
  assert.match(tour.p4, /aucune étape algérienne n’est confirmée/);
});
