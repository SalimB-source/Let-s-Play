import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmedLiveVideoId, scrollToHomeLive } from '../src/lib/homeLive.js';
import { youTubeEmbedUrl } from '../src/lib/videoPlayback.js';

const videoId = 'abcdefghijk';
test('seul un direct confirmé avec un identifiant vidéo valide est affichable', () => {
  assert.equal(confirmedLiveVideoId({ status: 'live', videoId }), videoId);
  for (const data of [null, {}, { status: 'offline', videoId }, { status: 'unknown', videoId }, { status: 'upcoming', videoId }, { status: 'live' }, { status: 'live', videoId: '../bad' }, { status: 'live', videoId: 123 }]) {
    assert.equal(confirmedLiveVideoId(data), null);
  }
  const url = new URL(youTubeEmbedUrl(videoId));
  assert.ok(url.pathname.endsWith(videoId));
  assert.notEqual(url.searchParams.get('autoplay'), '1');
});

test('bouton hero : défilement, focus et préférence de mouvement réduit', () => {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  try {
    let options;
    let focus;
    let prevented = false;
    const section = { scrollIntoView: value => { options = value; }, focus: value => { focus = value; } };
    globalThis.document = { getElementById: id => id === 'live' ? section : null };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    scrollToHomeLive({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.deepEqual(options, { behavior: 'smooth', block: 'start' });
    assert.deepEqual(focus, { preventScroll: true });
    window.matchMedia = () => ({ matches: true });
    scrollToHomeLive({ preventDefault() {} });
    assert.equal(options.behavior, 'instant');
    document.getElementById = () => null;
    assert.doesNotThrow(() => scrollToHomeLive({ preventDefault() { throw Error('section absente'); } }));
  } finally {
    globalThis.document = oldDocument;
    globalThis.window = oldWindow;
  }
});

test('accueil : live entre hero et ticker, indicateur et navigation conditionnels', () => {
  const home = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
  assert.ok(home.indexOf('id="top"') < home.indexOf('id="live"'));
  assert.ok(home.indexOf('id="live"') < home.indexOf('className="ticker"'));
  assert.equal((home.match(/id="live"/g) || []).length, 1);
  assert.match(home, /\{isLive && \(\s*<section className="live-section/);
  assert.match(home, /\{isLive && \(\s*<div className="hero-live-notice"/);
  assert.match(home, /href="#live" onClick=\{scrollToHomeLive\}/);
  assert.ok(home.includes("...(isLive ? [['live', exploreCopy.live]] : [])"));
  assert.ok(home.includes('setLiveVideoId(confirmedLiveVideoId(data))'));
  assert.ok(home.includes('controller?.abort()'));
  assert.ok(home.includes('setTimeout(checkLiveStatus, 60_000)'));
  assert.ok(!home.includes('youTubeLiveChannelEmbedUrl'));
});
