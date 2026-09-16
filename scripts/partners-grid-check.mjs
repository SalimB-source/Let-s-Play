/**
 * Grille partenaires de l'accueil — `npm run check:partners`.
 *
 * La section 03 de la page d'accueil (`#events`, `src/components/PartnersSection.jsx`)
 * affiche les 12 logos partenaires dans `.partner-grid`. Le contrat de mise en page :
 *
 *   - 5 colonnes sur grand écran ;
 *   - 3 colonnes dès 1024 px, et toujours 3 colonnes sur mobile (≤ 720 px).
 *
 * Ces règles vivent dans `src/partners.css`, mais une autre feuille importée après
 * elle dans `src/main.jsx` (ou un regroupement de media queries à la minification)
 * pourrait casser la cascade sans que rien ne le signale. Ce script ne rejoue donc
 * pas la CSS à la main : il construit le bundle réel (`vite build`), lit la CSS
 * produite, et résout la cascade pour plusieurs largeurs d'écran — la dernière
 * déclaration `.partner-grid` qui s'applique gagne.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'partners-grid-check');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const assetsDir = path.join(outDir, 'assets');
const cssName = fs.readdirSync(assetsDir).find((file) => file.endsWith('.css'));
if (!cssName) {
  console.error('Aucune CSS produite par le build — vérification impossible.');
  process.exit(1);
}
const css = fs.readFileSync(path.join(assetsDir, cssName), 'utf8');

/* ---------- Lecture de la CSS produite ---------- */

// Découpe un niveau de CSS en blocs `{ header } body }`, en respectant l'imbrication.
function splitBlocks(input) {
  const blocks = [];
  let cursor = 0;
  while (cursor < input.length) {
    const open = input.indexOf('{', cursor);
    if (open === -1) break;
    let depth = 1;
    let index = open + 1;
    while (index < input.length && depth > 0) {
      if (input[index] === '{') depth += 1;
      else if (input[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push({ header: input.slice(cursor, open).trim(), body: input.slice(open + 1, index - 1) });
    cursor = index;
  }
  return blocks;
}

// Traduit une condition de media query en intervalle de largeur en px.
// Gère les deux syntaxes présentes selon le minifieur : `(max-width:720px)`
// et sa forme moderne `(width<=720px)`. Toute condition non liée à la largeur
// (orientation, prefers-color-scheme…) rend le bloc « inconnu » : il est alors
// signalé plutôt qu'ignoré en silence.
function mediaWidthRange(header) {
  const conditions = header.match(/\([^)]*\)/g) || [];
  let min = 0;
  let max = Infinity;
  for (const condition of conditions) {
    const parsed =
      /\(\s*(?:max-width\s*:|width\s*<=)\s*([\d.]+)px\s*\)/.exec(condition) ||
      /\(\s*(?:min-width\s*:|width\s*>=)\s*([\d.]+)px\s*\)/.exec(condition);
    if (!parsed) return { unknown: true, header };
    const value = Number.parseFloat(parsed[1]);
    if (/max-width|<=/.test(condition)) max = Math.min(max, value);
    else min = Math.max(min, value);
  }
  return { min, max, header };
}

// Aplatit la CSS en règles `{ media, selectors[], body }`, dans l'ordre du fichier.
function flatten(blocks, media = null) {
  const rules = [];
  for (const block of blocks) {
    if (block.header.startsWith('@media')) {
      rules.push(...flatten(splitBlocks(block.body), block.header));
    } else if (block.header.startsWith('@')) {
      // @supports, @layer… : on descend quand même, la condition de largeur est perdue.
      rules.push(...flatten(splitBlocks(block.body), media));
    } else {
      rules.push({ media, selectors: block.header.split(',').map((s) => s.trim()), body: block.body });
    }
  }
  return rules;
}

const rules = flatten(splitBlocks(css));
const matches = (media, width) => {
  if (!media) return true;
  const range = mediaWidthRange(media);
  if (range.unknown) return false;
  return width >= range.min && width <= range.max;
};

// Cascade : toutes les déclarations `.partner-grid` qui s'appliquent à `width`,
// dans l'ordre du fichier — la dernière gagne (spécificité identique, 1 classe).
function gridColumnsAt(width) {
  const hits = [];
  for (const rule of rules) {
    if (!rule.selectors.includes('.partner-grid')) continue;
    if (!matches(rule.media, width)) continue;
    const declared = /grid-template-columns\s*:\s*([^;}]+)/.exec(rule.body);
    if (declared) hits.push({ origin: rule.media || 'hors media query', value: declared[1].trim() });
  }
  return hits;
}

const columnsOf = (declaration) => {
  const repeat = /repeat\(\s*(\d+)\s*,/.exec(declaration);
  return repeat ? Number(repeat[1]) : null;
};

/* ---------- Vérifications ---------- */

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} → ${actual}${ok ? '' : ` (attendu : ${expected})`}`);
}

console.log(`\nCSS analysée : assets/${cssName}\n`);

console.log('[1/4] nombre de colonnes de `.partner-grid` selon la largeur\n');
const screens = [
  [1440, 5, 'bureau'],
  [1024, 3, 'tablette / petit portable'],
  [900, 3, 'tablette'],
  [720, 3, 'grand mobile (seuil exact)'],
  [414, 3, 'mobile'],
  [390, 3, 'mobile'],
  [375, 3, 'mobile'],
  [360, 3, 'mobile'],
  [320, 3, 'petit mobile'],
];
for (const [width, expected, label] of screens) {
  const hits = gridColumnsAt(width);
  check(`${width} px (${label})`, columnsOf(hits.at(-1)?.value ?? '—'), expected);
}

console.log('\n[2/4] la règle mobile gagne bien la cascade\n');
const mobileHits = gridColumnsAt(375);
console.log(`  déclarations appliquées à 375 px : ${mobileHits.map((h) => `${h.value} [${h.origin}]`).join(' ← ')}`);
check('dernière déclaration appliquée', mobileHits.at(-1)?.value, 'repeat(3,minmax(0,1fr))');
check(
  'aucune feuille postérieure ne repasse `.partner-grid` en colonne unique',
  gridColumnsAt(375).some((hit) => columnsOf(hit.value) === 1),
  false,
);

console.log('\n[3/4] l’espacement des tuiles mobiles reste serré\n');
const gapHits = [];
for (const rule of rules) {
  if (!rule.selectors.includes('.partner-grid')) continue;
  if (!matches(rule.media, 375)) continue;
  const gap = /(?:^|[;\s])gap\s*:\s*([^;}]+)/.exec(rule.body);
  if (gap) gapHits.push({ origin: rule.media || 'hors media query', value: gap[1].trim() });
}
check('gap à 375 px', gapHits.at(-1)?.value, '10px');

console.log('\n[4/4] aucune règle ne repasse la grille en 1 ou 2 colonnes\n');
const everyGridRule = rules.filter((rule) => rule.selectors.includes('.partner-grid'));
console.log(`  ${everyGridRule.length} règles .partner-grid dans la CSS livrée :`);
for (const rule of everyGridRule) console.log(`    - [${rule.media || 'hors media query'}] ${rule.body.trim()}`);
for (const rule of everyGridRule) {
  const declared = /grid-template-columns\s*:\s*([^;}]+)/.exec(rule.body);
  if (!declared) continue;
  const columns = columnsOf(declared[1]);
  check(`[${rule.media || 'hors media query'}]`, columns, rule.media ? 3 : 5);
}

console.log(failures ? `\n${failures} échec(s).\n` : '\nGrille partenaires conforme sur toutes les largeurs.\n');
process.exit(failures ? 1 : 0);
