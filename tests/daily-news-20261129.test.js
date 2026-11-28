import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov29 from '../src/news/daily/2026-11-29.js';
import {dailySeoEntries as seo} from '../src/news/daily/seo-index.js';
import {articleFooterSource,officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry} from '../src/articleTrailers.js';
const read=(f)=>fs.readFileSync(f,'utf8');
const stories=nov29.dailyStories;
const keys=Object.keys(stories);
const FIELDS=['lead','intro','p1','p2','p3','p4','takeText'];

test('édition du 29 novembre : trois articles officiels, SEO, sitemap et médias',()=>{
  assert.equal(nov29.editionDate,'29.11.2026');
  assert.equal(nov29.editionIsoDate,'2026-11-29');
  assert.equal(nov29.dailyNewsListing.length,3);
  assert.equal(nov29.gamingNews.length,1);
  assert.deepEqual(keys,[
    'silksong-sea-of-sorrow-11-decembre-29-novembre',
    'tech/anthropic-ipo-cloture-20-novembre',
    'cinema/14th-ava-duvernay-sortie-netflix-4-decembre',
  ]);
  assert.deepEqual(keys.map((key)=>key.startsWith('cinema/')?'cinema':key.startsWith('tech/')?'tech':'gaming'),['gaming','tech','cinema']);
  for(const [key,s] of Object.entries(stories)){
    assert.equal(s.date,'29.11.2026',key);
    assert.ok(s.sourceDate<='2026-11-29',key);
    assert.equal(articleFooterSource(s)?.href,s.sourceUrl,`${key} : source officielle liée`);
    assert.equal(officialSourceUrl(s.sourceUrl),s.sourceUrl,`${key} : domaine relu`);
    assert.deepEqual(seo[`/news/${key}`],nov29.dailySeoEntries[`/news/${key}`]);
    assert.equal(s.image,s.thumbnail,key);
    assert.match(s.thumbnail,/^https:\/\//,key);
    assert.ok(fs.existsSync(`public/${s.fallbackImage}`),`${key} : visuel de secours`);
    assert.equal(read('public/sitemap.xml').split(`/news/${key}</loc>`).length-1,1,`${key} : une route au sitemap`);
    for(const f of FIELDS) assert.ok(s[f].length>100,`${key} : ${f}`);
    assert.ok(s.title.length<=20,`${key} : titre court`);
    assert.ok(s.accent.length<=24,`${key} : accent court`);
    assert.ok(s.title.length+1+s.accent.length<=40,`${key} : titre complet`);
    const media=getArticleTrailerEntry(key);
    assert.ok(media?.pending||media?.items?.length,`${key} : bloc média`);
  }
});

test('traductions EN et AR complètes, listées et rattachées aux médias',()=>{
  for(const lang of ['en','ar']){
    const listings=read(`src/news/localized/${lang}/index.js`);
    for(const key of keys){
      assert.ok(fs.existsSync(`src/news/localized/${lang}/${key}.js`),`${lang}/${key} : corps`);
      assert.ok(listings.includes(`/news/${key}`),`${lang}/${key} : listing`);
      assert.ok(fs.existsSync(`src/news/localized/${lang}/media/${key}.js`),`${lang}/${key} : phrases du bloc média`);
      const source=read(`src/news/localized/${lang}/${key}.js`);
      const fields=JSON.parse(source.match(/const fields = (\{[\s\S]*?\});\s*\nexport default/)[1]);
      for(const f of ['title','accent','dek','lead','intro','p1','p2','p3','p4','takeText','credit','imageAlt','source']) assert.ok(fields[f]?.trim(),`${lang}/${key} : ${f}`);
      assert.ok(fields.title.length<=20&&fields.accent.length<=24,`${lang}/${key} : budgets de titre`);
      if(lang==='ar') assert.match(`${fields.title} ${fields.p1}`,/[\u0600-\u06FF]/,'ar : caractères arabes');
      else assert.doesNotMatch(fields.title,/[\u0600-\u06FF]/,'en : pas de caractères arabes');
    }
  }
});

test('édition du 29 en une, archives du 27 et du 28 conservées',()=>{
  for(const p of ['Home','News']) assert.ok(read(`src/pages/${p}.jsx`).includes("from '../news/daily/2026-11-29'"),p);
  for(const f of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
    const text=read(f);
    for(const day of ['29','28','27','25','23','21']) assert.ok(text.includes(`daily/2026-11-${day}'`),`${f} : édition du ${day}`);
    assert.ok(text.indexOf("daily/2026-11-29'")<text.indexOf("daily/2026-11-28'"),`${f} : ordre`);
    assert.ok(text.indexOf("daily/2026-11-28'")<text.indexOf("daily/2026-11-27'"),`${f} : ordre 27`);
  }
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
  assert.ok(read('scripts/daily-news-check.mjs').includes("daily/2026-11-29.js'"),'contrôle : édition courante');
  assert.ok(read('scripts/daily-news-check.mjs').includes("daily/2026-11-27.js'"),'contrôle : édition précédente');
  assert.ok(read('scripts/daily-news-smoke.jsx').includes("'2026-11-29'"),'smoke : clés de l’édition');
});

test('contenus : Sea of Sorrow, clôture de l’IPO Anthropic et 14TH',()=>{
  const silk=stories['silksong-sea-of-sorrow-11-decembre-29-novembre'];
  assert.equal(silk.sourceDate,'2026-11-27');
  assert.equal(silk.sourceUrl,'https://www.teamcherry.com.au/blog/its-cherry-time');
  assert.match(silk.dek,/11 décembre 2026/);
  assert.match(silk.dek,/gratuitement/);
  assert.match(silk.p3,/Team Cherry Presents/);
  assert.match(silk.credit,/Team Cherry/);
  const silkMedia=getArticleTrailerEntry('silksong-sea-of-sorrow-11-decembre-29-novembre');
  assert.equal(silkMedia.items.length,1,'une seule vidéo officielle');
  assert.equal(silkMedia.items[0].id,'7hj4g173FhM');
  assert.equal(silkMedia.items[0].channel,'Team Cherry');
  assert.equal(silkMedia.items[0].verified,'29.11.2026');
  assert.ok(silk.thumbnail.includes('/vi/7hj4g173FhM/'),'miniature de la vidéo officielle');

  const ipo=stories['tech/anthropic-ipo-cloture-20-novembre'];
  assert.equal(ipo.sourceDate,'2026-11-20');
  assert.equal(ipo.sourceUrl,'https://www.anthropic.com/news/ipo-close');
  assert.match(ipo.p1,/1 127 000 000/);
  assert.match(ipo.p1,/83 dollars/);
  assert.match(ipo.p4,/actionnaires/);
  const ipoMedia=getArticleTrailerEntry('tech/anthropic-ipo-cloture-20-novembre');
  assert.equal(ipoMedia.items.length,0,'aucune vidéo non vérifiée');
  assert.ok(ipoMedia.pending.length>40,'absence de vidéo explicitée');

  const fourteen=stories['cinema/14th-ava-duvernay-sortie-netflix-4-decembre'];
  assert.equal(fourteen.sourceDate,'2026-11-16');
  assert.equal(fourteen.sourceUrl,'https://www.netflix.com/title/81908710');
  assert.match(fourteen.p2,/4 décembre/);
  assert.match(fourteen.p2,/R\b/);
  assert.match(fourteen.p4,/Algérie/);
  const fourteenMedia=getArticleTrailerEntry('cinema/14th-ava-duvernay-sortie-netflix-4-decembre');
  assert.equal(fourteenMedia.items.length,1);
  assert.equal(fourteenMedia.items[0].id,'xO92LnyDxQg');
  assert.equal(fourteenMedia.items[0].channel,'Netflix');
  assert.ok(fourteen.thumbnail.includes('/vi/xO92LnyDxQg/'),'miniature de la vidéo officielle');
});
