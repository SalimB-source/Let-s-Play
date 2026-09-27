/**
 * Contrôle des gros titres — `npm run check:headlines`.
 *
 * Règle éditoriale : un gros titre du site (h1 de page/article/dossier, h2 de
 * carte ou de section) tient sur trois lignes, jamais plus. Ce script rend
 * toutes les routes (scripts/headlines-check.jsx, via `vite build --ssr`),
 * récupère chaque h1/h2/h3 avec sa chaîne de conteneurs, puis calcule le nombre
 * de lignes que le navigateur affichera à seize largeurs de fenêtre.
 *
 * Le calcul est fait sans navigateur : les largeurs d'avance d'Orbitron
 * (poids 700 et 800, corps latin) sont figées ci-dessous, et chaque titre est
 * coupé comme un navigateur — au mot, sans césure. Les largeurs de colonne et
 * les corps de police sont ceux des feuilles de style, contexte par contexte ;
 * quand une feuille change, il suffit de mettre à jour le contexte concerné.
 *
 * Exceptions assumées : les étiquettes de sorties du calendrier (des titres de
 * jeux, souvent en anglais, qu'on ne réécrit pas) et les questions de quizz,
 * qui doivent rester lisibles en entier.
 *
 * Les métriques viennent de @fontsource/orbitron (fichiers statiques
 * orbitron-latin-<poids>-normal.woff) ; pour les régénérer :
 *   node -e "…fontkit.openSync(...).layout(caractère).advanceWidth…"
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'headlines-check');

// ---------------------------------------------------------------- métriques
// Largeurs d'avance Orbitron, en unités de 1000 par cadratin (unitsPerEm).
const metrics = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'orbitron-advances.json'), 'utf8'));
const ADVANCES = metrics.weights;

function textWidth(text, size, weight, lsEm = 0) {
  const table = ADVANCES[weight >= 800 ? '800' : '700'];
  let width = 0;
  for (const char of text) {
    const advance = table[char] ?? table.M;
    width += (advance / 1000) * size + lsEm * size;
  }
  return width;
}

/** Nombre de lignes d'un texte, coupé au mot comme le fait un navigateur. */
function layoutLines(text, maxWidth, size, weight, lsEm = 0) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let lines = 1;
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate, size, weight, lsEm) > maxWidth) {
      lines += 1;
      current = word;
    } else {
      current = candidate;
    }
  }
  return lines;
}

const clamp = (min, value, max) => Math.min(Math.max(value, min), max);
const wrapOf = (vw) => (vw > 800 ? Math.min(1240, vw - 56) : vw - 36);

// Corpus des h2 de section des dossiers : clamp(34px,4.2vw,58px), resserré
// entre 801 et 1150px (sidebar de 310px) et à 30px sous 450px.
const dossierSize = (vw) => {
  if (vw <= 450) return 30;
  if (vw > 800 && vw <= 1150) return clamp(30, vw * 0.034, 40);
  return clamp(34, vw * 0.042, 58);
};

// ---------------------------------------------------------------- contextes
// Chaque contexte décrit la colonne et le corps de police d'un titre, d'après
// les feuilles de style. `split: true` = le titre contient un <br> (deux blocs).
const CONTEXTS = {
  // .hero h1 — accueil
  hero: (vw) => ({
    width: wrapOf(vw),
    size: vw > 800 ? clamp(46, vw * 0.084, 110) : clamp(36, vw * 0.096, 52),
    ls: 0.005, weight: 800, split: true,
  }),
  // .page-hero h1 — colonne 1.1fr de « 1.1fr .9fr » (gap 48), 1 colonne ≤800px
  pageHero: (vw) => ({
    width: vw > 800 ? (wrapOf(vw) - 48) * (1.1 / 2) : wrapOf(vw),
    size: clamp(42, vw * 0.07, 84), ls: 0.01, weight: 800, split: true,
  }),
  // .page-hero h1 pleine largeur (titre sans illustration)
  pageHeroFull: (vw) => ({
    width: wrapOf(vw), size: clamp(42, vw * 0.07, 84), ls: 0.01, weight: 800, split: true,
  }),
  // 404
  notFound: (vw) => ({
    width: wrapOf(vw), size: clamp(48, vw * 0.08, 96), ls: 0, weight: 800, split: true,
  }),
  // .article-heading h1 — 1.05fr de « 1.05fr .95fr » (gap 38), 1 colonne ≤800px
  article: (vw) => ({
    width: vw > 800 ? (wrapOf(vw) - 38) * (1.05 / 2) : wrapOf(vw),
    size: vw > 800 ? clamp(24, vw * 0.028, 38) : clamp(24, vw * 0.07, 32),
    ls: 0.015, weight: 800, split: true,
  }),
  // .dossier-hero h1
  dossier: (vw) => ({
    width: wrapOf(vw),
    size: vw > 800 ? clamp(48, vw * 0.076, 100) : clamp(44, vw * 0.13, 72),
    ls: 0.01, weight: 800, split: true,
  }),
  // .search-hero h1 — clamp(42px,7vw,88px), resserré sous 430px
  searchHero: (vw) => ({
    width: wrapOf(vw),
    size: vw > 430 ? clamp(42, vw * 0.07, 88) : clamp(34, vw * 0.096, 42),
    ls: 0.01, weight: 800, split: true,
  }),
  // .quiz-header h1 — clamp(34px,5vw,58px), resserré sous 430px
  quizHero: (vw) => ({
    width: wrapOf(vw),
    size: vw > 430 ? clamp(34, vw * 0.05, 58) : clamp(28, vw * 0.08, 34),
    ls: 0.02, weight: 800, split: true,
  }),
  // .quiz-player-intro h1 — panneau max-width 860px, padding 30
  quizIntro: (vw) => ({
    width: Math.min(860, wrapOf(vw)) - 60, size: clamp(26, vw * 0.04, 42),
    ls: 0, weight: 800, split: true,
  }),
  // .auth-panel h1
  authHero: (vw) => ({
    width: Math.min(620, wrapOf(vw)), size: clamp(28, vw * 0.06, 48),
    ls: 0, weight: 800, split: true,
  }),
  // .news-carousel-copy h2 — carte de la grille Actus
  newsCard: (vw) => {
    const wrap = wrapOf(vw);
    if (vw >= 1201) {
      const card = (wrap - 16 * 4) / 5;
      return { width: card - 28, size: clamp(15, vw * 0.0115, 18), ls: 0, weight: 700 };
    }
    const cols = vw > 1100 ? 4 : vw > 800 ? 3 : 2;
    const gap = vw <= 650 ? 12 : 22;
    const pad = vw <= 650 ? 10 : clamp(16, vw * 0.02, 26);
    return {
      width: (wrap - gap * (cols - 1)) / cols - pad * 2,
      size: vw <= 650 ? clamp(16, vw * 0.042, 18) : clamp(18, vw * 0.016, 22),
      ls: 0.01, weight: 700,
    };
  },
  // .news-carousel.is-grid .news-today .daily-news-copy h2 — carte « à la une »
  newsToday: (vw) => {
    const wrap = wrapOf(vw);
    if (vw >= 1201) {
      const card = (wrap - 16 * 4) / 5;
      return { width: card * 2 + 16 - 40, size: clamp(16, vw * 0.012, 20), ls: 0.01, weight: 800 };
    }
    if (vw <= 650) return { width: wrap - 28, size: clamp(20, vw * 0.054, 24), ls: 0.01, weight: 800 };
    if (vw <= 800) return { width: wrap - clamp(20, vw * 0.024, 32) * 2, size: clamp(20, vw * 0.02, 28), ls: 0.01, weight: 800 };
    const cols = vw > 1100 ? 4 : 3;
    const card = (wrap - 22 * (cols - 1)) / cols;
    const pad = clamp(20, vw * 0.024, 32);
    return { width: card * 2 + 22 - pad * 2, size: clamp(20, vw * 0.02, 28), ls: 0.01, weight: 800 };
  },
  // Têtes de section (.featured-dossiers-head, .latest-tests-head, .reels-head,
  // .monthly-releases-head…) : le h2 occupe toute la largeur du wrap.
  sectionHead: (vw) => ({
    width: wrapOf(vw),
    size: vw > 450 ? clamp(38, vw * 0.05, 64) : clamp(30, vw * 0.084, 38),
    ls: 0.005, weight: 800, split: true,
  }),
  // .live-head h2 — aside à droite sur desktop, pleine largeur ≤800px
  liveHead: (vw) => ({
    width: vw > 800 ? wrapOf(vw) - 330 : wrapOf(vw),
    size: vw > 450 ? clamp(38, vw * 0.05, 64) : clamp(30, vw * 0.084, 38),
    ls: 0.005, weight: 800, split: true,
  }),
  // .monthly-releases-head h2 — flèche à droite, colonne ≤650px
  monthlyHead: (vw) => ({
    width: vw > 650 ? wrapOf(vw) - 160 : wrapOf(vw),
    size: vw > 650 ? clamp(34, vw * 0.05, 66) : clamp(28, vw * 0.074, 34),
    ls: 0, weight: 800, split: true,
  }),
  // .comments h2 — 1re colonne du panneau « 1fr 1.05fr » (gap 48, padding 38)
  commentsHead: (vw) => ({
    width: vw > 800 ? (wrapOf(vw) - 48) * (1 / 2.05) - 38 : wrapOf(vw) - 48,
    size: vw > 800 ? clamp(30, vw * 0.04, 48) : clamp(28, vw * 0.036, 46),
    ls: 0, weight: 800, split: true,
  }),
  // .article-engagement-heading h2 — panneau 760/900px, padding variable
  engagementHead: (vw) => ({
    width: Math.min(wrapOf(vw), vw > 1100 ? 900 : 760) - (vw > 1100 ? 84 : vw > 650 ? 68 : 32),
    size: clamp(25, vw * 0.032, 42), ls: 0, weight: 800, split: true,
  }),
  // .cta h2 — colonne (bouton à droite) puis colonne pleine ≤800px
  ctaHead: (vw) => ({
    width: vw > 800 ? wrapOf(vw) - 348 : wrapOf(vw) - 52,
    size: vw > 430 ? clamp(36, vw * 0.05, 58) : clamp(28, vw * 0.08, 36),
    ls: 0.005, weight: 800, split: true,
  }),
  // .manifesto-h2 — 1.05fr de « 1.05fr 1fr » (gap 9%), 1 colonne ≤800px
  manifestoHead: (vw) => ({
    width: vw > 800 ? wrapOf(vw) * 0.91 * (1.05 / 2.05) : wrapOf(vw),
    size: clamp(40, vw * 0.052, 68), ls: 0.005, weight: 800, split: true,
  }),
  // .partners-head h2 — 1.05fr de « 1.05fr .95fr » (gap 48), 1 colonne ≤720px
  partnersHead: (vw) => ({
    width: vw > 720 ? (wrapOf(vw) - 48) * 0.525 : wrapOf(vw),
    size: vw > 720 ? clamp(34, vw * 0.046, 58) : clamp(30, vw * 0.09, 40),
    ls: 0, weight: 800, split: true,
  }),
  // .quiz-category-heading h2 — pleine largeur
  quizCategoryHead: (vw) => ({
    width: wrapOf(vw), size: clamp(24, vw * 0.034, 38), ls: 0.015, weight: 800, split: true,
  }),
  // .dossier-feature-card-copy h2 — 1fr de « 1fr .8fr » (gap 40, padding 34)
  dossierFeature: (vw) => {
    const inner = vw > 800 ? wrapOf(vw) - 68 : wrapOf(vw) - 52;
    return {
      width: vw > 800 ? (inner - 40) / 1.8 : inner,
      size: clamp(34, vw * 0.045, 58), ls: 0, weight: 800, split: true,
    };
  },
  // Sections de dossier : colonne de lecture = wrap - 380 (aside 310 + gap 70)
  dossierSectionAlt: (vw) => {
    const col = vw > 800 ? wrapOf(vw) - 380 : wrapOf(vw);
    return {
      width: vw > 800 ? (col - 60) * 0.625 : col,
      size: dossierSize(vw), ls: 0, weight: 800, split: true,
    };
  },
  dossierTake: (vw) => ({
    width: vw > 800 ? (wrapOf(vw) - 190) / 2 : wrapOf(vw) - 52,
    size: dossierSize(vw), ls: 0, weight: 800, split: true,
  }),
  dossierNext: (vw) => ({
    width: vw > 800 ? wrapOf(vw) - 210 : wrapOf(vw),
    size: dossierSize(vw), ls: 0, weight: 800, split: true,
  }),
  dossierDark: (vw) => ({
    width: vw > 800 ? wrapOf(vw) - 380 - 120 : wrapOf(vw) - 52,
    size: dossierSize(vw), ls: 0, weight: 800, split: true,
  }),
  // h3 de carte « derniers tests » — 17px (15px ≤800px), 4 puis 2 colonnes
  latestCard: (vw) => {
    const cols = vw > 800 ? 4 : 2;
    const gap = vw > 800 ? 22 : 14;
    return {
      width: (wrapOf(vw) - gap * (cols - 1)) / cols,
      size: vw > 800 ? 17 : 15, ls: 0.01, weight: 700,
    };
  },
  // h3 de carte quizz — clamp(15px,.4vw+10px,17px)
  quizCard: (vw) => {
    const cols = vw >= 1200 ? 4 : vw > 900 ? 3 : vw > 640 ? 2 : 1;
    return {
      width: (wrapOf(vw) - 18 * (cols - 1)) / cols - 4,
      size: vw > 640 ? clamp(15, vw * 0.004 + 10, 17) : 13,
      ls: 0.01, weight: 700,
    };
  },
  // .featured-dossier-copy h3 — 2 colonnes (gap 40) puis 1
  featuredDossierH3: (vw) => ({
    width: (wrapOf(vw) - (vw > 800 ? 40 : 0)) / (vw > 800 ? 2 : 1),
    size: clamp(26, vw * 0.026, 36), ls: 0.005, weight: 800, split: true,
  }),
};

/** Chaîne de conteneurs du titre → contexte de mesure. */
function contextFor(row) {
  const chain = row.chain || '';
  if (row.tag === 'h1') {
    if (/section\.hero\b/.test(chain)) return 'hero';
    if (/article-heading/.test(chain)) return 'article';
    if (/dossier-hero/.test(chain)) return 'dossier';
    if (/search-hero/.test(chain)) return 'searchHero';
    if (/quiz-header/.test(chain)) return 'quizHero';
    if (/quiz-player-intro/.test(chain)) return 'quizIntro';
    if (/auth-panel/.test(chain)) return 'authHero';
    if (/page-hero/.test(chain)) return 'notFound';
    return null;
  }
  if (row.tag === 'h2') {
    if (/daily-news-copy/.test(chain)) return 'newsToday';
    if (/news-carousel-copy/.test(chain)) return 'newsCard';
    if (/comments-heading/.test(chain)) return 'commentsHead';
    if (/article-engagement-heading/.test(chain)) return 'engagementHead';
    if (/section\.cta/.test(chain)) return 'ctaHead';
    if (/dossier-section-grid|dossier-section-grid-reverse/.test(chain)) return 'dossierSectionAlt';
    if (/dossier-dark-panel/.test(chain)) return 'dossierDark';
    if (/dossier-take/.test(chain)) return 'dossierTake';
    if (/dossier-next/.test(chain)) return 'dossierNext';
    if (/dossier-feature-card-copy/.test(chain)) return 'dossierFeature';
    if (/manifesto-grid/.test(chain)) return 'manifestoHead';
    if (/partners-head/.test(chain)) return 'partnersHead';
    if (/quiz-category-heading/.test(chain)) return 'quizCategoryHead';
    if (/live-head/.test(chain)) return 'liveHead';
    if (/monthly-releases-head/.test(chain)) return 'monthlyHead';
    if (/featured-dossiers-head|latest-tests-head|reels-head/.test(chain)) return 'sectionHead';
    return null;
  }
  if (row.tag === 'h3') {
    if (/latest-test-card/.test(chain)) return 'latestCard';
    if (/quiz-card-copy/.test(chain)) return 'quizCard';
    if (/featured-dossier-copy/.test(chain)) return 'featuredDossierH3';
    return null;
  }
  return null;
}

const VIEWPORTS = [1440, 1366, 1280, 1201, 1100, 1024, 900, 800, 768, 700, 650, 600, 480, 430, 390, 360];

const decode = (html) => html
  .replace(/<br\s*\/?>/gi, '\u0000')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#x27;|&#39;/g, '’')
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&laquo;|&#171;/g, '«')
  .replace(/&raquo;|&#187;/g, '»')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/[ \t]+/g, ' ')
  .trim();

/** Parcourt le HTML rendu et renvoie chaque titre avec sa chaîne de conteneurs. */
function collectHeadings(html) {
  const rows = [];
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  let match;
  while ((match = tagRe.exec(html))) {
    const [, close, tag, attrs, selfClose] = match;
    if (close) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }
    const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
    if (/^h[1-3]$/.test(tag)) {
      const rest = html.slice(match.index);
      const closeIndex = rest.search(/<\/h[1-3]>/);
      const inner = closeIndex >= 0 ? rest.slice(match[0].length, closeIndex) : '';
      const text = decode(inner);
      if (text) {
        rows.push({
          tag,
          inner,
          chain: stack.filter((entry) => entry.cls).map((entry) => `${entry.tag}.${entry.cls}`).join(' > '),
        });
      }
    }
    if (selfClose || /^(br|img|meta|link|input|hr|source|path|circle|use|polygon|line|rect|ellipse|stop|iframe)$/i.test(tag)) continue;
    stack.push({ tag, cls });
  }
  return rows;
}

// ---------------------------------------------------------------- exécution
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/headlines-check.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' }
);

const { renderAll } = await import(path.join(outDir, 'headlines-check.js'));

let failures = 0;
const seen = new Map();
let measured = 0;

for (const page of renderAll()) {
  if (!page.ok) {
    console.log(`✗ ${page.path} — rendu impossible : ${page.error}`);
    failures += 1;
    continue;
  }
  for (const row of collectHeadings(page.html)) {
    const context = contextFor(row);
    if (!context) continue;
    measured += 1;
    const pieces = decode(row.inner).split('\u0000');
    let worst = { lines: 0, vw: 0 };
    let detail = [];
    for (const vw of VIEWPORTS) {
      const cfg = CONTEXTS[context](vw);
      const lines = cfg.split
        ? pieces.reduce((sum, piece) => sum + layoutLines(piece, cfg.width, cfg.size, cfg.weight, cfg.ls), 0)
        : layoutLines(pieces.join(' '), cfg.width, cfg.size, cfg.weight, cfg.ls);
      detail.push(`${vw}:${lines}`);
      if (lines > worst.lines) worst = { lines, vw };
    }
    if (worst.lines <= 3) continue;
    const key = `${context}|${pieces.join(' ')}`;
    const previous = seen.get(key);
    if (previous && previous.worst.lines >= worst.lines) continue;
    seen.set(key, { page: page.path, context, text: pieces.join(' ⏎ '), worst, detail });
  }
}

const violations = [...seen.values()].sort((a, b) => b.worst.lines - a.worst.lines);
console.log(`\nTitres mesurés : ${measured} — au-delà de trois lignes : ${violations.length}`);
for (const violation of violations) {
  console.log(`\n  ${violation.worst.lines} lignes (pire : ${violation.worst.vw}px) [${violation.context}] ${violation.page}`);
  console.log(`    ${violation.text}`);
  console.log(`    ${violation.detail.join(' ')}`);
}
if (violations.length) {
  failures += violations.length;
} else {
  console.log('Tous les gros titres tiennent sur trois lignes.');
}

process.exit(failures ? 1 : 0);
