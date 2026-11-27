import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nov27 from '../src/news/daily/2026-11-27.js';
import {dailySeoEntries as seo} from '../src/news/daily/seo-index.js';
import {articleFooterSource,officialSourceUrl} from '../src/lib/articleSources.js';
import {getArticleTrailerEntry} from '../src/articleTrailers.js';
const read=(f)=>fs.readFileSync(f,'utf8');
const stories=nov27.dailyStories;
const keys=Object.keys(stories);
const FIELDS=['lead','intro','p1','p2','p3','p4','takeText'];

test('édition du 27 novembre : trois articles officiels, SEO, sitemap et médias',()=>{
  assert.equal(nov27.editionDate,'27.11.2026');
  assert.equal(nov27.editionIsoDate,'2026-11-27');
  assert.equal(nov27.dailyNewsListing.length,3);
  assert.equal(nov27.gamingNews.length,1);
  assert.deepEqual(keys,[
    'cherry-time-team-cherry-27-novembre',
    'tech/neuralink-link-essai-pivotal-fda',
    'cinema/quasimodo-hunchback-soul-of-paris-netflix-27-novembre',
  ]);
  for(const [key,s] of Object.entries(stories)){
    assert.equal(s.date,'27.11.2026',key);
    assert.ok(s.sourceDate<='2026-11-27',key);
    assert.equal(articleFooterSource(s)?.href,s.sourceUrl,`${key} : source officielle liée`);
    assert.equal(officialSourceUrl(s.sourceUrl),s.sourceUrl,`${key} : domaine relu`);
    assert.deepEqual(seo[`/news/${key}`],nov27.dailySeoEntries[`/news/${key}`]);
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

test('édition du 27 en une, archives du 28 conservées',()=>{
  for(const p of ['Home','News']) assert.ok(read(`src/pages/${p}.jsx`).includes("from '../news/daily/2026-11-27'"),p);
  for(const f of ['src/pages/CurrentNews.jsx','src/pages/AllNews.jsx','src/pages/GamingNews.jsx','src/pages/CinemaNews.jsx','src/pages/TechNews.jsx','src/search/searchIndex.js']){
    const text=read(f);
    for(const day of ['27','28','25','23','21']) assert.ok(text.includes(`daily/2026-11-${day}'`),`${f} : édition du ${day}`);
    assert.ok(text.indexOf("daily/2026-11-27'")<text.indexOf("daily/2026-11-28'"),`${f} : ordre`);
  }
  assert.ok(!read('src/pages/News.jsx').includes('Édition précédente'));
  assert.ok(read('scripts/daily-news-check.mjs').includes("daily/2026-11-27.js'"),'contrôle : édition courante');
  assert.ok(read('scripts/daily-news-check.mjs').includes("daily/2026-11-28.js'"),'contrôle : édition précédente');
  assert.ok(read('scripts/daily-news-smoke.jsx').includes("'2026-11-27'"),'smoke : clés de l’édition');
});

test('contenus : Cherry Time, essai LINK et Quasimodo sur Netflix',()=>{
  const cherry=stories['cherry-time-team-cherry-27-novembre'];
  assert.equal(cherry.sourceDate,'2026-11-25');
  assert.match(cherry.lead,/15 heures UTC/);
  assert.match(cherry.p3,/15 décembre 2025/);
  assert.doesNotMatch(cherry.takeText,/sortira le|sort le/i,'aucune date de sortie inventée');
  const neuralink=stories['tech/neuralink-link-essai-pivotal-fda'];
  assert.equal(neuralink.sourceDate,'2026-11-25');
  assert.match(neuralink.p1,/sclérose latérale amyotrophique/);
  assert.match(neuralink.p3,/expérimental/);
  assert.match(neuralink.takeText,/LINK Pivotal Study/);
  const quasi=stories['cinema/quasimodo-hunchback-soul-of-paris-netflix-27-novembre'];
  assert.equal(quasi.sourceDate,'2026-10-30');
  assert.match(quasi.p1,/1830/);
  assert.match(quasi.p3,/TV-MA/);
  assert.match(quasi.intro,/Algérie/);
  const media=getArticleTrailerEntry('cinema/quasimodo-hunchback-soul-of-paris-netflix-27-novembre');
  assert.equal(media.items.length,1,'une seule vidéo officielle');
  assert.equal(media.items[0].channel,'Netflix');
  assert.equal(media.items[0].id,'eBfPTW1YaAQ');
  assert.ok(quasi.thumbnail.includes('/vi/eBfPTW1YaAQ/'),'miniature de la vidéo officielle');
  for(const key of ['cherry-time-team-cherry-27-novembre','tech/neuralink-link-essai-pivotal-fda']){
    const pending=getArticleTrailerEntry(key);
    assert.equal(pending.items.length,0,`${key} : aucune vidéo non vérifiée`);
    assert.ok(pending.pending.length>40,`${key} : absence de vidéo explicitée`);
  }
});
