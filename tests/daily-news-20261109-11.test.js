import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov9 from '../src/news/daily/2026-11-09.js';
import * as nov10 from '../src/news/daily/2026-11-10.js';
import * as nov11 from '../src/news/daily/2026-11-11.js';
import { dailyStories as previousStories } from '../src/news/daily/2026-11-08.js';
import { dailySeoEntries as seo } from '../src/news/daily/seo-index.js';
import { articleFooterSource } from '../src/lib/articleSources.js';
import { leadTrailer, getArticleTrailerEntry } from '../src/articleTrailers.js';
const read = path => fs.readFileSync(path, 'utf8');
const editions = [nov9, nov10, nov11];

for (const [index, edition] of editions.entries()) {
  test(`${index + 9} novembre : trois articles complets, officiels et archivés`, () => {
    assert.equal(edition.editionIsoDate, `2026-11-${String(index + 9).padStart(2, '0')}`);
    assert.equal(edition.dailyNewsListing.length, 3);
    assert.equal(edition.gamingNews.length, 1);
    assert.equal(Object.keys(edition.dailyStories).filter(key => key.startsWith('cinema/')).length, 1);
    assert.equal(Object.keys(edition.dailyStories).filter(key => key.startsWith('tech/')).length, 1);
    for (const [key, story] of Object.entries(edition.dailyStories)) {
      assert.equal(story.date, edition.editionDate);
      assert.ok(story.sourceDate <= edition.editionIsoDate, `${key}: no future source in a backdated edition`);
      for (const field of ['title', 'accent', 'dek', 'lead', 'intro', 'h2', 'p1', 'p2', 'h2b', 'p3', 'p4', 'takeText', 'credit', 'imageAlt']) assert.ok(story[field], `${key}: ${field}`);
      assert.equal(articleFooterSource(story).href, story.sourceUrl);
      assert.equal(new URL(story.image).protocol, 'https:');
      assert.ok(fs.existsSync(`public/${story.fallbackImage}`));
      assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`));
      assert.deepEqual(seo[`/news/${key}`], edition.dailySeoEntries[`/news/${key}`]);
      const entry = getArticleTrailerEntry(key);
      assert.ok(entry);
      assert.ok(entry.items.length || entry.pending);
    }
  });
}

test('neuf sujets uniques, archives préservées et 11 novembre en tête de tous les flux', () => {
  const keys = editions.flatMap(e => Object.keys(e.dailyStories));
  assert.equal(new Set(keys).size, 9);
  for (const key of keys) assert.ok(!(key in previousStories));
  for (const f of ['src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) {
    const text = read(f);
    for (const date of ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-08']) assert.ok(text.includes(`from '../news/daily/${date}'`), `${f}: ${date}`);
    assert.ok(text.indexOf("from '../news/daily/2026-11-11'") < text.indexOf("from '../news/daily/2026-11-10'"));
  }
  for (const f of ['src/pages/Home.jsx', 'src/pages/News.jsx']) assert.ok(read(f).includes("from '../news/daily/2026-11-11'"));
  assert.ok(!read('src/pages/News.jsx').includes('actus-hier'));
});

test('trailers officiels et datés, aucune fausse vidéo de saison renouvelée', () => {
  for (const [key, id, channel] of [
    ['gta-6-xbox-one-cloud-gaming-19-novembre', 'rz1B4B2yBZY', 'Rockstar Games'],
    ['cinema/the-debut-a24-deuxieme-bande-annonce', 'lF9n06SMDPU', 'A24'],
    ['cinema/the-body-netflix-sortie-11-novembre', 'wl7uj7n7DoY', 'Netflix'],
  ]) {
    assert.equal(leadTrailer(key).id, id);
    assert.equal(leadTrailer(key).channel, channel);
    assert.ok(leadTrailer(key).note.includes('publiée le'));
  }
  assert.equal(leadTrailer('cinema/nobody-wants-this-saison-4-renouvellement'), null);
  assert.match(nov9.dailyStories['cinema/nobody-wants-this-saison-4-renouvellement'].p3, /pas de date de sortie/);
});

test('conditions cloud, variations régionales et limites médicales non escamotées', () => {
  const gta = nov10.dailyStories['gta-6-xbox-one-cloud-gaming-19-novembre'];
  assert.match(gta.lead, /pas une version native/);
  assert.match(gta.p2, /acheté séparément/);
  assert.match(gta.p3, /ne promettons donc pas un accès depuis l’Algérie/);
  const ps = nov11.dailyStories['playstation-plus-novembre-2026-catalogue-extra-premium'];
  assert.match(ps.intro, /pas les jeux mensuels Essential/);
  assert.match(ps.p2, /24 novembre/);
  assert.match(ps.p4, /varier suivant la région/);
  const health = nov11.dailyStories['tech/google-sensorwm-sante-montres-recherche'];
  assert.match(health.intro, /pas confondre.*autorisation médicale/);
  assert.match(health.p4, /Ne modifiez pas un traitement/);
  assert.match(nov9.dailyStories['tech/google-language-explorer-diversite-linguistique'].p4, /ne garantit pas/);
});
