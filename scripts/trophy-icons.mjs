/**
 * Générateur des médaillons de trophées de jeu — `node scripts/trophy-icons.mjs`.
 *
 * Les succès du site utilisent des icônes 3D de 3dicons.co (`.webp` déjà
 * livrées dans public/icons/achievements/). Les trophées des deux jeux
 * d'arcade — **Mirage Rush** et **Vice City Rush** — sont dessinés ici : un
 * médaillon vectoriel (`.svg`, texte donc diffable et régénérable) qui porte
 *
 *   - la palette du jeu (désert crépusculaire / néons de Vice City),
 *   - le métal du grade (bronze, argent, or, platine),
 *   - un emblème propre à chaque trophée (fer à cheval, cristaux, coupe,
 *     volant, drapeau à damier, skyline…).
 *
 * La liste des médaillons est lue dans le catalogue : ajouter un succès de jeu
 * sans emblème fait échouer le générateur (aucune icône manquante possible),
 * et `npm run check:achievements` vérifie de son côté que le fichier est bien
 * livré. Aucune dépendance : le script n'écrit que du SVG.
 *
 *   node scripts/trophy-icons.mjs            # régénère tous les médaillons
 *   node scripts/trophy-icons.mjs --check    # vérifie seulement (aucune écriture)
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACHIEVEMENTS } from '../src/achievements/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons', 'achievements');

/** Catégories de jeu : celles dont les trophées sont dessinés ici. */
const GAME_GROUPS = ['mirage', 'vicecity'];

/** Taille du médaillon (carré, fond transparent). */
const SIZE = 256;

/**
 * Palette par jeu : dégradé du cadran, halo coloré derrière l'emblème et
 * teinte du trait de lumière. Les couleurs viennent des chartes des deux jeux
 * (sable et crépuscule violet pour Mirage, néon rose et cyan pour Vice City).
 */
const PALETTES = {
  mirage: {
    face: ['#6b3418', '#2a1246', '#120a26'],
    glow: '#ffb454',
    rim: '#ffe0b0',
    emblem: '#fff4e0',
  },
  vicecity: {
    face: ['#5c1152', '#2a1152', '#0b0f2c'],
    glow: '#ff5db8',
    rim: '#8ef7e6',
    emblem: '#fff1fb',
  },
};

/** Métaux des grades : lumière → ombre, plus un reflet clair. */
const METALS = {
  bronze: ['#f6c79a', '#cd8a52', '#7d4520'],
  silver: ['#ffffff', '#c3ccd8', '#79838f'],
  gold: ['#fff6c2', '#ffd619', '#a9761a'],
  platinum: ['#f2feff', '#aee6ff', '#5f92ad'],
};

/* ------------------------------------------------------------------ */
/* Emblèmes : dessin dans une boîte 64 × 64, centrée sur le médaillon   */
/* ------------------------------------------------------------------ */
/* Chaque emblème est écrit avec `stroke="currentColor"` / `fill="currentColor"` :
   la couleur est posée par le groupe parent (celle du jeu), ce qui garde tous
   les médaillons d'une même famille parfaitement cohérents. */

const CUP = `
  <path d="M19 12h26v11a13 13 0 0 1-26 0z" fill="currentColor"/>
  <path d="M19 15h-6a7 7 0 0 0 7 11M45 15h6a7 7 0 0 1-7 11" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M29 35h6v9h-6z" fill="currentColor"/>
  <rect x="19" y="44" width="26" height="7" rx="3.5" fill="currentColor"/>
  <rect x="15" y="52" width="34" height="5" rx="2.5" fill="currentColor" opacity=".75"/>`;

const CUP_SMALL = (x, y) => `
  <g transform="translate(${x} ${y}) scale(.5)">
    <path d="M19 12h26v11a13 13 0 0 1-26 0z" fill="currentColor"/>
    <path d="M29 35h6v9h-6z" fill="currentColor"/>
    <rect x="19" y="44" width="26" height="7" rx="3.5" fill="currentColor"/>
  </g>`;

const STAR = (cx = 32, cy = 30, r = 22) => {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.44;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="currentColor"/>`;
};

const EMBLEMS = {
  /* ------------------------------ Mirage Rush ----------------------------- */
  // Premier galop : le fer à cheval du cavalier.
  'mirage-first-gallop': `
    <path d="M20 50V32a12 12 0 0 1 24 0v18" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
    <circle cx="20" cy="54" r="4.5" fill="currentColor"/>
    <circle cx="44" cy="54" r="4.5" fill="currentColor"/>`,
  // Trois horizons : le soleil du désert sur les dunes.
  'mirage-track-tour': `
    <circle cx="32" cy="16" r="10" fill="currentColor"/>
    <path d="M32 2v4M46 8l-3 3M18 8l3 3" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M4 52c8-14 15-17 21-9 4 5 9 5 13-1 6-10 14-9 22 4v8H4z" fill="currentColor" opacity=".9"/>`,
  // Mains de cristal : trois cristaux solaires.
  'mirage-crystal-hands': `
    <path d="M32 5l10 15-10 39L22 20z" fill="currentColor"/>
    <path d="M13 21l7 10-7 22-7-22z" fill="currentColor" opacity=".8"/>
    <path d="M51 21l7 10-7 22-7-22z" fill="currentColor" opacity=".8"/>`,
  // Mille éclats : l'étoile du score, deux étincelles autour.
  'mirage-score-1000': `
    ${STAR(32, 30, 21)}
    <path d="M9 12l2.6 6.4L18 21l-6.4 2.6L9 30l-2.6-6.4L0 21l6.4-2.6z" transform="translate(3 0)" fill="currentColor" opacity=".85"/>
    <path d="M52 40l2.2 5.4 5.4 2.2-5.4 2.2-2.2 5.4-2.2-5.4-5.4-2.2 5.4-2.2z" fill="currentColor" opacity=".85"/>`,
  // Premier trophée : la coupe de la première victoire.
  'mirage-cup-first': CUP,
  // Cinq victoires : les deux lances croisées du duel.
  'mirage-duel-wins': `
    <path d="M12 52L46 12" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    <path d="M52 52L18 12" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    <path d="M40 8l10 2-4 9z" fill="currentColor"/>
    <path d="M24 8L14 10l4 9z" fill="currentColor"/>
    <circle cx="32" cy="32" r="6" fill="currentColor"/>`,
  // Tempête d'or : trois bonds de score, l'étoile au sommet.
  'mirage-score-3000': `
    ${STAR(32, 17, 13)}
    <path d="M14 34l18-9 18 9" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 46l18-9 18 9" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <path d="M14 58l18-9 18 9" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`,
  // Carte complète : la boussole des dix terrains.
  'mirage-all-tracks': `
    <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="4" opacity=".7"/>
    <polygon points="32,8 38,26 56,32 38,38 32,56 26,38 8,32 26,26" fill="currentColor"/>
    <circle cx="32" cy="32" r="4" fill="#2a1246"/>`,
  // Vitrine complète : les quatre coupes sur leur étagère.
  'mirage-cup-collection': `
    ${CUP_SMALL(6, 16)}
    ${CUP_SMALL(22, 10)}
    ${CUP_SMALL(38, 16)}
    <rect x="6" y="48" width="52" height="6" rx="3" fill="currentColor"/>
    <rect x="10" y="54" width="6" height="6" rx="2" fill="currentColor" opacity=".7"/>
    <rect x="48" y="54" width="6" height="6" rx="2" fill="currentColor" opacity=".7"/>`,

  /* ---------------------------- Vice City Rush ---------------------------- */
  // Premier départ : le volant.
  'vice-first-race': `
    <circle cx="32" cy="32" r="23" fill="none" stroke="currentColor" stroke-width="6"/>
    <circle cx="32" cy="32" r="7" fill="currentColor"/>
    <path d="M32 25V11M25 36L12 45M39 36l13 9" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>`,
  // Chapitre un : le clap du mode Histoire.
  'vice-story-chapter': `
    <path d="M8 22h48l-4-12H12z" fill="currentColor"/>
    <path d="M18 12l4 10M30 12l4 10M42 12l4 10" stroke="#2a1152" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="8" y="26" width="48" height="28" rx="4" fill="currentColor"/>
    <rect x="16" y="34" width="32" height="4" rx="2" fill="#2a1152" opacity=".55"/>
    <rect x="16" y="43" width="20" height="4" rx="2" fill="#2a1152" opacity=".55"/>`,
  // Première place : le drapeau à damier.
  'vice-podium': `
    <rect x="10" y="8" width="6" height="50" rx="3" fill="currentColor"/>
    <rect x="16" y="10" width="40" height="28" fill="currentColor" opacity=".25"/>
    <g fill="currentColor">
      <rect x="16" y="10" width="10" height="9"/><rect x="36" y="10" width="10" height="9"/>
      <rect x="26" y="19" width="10" height="9"/><rect x="46" y="19" width="10" height="9"/>
      <rect x="16" y="28" width="10" height="10"/><rect x="36" y="28" width="10" height="10"/>
      <rect x="26" y="10" width="10" height="9" opacity=".55"/><rect x="46" y="10" width="10" height="9" opacity=".55"/>
      <rect x="16" y="19" width="10" height="9" opacity=".55"/><rect x="36" y="19" width="10" height="9" opacity=".55"/>
      <rect x="26" y="28" width="10" height="10" opacity=".55"/><rect x="46" y="28" width="10" height="10" opacity=".55"/>
    </g>`,
  // Trois styles : la route à trois voies (circuit, sprint, poursuite).
  'vice-modes': `
    <path d="M14 58L26 8h12l12 50z" fill="currentColor" opacity=".28"/>
    <path d="M14 58L26 8M50 58L38 8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 56l3-12M33 36l3-12" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    <path d="M36 56l-3-12M31 36l-3-12" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".9"/>`,
  // Butin de rue : la pile de billets.
  'vice-score-1500': `
    <rect x="6" y="40" width="52" height="14" rx="4" fill="currentColor"/>
    <rect x="10" y="26" width="44" height="14" rx="4" fill="currentColor" opacity=".85"/>
    <rect x="14" y="12" width="36" height="14" rx="4" fill="currentColor" opacity=".7"/>
    <circle cx="32" cy="47" r="4.5" fill="#2a1152" opacity=".6"/>
    <circle cx="32" cy="33" r="4" fill="#2a1152" opacity=".5"/>`,
  // Tour du monde : la skyline des cinq villes.
  'vice-city-tour': `
    <g fill="currentColor">
      <rect x="6" y="30" width="10" height="28" rx="1.5"/>
      <rect x="18" y="18" width="9" height="40" rx="1.5"/>
      <rect x="29" y="8" width="10" height="50" rx="1.5"/>
      <rect x="41" y="24" width="8" height="34" rx="1.5"/>
      <rect x="51" y="34" width="8" height="24" rx="1.5"/>
    </g>
    <g fill="#2a1152" opacity=".55">
      <rect x="31" y="14" width="6" height="4"/><rect x="31" y="24" width="6" height="4"/>
      <rect x="31" y="34" width="6" height="4"/><rect x="20" y="26" width="5" height="4"/>
      <rect x="20" y="38" width="5" height="4"/><rect x="43" y="32" width="4" height="4"/>
      <rect x="8" y="38" width="6" height="4"/>
    </g>
    <circle cx="34" cy="5" r="3" fill="currentColor"/>`,
  // Coffre plein : les lingots d'or.
  'vice-score-4000': `
    <path d="M14 34h36l6 16H8z" fill="currentColor"/>
    <path d="M22 14h20l5 14H17z" fill="currentColor" opacity=".8"/>
    <path d="M18 38h28" stroke="#2a1152" stroke-width="3" opacity=".45" stroke-linecap="round"/>
    <path d="M52 8l2.4 5.6L60 16l-5.6 2.4L52 24l-2.4-5.6L44 16l5.6-2.4z" fill="currentColor"/>`,
  // Fin de l'histoire : la couronne de Nico.
  'vice-story-hero': `
    <path d="M8 46L12 18l12 12 8-16 8 16 12-12 4 28z" fill="currentColor"/>
    <rect x="10" y="48" width="44" height="8" rx="4" fill="currentColor" opacity=".8"/>
    <circle cx="12" cy="16" r="4" fill="currentColor"/>
    <circle cx="32" cy="12" r="4" fill="currentColor"/>
    <circle cx="52" cy="16" r="4" fill="currentColor"/>`,
  // Grand chelem : la couronne de laurier, une victoire par ville.
  'vice-grand-slam': `
    <path d="M20 54A24 24 0 0 1 14 20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M44 54a24 24 0 0 0 6-34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 26l-7-3 5 8zM14 38l-8 1 6 6zM50 26l7-3-5 8zM50 38l8 1-6 6z" fill="currentColor"/>
    ${STAR(32, 30, 15)}`,
};

/* ------------------------------------------------------------------ */
/* Composition du médaillon                                            */
/* ------------------------------------------------------------------ */

/** Identifiant de gradient unique par fichier (plusieurs médaillons peuvent
    coexister dans une même page sans collision d'`id`). */
function medalSvg({ id, group, rarity }) {
  const palette = PALETTES[group] || PALETTES.mirage;
  const metal = METALS[rarity] || METALS.bronze;
  const emblem = EMBLEMS[id];
  if (!emblem) throw new Error(`Aucun emblème dessiné pour le trophée « ${id} » (scripts/trophy-icons.mjs).`);
  const uid = id.replace(/[^a-z0-9]/gi, '-');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Trophée ${id}">
  <defs>
    <linearGradient id="${uid}-metal" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="${metal[0]}"/>
      <stop offset="0.45" stop-color="${metal[1]}"/>
      <stop offset="1" stop-color="${metal[2]}"/>
    </linearGradient>
    <linearGradient id="${uid}-face" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${palette.face[0]}"/>
      <stop offset="0.55" stop-color="${palette.face[1]}"/>
      <stop offset="1" stop-color="${palette.face[2]}"/>
    </linearGradient>
    <radialGradient id="${uid}-glow" cx="0.5" cy="0.62" r="0.55">
      <stop offset="0" stop-color="${palette.glow}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uid}-gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="${uid}-clip"><circle cx="128" cy="128" r="102"/></clipPath>
  </defs>

  <!-- Anneau de métal : c'est lui qui porte le grade du trophée. -->
  <circle cx="128" cy="128" r="122" fill="url(#${uid}-metal)"/>
  <circle cx="128" cy="128" r="122" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3"/>
  <circle cx="128" cy="128" r="113" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
  <circle cx="128" cy="128" r="112" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="6" stroke-dasharray="2 9" stroke-linecap="round"/>

  <!-- Cadran aux couleurs du jeu, halo derrière l'emblème. -->
  <circle cx="128" cy="128" r="102" fill="url(#${uid}-face)"/>
  <circle cx="128" cy="128" r="102" fill="url(#${uid}-glow)"/>
  <circle cx="128" cy="128" r="102" fill="none" stroke="${palette.rim}" stroke-width="3" opacity=".55"/>

  <g clip-path="url(#${uid}-clip)">
    <!-- Emblème du trophée (boîte 64 × 64 agrandie et centrée). -->
    <g transform="translate(128 128) scale(2.05) translate(-32 -32)" color="${palette.emblem}">
      <g transform="translate(1.6 2.4)" opacity=".35" color="#000000">${emblem}</g>
      <g>${emblem}</g>
    </g>
    <!-- Verre : reflet en haut, ombre portée en bas. -->
    <ellipse cx="128" cy="66" rx="96" ry="58" fill="url(#${uid}-gloss)"/>
    <ellipse cx="128" cy="216" rx="104" ry="52" fill="#000000" opacity=".22"/>
  </g>
</svg>
`;
}

/* ------------------------------------------------------------------ */

const gameAchievements = ACHIEVEMENTS.filter((entry) => GAME_GROUPS.includes(entry.group));
const missingEmblem = gameAchievements.filter((entry) => !EMBLEMS[entry.id]);
if (missingEmblem.length) {
  console.error(`Emblèmes manquants : ${missingEmblem.map((entry) => entry.id).join(', ')}`);
  process.exit(1);
}
const unusedEmblem = Object.keys(EMBLEMS).filter((id) => !gameAchievements.some((entry) => entry.id === id));
if (unusedEmblem.length) {
  console.error(`Emblèmes dessinés pour aucun succès du catalogue : ${unusedEmblem.join(', ')}`);
  process.exit(1);
}

const checkOnly = process.argv.includes('--check');
mkdirSync(outDir, { recursive: true });

let written = 0;
let unchanged = 0;
for (const entry of gameAchievements) {
  const file = path.join(outDir, path.basename(entry.icon));
  const svg = medalSvg(entry);
  if (!path.basename(entry.icon).endsWith('.svg')) {
    console.error(`Le trophée « ${entry.id} » n'attend pas un .svg (${entry.icon}) : généré quand même, à corriger dans le catalogue.`);
  }
  let previous = null;
  try { previous = readFileSync(file, 'utf8'); } catch { /* première génération */ }
  if (previous === svg) { unchanged += 1; continue; }
  if (checkOnly) {
    console.log(`  à régénérer : ${path.relative(root, file)}`);
    written += 1;
    continue;
  }
  writeFileSync(file, svg, 'utf8');
  written += 1;
}

if (checkOnly) {
  console.log(written === 0
    ? `OK — ${gameAchievements.length} médaillons de jeu à jour.`
    : `${written} médaillon(s) à régénérer (node scripts/trophy-icons.mjs).`);
  if (written > 0) process.exitCode = 1;
} else {
  console.log(`${written} médaillon(s) écrit(s), ${unchanged} déjà à jour — ${outDir}`);
  const stray = readdirSync(outDir).filter((name) => name.endsWith('.svg'));
  console.log(`SVG livrés dans public/icons/achievements : ${stray.length}`);
}
