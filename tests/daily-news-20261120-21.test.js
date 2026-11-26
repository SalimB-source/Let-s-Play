import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov20 from '../src/news/daily/2026-11-20.js';
import * as nov21 from '../src/news/daily/2026-11-21.js';
import {dailySeoEntries as seo} from '../src/news/daily/seo-index.js';
import {articleFooterSource,officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry} from '../src/articleTrailers.js';
const read=f=>fs.readFileSync(f,'utf8');
const all={...nov20.dailyStories,...nov21.dailyStories};
for(const [day,edition] of [[20,nov20],[21,nov21]])test(`${day} novembre : trois articles officiels uniques, SEO et médias cohérents`,()=>{
 assert.equal(edition.editionDate,`${day}.11.2026`);
 assert.equal(edition.editionIsoDate,`2026-11-${day}`);
 assert.equal(edition.dailyNewsListing.length,3);assert.equal(edition.gamingNews.length,1);
 assert.ok(edition.dailyNewsListing[0].to.startsWith('/news/gta-6-'));
 for(const [key,s] of Object.entries(edition.dailyStories)){
  assert.equal(s.date,edition.editionDate);assert.ok(s.sourceDate<=edition.editionIsoDate);
  assert.equal(articleFooterSource(s)?.href,s.sourceUrl);
  assert.deepEqual(seo[`/news/${key}`],edition.dailySeoEntries[`/news/${key}`]);
  assert.equal(s.image,s.thumbnail);assert.match(s.thumbnail,/^https:/);
  assert.ok(fs.existsSync(`public/${s.fallbackImage}`));
  assert.equal(read('public/sitemap.xml').split(`/news/${key}</loc>`).length-1,1);
  for(const f of ['lead','intro','p1','p2','p3','p4','takeText'])assert.ok(s[f].length>100,`${key}: ${f}`);
  const media=getArticleTrailerEntry(key);assert.ok(media?.pending || media?.items?.length);
  for(const lang of ['en','ar'])assert.ok(fs.existsSync(`src/news/localized/${lang}/${key}.js`));
 }
});
test('six nouvelles routes, édition du 21 à la une et archives préservées',()=>{
 assert.equal(Object.keys(all).length,6);
 for(const p of ['Home','News'])assert.ok(read(`src/pages/${p}.jsx`).includes("daily/2026-11-28'"));
 for(const f of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
  const text=read(f);
  for(const day of [21,20,19])assert.ok(text.includes(`daily/2026-11-${day}'`));
  assert.ok(text.indexOf("daily/2026-11-23'")<text.indexOf("daily/2026-11-21'"));
 }
 assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
});
test('GTA : album distinct du score, festival programmé et loterie expirée',()=>{
 const album=nov20.dailyStories['gta-6-the-album-34-titres-20-novembre'];
 assert.equal(album.sourceDate,'2026-11-20');assert.match(album.p1,/34 chansons/);assert.match(album.p3,/11 décembre/);
 const fest=nov21.dailyStories['gta-6-the-festival-miami-21-novembre'];
 assert.equal(fest.sourceDate,'2026-11-09');assert.match(fest.intro,/sans affirmer avoir assisté/);
 assert.match(fest.p1,/DJ set/);assert.match(fest.p3,/Ces dates sont passées/);
});
test('cinéma : catalogue local et nouvelle billetterie sans promesse de places',()=>{
 assert.match(nov20.dailyStories['cinema/on-behalf-of-my-son-netflix-20-novembre'].p3,/ne permet pas de garantir une sortie algérienne/);
 const tour=nov21.dailyStories['cinema/kpop-golden-world-tour-billets-21-novembre'];
 assert.equal(tour.sourceDate,'2026-11-20');assert.match(tour.lead,/édition du 15 novembre/);
 assert.match(tour.p1,/juin 2027/);assert.match(tour.intro,/ne promettons pas/);
});
test('tech : preview, données sensibles et sites officiels limités aux pages relues',()=>{
 const inline=nov20.dailyStories['tech/google-agents-controle-outils-semantic-governance'];
 const detect=nov21.dailyStories['tech/google-agent-anomaly-detection-multicloud'];
 assert.match(inline.intro,/Preview/);assert.match(inline.p2,/Agent Gateway/);
 assert.match(detect.dek,/Private Preview/);assert.match(detect.intro,/ne prouve pas/);assert.match(detect.p4,/données sensibles/);
 assert.equal(officialSourceUrl(inline.sourceUrl),inline.sourceUrl);assert.equal(officialSourceUrl(detect.sourceUrl),detect.sourceUrl);
 for(const bad of ['https://developers.googleblog.com/unreviewed/','https://random.googleblog.com/post','https://developers.googleblog.com.evil.example/post'])assert.equal(officialSourceUrl(bad),null);
});
