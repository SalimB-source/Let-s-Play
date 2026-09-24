/**
 * Génère la section « encre claire → encre sombre » de src/theme.css.
 *
 * Environ 200 règles du site posent une encre claire (blanc, blanc bleuté,
 * jaune de marque) parce qu'elles ont été écrites pour un fond noir. En thème
 * clair, elles doivent basculer sur une encre sombre. Cette liste est
 * mécanique : elle évite d'en oublier, et se régénère quand le site évolue.
 *
 *   node scripts/theme-ink-sweep.mjs           # rapport
 *   node scripts/theme-ink-sweep.mjs --write   # réécrit le bloc dans theme.css
 *
 * Les contextes qui gardent leur encre claire (médias, bandeaux de marque,
 * pastilles colorées) sont exclus ici et traités à la main dans la section
 * « Médias » de theme.css, qui reste la référence pour ces cas.
 */
import postcss from 'postcss';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const THEME = path.join(SRC, 'theme.css');
const START = '/* #region encre-claire — généré par scripts/theme-ink-sweep.mjs */';
const END = '/* #endregion encre-claire */';

const write = process.argv.includes('--write');

/* Contextes qui conservent leur encre claire en thème clair :
   - médias : le texte est posé sur une image ou un lecteur vidéo ;
   - bandeaux de marque : le ticker et l'appel final deviennent des aplats
     saturés, l'encre claire y reste juste ;
   - pastilles colorées : fond de marque plein, l'encre claire est le sujet. */
/* NB : `\\.play\\b` vise le bouton lecture, pas `.player-*` (page profil) ;
   `\\.hero\\b` vise le héros photo, pas `.arena-hero` ni `.quiz-rank-hero-*`. */
const KEEP = new RegExp([
  '\\.hero\\b', 'video-modal', 'live-player', 'live-offline', 'page-hero-visual',
  'video-image', 'latest-test-image', 'news-carousel-image', 'reel-', 'insta-',
  'dossier-feature-card-media', 'article-cover', 'score-badge',
  'featured-dossier-badge', 'social-slide-overlay', 'video-thumb-fallback',
  'button-ghost', 'ticker', 'cta', 'partner-mark-badge', 'messages-bubble.is-mine',
  'delete-account-confirm', 'nav-register', 'filter.active', '\\.play\\b',
  'button-yellow', 'awaited-band',
  // pastilles de statut pleines : le fond saturé porte l'encre claire
  'sentiment', 'article-views-inline',
].join('|'));

/* Encres de statut, lisibles sur noir mais pas sur blanc (le rouge clair
   #ff8c9d tombe à 2,2:1). Seules les déclarations `color` sont concernées :
   les mêmes teintes servent de remplissage (pastilles, points de présence) et
   doivent y rester vives. */
const STATUS_INK = new Map([
  ['var(--danger)', /#(?:ff8c9d|fb7185|fca5a5|fecdd3|ffb4be|ff8f8f|ff6b6b|ff5c5c|ff4d5a|ff3d4f|f87171|dc2626)\b/i],
  ['var(--ok)', /#(?:10b981|34d399|16a34a)\b/i],
  ['#b45309', /#(?:ff8a4c|f97316|eab308)\b/i],
  ['#1d4ed8', /#(?:60a5fa|3b82f6)\b/i],
]);

const WHITE_HEX = /#(?:fff|ffffff)\b/;
const WHITE_RGBA = /rgba?\(\s*2[0-9]{2}\s*,\s*2[0-9]{2}\s*,\s*2[0-9]{2}\s*(?:,\s*([\d.]+)\s*)?\)/;
const YELLOW = /var\(--yellow\s*\)/;

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css') && e.name !== 'theme.css') files.push(p);
  }
})(SRC);

const ink = [];    // → var(--ink)
const muted = [];  // → var(--muted)   (encres atténuées : corps de texte)
const faded = [];  // → rgba(20,18,50,α) (motifs décoratifs très translucides)
const yellowInk = [];
const statusInk = [];

for (const file of files.sort()) {
  const root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  root.walkDecls((decl) => {
    if (decl.prop.toLowerCase() !== 'color') return;
    const sel = (decl.parent.selector || '').replace(/\s*\n\s*/g, ' ').trim();
    if (!sel || KEEP.test(sel)) return;
    const value = decl.value;
    if (value.includes('color-mix')) return;      // teintes d'accent : traitées à la main
    if (YELLOW.test(value)) { yellowInk.push(sel); return; }
    for (const [replacement, pattern] of STATUS_INK) {
      if (pattern.test(value)) { statusInk.push({ sel, replacement }); return; }
    }
    if (WHITE_HEX.test(value)) { ink.push(sel); return; }
    const m = value.match(WHITE_RGBA);
    if (!m) return;
    const a = m[1] === undefined ? 1 : Number(m[1]);
    if (a >= 0.9) ink.push(sel);
    else if (a >= 0.5) muted.push(sel);
    else faded.push({ sel, a });
  });
}

/* Une règle à plusieurs sélecteurs (`a, b`) donne une entrée par sélecteur :
   sinon seul le premier reçoit le préfixe `[data-theme='light']` et le second
   s'applique aussi au thème sombre. */
const split = (sel) => sel.split(/\s*,\s*/).filter(Boolean);
const uniq = (list) => [...new Set(list.flatMap(split))];
const group = (sel, value, comment) => {
  const lines = uniq(sel).map((s) => `  [data-theme='light'] ${s}`);
  if (!lines.length) return '';
  return `\n/* ${comment} */\n${lines.join(',\n')} {\n  color: ${value};\n}\n`;
};

const block =
  START +
  '\n' +
  group(ink, 'var(--ink)', 'Encres blanches littérales : supposent un fond sombre.') +
  group(muted, 'var(--muted)', 'Encres blanches atténuées : corps de texte et libellés.') +
  group(yellowInk, 'var(--yellow-ink)', 'Jaune de marque en texte : assombri pour rester lisible.') +
  [...new Set(statusInk.map((f) => f.replacement))]
    .map((replacement) => {
      const sels = statusInk.filter((f) => f.replacement === replacement).map((f) => f.sel);
      const lines = uniq(sels).map((x) => `  [data-theme='light'] ${x}`);
      return lines.join(',\n') + ` {\n  color: ${replacement};\n}\n`;
    })
    .join('') +
  (faded.length
    ? `\n/* Motifs décoratifs translucides (les seuls dont l'alpha est conservé). */\n` +
      uniq(faded.map((f) => `${f.sel}|${f.a}`))
        .map((k) => {
          const [s, a] = k.split('|');
          return `  [data-theme='light'] ${s}`;
        })
        .join(',\n') +
      ` {\n  color: rgba(20,18,50,.05);\n}\n`
    : '') +
  END;

console.log(`encre pleine : ${uniq(ink).length}`);
console.log(`encre atténuée : ${uniq(muted).length}`);
console.log(`jaune → encre jaune : ${uniq(yellowInk).length}`);
console.log(`encres de statut : ${statusInk.length}`);
console.log(`motifs translucides : ${faded.length}`);

if (write) {
  const css = fs.readFileSync(THEME, 'utf8');
  const from = css.indexOf(START);
  const to = css.indexOf(END);
  if (from < 0 || to < 0) {
    console.error(`Marqueurs absents de ${THEME}`);
    process.exit(1);
  }
  fs.writeFileSync(THEME, css.slice(0, from) + block + css.slice(to + END.length));
  console.log(`\n${THEME} réécrit.`);
}
