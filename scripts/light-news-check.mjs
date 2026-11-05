/**
 * Contrôle du thème clair sur les pages Actus — `npm run check:light-actus`.
 *
 * Pourquoi un script : le thème clair (src/theme.css) surcharge ~300 règles
 * écrites pour un fond noir. Quand une page évolue — ici le hub Actus et ses
 * deux flux, construits après la dernière passe — rien ne signale les oublis :
 * la page reste lisible en sombre et devient illisible en clair. Ce contrôle
 * rend l'oubli visible.
 *
 * Comment : les trois routes sont rendues en HTML (scripts/light-news-check.jsx,
 * compilé par `vite build --ssr`), le HTML est chargé dans jsdom avec les
 * feuilles de style du site dans l'ordre de src/main.jsx, et <html> porte
 * `data-theme='light'`. Chaque élément est ensuite mesuré :
 *
 *   1. ENCRE — contraste du texte avec le fond réellement peint (les
 *      `background` des ancêtres sont composités, alpha compris) ;
 *   2. SURFACE — une carte ou un panneau reste-t-il presque noir ;
 *   3. HALO — un `text-shadow` néon subsiste-t-il hors contexte média.
 *
 * Les zones posées SUR une photo (voile, pastilles vues/sentiment, flèche…)
 * sont exclues : elles restent sombres dans les deux thèmes — c'est la règle
 * n°2 de theme.css. Leur liste reprend celle du balayage d'encre
 * (scripts/theme-ink-sweep.mjs).
 *
 * jsdom ne résout pas `var(--x)` : les jetons sont lus dans les blocs `:root`
 * des feuilles de style, puis substitués à la main.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'light-news-check');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/light-news-check.jsx', '--outDir',
   path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const { renderPages } = await import(path.join(outDir, 'light-news-check.js'));

/* Ordre d'import de src/main.jsx : theme.css en dernier, il a le dernier mot. */
const CSS_ORDER = [
  'styles.css', 'profile-lists.css', 'news-article.css', 'auth/auth.css',
  'news-carousel.css', 'news-view-toggle.css', 'daily-news.css',
  'monthly-releases.css', 'partners.css', 'reels-carousel.css',
  'dossier-article.css', 'achievements/achievements.css', 'quizzes/quiz.css',
  'friends/friends.css', 'messages/messages.css', 'social/social.css',
  'typography.css', 'theme.css',
];
const css = CSS_ORDER
  .map((file) => fs.readFileSync(path.join(root, 'src', file), 'utf8'))
  .join('\n');

/* jsdom ne sait pas évaluer une liste de sélecteurs qui contient `:has()`, et
   rend alors la règle entière non concordante (elle est ignorée) — alors que
   le navigateur, lui, ne rejette que le sélecteur fautif. On normalise donc la
   CSS avant injection : une règle par sélecteur, `:has()` écarté. La cascade
   n'en change pas : l'ordre des règles et leur spécificité sont conservés. */
function normalizeCss(source) {
  const out = postcss.parse(source);
  out.walkRules((rule) => {
    const selectors = rule.selector
      .split(/\s*,\s*(?![^(]*\))/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((s) => !s.includes(':has('));
    if (selectors.length < 2 && selectors[0] === rule.selector.trim()) return;
    selectors.forEach((selector, index) => {
      const clone = index === 0 ? rule : rule.cloneAfter({ selector });
      if (index === 0) clone.selector = selector;
    });
    if (!selectors.length) rule.remove();
  });
  return out.toResult().css;
}
const sheet = normalizeCss(css);

/* --------------------------------------------------------------- jetons --- */
const TOKENS = new Map();
for (const file of CSS_ORDER) {
  const parsed = postcss.parse(fs.readFileSync(path.join(root, 'src', file), 'utf8'), { from: file });
  parsed.walkDecls((decl) => {
    if (decl.prop.startsWith('--')) TOKENS.set(decl.prop, decl.value.trim());
  });
}
function resolveVars(value, depth = 0) {
  if (!value || depth > 8) return value;
  return String(value).replace(
    /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+?))?\s*\)/g,
    (match, name, fallback) => {
      const next = TOKENS.get(name) ?? fallback;
      return next ? resolveVars(next, depth + 1) : match;
    },
  );
}

/* -------------------------------------------------------------- couleurs --- */
function parseColor(value) {
  if (!value) return null;
  const v = resolveVars(value).trim();
  if (v === 'transparent' || v === 'none' || v === '') return { r: 0, g: 0, b: 0, a: 0 };
  let m = /^rgba?\(([^)]+)\)$/i.exec(v);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (parts.length >= 3) {
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    }
  }
  m = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }
  return null;
}
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const hex = (c) => '#' + [c.r, c.g, c.b]
  .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/* Aplat de la pastille d'onglet actif, lu dans la feuille (voir paintedPill). */
const PILL_RULE = (() => {
  const parsed = postcss.parse(fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8'));
  let value = null;
  parsed.walkRules((rule) => {
    if (rule.selector.trim() === '.nav-pill-indicator') {
      rule.walkDecls(/^background(-color)?$/, (decl) => { value = decl.value.trim(); });
    }
  });
  return value;
})();

/* Couleur moyenne d'un dégradé : chaque arrêt est d'abord composé sur le fond
   de page, sinon un `rgba(124,58,237,.10)` compterait pour du violet plein. */
const PAGE_BG = { r: 247, g: 248, b: 252, a: 1 };
function gradientColor(value) {
  const colors = [...resolveVars(value).matchAll(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi)]
    .map((m) => parseColor(m[0]))
    .filter(Boolean)
    .map((c) => over(c, PAGE_BG));
  if (!colors.length) return null;
  const sum = colors.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  return { r: sum.r / colors.length, g: sum.g / colors.length, b: sum.b / colors.length, a: 1 };
}

/* ------------------------------------------------- contexte « sur photo » --- */
/* Même liste que le balayage d'encre, complétée pour la page Actus. */
const MEDIA = /hero|video|reel-|insta-|article-cover|news-carousel-image|news-hub-card-image|daily-news-image|page-hero-visual|score-badge|dossier-feature-card-media|image|thumb|overlay|ticker|cta|partners-marquee|logo|live-player|news-sentiment|news-views|news-feature-badge|news-hub-card-num/;
function isMedia(el) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (typeof node.className === 'string' && MEDIA.test(node.className)) return true;
  }
  return false;
}
const ownText = (el) => [...el.childNodes]
  .filter((n) => n.nodeType === 3)
  .map((n) => n.textContent.trim())
  .join(' ')
  .trim();

/* L'onglet actif de l'île est peint par un indicateur séparé
   (`.nav-pill-indicator`, jaune, en position absolue SOUS le lien — le lien
   lui-même garde `background:transparent`). Sans ça, le contrôle mesurait
   l'encre sombre sur le violet de l'île et signalait un faux défaut. */
function paintedPill(win, el) {
  const primary = el.closest('.nav-primary');
  const pill = primary?.querySelector('.nav-pill-indicator');
  if (!pill || !el.matches('.active')) return null;
  // En SSR la pastille démarre à `opacity:0` et jsdom n'évalue pas la requête
  // média qui l'affiche : on lit la règle de style, pas le rendu.
  const color = parseColor(PILL_RULE) || parseColor(win.getComputedStyle(pill).backgroundColor);
  return color && color.a > 0 ? color : null;
}

/* Fond réellement peint : on remonte la chaîne des ancêtres en compositant. */
function backgroundOf(win, el) {
  const layers = [];
  let node = el;
  while (node && node.nodeType === 1) {
    const cs = win.getComputedStyle(node);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      const c = gradientColor(cs.backgroundImage);
      if (c) return { color: c, from: 'dégradé' };
    }
    const c = parseColor(cs.backgroundColor);
    if (c && c.a > 0) {
      layers.push(c);
      if (c.a >= 1) break;
    }
    node = node.parentElement;
  }
  let base = PAGE_BG;
  for (let i = layers.length - 1; i >= 0; i -= 1) base = over(layers[i], base);
  return { color: base, from: 'aplat' };
}

/* Peint à l'écran ? Un enfant d'un panneau `display:none` n'est jamais rendu —
   jsdom n'applique pas les requêtes média, donc le tiroir mobile existe dans le
   DOM du format bureau sans jamais être visible. */
function isPainted(el, getStyle) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    const s = getStyle(node);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  }
  return true;
}

/* --------------------------------------------------------------- contrôle --- */
const FAIL = [];
const pages = renderPages('fr');

for (const { path: route, html } of pages) {
  const dom = new JSDOM(
    `<!doctype html><html data-theme="light"><head><style>${sheet}</style></head><body>${html}</body></html>`,
    { pretendToBeVisual: true },
  );
  const { document, getComputedStyle } = dom.window;
  // La barre de navigation est un <nav> frère de <main> : balayer `main` seul
  // laissait passer l'île violette du thème clair, où le sélecteur de langue
  // tombait à 1,5:1. On mesure les deux zones.
  const zones = [document.querySelector('.nav'), document.querySelector('main')].filter(Boolean);
  const seen = new Set();

  for (const el of zones.flatMap((zone) => [...zone.querySelectorAll('*')])) {
    const cs = getComputedStyle(el);
    // jsdom n'évalue pas les requêtes média : le tiroir mobile est rendu mais
    // son contenu n'est jamais peint en 1280px — et un lien caché n'a pas de
    // contraste à défendre. Le format téléphone est couvert par
    // `check:phone-css` et `check:phone-layout`.
    if (!isPainted(el, getComputedStyle)) continue;
    const label = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
    if (isMedia(el)) continue;

    // 1. encre
    const text = ownText(el);
    // Libellés réservés aux lecteurs d'écran : invisibles, aucun contraste à
    // défendre (et sur téléphone ils sont dépliés par une requête média que
    // jsdom n'évalue pas — le format mobile a ses propres contrôles).
    if (el.classList.contains('sr-only')) continue;
    const ink = parseColor(cs.color);
    if (text && ink && ink.a > 0) {
      const pill = paintedPill(dom.window, el.closest('.nav-primary a') || el);
      const bg = pill ? { color: pill, from: 'pastille active' } : backgroundOf(dom.window, el);
      const ratio = contrast(over(ink, bg.color), bg.color);
      if (ratio < 3) {
        const key = `ink|${route}|${label}|${hex(ink)}|${hex(bg.color)}`;
        if (!seen.has(key)) {
          seen.add(key);
          FAIL.push(`${route}  ENCRE ${ratio.toFixed(2)}:1  ${hex(ink)} sur ${hex(bg.color)}  ${label}  « ${text.slice(0, 40)} »`);
        }
      }
    }

    // 2. surface
    const ownBg = cs.backgroundImage && cs.backgroundImage !== 'none'
      ? gradientColor(cs.backgroundImage)
      : parseColor(cs.backgroundColor);
    if (ownBg && ownBg.a >= 0.5 && luminance(over(ownBg, PAGE_BG)) < 0.25) {
      const key = `bg|${route}|${label}`;
      if (!seen.has(key)) {
        seen.add(key);
        FAIL.push(`${route}  SURFACE SOMBRE ${hex(ownBg)}  ${label}`);
      }
    }

    // 3. halo néon
    const shadow = cs.textShadow;
    if (shadow && shadow !== 'none' && shadow !== 'rgba(0, 0, 0, 0)') {
      const key = `halo|${route}|${label}`;
      if (!seen.has(key)) {
        seen.add(key);
        FAIL.push(`${route}  HALO NÉON  text-shadow:${shadow}  ${label}`);
      }
    }
  }
}

// Contrôle ciblé du chrome de navigation : ce sont les commandes les plus
// consultées du site, et elles vivent sur un fond qui change avec le thème
// (verre sombre en sombre, violet de marque en clair). On exige le seuil AA
// (4,5:1) pour la langue, le thème et le menu — pas seulement « pas noir ».
{
  const { document, getComputedStyle } = new JSDOM(
    `<!doctype html><html data-theme="light"><head><style>${sheet}</style></head><body>${pages[0].html}</body></html>`,
    { pretendToBeVisual: true },
  ).window;
  const nav = document.querySelector('.nav');
  const island = parseColor(getComputedStyle(nav).backgroundColor) || PAGE_BG;
  for (const selector of ['.lang-switch-button', '.theme-toggle', '.menu-button']) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const cs = getComputedStyle(el);
    const ink = parseColor(cs.color);
    if (!ink || ink.a === 0) continue;
    const own = parseColor(cs.backgroundColor);
    const base = own && own.a > 0 ? over(own, island) : island;
    const ratio = contrast(over(ink, base), base);
    if (ratio < 4.5) {
      FAIL.push(`NAV ${selector}  ENCRE ${ratio.toFixed(2)}:1  ${hex(ink)} sur ${hex(base)} (île ${hex(island)})`);
    }
  }
}

if (FAIL.length) {
  console.log(`\nThème clair — pages Actus : ${FAIL.length} problème(s)\n`);
  for (const line of FAIL) console.log('  ' + line);
  console.log('');
  process.exit(1);
}
console.log(`\nThème clair — pages Actus : OK (${pages.map((p) => p.path).join(', ')})\n`);
