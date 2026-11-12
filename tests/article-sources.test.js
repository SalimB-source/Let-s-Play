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

test('Bandai Namco publisher domains are verified and lookalikes remain blocked', () => {
  for (const url of [
    'https://www.bandainamcoent.com/news/ace-combat-8-wings-of-theve-game-overview',
    'https://en.bandainamcoent.eu/ace-combat/ace-combat-8-wings-of-theve',
  ]) assert.equal(officialSourceUrl(url), url);
  assert.equal(officialSourceUrl('https://bandainamcoent.com.evil.test/'), null);
  assert.equal(officialSourceUrl('https://fakebandainamcoent.eu/'), null);
});

test('only the S-GAME Phantom Blade Zero listing is allowed, never the whole Epic store', () => {
  const url = 'https://store.epicgames.com/p/phantom-blade-zero-e78a35';
  assert.equal(officialSourceUrl(url), url);
  for (const other of [
    'https://store.epicgames.com/',
    'https://store.epicgames.com/p/another-game',
    'https://store.epicgames.com/p/phantom-blade-zero-e78a35?unreviewed=1',
    'https://fake-store.epicgames.com/p/phantom-blade-zero-e78a35',
  ]) assert.equal(officialSourceUrl(other), null);
});

test('mixed legacy attribution text never leaks into official source footer', () => {
  const source = articleFooterSource({sourceUrl: 'https://www.remedygames.com/article/test', source: 'Remedy et ActuGaming', sourceDetail: 'Lire ActuGaming'});
  assert.deepEqual(source, {href: 'https://www.remedygames.com/article/test'});
  assert.equal(articleFooterSource(null), null);
});

test('article and gallery rendering apply the policy to old and future data', () => {
  const page = fs.readFileSync('src/pages/CurrentNews.jsx', 'utf8');
  assert.ok(page.includes('articleFooterSource(baseStory)'));
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

test('only the supplied AGA partnership post is allowed, never all of Facebook', () => {
  const url = 'https://www.facebook.com/photo/?fbid=1787284180064227&set=pb.100063479863011.-2207520000';
  assert.equal(officialSourceUrl(url), url);
  assert.equal(officialSourceUrl('https://www.facebook.com/photo/?fbid=1234'), null);
  assert.equal(officialSourceUrl('https://www.facebook.com/'), null);
});
