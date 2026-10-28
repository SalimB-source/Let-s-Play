/**
 * La voix d'arrivée des créatures, montée dans la vraie page du duel (jsdom) :
 * une carte du lot « Game voices » qui entre en jeu lance son propre MP3, et
 * laisse les accueils génériques aux cartes qui n'en ont pas.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

test('RpgDuelPage joue la voix propre des créatures qui en ont une', async () => {
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'scripts/rpg-voix-arrivees-smoke.jsx',
      outDir: 'node_modules/.cache/rpg-voix-arrivees',
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
    const { checkRpgVoixArrivees } = await import('../node_modules/.cache/rpg-voix-arrivees/rpg-voix-arrivees-smoke.js');
    await checkRpgVoixArrivees(assert, fichiersLus);
  } finally {
    dom.window.close();
    for (const [key, value] of Object.entries(savedGlobals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
