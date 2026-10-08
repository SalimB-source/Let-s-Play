/**
 * `npm run check:city-rush-white-ink`
 *
 * Le contrat de lisibilité de la console : AUCUNE surface blanche sous une
 * encre claire.
 *
 * Vice City Rush est un écran (règle 2 de `src/theme.css` — « les médias
 * restent sombres ») : ses panneaux sont nocturnes et son texte est écrit en
 * encre claire, littérale, un peu partout dans la peau du hub
 * (`vice-city-rush-hub-skin.css`). Deux familles de règles ont déjà cassé ce
 * contrat, et toutes les deux se voient en pleine partie :
 *
 *   1. une `background-color: #fff` posée sur les cartes du HUD (position,
 *      tour, vitesse), le score et le portique de route, alors que la même
 *      règle écrit `color: #f4f6fb` — blanc sur blanc ;
 *   2. la conversion « thème clair » de la page, qui passait le fond, les
 *      cartes de la sidebar, le bloc « sans collision » et le pied de page en
 *      papier pendant que la peau du hub y gardait son encre blanche.
 *
 * Cette vérification lit les feuilles (sans monter la page) et attrape les
 * deux : une règle qui pose une surface claire ET une encre claire, et une
 * règle `data-theme='light'` qui repeint une surface de la console en clair.
 * Les surfaces composites sont calculées au-dessus de l'encre du jeu
 * (`#06070b`), pas au-dessus du blanc : une pastille `rgba(255, 210, 62, .08)`
 * posée sur un panneau nocturne est sombre, pas claire.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = path.join(root, 'src', 'games');

/** Les feuilles de la console : la base, la peau du hub et les sur-couches
 * d'écran (cinématiques, HUD, histoire, tutoriel, tournoi, garage, écran-titre). */
const SHEETS = readdirSync(games)
  .filter((f) => f.endsWith('.css') && (/^vice-city-rush/.test(f) || /^city-rush-/.test(f)))
  .sort();

/* L'encre du jeu : le panneau nocturne (`rgba(4, 5, 9, .82)`) sur le fond
   d'encre (`#07080d`). Toute couleur semi-transparente se compose là-dessus. */
const PANEL = [6, 7, 11];

/** Luminance relative simplifiée (0-255) : suffisante pour trier clair/sombre. */
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Une couleur CSS simple → [r, g, b] composé sur l'encre, ou null. */
function ink(value) {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgb) {
    const a = rgb[4] === undefined ? 1 : parseFloat(rgb[4]);
    return [0, 1, 2].map((i) => Math.round(PANEL[i] + (Number(rgb[i + 1]) - PANEL[i]) * a));
  }
  if (v === 'white') return [255, 255, 255];
  return null;
}

/**
 * `color-mix(in srgb, A x%, B)` / `color-mix(in srgb, A, B y%)` → la couleur
 * réellement affichée. Sans ce calcul, un fond
 * `color-mix(in srgb, #ffd23e 14%, #17243a)` — du bleu nuit à peine doré —
 * serait lu comme le jaune qu'il contient.
 */
function evalMix(value) {
  const m = value.match(/^color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/i)
    || value.match(/^color-mix\(\s*in srgb\s*,\s*(.+?)\s*,\s*(.+?)\s+([\d.]+)%\s*\)$/i);
  if (!m) return null;
  const first = ink(m[1]);
  const second = ink(m[3] || m[2]);
  const pct = parseFloat(m[2]);
  if (!first || !second || Number.isNaN(pct)) return null;
  const ratio = /\)\s*$/i.test(value) && m[3] === undefined ? pct / 100 : 1 - pct / 100;
  return [0, 1, 2].map((i) => Math.round(first[i] * ratio + second[i] * (1 - ratio)));
}

/** La couleur la plus claire d'une valeur de fond (dégradés et mélanges compris). */
function lightestOf(value) {
  let best = null;
  const consider = (c) => {
    if (c && (!best || lum(c) > lum(best))) best = c;
  };
  for (const mix of value.match(/color-mix\([^)]*\)/gi) || []) consider(evalMix(mix));
  const sansMix = value.replace(/color-mix\([^)]*\)/gi, ' ');
  for (const token of sansMix.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b/g) || []) {
    consider(ink(token));
  }
  return best;
}

/**
 * Découpe une feuille en règles : `{ selector, decl, line, at }`, `at` portant
 * les `@media` / `@supports` englobants. Les commentaires sont retirés pour ne
 * pas prendre un exemple cité en commentaire pour une règle.
 */
function rules(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const out = [];
  const stack = [];
  let buffer = '';
  let line = 1;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (ch === '\n') {
      line += 1;
      buffer += ch;
      continue;
    }
    buffer += ch;
    if (ch === '{') {
      const header = buffer.slice(0, -1).trim();
      const headerLine = line - (header.split('\n').length - 1);
      buffer = '';
      stack.push(header.startsWith('@') ? { at: header.replace(/\s+/g, ' ') } : { selector: header.replace(/\s+/g, ' '), line: headerLine, decl: '' });
    } else if (ch === '}') {
      const top = stack.pop();
      buffer = '';
      if (!top || top.decl === undefined) continue;
      out.push({
        selector: top.selector,
        decl: top.decl.replace(/\s+/g, ' ').trim(),
        line: top.line,
        at: stack.filter((s) => s.at).map((s) => s.at).join(' '),
      });
    } else if (ch === ';' && stack.length && stack[stack.length - 1].decl !== undefined) {
      stack[stack.length - 1].decl += buffer;
      buffer = '';
    }
  }
  return out;
}

/** `prop: valeur` dans un bloc de déclarations, ou null. */
function decl(decls, prop) {
  const m = decls.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
  return m ? m[1].trim() : null;
}

/** Une couleur est-elle « claire » ? Seuil haut : le papier, pas les pastilles. */
const isLight = (c) => Boolean(c) && lum(c) >= 200;

function checkWhiteInk(assertFn) {
  const fautes = [];
  const clairSurClair = [];
  let rulesSeen = 0;

  for (const sheet of SHEETS) {
    const css = readFileSync(path.join(games, sheet), 'utf8');

    for (const rule of rules(css)) {
      rulesSeen += 1;
      const where = `${sheet}:${rule.line}${rule.at ? ` (dans ${rule.at})` : ''}`;

      // ── 1. Le thème clair ne repeint aucune surface de la console ───────
      // Ni le fond, ni les panneaux, ni l'encre de texte : la console est un
      // écran, elle reste nocturne dans les deux thèmes.
      if (/data-theme=['"]?light/.test(rule.selector)) {
        for (const [prop, valeur] of Object.entries({
          background: decl(rule.decl, 'background'),
          'background-color': decl(rule.decl, 'background-color'),
          '--cr-bg': decl(rule.decl, '--cr-bg'),
          '--cr-bg-2': decl(rule.decl, '--cr-bg-2'),
          '--cr-panel': decl(rule.decl, '--cr-panel'),
          '--cr-panel-2': decl(rule.decl, '--cr-panel-2'),
          '--cr-panel-solid': decl(rule.decl, '--cr-panel-solid'),
        })) {
          if (!valeur) continue;
          const c = lightestOf(valeur);
          if (isLight(c)) {
            fautes.push(
              `${where} — le thème clair pose ${prop}: ${valeur} : une surface de la console `
              + 'part en papier alors que la peau du hub y écrit en encre blanche',
            );
          }
        }
        const texte = decl(rule.decl, '--cr-text');
        if (texte && !isLight(lightestOf(texte)) && texte !== 'inherit') {
          fautes.push(
            `${where} — le thème clair pose --cr-text: ${texte} : une encre sombre sur les `
            + 'panneaux nocturnes de la console',
          );
        }
      }

      // ── 2. Aucune règle n'écrit clair sur clair ─────────────────────────
      const fond = decl(rule.decl, 'background') || decl(rule.decl, 'background-color');
      const couleur = decl(rule.decl, 'color');
      if (!fond || !couleur) continue;
      // Le texte en dégradé (`background-clip: text`) ne peint pas de surface.
      if (/background-clip:\s*text/.test(rule.decl)) continue;
      if (/^transparent$/i.test(couleur) || couleur.startsWith('var(')) continue;

      const surface = lightestOf(fond);
      const encre = lightestOf(couleur);
      // `color` égal au fond : l'idiome « aplat + halo » des cellules de la
      // barre de vie (`box-shadow: 0 0 8px currentColor` sur un <i> sans texte).
      const memeTeinte = surface && encre && surface.every((v, i) => Math.abs(v - encre[i]) <= 2);
      if (isLight(surface) && isLight(encre) && !memeTeinte) {
        clairSurClair.push(
          `${where} — « ${rule.selector} » pose color: ${couleur} sur ${fond} `
          + `(luminance ${Math.round(lum(encre))} sur ${Math.round(lum(surface))})`,
        );
      }
    }
  }

  assertFn.ok(rulesSeen > 400, `les feuilles de la console sont bien lues (${rulesSeen} règles)`);
  assertFn.deepEqual(clairSurClair, [], `encre claire sur surface claire :\n${clairSurClair.join('\n')}`);
  assertFn.deepEqual(fautes, [], `le thème clair repeint la console :\n${fautes.join('\n')}`);

  // ── 3. Le HUD et la page gardent leur encre nocturne ────────────────────
  const skin = readFileSync(path.join(games, 'vice-city-rush-hub-skin.css'), 'utf8');
  const base = readFileSync(path.join(games, 'vice-city-rush.css'), 'utf8');
  const panneauHud = rules(skin).filter((r) => /\.city-rush-hud-card/.test(r.selector));
  assertFn.ok(panneauHud.length > 0, 'la peau pose bien les cartes du HUD');
  for (const rule of panneauHud) {
    const fond = decl(rule.decl, 'background') || decl(rule.decl, 'background-color');
    assertFn.ok(
      !fond || !isLight(lightestOf(fond)),
      `vice-city-rush-hub-skin.css:${rule.line} — la carte du HUD « ${rule.selector} » `
      + `repart au blanc (${fond})`,
    );
  }
  assertFn.match(
    rules(base).find((r) => r.selector === ":root[data-theme='light'] .city-rush-page")?.decl || '',
    /--cr-panel-solid:\s*#0b0d13/,
    "le thème clair réancre l'encre nocturne sur la page de jeu",
  );
}

let code = 0;
try {
  checkWhiteInk(assert);
  console.log(
    'check:city-rush-white-ink ✓ — aucune surface blanche sous une encre claire : '
    + 'les cartes du HUD, le score, la barre de vie et le portique de route restent '
    + "sur l'encre nocturne, et le thème clair ne repeint plus la console en papier.",
  );
} catch (error) {
  console.error(error?.message || error);
  code = 1;
}
process.exit(code);
