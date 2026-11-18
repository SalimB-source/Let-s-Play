import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dailyStories, dailyNewsListing, editionDate, editionIsoDate} from '../src/news/daily/2026-11-18.js';
import {dailySeoEntries} from '../src/news/daily/seo-index.js';
import {articleFooterSource, officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry} from '../src/articleTrailers.js';
const read = f => fs.readFileSync(f,'utf8');
test('18 novembre : trois articles officiels, GTA en tête, SEO et médias explicites',()=>{
 assert.equal(editionDate,'18.11.2026'); assert.equal(editionIsoDate,'2026-11-18');
 assert.equal(dailyNewsListing.length,3);
 assert.equal(dailyNewsListing[0].to,'/news/gta-6-miami-heat-night-vice-city-18-novembre');
 for(const [key,s] of Object.entries(dailyStories)){
  assert.equal(articleFooterSource(s)?.href,s.sourceUrl);
  assert.equal(dailySeoEntries[`/news/${key}`].published,editionIsoDate);
  assert.ok(fs.existsSync(`public/${s.fallbackImage}`));
  assert.ok(read('public/sitemap.xml').includes(`/news/${key}</loc>`));
  assert.ok(getArticleTrailerEntry(key).pending);
  for(const field of ['lead','intro','p1','p2','p3','p4','takeText'])assert.ok(s[field].length>100,`${key}: ${field}`);
 }
});
test('une et archives : édition du 18 intégrée sans supprimer le 17',()=>{
 for(const page of ['Home','News'])assert.ok(read(`src/pages/${page}.jsx`).includes("daily/2026-11-18'"));
 for(const file of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
  const s=read(file);assert.ok(s.includes("daily/2026-11-18'"));assert.ok(s.includes("daily/2026-11-17'"));
 }
 assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
});
test('prudence : heures, territoires Netflix et performances fournisseur',()=>{
 assert.match(dailyStories['gta-6-miami-heat-night-vice-city-18-novembre'].intro,/1 h du matin le 19 novembre en Algérie/);
 assert.match(dailyStories['cinema/gentle-monster-netflix-18-novembre'].p3,/France et l’Algérie ne figurent pas/);
 assert.match(dailyStories['tech/google-home-nouveautes-novembre-2026'].p4,/pas notre benchmark/);
 assert.equal(officialSourceUrl('https://www.nba.com/unreviewed'),null);
});
