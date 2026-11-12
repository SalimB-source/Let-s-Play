/**
 * Contrôle du menu mobile en thème clair — `npm run check:light-mobile-menu`.
 *
 * Pourquoi : en thème clair, le tiroir plein écran ouvert par le burger
 * (≤ 800 px) est une surface CLAIRE (`#f7f8fc`), alors que la barre qu'il
 * ouvre reste violette. Les règles « île violette » de theme.css (sections 6
 * et 6bis) emploient des sélecteurs descendants qui repassent aussi sur le
 * tiroir : une encre blanche y restait posée sur le panneau clair — libellés,
 * numéros, recherche et boutons tombaient à 1,1:1, le menu devenait illisible.
 * Rien ne le signalait : `check:light-news` n'applique pas les requêtes média
 * (il ne voit que le format bureau) et `check:phone-css` ne mesure que la
 * forme des media queries, pas les couleurs.
 *
 * Comment : le Layout est rendu en HTML (scripts/light-news-check.jsx,
 * compilé par `vite build --ssr`), les feuilles sont APLATIES pour un
 * téléphone 390 px portrait (les media queries « petit écran » sont
 * dépliées, les « bureau » écartées — voir l'évaluateur plus bas), puis le
 * tout est chargé dans jsdom avec `<html data-theme="light">`. Le tiroir est
 * ouvert, l'état connecté injecté (l'SSR est invité), et chaque texte du menu
 * est mesuré : contraste de l'encre avec le fond réellement peint (ancêtres
 * composités, alpha compris) — seuil AA 4,5:1.
 *
 * jsdom ne résout pas `var(--x)` : les jetons sont lus dans les blocs `:root`
 * des feuilles de style, puis substitués à la main (comme dans
 * scripts/light-news-check.mjs).
 *
 *   npm run check:light-mobile-menu
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'light-mobile-menu-check');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/light-news-check.jsx', '--outDir',
   path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const { renderPages } = await import(path.join(outDir, 'light-news-check.js'));

/* Ordre d'import de src/main.jsx : theme.css en dernier, il a le dernier mot. */
const CSS_ORDER = [
  'styles.css', 'motion.css', 'auth/auth.css', 'daily-news.css',
  'monthly-releases.css', 'partners.css', 'reels-carousel.css',
  'achievements/achievements.css', 'friends/friends.css', 'messages/messages.css',
  'messages/calls.css', 'social/social.css', 'typography.css', 'large-screen.css',
  'theme.css',
];

/* ---------------------------------------------------- requêtes média ----- */
/* Fenêtre de mise en page d'un téléphone : 390 px portrait. Les media queries
   sont évaluées en booléens — les conditions inconnues font échouer
   l'évaluation et la requête est écartée (conservateur : une règle manquée
   ressort en contraste douteux, une règle de bureau appliquée à tort aussi). */
const VIEWPORT = 390;
function evalQuery(query) {
  const q = query
    .replace(/max-device-width\s*:\s*(\d+)px/gi, (_, n) => (VIEWPORT <= Number(n) ? 'true' : 'false'))
    .replace(/min-device-width\s*:\s*(\d+)px/gi, (_, n) => (VIEWPORT >= Number(n) ? 'true' : 'false'))
    .replace(/max-width\s*:\s*(\d+)px/gi, (_, n) => (VIEWPORT <= Number(n) ? 'true' : 'false'))
    .replace(/min-width\s*:\s*(\d+)px/gi, (_, n) => (VIEWPORT >= Number(n) ? 'true' : 'false'))
    .replace(/hover\s*:\s*hover/gi, 'false')
    .replace(/hover\s*:\s*none/gi, 'true')
    .replace(/pointer\s*:\s*coarse/gi, 'true')
    .replace(/pointer\s*:\s*fine/gi, 'false')
    .replace(/orientation\s*:\s*portrait/gi, 'true')
    .replace(/orientation\s*:\s*landscape/gi, 'false')
    .replace(/prefers-reduced-motion\s*:\s*reduce/gi, 'false')
    .replace(/prefers-color-scheme\s*:\s*light/gi, 'true')
    .replace(/prefers-color-scheme\s*:\s*dark/gi, 'false')
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/,/g, '||');
  try {
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`return (${q});`)());
  } catch {
    return false;
  }
}

/* Aplatie le CSS : media query applicable → contenu déplié ; sinon → écarté.
   Les sélecteurs `:has()` sont retirés au passage : jsdom ne sait pas les
   évaluer et rendrait la règle entière non concordante. */
function flatten(source) {
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
  const dropped = [];
  out.walkAtRules('media', (atrule) => {
    if (!evalQuery(atrule.params)) dropped.push(atrule);
    else atrule.replaceWith(atrule.nodes);
  });
  dropped.forEach((r) => r.remove());
  return out.toResult().css;
}

const css = CSS_ORDER.map((file) => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n');
const sheet = flatten(css);

/* --------------------------------------------------------------- jetons --- */
const TOKENS = new Map();
for (const file of CSS_ORDER) {
  postcss.parse(fs.readFileSync(path.join(root, 'src', file), 'utf8'))
    .walkDecls((decl) => { if (decl.prop.startsWith('--')) TOKENS.set(decl.prop, decl.value.trim()); });
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
    if (parts.length >= 3) return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  m = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return {
      r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255,
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

/* Fond réellement peint : remonte la chaîne des ancêtres en compositant ;
   un dégradé est réduit à la moyenne de ses couleurs posées sur la page.
   `stopAt` interrompt la remontée avant un ancêtre qui n'est PAS le fond
   visuel de l'élément (empilement), `base` fournit alors le fond réel. */
const PAGE_BG = { r: 247, g: 248, b: 252, a: 1 };
function backgroundOf(win, el, { stopAt = null, base: fixedBase = null } = {}) {
  const layers = [];
  let node = el;
  while (node && node.nodeType === 1) {
    if (stopAt && node === stopAt) break;
    const cs = win.getComputedStyle(node);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      const colors = [...resolveVars(cs.backgroundImage).matchAll(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi)]
        .map((m) => parseColor(m[0])).filter(Boolean)
        .map((c) => over(c, fixedBase ?? PAGE_BG));
      if (colors.length) {
        const sum = colors.reduce((a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }), { r: 0, g: 0, b: 0 });
        return { r: sum.r / colors.length, g: sum.g / colors.length, b: sum.b / colors.length, a: 1 };
      }
    }
    const c = parseColor(cs.backgroundColor);
    if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    node = node.parentElement;
  }
  let base = fixedBase ?? PAGE_BG;
  for (let i = layers.length - 1; i >= 0; i -= 1) base = over(layers[i], base);
  return base;
}

/* ------------------------------------------------------------- contrôle --- */
const { html } = renderPages('fr')[0];
const dom = new JSDOM(
  `<!doctype html><html data-theme="light"><head><style>${sheet}</style></head><body>${html}</body></html>`,
  { pretendToBeVisual: true, url: 'http://localhost/' },
);
const { document, window } = dom.window;

const drawer = document.querySelector('.nav-links');
if (!drawer) {
  console.error('✗ .nav-links absent du rendu — le menu mobile a changé de structure.');
  process.exit(1);
}
drawer.classList.add('open');
/* Le burger porte l'état « ouvert » (il devient le bouton de fermeture). */
document.querySelector('.menu-button')?.classList.add('open');

/* État connecté : l'SSR est invité. Le profil gagne sa pastille de niveau,
   la grille d'actions son compte et son bouton de déconnexion. */
const profileLink = document.querySelector('.nav-profile-link');
if (profileLink) {
  profileLink.classList.add('is-player');
  profileLink.querySelector('.nav-link-arrow')?.remove();
  profileLink.querySelector('.nav-link-main')?.insertAdjacentHTML(
    'beforeend',
    '<span class="nav-profile-level"><small>NIV.</small><strong>9</strong></span>',
  );
}
document.querySelector('.nav-actions-grid')?.insertAdjacentHTML(
  'beforeend',
  '<a class="nav-account connected" href="#"><span class="nav-account-inner">'
  + '<span class="nav-account-name">SALIM</span>'
  + '<span class="nav-account-level"><small>NIV.</small><strong>9</strong></span>'
  + '</span></a><button class="nav-logout" type="button">Déconnexion</button>',
);

/* Chaque entrée : sélecteur → tous les éléments concordants sont mesurés. */
const PROBES = [
  ['.nav-primary .nav-link-label', 'libellé de section'],
  ['.nav-primary .nav-link-num', 'numéro de section'],
  ['.nav-primary .nav-link-desc', 'libellé secondaire'],
  ['.nav-primary .nav-link-arrow', 'flèche ↗'],
  ['.nav-submenu-link .nav-submenu-label', 'sous-rubrique Actus'],
  ['.mobile-menu-eyebrow span:nth-child(2)', 'bandeau haut'],
  ['.mobile-menu-footer-label', 'pied « FOLLOW »'],
  ['.mobile-menu-footer-bottom span', 'pied copyright'],
  ['.mobile-menu-socials a', 'pied réseaux'],
  ['.nav-search input', 'champ de recherche'],
  ['.nav-search-icon', 'loupe'],
  ['.nav-search-submit', 'valider la recherche'],
  ['.theme-toggle', 'bouton thème'],
  ['.lang-switch-button', 'bouton langue'],
  ['.nav-account.nav-login', 'bouton connexion'],
  ['.nav-account.nav-register', 'bouton inscription'],
  ['.nav-account.connected .nav-account-name', 'nom du compte'],
  ['.nav-account-level', 'pastille de niveau'],
  ['.nav-logout', 'bouton déconnexion'],
  ['.nav-profile-level small', 'profil — niveau (petit)'],
  ['.nav-profile-level strong', 'profil — niveau (chiffre)'],
  ['.menu-button.open', 'bouton fermer le menu'],
];

const FAIL = [];
let measured = 0;
for (const [selector, label] of PROBES) {
  const els = [...document.querySelectorAll(selector)];
  if (!els.length) {
    FAIL.push(`ABSENT  ${label}  (${selector})`);
    continue;
  }
  for (const el of els) {
    const ink = parseColor(window.getComputedStyle(el).color);
    /* Le burger (z-index 1002) est peint AU-DESSUS du tiroir (z-index 1000) :
       son fond visuel est le tiroir, pas l'île violette de ses ancêtres. */
    const overDrawer = selector === '.menu-button.open';
    const bg = overDrawer
      ? backgroundOf(window, el, {
        stopAt: document.querySelector('.nav'),
        base: backgroundOf(window, drawer),
      })
      : backgroundOf(window, el);
    if (!ink || ink.a === 0) {
      FAIL.push(`ENCRE INDÉFINIE  ${label}  (${selector})`);
      continue;
    }
    measured += 1;
    const ratio = contrast(over(ink, bg), bg);
    if (ratio < 4.5) {
      FAIL.push(`ENCRE ${ratio.toFixed(2)}:1  ${hex(ink)} sur ${hex(bg)}  ${label}  (${selector})`);
    }
  }
}

if (FAIL.length) {
  console.error(`\n${FAIL.length} problème(s) — menu mobile en thème clair :\n`);
  for (const f of FAIL) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`Menu mobile (thème clair) : ${measured} mesure(s) au-dessus du seuil AA 4,5:1.`);
console.log('OK — le tiroir plein écran reste lisible en thème clair.\n');
