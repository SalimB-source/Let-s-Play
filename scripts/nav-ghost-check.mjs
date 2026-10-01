/**
 * Contrôle « liens fantômes du menu mobile » — sans dépendance, CI-friendly.
 *
 *   npm run check:nav-ghost
 *
 * Le menu plein écran du téléphone (`.nav-links`, `position:fixed; inset:0`,
 * z-index:1000) se masque FERMÉ par `opacity:0` + `pointer-events:none`. Or
 * `pointer-events` S'HÉRITE : un descendant qui se redonne `auto` redevient
 * cliquable À TRAVERS le calque parent `none` — invisible, mais au-dessus de
 * la page. C'est exactement ce que faisait la requête média téléphone en
 * posant `pointer-events:auto` sur `.nav-submenu` : les sous-entrées
 * « Jeux-vidéo » (`/jeu`) et « Quizz » (`/quizz`) — pleine largeur,
 * `min-height:40px` — flottaient invisibles au milieu de l'écran et captaient
 * les appuis du dessous. Symptôme rapporté : sur la page du jeu, « JOUER » ou
 * « LANCER LA PARTIE » ouvrait la grille des quizz.
 *
 * Ce script relit `src/styles.css` et verrouille les invariants du correctif :
 *
 *   1. dans la requête média téléphone, `.nav-submenu` ne réactive jamais
 *      `pointer-events` (il hérite du calque : fermé = traversé, ouvert =
 *      cliquable) ;
 *   2. l'état « survol bureau » (`is-open`) est neutralisé sur téléphone —
 *      il ne peut pas rouvrir une zone cliquable invisible ;
 *   3. l'interactivité ne revient que par `.nav-links.open .nav-submenu`,
 *      APRÈS la neutralisation (même spécificité : l'ordre tranche) ;
 *   4. le calque lui-même reste `pointer-events:none` fermé et `auto` ouvert.
 *
 * Complémentaire de `npm run check:nav` (comportement du panneau, jsdom) et
 * de `npm run check:phone-css` (conditions téléphone des requêtes média).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ''); // commentaires exclus de l'analyse

/** Blocs `@media (…){ … }` du fichier : [{ header, body, start }]. */
function mediaBlocks(source) {
  const blocks = [];
  const re = /@media([^{]*)\{/g;
  let match;
  while ((match = re.exec(source))) {
    const openAt = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = openAt; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          blocks.push({
            header: match[1].replace(/\s+/g, ' ').trim(),
            body: source.slice(openAt + 1, i),
            start: match.index,
          });
          re.lastIndex = i + 1;
          break;
        }
      }
    }
  }
  return blocks;
}

/** Règles de premier niveau d'un bloc : [{ selector, decls, index }]. */
function rules(blockBody) {
  const out = [];
  let selector = '';
  for (let i = 0; i < blockBody.length; i += 1) {
    const char = blockBody[i];
    if (char === '{') {
      // accolade fermante associée (les sélecteurs ne contiennent pas d'accolades)
      let depth = 1;
      let close = i + 1;
      while (close < blockBody.length && depth > 0) {
        if (blockBody[close] === '{') depth += 1;
        else if (blockBody[close] === '}') depth -= 1;
        close += 1;
      }
      out.push({
        selector: selector.replace(/\s+/g, ' ').trim(),
        decls: blockBody.slice(i + 1, close - 1),
        index: i,
      });
      selector = '';
      i = close - 1;
    } else {
      selector += char;
    }
  }
  return out;
}

const phoneBlocks = mediaBlocks(css).filter((b) => /max-width:\s*800px/.test(b.header));
if (phoneBlocks.length === 0) {
  console.error('ÉCHEC — aucune requête média téléphone (max-width:800px) trouvée dans src/styles.css.');
  process.exit(1);
}

const problems = [];

/* ── 1. Le sous-menu téléphone ne réactive pas pointer-events ────────── */
const submenuBlock = phoneBlocks.find((b) => /\.nav-submenu-toggle\s*{\s*display:none/.test(b.body.replace(/\s+/g, ' ')));
if (!submenuBlock) {
  problems.push('la requête média téléphone du sous-menu (avec .nav-submenu-toggle{display:none}) est introuvable');
} else {
  const blockRules = rules(submenuBlock.body);
  const submenu = blockRules.find((r) => r.selector === '.nav-submenu');
  if (!submenu) {
    problems.push('la règle .nav-submenu de la requête média téléphone est introuvable');
  } else if (/pointer-events\s*:\s*auto/.test(submenu.decls)) {
    problems.push(
      '.nav-submenu (téléphone) réactive pointer-events:auto : la propriété s\'hérite, '
      + 'les sous-entrées redeviennent cliquables à travers le menu plein écran fermé '
      + '(liens fantômes — cf. « JOUER » qui ouvrait les quizz)',
    );
  }

  /* ── 2. L'état « survol bureau » est neutralisé sur téléphone ──────── */
  const hoverState = blockRules.find((r) => r.selector === '.nav-item--menu.is-open .nav-submenu');
  if (!hoverState || !/pointer-events\s*:\s*none/.test(hoverState.decls)) {
    problems.push(
      'il manque .nav-item--menu.is-open .nav-submenu{pointer-events:none} dans la requête '
      + 'média téléphone : l\'état de survol de la barre bureau ne doit pas rouvrir de zone '
      + 'cliquable invisible',
    );
  }

  /* ── 3. L\'interactivité ne revient que menu OUVERT, après la neutralisation */
  const openState = blockRules.find((r) => r.selector === '.nav-links.open .nav-submenu');
  if (!openState || !/pointer-events\s*:\s*auto/.test(openState.decls)) {
    problems.push(
      'il manque .nav-links.open .nav-submenu{pointer-events:auto} dans la requête média '
      + 'téléphone : le sous-menu doit rester utilisable quand le menu est ouvert',
    );
  } else if (hoverState && openState.index < hoverState.index) {
    problems.push(
      '.nav-links.open .nav-submenu doit venir APRÈS .nav-item--menu.is-open .nav-submenu '
      + '(même spécificité : menu ouvert + entrée « survolée », c\'est l\'ordre qui tranche)',
    );
  }
}

/* ── 4. Le calque plein écran : traversé fermé, interactif ouvert ─────── */
const overlayBlock = phoneBlocks.find((b) => {
  const body = b.body.replace(/\s+/g, ' ');
  return /\.nav-links\s*{\s*[^}]*position:fixed/.test(body);
});
if (!overlayBlock) {
  problems.push('la requête média téléphone du menu plein écran (.nav-links position:fixed) est introuvable');
} else {
  const flat = overlayBlock.body.replace(/\s+/g, ' ');
  const closed = flat.match(/\.nav-links\s*{[^}]*}/)?.[0] || '';
  const opened = flat.match(/\.nav-links\.open\s*{[^}]*}/)?.[0] || '';
  if (!/pointer-events\s*:\s*none/.test(closed)) {
    problems.push('.nav-links (menu fermé) doit garder pointer-events:none — sinon il bloque toute la page');
  }
  if (!/pointer-events\s*:\s*auto/.test(opened)) {
    problems.push('.nav-links.open doit poser pointer-events:auto — sinon le menu ouvert ne se parcourt plus');
  }
}

if (problems.length) {
  console.error(`ÉCHEC — liens fantômes du menu mobile (${problems.length}) :`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('OK — aucune sous-entrée cliquable à travers le menu mobile fermé.');
