/**
 * `npm run check:city-rush-ink`
 *
 * Le contrat de la peau : tout le jeu parle la langue du hub de lancement.
 *
 * L'écran-titre (`src/games/vice-city-rush-menu.css`) a été dessiné à part :
 * encre d'imprimerie, angles coupés au cutter, filets d'un cheveu, équerres
 * jaunes de sélection, grain de pellicule, « Pirata One » et « Permanent
 * Marker ». Le reste de la console a été remis à plat sur ce même vocabulaire
 * (jetons dans `src/games/vice-city-rush.css`, retouches dans
 * `src/games/vice-city-rush-hub-skin.css`, polices défendues dans
 * `src/typography.css`).
 *
 * Cette vérification est purement typographique : elle lit les feuilles et
 * l'ordre des `import`, sans monter la page. Elle attrape les deux façons dont
 * la peau peut se déliter — une couleur de l'ancienne peau qui revient, ou un
 * rayon qui se remet à briller — et le seul ordre d'import qui lui laisse le
 * dernier mot.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const MENU = 'src/games/vice-city-rush-menu.css';
const BASE = 'src/games/vice-city-rush.css';
const SKIN = 'src/games/vice-city-rush-hub-skin.css';
const TYPO = 'src/typography.css';
const PAGE = 'src/games/ViceCityRushPage.jsx';

const menu = read(MENU);
const base = read(BASE);
const skin = read(SKIN);
const typo = read(TYPO);
const page = read(PAGE);

/** Le bloc `{ ... }` de la première occurrence d'un sélecteur (le sélecteur
 * doit être écrit tel quel, accolade exclue : c'est le jeton près de lui qui
 * compte, pas la règle la plus spécifique). */
function firstBlock(css, selector) {
  const needle = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${needle}\\s*\\{([^}]*)\\}`))?.[1] || '';
}

function checkInk(assertFn) {
  // ── 1. Les jetons du hub sont bien dans la feuille de base ────────────────
  const tokens = firstBlock(base, '.city-rush-page');
  for (const [nom, attendu] of [
    ['--cr-ink', '#07080d'],
    ['--cr-ink-raised', '#0b0d13'],
    ['--cr-cherry', '#ffd23e'],
    ['--cr-tag', '#ff5db8'],
    ['--cr-cyan', '#8fd8ff'],
    ['--cr-hairline', '1px'],
  ]) {
    assertFn.match(
      tokens,
      new RegExp(`${nom}:\\s*${attendu}\\s*;`),
      `le jeton ${nom} de la page vaut ${attendu} (${BASE})`,
    );
  }
  assertFn.match(tokens, /--cr-radius-xl:\s*0/, 'le hub n’a pas d’arrondi : les coques sont à angle droit');
  assertFn.match(tokens, /--cr-radius-pill:\s*4px/, 'les pastilles montent à 4 px, pas plus');
  assertFn.match(
    tokens,
    /--cr-display:\s*'Pirata One'/,
    'la police de titre du jeu est celle du hub (« Pirata One »)',
  );
  assertFn.match(tokens, /--cr-marker:\s*'Permanent Marker'/, 'la police de tag du jeu est celle du hub');
  assertFn.match(
    tokens,
    /--display:\s*var\(--cr-display\)/,
    'les jetons globaux `--display` et `--font-gaming` suivent la police du hub',
  );
  assertFn.match(tokens, /--font-gaming:\s*var\(--cr-display\)/, 'idem pour `--font-gaming`');

  // ── 2. La peau ne redéfinit pas les jetons : elle les aliasse ─────────────
  const alias = firstBlock(skin, ':root .city-rush-page.city-rush-page');
  assertFn.ok(alias, `la peau pose son bloc de jetons sur la page (${SKIN})`);
  assertFn.match(alias, /--cr-pink:\s*var\(--cr-tag\)/, 'le rose de la peau est le rose du hub, en jeton — pas en hex');
  assertFn.match(alias, /--cr-yellow:\s*var\(--cr-cherry\)/, 'idem pour la cerise');
  for (const nom of ['--cr-chip-bg', '--cr-chip-ink', '--cr-chip-edge', '--cr-grain', '--cr-corner']) {
    assertFn.ok(alias.includes(nom), `la peau définit ${nom}`);
  }
  for (const nom of ['--cr-corner-image', '--cr-corner-size', '--cr-corner-position']) {
    assertFn.ok(alias.includes(nom), `les huit équerres du hub sont rejouées par ${nom}`);
  }
  assertFn.match(alias, /color-scheme:\s*dark/, 'la console est un écran : `color-scheme: dark`');

  // ── 3. L'équerre de sélection, signe le plus reconnaissable du hub ───────
  const equerre = skin.match(/:root \.city-rush-page\.city-rush-page :is\(([^)]*)\)\.is-selected \{([^}]*)\}/)?.[0] || '';
  assertFn.ok(equerre, `la marque de sélection du hub est rejouée sur les cartes du jeu (${SKIN})`);
  for (const carte of ['.city-rush-mode-card', '.city-rush-city-card', '.city-rush-car-card', '.city-rush-story-banner', '.cr-story-mission-card']) {
    assertFn.ok(equerre.includes(carte), `« ${carte} » porte les huit équerres de cerise`);
  }
  assertFn.match(equerre, /background-image:\s*var\(--cr-corner-image\)/, 'l’équerre vient des jetons, pas d’un copier-coller');
  assertFn.match(equerre, /background-size:\s*var\(--cr-corner-size\)/, 'l’équerre a la taille du hub : 14 px × 3 px');
  assertFn.match(
    skin,
    /\.city-rush-car-card\.is-locked\s*\{[^}]*--cr-corner:\s*linear-gradient\(/,
    'une vignette verrouillée garde la même équerre, repassée au gris d’encre',
  );

  // ── 4. Aucun résidu de l'ancienne peau (néons, violets, gros arrondis) ───
  const anciennePeau = /#9b5cff|#ff36b8|#ff24aa|#30f5e4|#8cff30|rgba\(155,\s*92,\s*255|rgba\(255,\s*54,\s*184/i;
  for (const [nom, css] of [[BASE, base], [SKIN, skin]]) {
    assertFn.ok(!anciennePeau.test(css), `${nom} ne garde aucune couleur de l’ancienne peau`);
    for (const [, valeur] of css.matchAll(/border-radius:\s*([^;}]+)/g)) {
      const v = valeur.replace(/\s*!important\s*$/, '').trim();
      const ok = /^0$|^inherit$|^50%$|^999/.test(v)
        || /^var\(--(cr-radius|hud-radius)/.test(v)
        || (parseFloat(v) <= 8 && /px$/.test(v));
      assertFn.ok(ok, `${nom} : « border-radius: ${v} » sort du vocabulaire du hub (0 · 1 · 2 · 4 · 6 px, ou un jeton)`);
    }
  }

  // ── 5. Thème clair : la page est du papier, la coque reste l'écran ───────
  const clair = (sel) => firstBlock(base, sel);
  assertFn.match(clair(':root[data-theme=\'light\'] .city-rush-page'), /--cr-grain:/, 'le thème clair retourne le grain sur le papier');
  assertFn.match(clair(':root[data-theme=\'light\'] .city-rush-page'), /--cr-chip-ink:/, 'le thème clair a sa puce d’encre sur la page');
  assertFn.match(
    clair(':root[data-theme=\'light\'] .city-rush-shell'),
    /--cr-chip-ink:\s*#dfe6f2/,
    'la coque, elle, garde la puce nocturne : c’est un écran sombre dans les deux thèmes',
  );

  // ── 6. Typographie : le hub garde ses polices face au `body * !important` ─
  assertFn.match(
    typo,
    /html body \.city-rush-page[^{]*\{[^}]*'Pirata One'[^}]*!important/,
    `${TYPO} rend « Pirata One » aux titres du hub, malgré le « body * » du bloc 1`,
  );
  assertFn.match(
    typo,
    /\.vcr-key-chip kbd\s*\{[^}]*font-weight:\s*700\s*!important/,
    'les touches du hub gardent leur graisse',
  );

  // ── 7. Ordre d'import : la peau suit les feuilles générales, pas les écrans ─
  // Le tournoi et le garage sont des sur-couches d'un écran précis ; ils viennent
  // après la peau et peuvent donc y recoudre leur propre mise en page. Tout le
  // reste — base, cinématiques, HUD, histoire — doit précéder la retouche.
  const imported = [...page.matchAll(/^import\s+'\.\/([^']+)';/gm)].map((m) => m[1]);
  const index = (f) => imported.indexOf(f);
  const rang = index(SKIN.split('/').pop());
  assertFn.ok(rang >= 0, `${SKIN} est importé dans ${PAGE}`);
  for (const feuille of ['vice-city-rush.css', 'vice-city-rush-cinematic.css', 'vice-city-rush-hud.css', 'city-rush-story.css']) {
    assertFn.ok(index(feuille) >= 0 && index(feuille) < rang, `la peau suit « ${feuille} » dans ${PAGE}`);
  }
  for (const feuille of ['city-rush-tournament.css', 'vice-city-rush-garage.css']) {
    assertFn.ok(index(feuille) > rang, `« ${feuille} » garde le droit de recoudre la peau sur son écran`);
  }
  assertFn.ok(
    /\.vcr-menu\s*\{[\s\S]{0,160}position:\s*fixed/.test(menu),
    `le hub est une couche fixe plein écran (${MENU}) — la page, pas la coque, doit porter le plein écran`,
  );
}

let code = 0;
try {
  checkInk(assert);
  console.log(
    'check:city-rush-ink ✓ — la page de jeu parle la langue du hub : encres d’imprimerie, angles coupés, '
    + 'filets d’un cheveu, équerres de cerise sur la sélection, grain de pellicule, « Pirata One » et '
    + '« Permanent Marker » défendus contre la typographie du site ; la peau suit les feuilles générales et précède les sur-couches de tournoi et de garage.',
  );
} catch (error) {
  console.error(error?.message || error);
  code = 1;
}
process.exit(code);
