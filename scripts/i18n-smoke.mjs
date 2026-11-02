/**
 * i18n smoke test — `npm run check:i18n`.
 *
 * 1. Renders every route in every language and fails on the first crash.
 * 2. Re-runs it with `news.million` deleted from FR / AR, i.e. the exact
 *    regression introduced by ff6d390 ("Add Onimusha sales news article"),
 *    to prove a partially translated dictionary degrades instead of throwing.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { translations as sourceTranslations } from '../src/i18n/translations.js';
import { frenchSiteDictionary } from '../src/i18n/translations-fr-site.js';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
function withBaseFallback(dict, base) {
  if (!isPlainObject(dict)) return dict;
  const merged = {};
  const keys = new Set([...Object.keys(dict), ...(isPlainObject(base) ? Object.keys(base) : [])]);
  for (const key of keys) {
    const value = dict[key];
    const fallback = isPlainObject(base) ? base[key] : undefined;
    if (isPlainObject(value) && isPlainObject(fallback)) {
      merged[key] = withBaseFallback(value, fallback);
    } else if (value === undefined || value === null || value === '') {
      merged[key] = fallback === undefined ? value : fallback;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
assert.deepEqual(
  frenchSiteDictionary,
  withBaseFallback(sourceTranslations.fr, sourceTranslations.en),
  'translations-fr-site.js is stale; run `npm run i18n:fr-site`'
);
console.log('French production dictionary is up to date.');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'i18n-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'vite',
    'build',
    '--ssr',
    'scripts/i18n-smoke.jsx',
    '--outDir',
    path.relative(root, outDir),
    '--emptyOutDir',
    '--logLevel',
    'error',
  ],
  { cwd: root, stdio: 'inherit' }
);

const { LANGS, ROUTES, renderAll, translations } = await import(
  path.join(outDir, 'i18n-smoke.js')
);

let failures = 0;

function runPass(label) {
  for (const lang of LANGS) {
    for (const result of renderAll(lang)) {
      if (result.ok) {
        console.log(`  ok   ${result.lang.padEnd(2)} ${result.path}`);
      } else {
        failures += 1;
        console.log(`  FAIL ${result.lang.padEnd(2)} ${result.path}\n       ${result.error}`);
      }
    }
  }
  console.log(`  -> ${label}: ${LANGS.length * ROUTES.length} renders checked\n`);
}

console.log(`\n[1/2] every route x every language (${LANGS.join(', ')})\n`);
runPass('baseline');

console.log('[2/2] regression: news.million missing from FR / AR (the ff6d390 bug)\n');
const removed = [];
for (const lang of ['fr', 'ar']) {
  if (translations[lang]?.news?.million) {
    removed.push([lang, translations[lang].news.million]);
    delete translations[lang].news.million;
  }
}
if (removed.length === 0) {
  console.log('  skipped — news.million not present in FR / AR\n');
} else {
  runPass('untranslated news.million');
  for (const [lang, block] of removed) translations[lang].news.million = block;
}

if (failures > 0) {
  console.error(`\n${failures} render(s) crashed.`);
  process.exit(1);
}
console.log('All routes render in every language. i18n OK.');
