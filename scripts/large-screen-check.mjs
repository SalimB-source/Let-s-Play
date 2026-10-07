/**
 * Contrôle « grand écran » — sans dépendance, exécutable en CI.
 *
 * `src/large-screen.css` est la seule feuille qui élargit le site au-delà de
 * 1240 px. Elle est facile à casser sans s'en rendre compte, de trois façons :
 *
 *   1. **Une requête média sans garde-fou téléphone.** Toute requête `min-width`
 *      doit s'écrire en OU avec `(min-device-width:601px)`, sinon un téléphone
 *      dont la fenêtre de mise en page a été élargie (zoom Safari, WebView)
 *      reçoit la mise en page grand écran. C'est la règle de
 *      `src/lib/phoneLayout.js`, et `npm run check:phone-css` la vérifie déjà
 *      pour tout `src/` — ce contrôle-ci la rejoue sur ce fichier pour donner
 *      l'erreur au plus près de la ligne fautive.
 *   2. **Une colonne ajoutée à une grille à nombre d'éléments fixe.** Les 4
 *      reels, les 3 cartes du hub d'actu, les 3 formats et les 3 statistiques
 *      remplissent exactement une rangée ; une colonne de plus y laisserait un
 *      trou. Seules les grilles alimentées par des données peuvent en gagner.
 *   3. **Des paliers qui ne montent plus.** Le conteneur doit s'élargir à
 *      chaque palier, et les trois conteneurs du site (`.wrap`, `.nav`,
 *      `.hero-content`) doivent avancer ensemble.
 *
 *   npm run check:large-screen
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'src', 'large-screen.css');
const rel = path.relative(root, file);

/** Grilles alimentées par des données : elles seules peuvent gagner des colonnes. */
const DATA_GRIDS = new Set([
  '.latest-tests-grid',      // src/reviewsData.js — 10 tests, variable
  '.news-carousel.is-grid',  // flux d'articles des pages actu
  '.search-results-grid',    // résultats de recherche
  '.release-grid',           // calendrier des sorties
]);

/** Grilles à nombre d'éléments fixe : leur ajouter une colonne laisserait un trou. */
const FIXED_GRIDS = new Set([
  '.reels-grid',
  '.news-hub-grid',
  '.format-grid',
  '.stats',
  '.partner-grid',
  '.featured-dossiers--episodes .featured-dossiers-grid',
]);

/**
 * Blocs de lecture à deux colonnes (texte + colonne latérale). Eux ne gagnent
 * jamais de colonne : ils sont simplement recadrés pour que le texte et sa
 * colonne latérale ne s'écartent pas avec la largeur.
 */
const READING_LAYOUTS = new Set(['.article-layout', '.dossier-reading']);

/**
 * Blocs de premier niveau (ici : les requêtes média) avec leur contenu.
 * Un simple `replace(/@media[^{]*\{/…)` ne suffirait pas : il faut compter les
 * accolades pour savoir où se termine chaque palier.
 */
function topLevelBlocks(source) {
  const blocks = [];
  let depth = 0;
  let preludeStart = 0;
  let innerStart = 0;
  let prelude = '';
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '{') {
      if (depth === 0) {
        prelude = source.slice(preludeStart, i);
        innerStart = i + 1;
      }
      depth += 1;
    } else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        blocks.push({ prelude: prelude.trim(), inner: source.slice(innerStart, i) });
        preludeStart = i + 1;
      }
    }
  }
  return blocks;
}

const problems = [];
const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = topLevelBlocks(source);

// 1) Chaque palier porte son garde-fou téléphone.
let wideTiers = 0;
for (const { prelude } of blocks) {
  if (!prelude.startsWith('@media')) continue;
  const query = prelude.replace(/\s+/g, ' ');
  const minWidths = [...query.matchAll(/(?<!device-)min-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
  if (!minWidths.some((w) => w > 800)) continue;
  wideTiers += 1;
  if (!query.includes('min-device-width:601px')) {
    problems.push(`[${rel}] « ${query} » → ajouter « and (min-device-width:601px) » (garde-fou téléphone)`);
  }
}
if (wideTiers !== 3) {
  problems.push(`[${rel}] ${wideTiers} palier(s) ≥ 1441 px au lieu de 3 (1440 / 1920 / 2560)`);
}

// 2) Le conteneur s'élargit à chaque palier, et les trois conteneurs suivent.
const shells = [...source.matchAll(/--lp-shell:\s*min\((\d+)px,\s*calc\(100% - (\d+)px\)\)/g)]
  .map((m) => ({ max: Number(m[1]), gutter: Number(m[2]) }));
if (shells.length !== wideTiers) {
  problems.push(`[${rel}] ${shells.length} définition(s) de --lp-shell pour ${wideTiers} palier(s)`);
}
for (let i = 1; i < shells.length; i += 1) {
  if (shells[i].max <= shells[i - 1].max) {
    problems.push(`[${rel}] le palier ${i + 1} (${shells[i].max}px) n'est pas plus large que le précédent (${shells[i - 1].max}px)`);
  }
}
for (const { max, gutter } of shells) {
  if (max - gutter <= 0) {
    problems.push(`[${rel}] la gouttière (${gutter}px) annule la largeur maximale du conteneur (${max}px)`);
  }
}
const containerRules = [...source.matchAll(/\.wrap,\s*\.nav,\s*\.hero-content\{[^}]*width:\s*var\(--lp-shell\)/g)];
if (containerRules.length !== wideTiers) {
  problems.push(`[${rel}] ${containerRules.length} règle(s) de conteneur (.wrap / .nav / .hero-content) pour ${wideTiers} palier(s) — les trois doivent avancer ensemble`);
}

// 3) Seules les grilles alimentées par des données gagnent des colonnes ; les
//    blocs de lecture sont seulement recadrés.
let gridSelectors = 0;
for (const { inner } of blocks) {
  for (const [, selectorList, body] of inner.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!body.includes('grid-template-columns')) continue;
    const value = (body.match(/grid-template-columns:\s*([^;}]+)/) || [, ''])[1];
    const addsColumns = value.includes('repeat(');
    for (const selector of selectorList.split(',').map((s) => s.trim()).filter(Boolean)) {
      gridSelectors += 1;
      if (addsColumns) {
        if (FIXED_GRIDS.has(selector)) {
          problems.push(`[${rel}] « ${selector} » a un nombre d'éléments fixe : une colonne de plus y laisserait un trou`);
        } else if (!DATA_GRIDS.has(selector)) {
          problems.push(`[${rel}] « ${selector} » gagne des colonnes sans figurer dans la liste des grilles alimentées par des données`);
        }
      } else if (!READING_LAYOUTS.has(selector)) {
        problems.push(`[${rel}] « ${selector} » recadre une grille sans figurer dans la liste des blocs de lecture`);
      }
    }
  }
}
if (gridSelectors === 0) {
  problems.push(`[${rel}] aucune grille recadrée : le fichier ne fait plus rien, ou l'analyse ne le lit plus`);
}

if (problems.length) {
  console.error(`\n${problems.length} problème(s) dans la mise en page grand écran :\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error('\nVoir l’en-tête de src/large-screen.css et la section « Grand écran » du README.\n');
  process.exit(1);
}

console.log(`Grand écran : ${wideTiers} paliers (${shells.map((s) => `${s.max}px`).join(' → ')}), ${gridSelectors} sélecteur(s) de grille recadré(s).`);
console.log('OK — paliers ordonnés, conteneurs synchronisés, garde-fous téléphone et grilles fixes respectés.\n');
