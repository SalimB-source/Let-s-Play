/**
 * Le catalogue monté en jsdom : ouvrir la fiche d'une créature fait entendre sa
 * voix (le même MP3 que son arrivée en jeu), les cartes muettes gardent
 * l'effleurement.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

test('RpgDuelPage fait parler la créature dont le catalogue ouvre la fiche', async () => {
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'scripts/rpg-catalogue-voix-smoke.jsx',
      outDir: 'node_modules/.cache/rpg-catalogue-voix',
      emptyOutDir: true,
    },
  });
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  const fichiersLus = [];
  dom.window.HTMLMediaElement.prototype.play = function fakeMediaPlay() {
    fichiersLus.push(this.src);
    return Promise.resolve();
  };
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  dom.window.AudioContext = class FakeDomAudioContext {
    constructor() {
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = { connect() { return this; }, disconnect() {} };
      this.state = 'running';
    }
    createGain() {
      return {
        gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } },
        connect() { return this; },
        disconnect() {},
      };
    }
    async resume() {}
    async close() {}
  };
  const savedGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const { checkRpgCatalogueVoix } = await import('../node_modules/.cache/rpg-catalogue-voix/rpg-catalogue-voix-smoke.js');
    await checkRpgCatalogueVoix(assert, fichiersLus);
  } finally {
    dom.window.close();
    for (const [key, value] of Object.entries(savedGlobals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
