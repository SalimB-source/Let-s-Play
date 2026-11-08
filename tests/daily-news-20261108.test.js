import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, gamingNews, dailySeoEntries, editionDate, editionIsoDate } from '../src/news/daily/2026-11-08.js';
import { dailySeoEntries as seoIndex } from '../src/news/daily/seo-index.js';
import { articleFooterSource } from '../src/lib/articleSources.js';
import { getArticleTrailerEntry, leadTrailer } from '../src/articleTrailers.js';
const read = f => fs.readFileSync(f, 'utf8');

test('8 novembre : trois univers, sources officielles, contenu et SEO', () => {
  assert.equal(editionDate, '08.11.2026');
  assert.equal(editionIsoDate, '2026-11-08');
  assert.equal(dailyNewsListing.length, 4);
  assert.equal(gamingNews.length, 2);
  assert.equal(new Set(dailyNewsListing.map(s => s.to)).size, 4);
  for (const [key, story] of Object.entries(dailyStories)) {
    for (const field of ['dek', 'lead', 'intro', 'h2', 'p1', 'p2', 'h2b', 'p3', 'p4', 'takeText', 'imageAlt', 'credit']) assert.ok(story[field], `${key}: ${field}`);
    assert.equal(story.date, editionDate);
    assert.equal(articleFooterSource(story).href, story.sourceUrl);
    assert.ok(fs.existsSync(`public/${story.fallbackImage}`));
    assert.deepEqual(seoIndex[`/news/${key}`], dailySeoEntries[`/news/${key}`]);
    assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`));
    assert.ok(getArticleTrailerEntry(key));
  }
});

test('dates originales, limites de previews et acquisition prévue explicites', () => {
  const xbox = dailyStories['xbox-cloud-gaming-telephone-manette-preview'];
  assert.match(xbox.lead, /4 novembre/);
  assert.match(xbox.p2, /aucune disponibilité en Algérie/);
  assert.match(xbox.p3, /réservée aux États-Unis/);
  const dropbox = dailyStories['tech/dropbox-tigris-dbx-agent-cloud-acquisition'];
  assert.match(dropbox.intro, /pas comme finalisée/);
  assert.match(dropbox.p4, /2027/);
  assert.match(dropbox.credit, /Logo officiel.*pas une image de Tigris/);
  for (const key of ['xbox-cloud-gaming-telephone-manette-preview', 'tech/dropbox-tigris-dbx-agent-cloud-acquisition']) {
    assert.equal(leadTrailer(key), null);
    assert.match(getArticleTrailerEntry(key).pending, /Aucune vidéo officielle/);
  }
  const key = 'cinema/journal-degonfle-christmas-getaway-disney-trailer';
  assert.equal(leadTrailer(key).id, 'O8JuMijNEAU');
  assert.equal(leadTrailer(key).channel, 'Disney');
  assert.equal(leadTrailer(key).verified, editionDate);
  assert.match(leadTrailer(key).note, /4 novembre.*4 décembre/);
  assert.match(dailyStories[key].p4, /pas une critique/);
});

test('édition du 8 dans tous les flux, sans section édition précédente', () => {
  for (const f of ['src/pages/Home.jsx', 'src/pages/News.jsx', 'src/pages/GamingNews.jsx', 'src/pages/CinemaNews.jsx', 'src/pages/TechNews.jsx', 'src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) assert.ok(read(f).includes("from '../news/daily/2026-11-08'"), f);
  const news = read('src/pages/News.jsx');
  assert.ok(!news.includes('actus-hier'));
  assert.ok(!news.includes('localizedYesterday'));
  assert.ok(!news.includes('ÉDITION PRÉCÉDENTE'));
  assert.ok(!news.includes('LES ACTUS D’HIER'));
  for (const f of ['src/pages/CurrentNews.jsx', 'src/pages/AllNews.jsx', 'src/search/searchIndex.js']) assert.ok(read(f).includes("from '../news/daily/2026-11-05'"));
});


test('GTA VI ouvre la une gaming et l’accueil avec les médias officiels datés', () => {
  const key = 'gta-6-nouvelles-images-voitures-galerie-lancement';
  assert.equal(dailyNewsListing[0].to, `/news/${key}`);
  assert.equal(gamingNews[0].to, `/news/${key}`);
  const story = dailyStories[key];
  assert.match(story.lead, /5 novembre/);
  assert.match(story.p2, /distincte de la galerie officielle/);
  assert.match(story.p4, /pas de conclure/);
  assert.match(story.credit, /pas d’une photo des répliques/);
  assert.equal(new URL(story.sourceUrl).hostname, 'www.rockstargames.com');
  assert.equal(leadTrailer(key).id, 'rz1B4B2yBZY');
  assert.match(leadTrailer(key).note, /15 octobre 2026/);
  assert.match(read('src/pages/Home.jsx'), /const featuredStory = dailyNewsListing.find/);
});
