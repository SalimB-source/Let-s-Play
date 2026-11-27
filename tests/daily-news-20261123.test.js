import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov23 from '../src/news/daily/2026-11-23.js';
import {dailySeoEntries as seo} from '../src/news/daily/seo-index.js';
import {articleFooterSource,officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry} from '../src/articleTrailers.js';
const read=(f)=>fs.readFileSync(f,'utf8');
const stories=nov23.dailyStories;
const keys=Object.keys(stories);
const FIELDS=['lead','intro','p1','p2','p3','p4','takeText'];

test('édition du 23 novembre : trois articles officiels, SEO, sitemap et médias',()=>{
  assert.equal(nov23.editionDate,'23.11.2026');
  assert.equal(nov23.editionIsoDate,'2026-11-23');
  assert.equal(nov23.dailyNewsListing.length,3);
  assert.equal(nov23.gamingNews.length,1);
  assert.deepEqual(keys,[
    'gta-6-calendrier-xbox-23-27-novembre',
    'tech/openai-perplexite-intelligence-22-novembre',
    'cinema/netflix-sorties-23-novembre-2026',
  ]);
  for(const [key,s] of Object.entries(stories)){
    assert.equal(s.date,'23.11.2026',key);
    assert.ok(s.sourceDate<='2026-11-23',key);
    assert.equal(articleFooterSource(s)?.href,s.sourceUrl,`${key} : source officielle liée`);
    assert.equal(officialSourceUrl(s.sourceUrl),s.sourceUrl,`${key} : domaine relu`);
    assert.deepEqual(seo[`/news/${key}`],nov23.dailySeoEntries[`/news/${key}`]);
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
    }
  }
});

test('édition du 23 en une, archives du 21 conservées',()=>{
  for(const p of ['Home','News']) assert.ok(read(`src/pages/${p}.jsx`).includes("from '../news/daily/2026-11-27'"),p);
  for(const f of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
    const text=read(f);
    for(const day of [23,21,20,19]) assert.ok(text.includes(`daily/2026-11-${day}'`),`${f} : édition du ${day}`);
    assert.ok(text.indexOf("daily/2026-11-27'")<text.indexOf("daily/2026-11-28'"),`${f} : ordre`);
  }
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
});

test('contenus : sorties Xbox, note OpenAI et programme Netflix du 23',()=>{
  const xbox=stories['gta-6-calendrier-xbox-23-27-novembre'];
  assert.equal(xbox.sourceDate,'2026-11-20');
  assert.match(xbox.p1,/Game Pass/);
  assert.match(xbox.p4,/peuvent évoluer/);
  const ia=stories['tech/openai-perplexite-intelligence-22-novembre'];
  assert.equal(ia.sourceDate,'2026-11-22');
  assert.match(ia.p3,/quatre limites/);
  assert.match(ia.takeText,/pas une règle déjà en vigueur/);
  const netflix=stories['cinema/netflix-sorties-23-novembre-2026'];
  assert.equal(netflix.sourceDate,'2026-11-20');
  assert.match(netflix.intro,/Algérie/);
  assert.match(netflix.p4,/pas comme un verdict/);
});
