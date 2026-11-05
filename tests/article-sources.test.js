import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { officialSourceUrl, articleFooterSource } from '../src/lib/articleSources.js';

test('only reviewed official HTTPS domains are shown in footers', () => {
  for (const url of ['https://blog.playstation.com/news', 'https://news.xbox.com/fr-fr/', 'https://blogs.microsoft.com/', 'https://developer.apple.com/news/', 'https://openai.com/index/']) {
    assert.equal(officialSourceUrl(url), url);
    assert.equal(articleFooterSource({ sourceUrl: url }).href, url);
  }
  for (const url of ['https://www.frandroid.com/news', 'https://www.gamergen.com/', 'https://spiritgamer.fr/', 'https://nintendoeverything.com/', 'https://en.wikipedia.org/', 'https://youtube.com/watch?v=unknown', 'https://x.com/random', 'https://playstation.com.evil.test/', 'https://fakeplaystation.com/', 'http://xbox.com/', 'https://user@sony.com/', 'javascript:alert(1)', undefined, '']) {
    assert.equal(officialSourceUrl(url), null);
    assert.equal(articleFooterSource({ sourceUrl: url }), null);
  }
});

test('mixed legacy attribution text never leaks into official source footer', () => {
  const source = articleFooterSource({sourceUrl: 'https://www.remedygames.com/article/test', source: 'Remedy et ActuGaming', sourceDetail: 'Lire ActuGaming'});
  assert.deepEqual(source, {href: 'https://www.remedygames.com/article/test', label: 'Consulter la source officielle'});
  assert.equal(articleFooterSource(null), null);
});

test('article and gallery rendering apply the policy to old and future data', () => {
  const page = fs.readFileSync('src/pages/CurrentNews.jsx', 'utf8');
  assert.ok(page.includes('articleFooterSource(story)'));
  assert.ok(page.includes('href={footerSource.href}'));
  assert.ok(!page.includes('{story.source}'));
  assert.ok(!page.includes('{story.sourceDetail}'));
  const gallery = fs.readFileSync('src/components/ArticleGallery.jsx', 'utf8');
  assert.ok(gallery.includes('officialSourceUrl(source.href)'));
  assert.ok(gallery.includes('officialCreditSources.map'));
});

test('official videos require an individually verified registry entry', () => {
  assert.equal(officialSourceUrl('https://www.youtube.com/watch?v=CQve7-PraCM'), 'https://www.youtube.com/watch?v=CQve7-PraCM');
  assert.equal(officialSourceUrl('https://www.youtube.com/@random'), null);
});
