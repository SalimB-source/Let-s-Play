/**
 * Contrôle « mise en page téléphone » — sans dépendance, exécutable en CI.
 *
 * La mise en page mobile du site repose sur des requêtes média
 * `@media(max-width:800px)`. Or la fenêtre de mise en page n'est pas toujours
 * celle de l'écran : Safari mémorise un zoom par site, « version ordinateur »
 * élargit la fenêtre, et une WebView n'honore `<meta viewport>` que si
 * l'application le lui demande (voir `src/lib/phoneLayout.js`). Dans ces cas,
 * toutes les requêtes `max-width` étaient ignorées → barre de navigation
 * « PC » et blocs côte à côte sur un téléphone.
 *
 * La parade : chaque requête « petit écran » est écrite en OU d'une condition
 * `max-device-width` (taille d'écran, insensible au zoom), et chaque requête
 * « bureau » est restreinte aux appareils qui ne sont pas des téléphones en
 * portrait. Ce script vérifie que la règle est respectée partout — un nouveau
 * composant qui ajouterait un `@media(max-width:…px)` sans la condition
 * téléphone casse le contrôle.
 *
 *   npm run check:phone-css
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HANDHELD = 'max-device-width:600px';
const PHONE_BREAKPOINT = 800; // au-delà, on est sur une grande tablette/bureau
const LANDSCAPE_GUARD = 'min-device-width:601px';

function cssFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') cssFiles(file, out);
    } else if (entry.name.endsWith('.css')) {
      out.push(file);
    }
  }
  return out;
}

/** Paramètres des @media d'un fichier (chaînes littérales, commentaires exclus). */
function mediaQueries(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/@media([^{]*)\{/g)].map((match) => match[1].replace(/\s+/g, ' ').trim());
}

const problems = [];
let phoneQueries = 0;
let desktopQueries = 0;

for (const file of cssFiles(path.join(root, 'src')).sort()) {
  const rel = path.relative(root, file);
  for (const query of mediaQueries(fs.readFileSync(file, 'utf8'))) {
    const maxWidths = [...query.matchAll(/(?<!device-)max-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    const minWidths = [...query.matchAll(/(?<!device-)min-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    const hasHandheld = query.includes(HANDHELD);
    const hasLandscapeGuard = query.includes(LANDSCAPE_GUARD);

    // Requête « petit écran » : elle doit aussi couvrir un téléphone dont la
    // fenêtre de mise en page a été élargie.
    if (maxWidths.some((w) => w <= PHONE_BREAKPOINT)) {
      phoneQueries += 1;
      if (!hasHandheld) {
        problems.push(`[${rel}] ${query} → ajouter « , (hover:none) and (pointer:coarse) and (${HANDHELD}) »`);
      }
    }

    // Requête « bureau » : elle ne doit pas s'appliquer à un téléphone en
    // portrait (dont la fenêtre peut être large), mais rester active sur un
    // ordinateur et sur un téléphone en paysage.
    if (minWidths.some((w) => w > PHONE_BREAKPOINT)) {
      desktopQueries += 1;
      if (!hasHandheld && !hasLandscapeGuard) {
        problems.push(`[${rel}] ${query} → ajouter « and (hover:hover), … and (${LANDSCAPE_GUARD}) »`);
      }
    }
  }
}

const total = phoneQueries + desktopQueries;
if (problems.length) {
  console.error(`\n${problems.length} requête(s) média sans condition téléphone :\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error('\nVoir src/lib/phoneLayout.js et la section « Mise en page téléphone » du README.\n');
  process.exit(1);
}

console.log(`Mise en page téléphone : ${phoneQueries} requête(s) « petit écran » et ${desktopQueries} requête(s) « bureau » protégées (${total} au total).`);
console.log('OK — la mise en page mobile ne dépend pas de la largeur de fenêtre imposée par le navigateur.\n');
