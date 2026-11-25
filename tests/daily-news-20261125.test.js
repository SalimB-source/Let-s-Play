import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov25 from '../src/news/daily/2026-11-25.js';
import {dailySeoEntries as seo} from '../src/news/daily/seo-index.js';
import {articleFooterSource,officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry} from '../src/articleTrailers.js';
const read=(f)=>fs.readFileSync(f,'utf8');
const stories=nov25.dailyStories;
const keys=Object.keys(stories);
const FIELDS=['lead','intro','p1','p2','p3','p4','takeText'];

test('édition du 25 novembre : trois articles officiels, SEO, sitemap et médias',()=>{
  assert.equal(nov25.editionDate,'25.11.2026');
  assert.equal(nov25.editionIsoDate,'2026-11-25');
  assert.equal(nov25.dailyNewsListing.length,3);
  assert.equal(nov25.gamingNews.length,1);
  assert.deepEqual(keys,[
    'playstation-plus-decembre-2026-jeux-mensuels',
    'tech/openai-gpt-6-conception-proteines',
    'cinema/the-mosquito-bowl-netflix-25-novembre',
  ]);
  for(const [key,s] of Object.entries(stories)){
    assert.equal(s.date,'25.11.2026',key);
    assert.ok(s.sourceDate<='2026-11-25',key);
    assert.equal(articleFooterSource(s)?.href,s.sourceUrl,`${key} : source officielle liée`);
    assert.equal(officialSourceUrl(s.sourceUrl),s.sourceUrl,`${key} : domaine relu`);
    assert.deepEqual(seo[`/news/${key}`],nov25.dailySeoEntries[`/news/${key}`]);
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
      else assert.doesNotMatch(fields.title,/\u0600/,'en : pas de caractères arabes');
    }
  }
});

test('édition du 25 en une, archives du 23 conservées',()=>{
  for(const p of ['Home','News']) assert.ok(read(`src/pages/${p}.jsx`).includes("from '../news/daily/2026-11-25'"),p);
  for(const f of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
    const text=read(f);
    for(const day of ['25','23','21','20']) assert.ok(text.includes(`daily/2026-11-${day}'`),`${f} : édition du ${day}`);
    assert.ok(text.indexOf("daily/2026-11-25'")<text.indexOf("daily/2026-11-23'"),`${f} : ordre`);
  }
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
});

test('contenus : PS Plus de décembre, protéines GPT-6 et Mosquito Bowl',()=>{
  const plus=stories['playstation-plus-decembre-2026-jeux-mensuels'];
  assert.equal(plus.sourceDate,'2026-11-25');
  assert.match(plus.p1,/Tony Hawk’s Pro Skater 3\+4/);
  assert.match(plus.p3,/PS4 uniquement/);
  assert.match(plus.p4,/4 janvier/);
  const ia=stories['tech/openai-gpt-6-conception-proteines'];
  assert.equal(ia.sourceDate,'2026-11-24');
  assert.match(ia.p1,/35/);
  assert.match(ia.p3,/ESMFold2/);
  assert.match(ia.takeText,/prépublication/);
  const film=stories['cinema/the-mosquito-bowl-netflix-25-novembre'];
  assert.equal(film.sourceDate,'2026-11-25');
  assert.match(film.p2,/2 heures et 9 minutes/);
  assert.match(film.intro,/Algérie/);
  const media=getArticleTrailerEntry('cinema/the-mosquito-bowl-netflix-25-novembre');
  assert.equal(media.items[0].id,'CPFkLjHfKoc');
  assert.equal(media.items[0].channel,'Netflix');
  assert.ok(media.items[0].note.length>40,'la vidéo d’illustration est signalée');
});
