import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOCALIZED_FIELDS } from '../src/news/localized/index.js';
import { articleTrailers } from '../src/articleTrailers.js';
const legacy = new Set(JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-untranslated-daily.json', import.meta.url))));
const stories = {};
for (const file of fs.readdirSync('src/news/daily').filter(f => /^2026-.*\.js$/.test(f))) {
  Object.assign(stories, (await import(`../src/news/daily/${file}`)).dailyStories);
}
for (const [slug, story] of Object.entries(stories)) {
  if (legacy.has(slug)) continue; // Explicit pre-existing debt, never add new publications here.
  for (const lang of ['en', 'ar']) test(`${lang}: full daily translation /news/${slug}`, async () => {
    const { default: fields } = await import(`../src/news/localized/${lang}/${slug}.js`);
    for (const key of LOCALIZED_FIELDS.filter(k => typeof story[k] === 'string' && story[k].trim())) {
      assert.ok(typeof fields[key] === 'string' && fields[key].trim(), `missing ${key}`);
    }
    assert.notEqual(fields.p1, story.p1, 'body must not silently reuse French');
    const { listings } = await import(`../src/news/localized/${lang}/index.js`);
    for (const key of ['title', 'accent', 'dek', 'imageAlt', 'category', 'readTime']) {
      assert.equal(listings[`/news/${slug}`]?.[key], fields[key], `stale listing ${key}`);
    }
    const { default: media } = await import(`../src/news/localized/${lang}/media/${slug}.js`);
    assert.ok(media[slug], 'missing media translation');
  });
}
