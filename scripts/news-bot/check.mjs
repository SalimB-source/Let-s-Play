#!/usr/bin/env node
// Vérification du robot actus du jour (npm run check:newsbot) :
//   1. rejoue toute la chaîne hors-ligne via les fixtures (--fixtures --root tmp) ;
//   2. valide les fichiers réellement committés (JSON, index, visuels, slugs) ;
//   3. contrôle l’absence de collision de slugs avec les routes manuelles.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REQUIRED_FIELDS, OPTIONAL_FIELDS, detectRepetitions } from './lib/story.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
let failures = 0;

const fail = (message) => { failures += 1; console.error(`  ✗ ${message}`); };
const ok = (message) => console.log(`  ✓ ${message}`);

// ------------------------------------------------------------------ 1. chaîne complète rejouée hors-ligne
console.log('1/3 — Relecture hors-ligne de la chaîne (fixtures → articles → index)');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'letsplay-newsbot-'));
try {
  execFileSync(process.execPath, [path.join(SCRIPT_DIR, 'fetch-news.mjs'), '--fixtures', `--root=${tmp}`], { stdio: 'pipe' });
  const tmpIndex = fs.readFileSync(path.join(tmp, 'src/news/autoIndex.js'), 'utf8');
  const tmpJsons = fs.readdirSync(path.join(tmp, 'src/news/auto')).filter((file) => file.endsWith('.json'));
  if (tmpJsons.length !== 3) fail(`la chaîne fixtures devrait produire 3 articles, en a produit ${tmpJsons.length}`);
  else ok('la chaîne fixtures produit bien 3 articles (promos et astuces écartées)');
  for (const file of tmpJsons) {
    const story = JSON.parse(fs.readFileSync(path.join(tmp, 'src/news/auto', file), 'utf8'));
    for (const field of REQUIRED_FIELDS) {
      if (typeof story[field] !== 'string' || !story[field].trim()) fail(`fixture ${file} : champ « ${field} » manquant`);
    }
    for (const field of OPTIONAL_FIELDS) {
      if (story[field] != null && typeof story[field] !== 'string') fail(`fixture ${file} : champ « ${field} » invalide`);
    }
    for (const issue of detectRepetitions(story)) {
      fail(`fixture ${file} : répétition ${issue.a}↔${issue.b} (${issue.length} caractères communs)`);
    }
    if (!tmpIndex.includes(`"${story.slug}"`)) fail(`fixture ${file} : slug absent de l’index généré`);
    if (!fs.existsSync(path.join(tmp, 'public/news-auto', `${story.slug}.svg`))) fail(`fixture ${file} : visuel SVG absent`);
    if (!/^https?:\/\//.test(story.officialThumbnailUrl)) fail(`fixture ${file} : miniature officielle absente ou invalide`);
    if (!fs.existsSync(path.join(tmp, 'public', story.thumbnail))) fail(`fixture ${file} : fichier de miniature officielle absent`);
    if (!fs.readFileSync(path.join(tmp, 'news-bot/report.md'), 'utf8').includes(story.slug)) fail(`fixture ${file} : absente du rapport`);
  }
  if (!tmpIndex.startsWith('// ⚙️ FICHIER GÉNÉRÉ')) fail('l’index généré doit commencer par la bannière « FICHIER GÉNÉRÉ »');
  ok('articles de fixtures conformes au schéma (slug, visuel, index, rapport)');
} catch (error) {
  fail(`la chaîne fixtures a échoué : ${error.message}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ------------------------------------------------------------------ 2. fichiers committés
console.log('2/3 — Validation des articles committés (src/news/auto, public/news-auto)');
const autoDir = path.join(ROOT, 'src/news/auto');
const indexFile = path.join(ROOT, 'src/news/autoIndex.js');
const committed = fs.existsSync(autoDir) ? fs.readdirSync(autoDir).filter((file) => file.endsWith('.json')) : [];
const index = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
if (!index.startsWith('// ⚙️ FICHIER GÉNÉRÉ')) fail('src/news/autoIndex.js doit être un fichier généré (bannière en tête)');
const indexSlugs = [...index.matchAll(/^ {2}"([a-z0-9-]+)":/gm)].map((match) => match[1]);
if (new Set(indexSlugs).size !== indexSlugs.length) fail('l’index contient des slugs en double');

const dates = [];
for (const file of committed) {
  let story;
  try {
    story = JSON.parse(fs.readFileSync(path.join(autoDir, file), 'utf8'));
  } catch (error) { fail(`${file} : JSON illisible (${error.message})`); continue; }
  for (const field of REQUIRED_FIELDS) {
    if (typeof story[field] !== 'string' || !story[field].trim()) fail(`${file} : champ « ${field} » manquant`);
  }
  for (const field of OPTIONAL_FIELDS) {
    if (story[field] != null && typeof story[field] !== 'string') fail(`${file} : champ « ${field} » invalide`);
  }
  for (const issue of detectRepetitions(story)) {
    fail(`${file} : répétition ${issue.a}↔${issue.b} (${issue.length} caractères communs)`);
  }
  if (story.slug && !indexSlugs.includes(story.slug)) fail(`${file} : slug « ${story.slug} » absent de l’index`);
  if (!fs.existsSync(path.join(ROOT, 'public/news-auto', `${story.slug}.svg`))) fail(`${file} : visuel public/news-auto/${story.slug}.svg absent`);
  if (story.thumbnail || story.officialThumbnailUrl) {
    if (!/^https?:\/\//.test(story.officialThumbnailUrl)) fail(`${file} : miniature officielle absente ou invalide`);
    if (!fs.existsSync(path.join(ROOT, 'public', story.thumbnail))) fail(`${file} : fichier de miniature officielle absent`);
  }
  const expectedFile = `${story.date.split('.').reverse().join('-')}-${story.slug}.json`;
  if (file !== expectedFile) fail(`${file} : nom de fichier attendu « ${expectedFile} »`);
  dates.push(story.date.split('.').reverse().join(''));
}
if (committed.length) {
  const sorted = [...dates].sort().reverse();
  if (JSON.stringify(dates.sort()) !== JSON.stringify([...dates].sort())) fail('les dates des fichiers doivent être triables (format YYYY-MM-DD-<slug>.json)');
  if (JSON.stringify(indexSlugs) === JSON.stringify([...indexSlugs].sort())) fail('l’index doit être trié par date décroissante, pas alphabétiquement — vérifier generateAutoIndex');
}
ok(committed.length ? `${committed.length} article(s) committé(s) validé(s)` : 'aucun article committé pour l’instant (état initial valide)');

// ------------------------------------------------------------------ 3. collisions de slugs
console.log('3/3 — Collisions avec les routes manuelles de src/main.jsx');
const main = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
const manual = new Set([...main.matchAll(/\/news\/([a-z0-9-]+)/g)].map((match) => match[1]));
for (const slug of indexSlugs) {
  if (manual.has(slug)) fail(`le slug « ${slug} » existe déjà comme route manuelle`);
}
const route = main.match(/<Route path="\/news\/:slug"[^>]*>/);
if (!route) fail('la route /news/:slug (actus générées) doit être déclarée dans src/main.jsx');
else ok('route /news/:slug présente, slugs générés sans collision');

console.log(failures ? `\n✗ ${failures} problème(s) détecté(s).` : '\n✓ Robot actus : tous les contrôles passent.');
process.exit(failures ? 1 : 0);
