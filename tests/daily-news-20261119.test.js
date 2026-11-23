import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dailyStories, dailyNewsListing, gamingNews, editionDate, editionIsoDate, dailySeoEntries} from '../src/news/daily/2026-11-19.js';
import {dailySeoEntries as seo} from '../src/news/daily/seo-index.js';
import {articleFooterSource,officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry,leadTrailer} from '../src/articleTrailers.js';
const read=f=>fs.readFileSync(f,'utf8');
const gta='gta-6-19-novembre-consoles-points-verifies';
const netflix='cinema/the-altruists-netflix-19-novembre';
const figma='tech/figma-images-multiples-modeles-18-novembre';
test('19 novembre : trois articles officiels, GTA en tête et SEO synchronisé',()=>{
 assert.equal(editionDate,'19.11.2026');assert.equal(editionIsoDate,'2026-11-19');
 assert.equal(dailyNewsListing.length,3);assert.equal(gamingNews.length,1);
 assert.deepEqual(Object.keys(dailyStories),[gta,netflix,figma]);
 for(const [key,s] of Object.entries(dailyStories)){
  assert.equal(articleFooterSource(s)?.href,s.sourceUrl);
  assert.ok(s.sourceDate<=editionIsoDate);assert.equal(s.date,editionDate);
  assert.deepEqual(seo[`/news/${key}`],dailySeoEntries[`/news/${key}`]);
  assert.equal(s.thumbnail,s.image);assert.match(s.image,/^https:/);
  assert.ok(fs.existsSync(`public/${s.fallbackImage}`));
  assert.equal(read('public/sitemap.xml').split(`/news/${key}</loc>`).length-1,1);
  for(const f of ['lead','intro','p1','p2','p3','p4','takeText'])assert.ok(s[f].length>100,`${key}: ${f}`);
 }
});
test('une du 19 et conservation des archives du 18',()=>{
 for(const p of ['Home','News'])assert.ok(read(`src/pages/${p}.jsx`).includes("daily/2026-11-23'"));
 for(const f of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
  const text=read(f);assert.ok(text.includes("daily/2026-11-19'"));assert.ok(text.includes("daily/2026-11-18'"));
 }
 assert.equal(dailyNewsListing[0].to,`/news/${gta}`);
 assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
});
test('dates et limites : ancien trailer GTA, fiction Netflix et crédits Figma',()=>{
 assert.equal(dailyStories[gta].sourceDate,'2026-11-10');
 assert.match(dailyStories[gta].intro,/pas.*vérifié/);
 assert.match(dailyStories[gta].p3,/ni une inclusion automatique dans Game Pass/);
 assert.equal(leadTrailer(gta).channel,'Rockstar Games');assert.match(leadTrailer(gta).note,/15 octobre/);
 assert.match(dailyStories[netflix].h2,/PAS UN DOCUMENTAIRE/);
 assert.match(getArticleTrailerEntry(netflix).pending,/2 min 03/);
 assert.match(dailyStories[figma].p3,/crédits partagé/);
 assert.match(getArticleTrailerEntry(figma).pending,/Aucune vidéo officielle/);
 assert.equal(officialSourceUrl('https://www.figma.com.evil.example/release-notes/'),null);
});
