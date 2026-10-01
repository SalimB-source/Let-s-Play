import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exitNativeFullscreen,
  isFullscreenShortcut,
  nativeFullscreenElement,
  opensFullscreenOnLaunch,
  requestNativeFullscreen,
} from '../src/games/mirageFullscreen.js';
import { MAX_PIXEL_RATIO, MAX_RENDER_PIXELS, renderPixelRatio } from '../src/games/miragePixelBudget.js';

// ── Touche F ────────────────────────────────────────────────────────────────

test('F seul bascule le plein écran, en minuscule comme en majuscule', () => {
  assert.equal(isFullscreenShortcut({ key: 'f' }), true);
  assert.equal(isFullscreenShortcut({ key: 'F' }), true, 'Maj + F ou verrouillage majuscule : même touche');
});

test('Ctrl/Cmd/Alt + F, touche maintenue, autres touches : ce n’est pas le raccourci', () => {
  assert.equal(isFullscreenShortcut({ key: 'f', ctrlKey: true }), false, 'Ctrl + F est la recherche du navigateur');
  assert.equal(isFullscreenShortcut({ key: 'f', metaKey: true }), false, 'Cmd + F aussi');
  assert.equal(isFullscreenShortcut({ key: 'f', altKey: true }), false, 'Alt + F ouvre un menu');
  assert.equal(isFullscreenShortcut({ key: 'f', repeat: true }), false, 'maintenue, la touche ferait clignoter le plein écran');
  for (const key of ['g', 'Escape', 'Enter', ' ', 'F11', 'ArrowUp', '']) {
    assert.equal(isFullscreenShortcut({ key }), false, `« ${key} » n’est pas le raccourci`);
  }
  assert.equal(isFullscreenShortcut({}), false);
  assert.equal(isFullscreenShortcut(null), false);
  assert.equal(isFullscreenShortcut(undefined), false);
});

// ── Fullscreen API ──────────────────────────────────────────────────────────

test('nativeFullscreenElement lit l’API standard, puis le préfixe WebKit', () => {
  const standard = {};
  const prefixed = {};
  assert.equal(nativeFullscreenElement({ fullscreenElement: standard }), standard);
  assert.equal(nativeFullscreenElement({ webkitFullscreenElement: prefixed }), prefixed, 'Safari plus ancien');
  assert.equal(nativeFullscreenElement({ fullscreenElement: standard, webkitFullscreenElement: prefixed }), standard);
  assert.equal(nativeFullscreenElement({ fullscreenElement: null }), null);
  assert.equal(nativeFullscreenElement({}), null);
  assert.equal(nativeFullscreenElement(null), null);
  assert.equal(nativeFullscreenElement(), null, 'hors navigateur (pas de document) : jamais d’exception');
});

test('requestNativeFullscreen appelle la méthode sur l’élément et dit si la demande est partie', async () => {
  let receiver = null;
  const element = { requestFullscreen() { receiver = this; return Promise.resolve(); } };
  assert.equal(await requestNativeFullscreen(element), true);
  assert.equal(receiver, element, 'la méthode doit être appelée sur l’élément (sinon « Illegal invocation »)');

  let prefixedCalls = 0;
  assert.equal(await requestNativeFullscreen({ webkitRequestFullscreen() { prefixedCalls += 1; } }), true, 'préfixe WebKit, sans promesse');
  assert.equal(prefixedCalls, 1);
});

test('requestNativeFullscreen ne lève jamais : refus, exception, API absente → false', async () => {
  assert.equal(await requestNativeFullscreen({ requestFullscreen: () => Promise.reject(new TypeError('denied')) }), false, 'refus du navigateur');
  assert.equal(await requestNativeFullscreen({ requestFullscreen() { throw new Error('boom'); } }), false, 'exception synchrone');
  assert.equal(await requestNativeFullscreen({}), false, 'iPhone : pas de Fullscreen API sur un élément');
  assert.equal(await requestNativeFullscreen(null), false);
  assert.equal(await requestNativeFullscreen(undefined), false);
});

test('exitNativeFullscreen ne sort que s’il y a un plein écran, et ne lève jamais', async () => {
  let exits = 0;
  const open = { fullscreenElement: {}, exitFullscreen() { exits += 1; return Promise.resolve(); } };
  await exitNativeFullscreen(open);
  assert.equal(exits, 1);

  await exitNativeFullscreen({ fullscreenElement: null, exitFullscreen() { exits += 1; } });
  assert.equal(exits, 1, 'rien à fermer : on n’appelle pas exitFullscreen (il rejetterait)');

  let prefixed = 0;
  await exitNativeFullscreen({ webkitFullscreenElement: {}, webkitExitFullscreen() { prefixed += 1; } });
  assert.equal(prefixed, 1, 'préfixe WebKit');

  await assert.doesNotReject(exitNativeFullscreen({ fullscreenElement: {}, exitFullscreen: () => Promise.reject(new Error('déjà fermé')) }));
  await assert.doesNotReject(exitNativeFullscreen({ fullscreenElement: {} }), 'API de sortie absente');
  await assert.doesNotReject(exitNativeFullscreen(null));
});

// ── Qui ouvre le plein écran au lancement ───────────────────────────────────

function withWindow(fakeWindow, run) {
  const had = 'window' in globalThis;
  const previous = globalThis.window;
  if (fakeWindow === undefined) delete globalThis.window;
  else globalThis.window = fakeWindow;
  try {
    return run();
  } finally {
    if (had) globalThis.window = previous;
    else delete globalThis.window;
  }
}

const matchMediaFor = (coarse) => (query) => ({ matches: coarse && query === '(pointer: coarse)', media: query });

test('ordinateur (souris) : « LANCER » n’ouvre pas le plein écran de lui-même', () => {
  assert.equal(withWindow({ matchMedia: matchMediaFor(false) }, opensFullscreenOnLaunch), false);
  assert.equal(withWindow({}, opensFullscreenOnLaunch), false, 'navigateur sans matchMedia');
});

test('téléphone ou tablette (pointeur grossier) : « LANCER » ouvre le plein écran', () => {
  assert.equal(withWindow({ matchMedia: matchMediaFor(true) }, opensFullscreenOnLaunch), true);
});

test('application Android (pont LetsPlayAndroid) : « LANCER » ouvre le plein écran, même sans écran tactile reconnu', () => {
  assert.equal(withWindow({ LetsPlayAndroid: {}, matchMedia: matchMediaFor(false) }, opensFullscreenOnLaunch), true);
  assert.equal(withWindow({ LetsPlayAndroid: {} }, opensFullscreenOnLaunch), true);
});

test('hors navigateur ou matchMedia défaillant : jamais d’exception, jamais de plein écran forcé', () => {
  assert.equal(withWindow(undefined, opensFullscreenOnLaunch), false, 'rendu serveur');
  assert.equal(withWindow({ matchMedia() { throw new Error('indisponible'); } }, opensFullscreenOnLaunch), false);
  assert.equal(withWindow({ matchMedia: () => null }, opensFullscreenOnLaunch), false);
});

// ── Budget de pixels ────────────────────────────────────────────────────────

const pixels = (width, height, ratio) => Math.round(width * ratio) * Math.round(height * ratio);

test('la vue de la page et le 1080p plein écran gardent leur définition d’avant', () => {
  assert.equal(renderPixelRatio(978, 700, 1), 1, 'vue de la page, écran standard');
  assert.equal(renderPixelRatio(978, 700, 2), MAX_PIXEL_RATIO, 'vue de la page, Retina : plafond de densité habituel');
  assert.equal(renderPixelRatio(390, 800, 3), MAX_PIXEL_RATIO, 'téléphone : plafond de densité habituel');
  assert.equal(renderPixelRatio(1920, 1030, 1), 1, '1080p plein écran à sa définition native (1,98 Mpx)');
  assert.equal(renderPixelRatio(1920, 1080, 1), 1, '1080p exact (2,07 Mpx)');
});

test('plein écran sur grand écran : l’image garde environ le budget de pixels', () => {
  const qhd = renderPixelRatio(2560, 1390, 1);
  assert.ok(qhd < 1 && qhd > 0.7, `1440p : ratio réduit (${qhd.toFixed(2)})`);
  assert.ok(pixels(2560, 1390, qhd) <= MAX_RENDER_PIXELS * 1.001);
  assert.ok(pixels(2560, 1390, qhd) >= MAX_RENDER_PIXELS * 0.99, 'on ne baisse pas plus que nécessaire');

  const uhd = renderPixelRatio(3840, 2110, 1);
  assert.ok(uhd < 0.6, `4K : ratio fortement réduit (${uhd.toFixed(2)})`);
  assert.ok(pixels(3840, 2110, uhd) <= MAX_RENDER_PIXELS * 1.001);

  const laptop = renderPixelRatio(1440, 850, 2);
  assert.ok(laptop < MAX_PIXEL_RATIO && laptop > 1.2, `portable Retina plein écran (${laptop.toFixed(2)})`);
  assert.ok(pixels(1440, 850, laptop) <= MAX_RENDER_PIXELS * 1.001);
});

test('le budget n’est jamais dépassé et ne monte jamais avec la taille de la vue', () => {
  const sizes = [[320, 480], [390, 800], [800, 600], [978, 700], [1280, 720], [1366, 768], [1920, 1080], [2560, 1440], [3440, 1440], [3840, 2160], [7680, 4320]];
  for (const density of [1, 1.25, 1.5, 2, 3]) {
    let previous = Infinity;
    for (const [width, height] of sizes) {
      const ratio = renderPixelRatio(width, height, density);
      assert.ok(ratio > 0 && ratio <= MAX_PIXEL_RATIO, `ratio ${ratio} hors limites (${width}×${height} @${density})`);
      assert.ok(ratio <= density + 1e-9, 'jamais plus net que l’écran');
      assert.ok(width * height * ratio * ratio <= MAX_RENDER_PIXELS * 1.0001, `budget dépassé (${width}×${height} @${density})`);
      assert.ok(ratio <= previous + 1e-9, 'une vue plus grande ne rend jamais plus net');
      previous = ratio;
    }
  }
});

test('valeurs absurdes : repli sur le plafond de densité, jamais 0 ni NaN', () => {
  for (const [width, height, density] of [[0, 0, 2], [0, 700, 2], [978, 0, 2], [NaN, 700, 2], [978, NaN, 2], [-5, 700, 2], [Infinity, 700, 2], [undefined, undefined, 2], ['abc', 'def', 2]]) {
    const ratio = renderPixelRatio(width, height, density);
    assert.ok(Number.isFinite(ratio) && ratio > 0, `${width}×${height} → ${ratio}`);
  }
  assert.equal(renderPixelRatio(0, 0, 2), MAX_PIXEL_RATIO);
  assert.equal(renderPixelRatio(978, 700, 0), 1, 'densité nulle : 1');
  assert.equal(renderPixelRatio(978, 700, NaN), 1);
  assert.equal(renderPixelRatio(978, 700, -2), 1);
  assert.equal(renderPixelRatio(978, 700), 1, 'densité omise : 1');
});
