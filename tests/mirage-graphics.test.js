import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAPHICS_LOW,
  GRAPHICS_NORMAL,
  GRAPHICS_PROFILES,
  GRAPHICS_QUALITIES,
  GRAPHICS_STORAGE_KEY,
  createGraphicsStore,
  gemBurstShardCount,
  graphicsProfile,
  isLowGraphics,
  normalizeGraphics,
  readGraphics,
  shouldSkipRender,
  writeGraphics,
} from '../src/games/mirageGraphics.js';
import { MAX_PIXEL_RATIO, MAX_RENDER_PIXELS, renderPixelRatio } from '../src/games/miragePixelBudget.js';
import { GEM_BURST_SHARDS } from '../src/games/mirageRules.js';

const normal = GRAPHICS_PROFILES[GRAPHICS_NORMAL];
const low = GRAPHICS_PROFILES[GRAPHICS_LOW];

/** Faux `localStorage` : une simple table, avec ses accès comptés. */
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    reads: 0,
    writes: 0,
    getItem(key) { this.reads += 1; return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { this.writes += 1; data.set(key, String(value)); },
  };
}

// ── Profils ─────────────────────────────────────────────────────────────────

test('graphics: two levels, normal first, and the key is versioned like the other Mirage keys', () => {
  assert.deepEqual([...GRAPHICS_QUALITIES], ['normal', 'low']);
  assert.equal(GRAPHICS_STORAGE_KEY, 'letsplay_mirage_graphics_v1');
  assert.ok(Object.isFrozen(GRAPHICS_PROFILES) && Object.isFrozen(normal) && Object.isFrozen(low), 'les profils ne se modifient pas à chaud');
});

test('graphics: « normal » is the game as it has always been drawn', () => {
  assert.equal(normal.maxPixelRatio, MAX_PIXEL_RATIO);
  assert.equal(normal.maxRenderPixels, MAX_RENDER_PIXELS);
  assert.equal(normal.antialias, true);
  assert.equal(normal.sceneryEffects, true);
  assert.equal(normal.glowHalos, true, 'les cristaux brillent');
  assert.equal(normal.sceneryRangeRatio, Infinity, 'tout le décor est dessiné');
  assert.equal(normal.gemBurstRatio, 1);
  assert.equal(normal.hudInterval, 125);
  assert.equal(normal.idleFrameInterval, 0, 'une image à chaque rafraîchissement, partout');
});

test('graphics: « low » is lighter on every axis — and only dresses the picture, never the game', () => {
  assert.ok(low.maxPixelRatio < normal.maxPixelRatio);
  assert.ok(low.maxRenderPixels < normal.maxRenderPixels);
  assert.equal(low.antialias, false);
  assert.equal(low.sceneryEffects, false);
  assert.equal(low.glowHalos, false, 'les halos s’éteignent, la gemme reste');
  assert.ok(low.sceneryRangeRatio < normal.sceneryRangeRatio);
  assert.ok(low.gemBurstRatio < normal.gemBurstRatio);
  assert.ok(low.hudInterval > normal.hudInterval);
  assert.ok(low.idleFrameInterval > normal.idleFrameInterval);
  // La liste est fermée : tout nouveau réglage doit passer ici, donc être relu — jamais de réglage de jeu.
  const dressing = ['quality', 'maxPixelRatio', 'maxRenderPixels', 'antialias', 'sceneryEffects', 'glowHalos', 'sceneryRangeRatio', 'gemBurstRatio', 'hudInterval', 'idleFrameInterval'];
  assert.deepEqual(Object.keys(normal).sort(), [...dressing].sort());
  assert.deepEqual(Object.keys(low).sort(), [...dressing].sort());
});

test('graphics: the lowered pixel ceilings stay readable on a phone and a laptop', () => {
  assert.ok(low.maxPixelRatio >= 1, 'jamais en dessous d’un pixel rendu par pixel CSS');
  assert.ok(low.maxRenderPixels >= 640 * 360 * 2, 'au moins deux fois un écran 360p');
  assert.ok(low.sceneryRangeRatio > 0.7 && low.sceneryRangeRatio < 1, 'le décor ne disparaît que noyé dans le brouillard');
  // Brouillard des terrains : 82 m (la plupart), 84 m (Infini), 104 m (Serpent) — la coupe reste au-delà de 55 m.
  for (const fogFar of [82, 84, 104]) assert.ok(low.sceneryRangeRatio * fogFar > 55, `portée du décor pour un brouillard de ${fogFar} m`);
  assert.ok(low.hudInterval <= 250, 'le chrono et le score restent vivants');
  assert.ok(low.idleFrameInterval <= 100, 'au moins 10 images par seconde à l’arrêt');
});

// ── Valeurs inconnues ───────────────────────────────────────────────────────

test('graphics: anything unknown means normal, only « low » lowers', () => {
  assert.equal(normalizeGraphics('low'), 'low');
  assert.equal(normalizeGraphics('normal'), 'normal');
  for (const value of [undefined, null, '', 'LOW', ' low', 'ultra', 'high', 0, 1, true, {}, [], 'low\n']) {
    assert.equal(normalizeGraphics(value), 'normal', `${JSON.stringify(value)} → normal`);
    assert.equal(isLowGraphics(value), false);
    assert.equal(graphicsProfile(value), normal);
  }
  assert.equal(isLowGraphics('low'), true);
  assert.equal(graphicsProfile('low'), low, 'toujours le même objet : le moteur compare par identité');
});

// ── Stockage ────────────────────────────────────────────────────────────────

test('graphics: the choice round-trips through the storage', () => {
  const storage = fakeStorage();
  assert.equal(readGraphics(storage), 'normal', 'rien de mémorisé : normal');
  assert.equal(writeGraphics('low', storage), true);
  assert.equal(storage.data.get(GRAPHICS_STORAGE_KEY), 'low');
  assert.equal(readGraphics(storage), 'low');
  assert.equal(writeGraphics('normal', storage), true);
  assert.equal(readGraphics(storage), 'normal');
  assert.equal(writeGraphics('ultra', storage), true);
  assert.equal(storage.data.get(GRAPHICS_STORAGE_KEY), 'normal', 'on ne mémorise jamais une valeur inconnue');
});

test('graphics: a corrupted, missing or locked storage never breaks the game', () => {
  assert.equal(readGraphics(fakeStorage({ [GRAPHICS_STORAGE_KEY]: '{"quality":"low"}' })), 'normal');
  assert.equal(readGraphics(fakeStorage({ [GRAPHICS_STORAGE_KEY]: 'undefined' })), 'normal');
  assert.equal(readGraphics(null), 'normal');
  const locked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(readGraphics(locked), 'normal');
  assert.equal(writeGraphics('low', locked), false, 'écriture refusée : on le sait, sans exception');
  assert.equal(writeGraphics('low', null), false);
});

// ── État partagé ────────────────────────────────────────────────────────────

test('graphics store: reads the saved level once, lazily', () => {
  const storage = fakeStorage({ [GRAPHICS_STORAGE_KEY]: 'low' });
  const store = createGraphicsStore(() => storage);
  assert.equal(storage.reads, 0, 'rien n’est lu avant d’en avoir besoin');
  assert.equal(store.get(), 'low');
  assert.equal(store.get(), 'low');
  assert.equal(storage.reads, 1, 'le stockage n’est lu qu’une fois, pas à chaque image');
});

test('graphics store: set() saves, notifies every subscriber once, and ignores a no-op', () => {
  const storage = fakeStorage();
  const store = createGraphicsStore(() => storage);
  const seen = [];
  const other = [];
  store.subscribe((level) => seen.push(level));
  store.subscribe((level) => other.push(level));
  assert.equal(store.set('low'), 'low');
  assert.equal(store.get(), 'low');
  assert.equal(storage.data.get(GRAPHICS_STORAGE_KEY), 'low');
  assert.deepEqual([seen, other], [['low'], ['low']]);
  assert.equal(store.set('low'), 'low');
  assert.equal(storage.writes, 1, 'même niveau : ni écriture ni notification');
  assert.deepEqual(seen, ['low']);
  store.set('normal');
  assert.deepEqual(seen, ['low', 'normal']);
  assert.equal(storage.data.get(GRAPHICS_STORAGE_KEY), 'normal');
  assert.equal(store.set('ultra'), 'normal', 'une valeur inconnue vaut normal');
  assert.deepEqual(seen, ['low', 'normal'], '… et ne notifie pas : on y était déjà');
});

test('graphics store: unsubscribing stops the notifications, even from inside one', () => {
  const store = createGraphicsStore(() => fakeStorage());
  const calls = [];
  const stop = store.subscribe((level) => calls.push(['a', level]));
  const stopSelf = store.subscribe((level) => { calls.push(['b', level]); stopSelf(); });
  store.subscribe((level) => calls.push(['c', level]));
  store.set('low');
  assert.deepEqual(calls, [['a', 'low'], ['b', 'low'], ['c', 'low']], 'la liste est copiée : se désabonner pendant l’envoi ne saute personne');
  stop();
  store.set('normal');
  assert.deepEqual(calls.slice(3), [['c', 'normal']], 'a et b ne reçoivent plus rien');
});

test('graphics store: the level changes for this tab even when the storage refuses to save it', () => {
  const locked = { getItem() { return null; }, setItem() { throw new Error('QuotaExceededError'); } };
  const store = createGraphicsStore(() => locked);
  const seen = [];
  store.subscribe((level) => seen.push(level));
  assert.equal(store.set('low'), 'low');
  assert.equal(store.get(), 'low', 'navigation privée : le choix tient jusqu’à la fermeture de l’onglet');
  assert.deepEqual(seen, ['low']);
  const none = createGraphicsStore(() => null);
  assert.equal(none.get(), 'normal');
  assert.equal(none.set('low'), 'low');
  assert.equal(none.get(), 'low');
});

test('graphics store: sync() picks up a change made by another tab, once', () => {
  const storage = fakeStorage();
  const store = createGraphicsStore(() => storage);
  const seen = [];
  store.subscribe((level) => seen.push(level));
  assert.equal(store.get(), 'normal');
  assert.equal(store.sync(), 'normal');
  assert.deepEqual(seen, [], 'rien n’a changé : personne n’est réveillé');
  storage.data.set(GRAPHICS_STORAGE_KEY, 'low');
  assert.equal(store.sync(), 'low');
  assert.equal(store.get(), 'low');
  assert.deepEqual(seen, ['low']);
  assert.equal(store.sync(), 'low');
  assert.deepEqual(seen, ['low'], 'un second sync() identique ne notifie pas');
  storage.data.delete(GRAPHICS_STORAGE_KEY);
  assert.equal(store.sync(), 'normal', 'stockage vidé dans l’autre onglet : retour à normal');
  assert.deepEqual(seen, ['low', 'normal']);
  assert.equal(storage.writes, 0, 'sync() ne réécrit jamais ce qu’il vient de lire');
});

test('graphics store: sync() before any get() just adopts the saved level', () => {
  const storage = fakeStorage({ [GRAPHICS_STORAGE_KEY]: 'low' });
  const store = createGraphicsStore(() => storage);
  const seen = [];
  store.subscribe((level) => seen.push(level));
  assert.equal(store.sync(), 'low');
  assert.deepEqual(seen, [], 'premier niveau lu : ce n’est pas un changement');
});

// ── Ce que le moteur en fait ────────────────────────────────────────────────

test('graphics: the crystal burst keeps at least 3 shards, and never more than the full burst', () => {
  assert.equal(gemBurstShardCount(GEM_BURST_SHARDS, normal), GEM_BURST_SHARDS, 'normal : le jet complet');
  assert.equal(gemBurstShardCount(GEM_BURST_SHARDS, low), Math.round(GEM_BURST_SHARDS * low.gemBurstRatio));
  assert.ok(gemBurstShardCount(GEM_BURST_SHARDS, low) >= 3);
  assert.ok(gemBurstShardCount(GEM_BURST_SHARDS, low) < GEM_BURST_SHARDS);
  for (const full of [1, 2, 3, 4, 6, 10, 24]) {
    for (const profile of [normal, low, { gemBurstRatio: 0 }, { gemBurstRatio: 5 }, { gemBurstRatio: -1 }, { gemBurstRatio: Number.NaN }, {}, null, undefined]) {
      const count = gemBurstShardCount(full, profile);
      assert.ok(Number.isInteger(count), `entier (${full}, ${JSON.stringify(profile)})`);
      assert.ok(count >= Math.min(3, full), `au moins ${Math.min(3, full)} éclats (${full}, ${JSON.stringify(profile)}) → ${count}`);
      assert.ok(count <= full, `jamais plus que le jet complet (${full}, ${JSON.stringify(profile)}) → ${count}`);
    }
  }
  assert.equal(gemBurstShardCount(10, { gemBurstRatio: Number.NaN }), 10, 'un profil absurde garde le jet complet');
  assert.equal(gemBurstShardCount(10, null), 10);
});

test('graphics: idle frames are throttled only while the track stands still', () => {
  const idle = { running: false, pending: false, interval: 66, last: 1000 };
  assert.equal(shouldSkipRender({ ...idle, now: 1010 }), true, 'à l’arrêt, une image trop proche est sautée');
  assert.equal(shouldSkipRender({ ...idle, now: 1065 }), true);
  assert.equal(shouldSkipRender({ ...idle, now: 1066 }), false, 'au bout du délai, on redessine');
  assert.equal(shouldSkipRender({ ...idle, now: 5000 }), false);
  assert.equal(shouldSkipRender({ ...idle, running: true, now: 1001 }), false, 'en course, jamais : chaque image est dessinée');
  assert.equal(shouldSkipRender({ ...idle, pending: true, now: 1001 }), false, 'taille ou réglage changé : on redessine tout de suite');
  assert.equal(shouldSkipRender({ ...idle, interval: 0, now: 1001 }), false, 'normal : aucun ralentissement');
  assert.equal(shouldSkipRender({ ...idle, interval: normal.idleFrameInterval, now: 1001 }), false);
  assert.equal(shouldSkipRender({ ...idle, interval: low.idleFrameInterval, now: 1001 }), true);
  for (const interval of [-5, Number.NaN, undefined, null]) assert.equal(shouldSkipRender({ ...idle, interval, now: 1001 }), false, `délai ${interval} : pas de ralentissement`);
  assert.equal(shouldSkipRender({ ...idle, now: 900 }), false, 'une horloge qui recule ne gèle jamais l’image');
  assert.equal(shouldSkipRender({ ...idle, now: Number.NaN }), false);
  assert.equal(shouldSkipRender({ ...idle, last: Number.NaN, now: 1001 }), false, 'jamais dessiné : on dessine');
});

test('graphics: the idle throttle never lets the picture freeze for more than one interval', () => {
  // Simule un affichage à 144 Hz : une image tous les ~7 ms, la piste à l'arrêt.
  let last = 0;
  let drawn = 0;
  let longestGap = 0;
  let previousDraw = 0;
  for (let now = 7; now < 2000; now += 6.94) {
    if (shouldSkipRender({ running: false, pending: false, interval: low.idleFrameInterval, now, last })) continue;
    drawn += 1;
    longestGap = Math.max(longestGap, now - previousDraw);
    previousDraw = now;
    last = now;
  }
  assert.ok(drawn >= 20 && drawn <= 36, `à l’arrêt ≈ 15 images/s sur 2 s (${drawn})`);
  assert.ok(longestGap < low.idleFrameInterval + 10, `jamais plus d’un délai sans image (${longestGap.toFixed(1)} ms)`);
});

// ── Résolution ──────────────────────────────────────────────────────────────

test('graphics: on a phone, low renders 1 pixel per CSS pixel instead of 1.55', () => {
  // iPhone / Android récent : 390 × 800 px CSS, densité 3.
  assert.equal(renderPixelRatio(390, 800, 3, normal), MAX_PIXEL_RATIO);
  assert.equal(renderPixelRatio(390, 800, 3, low), 1);
  const phonePixels = (profile) => { const ratio = renderPixelRatio(390, 800, 3, profile); return 390 * 800 * ratio * ratio; };
  assert.ok(phonePixels(normal) / phonePixels(low) > 2.3, 'plus de 2,3 fois moins de pixels à remplir');
  // Écran de densité 2 et téléphone d'entrée de gamme (densité 1,5) : jamais au-dessus de la densité réelle.
  assert.equal(renderPixelRatio(360, 700, 2, low), 1);
  assert.equal(renderPixelRatio(360, 700, 1.5, low), 1);
  assert.equal(renderPixelRatio(360, 700, 1.25, low), 1, 'normal 1,25 → bas 1 (plafond de la densité conservé)');
  assert.equal(renderPixelRatio(360, 700, 0.75, low), 0.75, 'un écran sous 1× n’est pas sur-échantillonné');
});

test('graphics: on a big screen, low caps the picture at 1280 × 720 pixels', () => {
  const fullHd = renderPixelRatio(1920, 1080, 1, low);
  assert.ok(Math.abs(1920 * 1080 * fullHd * fullHd - low.maxRenderPixels) < 1, 'plein écran 1080p : exactement le budget bas');
  assert.ok(Math.abs(fullHd - 2 / 3) < 1e-9);
  assert.equal(renderPixelRatio(1920, 1080, 1, normal), 1, 'normal : 1080p reste à sa définition native');
  const retina = renderPixelRatio(1440, 900, 2, low);
  assert.ok(1440 * 900 * retina * retina <= low.maxRenderPixels + 1);
  assert.ok(renderPixelRatio(3840, 2160, 2, low) < renderPixelRatio(3840, 2160, 2, normal));
  // La fenêtre de la page (≈ 900 × 620) tient déjà dans le budget bas à densité 1.
  assert.equal(renderPixelRatio(894, 624, 1, low), 1);
});

test('graphics: low never renders more pixels than normal, whatever the screen', () => {
  for (const width of [0, 1, 240, 360, 390, 412, 768, 844, 894, 1280, 1920, 2560, 3840]) {
    for (const height of [0, 1, 320, 700, 800, 1080, 1440, 2160]) {
      for (const dpr of [0.5, 0.75, 1, 1.25, 1.5, 2, 2.625, 3, 3.5, 4]) {
        const lowRatio = renderPixelRatio(width, height, dpr, low);
        const normalRatio = renderPixelRatio(width, height, dpr, normal);
        assert.ok(Number.isFinite(lowRatio) && lowRatio > 0, `ratio bas valide (${width}×${height} @${dpr})`);
        assert.ok(lowRatio <= normalRatio + 1e-12, `bas ≤ normal (${width}×${height} @${dpr}) : ${lowRatio} / ${normalRatio}`);
        assert.ok(lowRatio <= low.maxPixelRatio + 1e-12 && lowRatio <= dpr + 1e-12);
        if (width * height > 0) assert.ok(width * height * lowRatio * lowRatio <= low.maxRenderPixels + 1, `budget bas respecté (${width}×${height} @${dpr})`);
      }
    }
  }
});

test('graphics: renderPixelRatio() without limits behaves exactly as before', () => {
  assert.equal(renderPixelRatio(390, 800, 3), MAX_PIXEL_RATIO);
  assert.equal(renderPixelRatio(390, 800, 3, null), MAX_PIXEL_RATIO);
  assert.equal(renderPixelRatio(390, 800, 3, undefined), MAX_PIXEL_RATIO);
  assert.equal(renderPixelRatio(390, 800, 3, {}), MAX_PIXEL_RATIO, 'limites absentes : plafonds par défaut');
  assert.equal(renderPixelRatio(390, 800, 3, normal), renderPixelRatio(390, 800, 3));
  assert.equal(renderPixelRatio(1920, 1080, 1, normal), renderPixelRatio(1920, 1080, 1));
  assert.equal(renderPixelRatio(3840, 2160, 2, normal), renderPixelRatio(3840, 2160, 2));
  for (const absurd of [{ maxPixelRatio: 0, maxRenderPixels: -1 }, { maxPixelRatio: Number.NaN, maxRenderPixels: Number.NaN }, { maxPixelRatio: 'x', maxRenderPixels: null }]) {
    assert.equal(renderPixelRatio(390, 800, 3, absurd), MAX_PIXEL_RATIO, `limites absurdes ${JSON.stringify(absurd)} : plafonds par défaut`);
  }
});
