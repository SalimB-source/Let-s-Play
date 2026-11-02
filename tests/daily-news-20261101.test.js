import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyStories, dailyNewsListing, dailySeoEntries } from '../src/news/daily/2026-11-01.js';
import { dailyStories as today } from '../src/news/daily/2026-11-02.js';
import { getArticleTrailerEntry, leadTrailer } from '../src/articleTrailers.js';

test('édition d’hier : trois articles reliés, datés, avec médias crédités', () => {
  assert.equal(dailyNewsListing.length, 3);
  for (const [key, story] of Object.entries(dailyStories)) {
    assert.equal(story.date, '01.11.2026');
    assert.ok(story.p4.includes('préparée le 2 novembre 2026'));
    assert.ok(story.image.startsWith('https://'));
    assert.ok(fs.existsSync(`public/${story.fallbackImage}`));
    assert.ok(story.credit);
    assert.equal(dailySeoEntries[`/news/${key}`].published, '2026-11-01');
    assert.ok(dailyNewsListing.find(s => s.to === `/news/${key}`));
  }
});

test('vidéos officielles vérifiées, miniatures correspondantes ou absence explicite', () => {
  const expected = {
    'game-pass-novembre-2026-gravhounds': ['h7K6kahO2Ak', 'Octopus Panic'],
    'cinema/hit-man-w9-2-novembre-2026': ['LAgFYCV7D0w', 'DCM - Romandie'],
    'fortnite-treasure-hunters-1-novembre-2026': ['adm8SP0joNk', 'Nintendo of America'],
    'cinema/ligne-verte-television-1-novembre-2026': ['mccs8Ql8m8o', 'Warner Bros. France'],
  };
  for (const [key, [id, channel]] of Object.entries(expected)) {
    const entry = leadTrailer(`/news/${key}`);
    assert.equal(entry.id, id);
    assert.equal(entry.channel, channel);
    assert.equal(entry.verified, '02.11.2026');
    assert.ok(entry.note);
    assert.ok(({ ...today, ...dailyStories })[key].thumbnail.includes(id));
  }
  for (const key of ['tech/jecheon-assistant-ia-generative', 'tech/longcat-2-5-annonce-1-novembre-2026']) {
    const entry = getArticleTrailerEntry(key);
    assert.equal(entry.items.length, 0);
    assert.ok(entry.pending.includes('officielle'));
    assert.equal(leadTrailer(`/news/${key}`), null);
  }
});
