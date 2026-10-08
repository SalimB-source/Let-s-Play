/**
 * Balayage « encre du hub » pour Vice City Rush — aligne le reste du jeu sur le
 * hub de lancement (`vice-city-rush-menu.css`) sur quatre points mécaniques :
 *
 *   0. **la peau** : `vice-city-rush-hub-skin.css` est la couche de finition posée
 *      en dernier sur la console. Elle est retunée en même temps que le reste
 *      (traits de 5 px → un cheveu, ombres tricolores → projection franche,
 *      Impact → les polices du hub, couleurs comic → encres du hub) ; sa mise
 *      en page, elle, n'est pas touchée.
 *   1. **les angles** : le hub est taillé à l'équerre (2 px de rayon sur les
 *      seules pastilles, les panneaux n'ont pas d'arrondi). Le jeu, lui, vient
 *      d'une refonte « bento + glassmorphism » avec des rayons de 8 à 28 px.
 *      Tout rayon `>= 8px` tombe à `2px`, toute pilule (`>= 60px`, `999px`,
 *      `99px`) tombe à `4px`. Les disques (`50%`) et les petits rayons
 *      (`<= 6px`, déjà dans la langue du hub) sont conservés, ainsi
 *      que `inherit` et les `var(--cr-radius-*)`, réglés par les jetons.
 *   2. **le verre dépoli** : `backdrop-filter: blur(...)` n'existe pas dans le
 *      hub, qui pose des encres quasi pleines. Toutes les demandes de flou des
 *      feuilles du jeu passent à `none` (les fonds, eux, deviennent opaques via
 *      les jetons `--cr-panel*`).
 *   3. **les encres bleutées** : le hub est un noir d'imprimerie (`#07080d`),
 *      pas un bleu nuit. Les noirs bleutés et les vitres teintées les plus
 *      fréquents sont remappés sur l'échelle d'encre du hub.
 *
 * Le geste est volontairement mécanique et rejouable : après une semaine de
 * nouvelles règles de style, un `npm run theme:city-rush-ink` remet le jeu
 * d'aplomb sans toucher à la mise en page.
 *
 *   node scripts/vice-city-rush-ink-sweep.mjs           # rapport
 *   node scripts/vice-city-rush-ink-sweep.mjs --write   # réécrit les fichiers
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAMES = path.join(root, 'src', 'games');

// Le hub lui-même n'est pas balayé : c'est la référence.
const FILES = [
  'vice-city-rush.css',
  'vice-city-rush-cinematic.css',
  'vice-city-rush-hud.css',
  'vice-city-rush-hub-skin.css',
  'vice-city-rush-garage.css',
  'city-rush-story.css',
  'city-rush-story-scene.css',
  'city-rush-tournament.css',
  'city-rush-tutorial.css',
];

const write = process.argv.includes('--write');

/* ── La peau (vice-city-rush-hub-skin.css) ───────────────────────────────────
   Cette feuille est la couche de finition posée en dernier sur la console.
   Elle avait été dessinée « comic-book » : traits de 5 px, trames épaisses,
   ombres décalées de trois couleurs, Impact à tous les étages. Le balayage la
   ramène à la langue du hub — un trait, une encre, un jaune — sans toucher à
   sa mise en page (grilles, `grid-template-areas`, points de rupture), qui
   elle, est bonne et vérifiée par les fumées.
   ─────────────────────────────────────────────────────────────────────── */

/** Encres bleutées et couleurs de la peau comic → palette du hub. */
const HUB_HEX = new Map([
  ['#0d0620', '#07080d'],
  ['#0d0625', '#07080d'],
  ['#06021a', '#07080d'],
  ['#070418', '#07080d'],
  ['#0c0a24', '#0a0c12'],
  ['#130832', '#0b0d13'],
  ['#15103b', '#0a0c12'],
  ['#170a3d', '#10131a'],
  ['#1c0c3e', '#0b0d13'],
  ['#251050', '#10131a'],
  ['#1a0a38', '#0b0d13'],
  ['#1a0840', '#0d1017'],
  ['#120530', '#080a10'],
  ['#190b3a', '#0b0d13'],
  ['#1c1045', '#0b0d13'],
  ['#281454', '#0b0d13'],
  ['#10131f', '#0b0d13'],
  ['#0d1017', '#0b0d13'],
  ['#fffbea', '#f4f6fb'],
  ['#fff7dc', '#f4f6fb'],
  ['#fff8e6', '#f4f6fb'],
  ['#fff5d5', '#eef1f7'],
  ['#fff6d8', '#dfe6f2'],
  ['#d7cff0', '#c9d2e2'],
  ['#bbaae8', '#aeb7c8'],
  ['#ddd0ff', '#dfe6f2'],
  ['#cfc4f0', '#c9d2e2'],
  ['#ff36b8', '#ff5db8'],
  ['#ff24aa', '#ff5db8'],
  ['#30f5e4', '#8fd8ff'],
  ['#ffe130', '#ffd23e'],
  ['#ffd730', '#ffd23e'],
  ['#8cff30', '#8fd8ff'],
  ['#9b5cff', '#ff5db8'],
  ['#25420d', '#4d5566'],
]);

/** Trames et aplats saturés de la peau → teintes du hub. */
const HUB_RGB = [
  [/\brgba\(\s*255\s*,\s*36\s*,\s*170\b/g, 'rgba(255, 93, 184'],
  [/\brgba\(\s*255\s*,\s*57\s*,\s*177\b/g, 'rgba(255, 93, 184'],
  [/\brgba\(\s*255\s*,\s*225\s*,\s*48\b/g, 'rgba(255, 210, 62'],
  [/\brgba\(\s*255\s*,\s*228\s*,\s*65\b/g, 'rgba(255, 210, 62'],
  [/\brgba\(\s*255\s*,\s*215\s*,\s*48\b/g, 'rgba(255, 210, 62'],
  [/\brgba\(\s*255\s*,\s*246\s*,\s*198\b/g, 'rgba(255, 255, 255'],
  [/\brgba\(\s*30\s*,\s*235\s*,\s*220\b/g, 'rgba(143, 216, 255'],
  [/\brgba\(\s*140\s*,\s*70\s*,\s*255\b/g, 'rgba(255, 93, 184'],
  [/\brgba\(\s*69\s*,\s*243\s*,\s*226\b/g, 'rgba(143, 216, 255'],
  [/\brgba\(\s*12\s*,\s*5\s*,\s*40\b/g, 'rgba(7, 8, 13'],
  [/\brgba\(\s*16\s*,\s*6\s*,\s*44\b/g, 'rgba(9, 11, 17'],
  [/\brgba\(\s*10\s*,\s*4\s*,\s*36\b/g, 'rgba(7, 8, 13'],
  [/\brgba\(\s*8\s*,\s*2\s*,\s*32\b/g, 'rgba(5, 6, 10'],
  [/\brgba\(\s*5\s*,\s*3\s*,\s*22\b/g, 'rgba(4, 5, 9'],
  [/\brgba\(\s*4\s*,\s*2\s*,\s*18\b/g, 'rgba(4, 5, 9'],
];

const HUB_FONT = /Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif/g;

/**
 * Les violets de la peau comic tombent sur l'échelle d'encre du hub : un noir
 * d'imprimerie pour les fonds, un blanc papier pour les encres claires. La
 * lecture se fait sur la saturation et la luminance, pas sur une liste de
 * couleurs — la peau compte une soixantaine de violets et un dégradé de
 * lilas pour les textes, tous ramenés à quatre crans.
 */
function inkifyColor(hex) {
  const digits = hex.slice(1);
  if (digits.length !== 6) return null;
  const r = parseInt(digits.slice(0, 2), 16);
  const g = parseInt(digits.slice(2, 4), 16);
  const b = parseInt(digits.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const violet = b > g && r > g && max < 140 && max - min > 18;
  const lilac = min > 150 && b > g + 4;
  const cream = r > 236 && g > 220 && b < g && g - b > 8;
  if (violet) {
    if (max < 34) return '#080a10';
    if (max < 52) return '#0b0d13';
    if (max < 70) return '#10131a';
    return '#1a1e28';
  }
  if (lilac) return '#dfe6f2';
  if (cream) return '#f4f6fb';
  return null;
}

const PURPLE_RGB = [
  [/\brgba\(\s*30\s*,\s*12\s*,\s*76\b/g, 'rgba(11, 13, 19'],
  [/\brgba\(\s*12\s*,\s*6\s*,\s*38\b/g, 'rgba(8, 10, 16'],
  [/\brgba\(\s*8\s*,\s*4\s*,\s*30\b/g, 'rgba(8, 10, 16'],
  [/\brgba\(\s*6\s*,\s*3\s*,\s*22\b/g, 'rgba(4, 5, 9'],
  [/\brgba\(\s*20\s*,\s*8\s*,\s*54\b/g, 'rgba(11, 13, 19'],
  [/\brgba\(\s*16\s*,\s*6\s*,\s*44\b/g, 'rgba(9, 11, 17'],
];

/** Ombres empilées façon « encre de BD » (3 à 5 calques) → projection du hub. */
function retuneTextShadow(value) {
  const layers = value.split(',').length;
  if (layers < 3) return null;
  return '0 2px 0 #0a0c12, 0 0 18px rgba(0, 0, 0, 0.85)';
}

/**
 * Une ombre portée « sticker » (`A A 0 couleur`) devient la projection franche
 * du hub (`0 3px 0 #0a0c12`), éventuellement nappée du halo jaune de
 * l'entrée sélectionnée. Les anneaux (`0 0 0 Npx …`) sont effacés : le hub
 * cerise sa sélection avec des équerres, pas avec un liseré.
 */
function retuneShadow(value) {
  const rings = /inset\s+0\s+0\s+0\s+\d+px\s+var\(--cr-[a-z-]+\)\s*,?/g;
  let cleaned = value.replace(rings, '').trim();
  cleaned = cleaned.replace(/0\s+0\s+0\s+\d+px\s+var\(--cr-[a-z]+\)\s*,?/g, '');
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  if (!cleaned) return '0 3px 0 rgba(4, 5, 9, 0.72)';
  const offsets = cleaned.match(/(-?\d+px\s+){2,3}0\s+[^,]+/g);
  if (offsets && offsets.length === 1 && /^-?\d+px\s+-?\d+px\s+0\b/.test(cleaned.trim())) {
    return '0 3px 0 rgba(4, 5, 9, 0.72)';
  }
  if (offsets && offsets.length > 1) {
    return '0 3px 0 rgba(4, 5, 9, 0.72), 0 0 14px rgba(255, 210, 62, 0.28)';
  }
  return cleaned;
}

/** La peau, retunée : traits fins, une encre, polices du hub, ombres franches. */
/**
 * Les trames « papier journal » (points espacés de 9 à 17 px) deviennent le
 * grain de pellicule du hub : mêmes points, mais serrés à 3 px et en blanc
 * très faible, posés en `overlay` comme `.vcr-menu-grain`.
 */
function retuneTone(value) {
  if (!/radial-gradient\(\s*circle/.test(value)) return null;
  const next = value.replace(
    /radial-gradient\(\s*circle(?:[^()]|\([^()]*\))*\)[^,;]*/g,
    'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px) 0 0 / 3px 3px',
  );
  return next === value ? null : next;
}

/**
 * Une pastille de la barre ou d'un panneau, peinte d'une couleur saturée,
 * devient la puce de raccourci du hub : encre quasi pleine, filet d'un
 * cheveu, encre claire. Les états — survol, actif, sélectionné, « GO » —
 * gardent le jaune de cerise, qui est dans la langue du hub.
 */
const CHIP_STATES = /:hover|:active|:focus|is-on|is-active|is-selected|is-done|is-champion|is-win|start-button|next-race-button|card-action|fullscreen-button|sound-button|nav-button|close/;
function retuneChips(source) {
  let touched = 0;
  const next = source.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, body) => {
    const flat = selector.replace(/\s+/g, ' ');
    if (CHIP_STATES.test(flat)) return match;
    if (!/background:\s*var\(--cr-(yellow|lime|cyan|pink|violet)\)/.test(body)) return match;
    const tuned = body
      .replace(/background:\s*var\(--cr-(yellow|lime|cyan|pink|violet)\)(\s*!important)?/g, 'background: var(--cr-chip-bg)')
      .replace(/color:\s*var\(--cr-ink\)/g, 'color: var(--cr-chip-ink)')
      .replace(/color:\s*#fff\b/g, 'color: var(--cr-chip-ink)')
      .replace(/border:\s*1px solid var\(--cr-border\)/g, 'border: 1px solid var(--cr-chip-edge)')
      .replace(/border-color:\s*var\(--cr-ink\)/g, 'border-color: var(--cr-chip-edge)');
    if (tuned === body) return match;
    touched += 1;
    return `${selector}{${tuned}}`;
  });
  return { source: next, touched };
}

function retuneSkin(source) {
  const stats = { borders: 0, shadows: 0, fonts: 0, tilts: 0, strokes: 0, texts: 0, purples: 0, tones: 0, chips: 0 };

  let next = source.replace(/border(-top|-right|-bottom|-left)?:\s*[2-9]px solid var\(--cr-(ink|paper|cyan|yellow|pink|lime|violet)\)(\s*!important)?/g,
    (match, side, name, important) => {
      stats.borders += 1;
      const edge = side || '';
      const width = edge ? '2px' : '1px';
      const color = edge ? 'var(--cr-cherry)' : 'var(--cr-border)';
      return `border${edge}: ${width} solid ${color}${important || ''}`;
    });

  next = next.replace(/box-shadow:\s*([^;{}]+)/g, (match, value) => {
    if (!/var\(--cr-(ink|paper|cyan|yellow|pink|lime|violet)\)/.test(value)) return match;
    const tuned = retuneShadow(value);
    if (tuned === value.trim()) return match;
    stats.shadows += 1;
    return `box-shadow: ${tuned}`;
  });

  next = next.replace(HUB_FONT, () => {
    stats.fonts += 1;
    return 'var(--cr-display)';
  });

  // Les inclinaisons « autocollant » tombent à 2°, les gestes du hub (tag à -8°,
  // nom de modèle à -2°) restent, eux, dans la langue.
  next = next.replace(/transform:\s*rotate\((-?\d+(?:\.\d+)?)deg\)/g, (match, degrees) => {
    const value = Number(degrees);
    if (Number.isNaN(value) || Math.abs(value) <= 3) return match;
    stats.tilts += 1;
    return `transform: rotate(${value < 0 ? -2 : 2}deg)`;
  });
  next = next.replace(/transform:\s*translate\(-\d+px,\s*-\d+px\)\s*rotate\(-?\*?[\d.]+deg\)/g, () => {
    stats.tilts += 1;
    return 'transform: translateY(-3px)';
  });
  next = next.replace(/filter:\s*saturate\(1\.3[0-9]\)\s*contrast\(1\.[0-9]+\)(\s*brightness\([0-9.]+\))?/g, () => {
    stats.tilts += 1;
    return 'filter: saturate(1.05) contrast(1.04)';
  });

  // Le liseré noir dessiné au feutre autour des gros titres n'existe pas dans
  // la langue du hub (le logo de l'écran-titre est juste posé sur son ombre).
  next = next.replace(/^[ \t]*-webkit-text-stroke:[^;]+;\n/gm, () => {
    stats.strokes += 1;
    return '';
  });

  // Empilages d'ombres façon encre de BD → projection franche du hub.
  next = next.replace(/text-shadow:\s*([^;{}]+)/g, (match, value) => {
    const tuned = retuneTextShadow(value.trim());
    if (!tuned || tuned === value.trim()) return match;
    stats.texts += 1;
    return `text-shadow: ${tuned}`;
  });

  for (const [from, to] of HUB_HEX) {
    next = next.replace(new RegExp(from, 'gi'), () => to);
  }
  for (const [pattern, to] of HUB_RGB) {
    next = next.replace(pattern, () => to);
  }
  for (const [pattern, to] of PURPLE_RGB) {
    next = next.replace(pattern, () => to);
  }

  // Trames de papier journal → grain de pellicule du hub.
  next = next.replace(/background(-image)?:\s*([^;{}]+)/g, (match, image, value) => {
    const tuned = retuneTone(value);
    if (!tuned) return match;
    stats.tones += 1;
    return `background${image || ''}: ${tuned}`;
  });

  // Pastilles saturées → puces d'encre du hub (le jaune reste aux états).
  const chips = retuneChips(next);
  next = chips.source;
  stats.chips += chips.touched;

  // Violets et lilas restants : rampe d'encre du hub.
  next = next.replace(/#[0-9a-fA-F]{6}\b/g, (match) => {
    const inked = inkifyColor(match.toLowerCase());
    if (!inked) return match;
    stats.purples += 1;
    return inked;
  });

  return { source: next, stats };
}

/** Encres bleutées → encre d'imprimerie du hub. */
const INK_HEX = new Map([
  ['#070a14', '#07080d'],
  ['#0a0e1e', '#090b11'],
  ['#080a0e', '#07080d'],
  ['#090d14', '#07080d'],
  ['#080b11', '#07080d'],
  ['#080b10', '#07080d'],
  ['#070a12', '#07080d'],
  ['#05070b', '#05060a'],
  ['#0e1326', '#10131a'],
  ['#141a32', '#0b0d13'],
  ['#11151d', '#0b0d13'],
  ['#171c25', '#10131a'],
  ['#141232', '#0d1017'],
]);

/** Vitres teintées → aplats d'encre (le hub ne transparente presque rien). */
const INK_RGB = [
  [/\brgba\(\s*18\s*,\s*22\s*,\s*42\b/g, 'rgba(11, 13, 19'],
  [/\brgba\(\s*24\s*,\s*28\s*,\s*54\b/g, 'rgba(16, 19, 26'],
  [/\brgba\(\s*20\s*,\s*24\s*,\s*48\b/g, 'rgba(13, 16, 22'],
  [/\brgba\(\s*10\s*,\s*12\s*,\s*24\b/g, 'rgba(8, 10, 16'],
  [/\brgba\(\s*9\s*,\s*12\s*,\s*24\b/g, 'rgba(8, 10, 16'],
  [/\brgba\(\s*7\s*,\s*10\s*,\s*20\b/g, 'rgba(7, 8, 13'],
  [/\brgba\(\s*6\s*,\s*8\s*,\s*12\b/g, 'rgba(6, 7, 11'],
];

/** Un rayon exprimé en px, ramené à la langue du hub. */
function capRadiusValue(value) {
  let touched = false;
  const next = value.replace(/(\d+(?:\.\d+)?)px/g, (match, number) => {
    const px = Number(number);
    if (Number.isNaN(px)) return match;
    touched = true;
    if (px >= 60) return '4px';           // pilules et demi-cercles en px
    if (px >= 8) return '2px';            // angles « bento » → équerre
    if (px > 6) return '6px';             // 7 px, dernière taille utile du hub
    return match;                          // <= 6px : déjà dans la langue du hub
  });
  return { value: next, touched };
}

let totalRadius = 0;
let totalBlur = 0;
let totalInk = 0;

for (const file of FILES) {
  const full = path.join(GAMES, file);
  if (!fs.existsSync(full)) {
    console.warn(`— ignoré (absent) : src/games/${file}`);
    continue;
  }
  const before = fs.readFileSync(full, 'utf8');
  let source = before;
  let radius = 0;
  let blur = 0;
  let ink = 0;

  // 0. La peau du jeu (vice-city-rush-hub-skin.css) d'abord : traits, ombres,
  //    polices et couleurs ramenés à la langue du hub.
  if (file === 'vice-city-rush-hub-skin.css') {
    const retuned = retuneSkin(source);
    source = retuned.source;
    ink += retuned.stats.borders + retuned.stats.fonts + retuned.stats.tilts;
    console.log(`  · peau : ${retuned.stats.borders} trait(s) affiné(s), ${retuned.stats.shadows} ombre(s) reprise(s), ${retuned.stats.fonts} police(s), `
      + `${retuned.stats.tilts} inclinaison(s)/filtre(s), ${retuned.stats.strokes} liseré(s) retiré(s), ${retuned.stats.texts} empilage(s) d'ombres, `
      + `${retuned.stats.purples} violet(s) réancré(s), ${retuned.stats.tones} trame(s) grainée(s), ${retuned.stats.chips} puce(s) d'encre`);
  }

  // 1. Les angles. `border-radius` uniquement : les autres propriétés qui
  //    prennent des px (tailles, ombres) ne sont pas touchées.
  source = source.replace(/border-radius:\s*([^;{}]+)/g, (match, value) => {
    if (/var\(|%|inherit/.test(value) && !/px/.test(value)) return match;
    const { value: capped, touched } = capRadiusValue(value);
    if (!touched || capped === value) return match;
    radius += 1;
    return `border-radius: ${capped}`;
  });

  // 2. Le verre dépoli.
  source = source.replace(/backdrop-filter:\s*blur\((?:[^()]|\([^()]*\))*\)\s*(!important)?/g, (match, important = '') => {
    blur += 1;
    return `backdrop-filter: none${important ? ' !important' : ''}`;
  });
  source = source.replace(/-webkit-backdrop-filter:\s*blur\((?:[^()]|\([^()]*\))*\)/g, () => {
    blur += 1;
    return '-webkit-backdrop-filter: none';
  });

  // 3. Les encres.
  for (const [from, to] of INK_HEX) {
    const pattern = new RegExp(from.replace('#', '#'), 'gi');
    source = source.replace(pattern, () => {
      ink += 1;
      return to;
    });
  }
  for (const [pattern, to] of INK_RGB) {
    source = source.replace(pattern, () => {
      ink += 1;
      return to;
    });
  }

  totalRadius += radius;
  totalBlur += blur;
  totalInk += ink;

  if (source !== before) {
    console.log(`src/games/${file} — ${radius} angle(s) remis à l'équerre, ${blur} verre(s) retiré(s), ${ink} encre(s) réancrée(s)`);
    if (write) fs.writeFileSync(full, source);
  } else {
    console.log(`src/games/${file} — déjà d'aplomb`);
  }
}

console.log(`\n${write ? 'réécrit' : 'à réécrire'} : ${totalRadius} rayon(s), ${totalBlur} flou(s), ${totalInk} encre(s) — ${FILES.length} feuilles.`);
