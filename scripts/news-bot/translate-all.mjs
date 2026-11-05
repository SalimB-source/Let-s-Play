#!/usr/bin/env node
// Traduction du stock d'articles — `npm run news:translate`.
//
// Le robot traduit désormais chaque article À SA PUBLICATION. Cette commande
// s'occupe du stock déjà en ligne (rédaction, éditions quotidiennes, anciennes
// actus du robot) : elle parcourt le catalogue, repère les articles sans
// traduction anglaise ou arabe, et les traduit avec le même fournisseur que la
// rédaction (`lib/llm.mjs`).
//
//   npm run news:translate                    # toutes les langues, tout le stock
//   npm run news:translate -- --lang=en       # une seule langue
//   npm run news:translate -- --limit=10      # les 10 articles les plus récents
//   npm run news:translate -- --slug=zelda-40th
//   npm run news:translate -- --force         # retraduit même ce qui existe
//   npm run news:translate -- --dry-run       # liste, sans appeler l'IA
//
// Sans clé IA, la commande s'arrête proprement en le disant : le site continue
// d'afficher ces articles en français avec la mention « Version française ».

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectLlm } from './lib/llm.mjs';
import {
  TRANSLATE_LANGS, translateStory, writeTranslations, regenerateLocalizedIndex, hasTranslation, localizedSlug,
} from './lib/translate.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const args = process.argv.slice(2);
const option = (name) => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.split('=').slice(1).join('=') : undefined;
};
const flag = (name) => args.includes(`--${name}`);

const DRY = flag('dry-run');
const FORCE = flag('force');
const LIMIT = Math.max(1, Number(option('limit') || 0) || Number.POSITIVE_INFINITY);
const ONLY_SLUG = option('slug');
const LANGS = (option('lang') ? option('lang').split(',') : TRANSLATE_LANGS)
  .map((lang) => lang.trim())
  .filter((lang) => TRANSLATE_LANGS.includes(lang));
if (!LANGS.length) {
  console.error(`Langues inconnues. Valeurs acceptées : ${TRANSLATE_LANGS.join(', ')}.`);
  process.exit(1);
}

// ------------------------------------------------------------ catalogue
const outDir = path.join(ROOT, 'node_modules/.cache/translate-catalog');
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/news-bot/catalog-export.jsx', '--outDir', path.relative(ROOT, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: ROOT, stdio: 'inherit' },
);
const { articles } = await import(path.join(outDir, 'catalog-export.js'));

const selected = articles
  .filter(({ key, story }) => !ONLY_SLUG || key === ONLY_SLUG || story.slug === ONLY_SLUG || localizedSlug(story) === ONLY_SLUG)
  .slice(0, LIMIT)
  // Ce qui manque dans AU MOINS une langue demandée.
  .filter(({ story }) => FORCE || LANGS.some((lang) => !hasTranslation(ROOT, story, lang)));

console.log(`Catalogue : ${articles.length} article(s) · à traduire : ${selected.length} (langues : ${LANGS.join(', ')})${DRY ? ' · mode simulation' : ''}.`);

if (!selected.length) {
  console.log('Tout est déjà traduit — rien à faire.');
  process.exit(0);
}

if (DRY) {
  for (const { key, story } of selected) {
    const missing = LANGS.filter((lang) => FORCE || !hasTranslation(ROOT, story, lang));
    console.log(`  · ${key} — ${missing.join(', ')}`);
  }
  process.exit(0);
}

const llm = detectLlm();
if (!llm) {
  console.error('Aucune clé IA configurée (OPENAI_API_KEY, ANTHROPIC_API_KEY, MISTRAL_API_KEY, GEMINI_API_KEY).');
  console.error('Les articles resteront en français sur le site, avec la mention « Version française ».');
  process.exit(1);
}

// ------------------------------------------------------------ traduction
const stats = { done: 0, skipped: 0, failed: 0, byLang: Object.fromEntries(LANGS.map((lang) => [lang, 0])) };
const failures = [];
let index = 0;

for (const { key, story } of selected) {
  index += 1;
  const missing = LANGS.filter((lang) => FORCE || !hasTranslation(ROOT, story, lang));
  if (!missing.length) { stats.skipped += 1; continue; }
  const fieldsByLang = {};
  for (const lang of missing) {
    const result = await translateStory(story, lang, llm);
    if (result.fields) {
      fieldsByLang[lang] = result.fields;
      stats.byLang[lang] += 1;
    } else {
      failures.push(`${key} → ${lang} : ${result.reason}`);
    }
  }
  if (Object.keys(fieldsByLang).length) {
    writeTranslations(ROOT, story, fieldsByLang);
    stats.done += 1;
    console.log(`  [${index}/${selected.length}] ${key} → ${Object.keys(fieldsByLang).join(', ')}`);
  } else {
    stats.failed += 1;
    console.log(`  [${index}/${selected.length}] ${key} — échec (${failures.at(-1)?.split(' : ').slice(1).join(' : ')})`);
  }
}

for (const lang of LANGS) regenerateLocalizedIndex(ROOT, lang);

console.log(`\nTerminé : ${stats.done} article(s) traduit(s), ${stats.failed} échec(s), ${stats.skipped} déjà à jour.`);
console.log(`Par langue : ${LANGS.map((lang) => `${lang}=${stats.byLang[lang]}`).join(' · ')}`);
if (failures.length) {
  console.log('\nÉchecs :');
  for (const failure of failures.slice(0, 20)) console.log(`  - ${failure}`);
  if (failures.length > 20) console.log(`  … et ${failures.length - 20} autre(s).`);
  process.exitCode = stats.done ? 0 : 1;
}
