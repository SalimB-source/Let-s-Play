/**
 * La magie qui vient d'être jouée.
 * node scripts/rpg-sort-joue-check.mjs
 *
 * Un sort joué ouvre une fiche brève et compacte au centre de la table, sans
 * voile. Elle annonce les sorts des deux camps ; au doigt, sa largeur et sa
 * vignette sont encore réduites pour mieux dégager le plateau.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const page = lire('RpgDuelPage.jsx');
const css = lire('rpg-battle.css');
const mobileCss = lire('rpg-mobile.css');

// ── 1. Plus aucun aperçu plein cadre pour un sort joué ──────────────────────
assert.doesNotMatch(page, /apercuMagie/,
  'la page ne garde aucun état d’aperçu de magie');
assert.doesNotMatch(page, /spellPlayed/,
  'l’aperçu central n’a plus de variante pour un sort joué');
assert.doesNotMatch(page, /rpg-spell-preview-layer|rpg-preview-backdrop/,
  'ni couche d’aperçu de sort, ni voile sombre dans le rendu');
assert.doesNotMatch(css, /rpg-spell-preview-layer|rpg-preview-backdrop|is-spell-preview/,
  'la feuille ne porte plus les règles de cet aperçu');
assert.match(page, /const apercuCarte = \(apercuAppui \|\| apercuCatalogue\) \? 'fiche' : null;/,
  'la table ne se floute que sous une fiche : la magie jouée ne voile plus rien');
assert.doesNotMatch(css, /\.card-table\[data-apercu-carte\][^{]*spell/s,
  'le flou du plateau ne connaît plus de sort');

// ── 2. Une fiche centrale, compacte et non interactive ──────────────────────
assert.match(page,
  /<div className="rpg-spell-played-stack">\s*\{sortJoueSorcier && <SpellAnnouncement annonce=\{sortJoueSorcier\} camp="sorcier" \/>\}\s*\{sortJoue && <SpellAnnouncement annonce=\{sortJoue\} \/>\}/s,
  'la pile centrale annonce aussi bien un sort du joueur que du sorcier');
assert.equal((page.match(/<SpellAnnouncement /g) ?? []).length, 2,
  'la fiche est rendue une fois par camp et les deux peuvent coexister');
assert.match(css, /\.rpg-spell-played-stack\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*display:\s*flex;[^}]*justify-content:\s*center;/s,
  'la pile centre les fiches sur le plateau');

const bloc = css.slice(css.indexOf('.rpg-spell-played {'), css.indexOf('.rpg-spell-played--contre'));
assert.ok(bloc.length > 0, 'la feuille porte la fiche du sort');
assert.match(bloc, /display:\s*grid;/, 'la fiche aligne la carte et ses détails');
assert.match(bloc, /grid-template-columns:\s*58px minmax\(0, 1fr\);/,
  'petite carte à gauche, texte à côté');
assert.match(bloc, /width:\s*min\(360px, calc\(100vw - 40px\)\);/,
  'sur grand écran, sa largeur se mesure au viewport');
assert.match(bloc, /pointer-events:\s*none;/, 'elle ne capte aucun geste : la table reste jouable dessous');
assert.match(bloc, /animation:\s*rpg-spell-arrival/, 'elle arrive avec son animation, comme avant');
assert.doesNotMatch(bloc, /position:\s*absolute;|bottom:\s*calc\(100%/,
  'elle n’est plus accrochée aux piles du joueur ou du sorcier');
assert.match(css, /@media \(max-width: 560px\) \{\s*\.rpg-spell-played \{[^}]*width:\s*min\(300px, calc\(100vw - 24px\)\);/s,
  'les petits viewports restent bornés à leur largeur');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-spell-played\s*\{[^}]*grid-template-columns:\s*38px minmax\(0, 1fr\);[^}]*width:\s*min\(260px, calc\(100vw - 24px\)\);[^}]*min-height:\s*0;/s,
  'sur mobile, la fenêtre d’annonce est plus étroite, avec une vignette plus petite — dans les deux camps');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-spell-played__art\s*\{\s*width:\s*38px;\s*height:\s*48px;\s*\}/,
  'la vignette mobile réduit aussi la hauteur de la fenêtre');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-spell-played__details > p\s*\{\s*font-size:\s*8px;\s*\}/,
  'le texte d’effet garde deux lignes lisibles dans le format réduit');
assert.doesNotMatch(css, /\.rpg-spell-played \{[^}]*width:\s*calc\(100%/, 'aucune largeur relative au plateau');

assert.match(css, /\.rpg-spell-played__art\s*\{[^}]*width:\s*58px;[^}]*height:\s*72px;/s,
  'la carte du sort tient en 58 × 72 pixels, pas en pleine fiche');
assert.match(css, /\.rpg-spell-played__details > p \{[^}]*-webkit-line-clamp:\s*2;/s,
  'le texte du sort se lit sur deux lignes');

// ── 3. Elle s'efface et rend la table ──────────────────────────────────────
assert.match(page, /const poserFiche = camp === 'sorcier' \? setSortJoueSorcier : setSortJoue;/,
  'le sort joué ouvre la fiche du camp qui l’a lancé');
assert.match(page, /const minuteur = camp === 'sorcier' \? timerSortSorcierRef : timerSortRef;/,
  'chaque camp garde son minuteur');
assert.match(page, /poserFiche\(\{[\s\S]{0,200}?carteId: carte\.id,[\s\S]{0,120}?contre,\s*vague,\s*\}\);/,
  'la fiche porte la carte, sa cible, le contre et la vague');
assert.match(page, /minuteur\.current = window\.setTimeout\(\(\) => \{\s*minuteur\.current = null;\s*poserFiche\(null\);\s*\}, 3600\);/s,
  'la fiche s’efface seule au bout de 3,6 s');
assert.match(page, /if \(minuteur\.current\) window\.clearTimeout\(minuteur\.current\);/,
  'un second sort du même camp remplace le premier : jamais deux fiches empilées');

// ── 4. Le sort du sorcier : la même fiche, de son côté, en rouge ───────────
assert.match(page, /function SpellAnnouncement\(\{ annonce, camp = 'joueur' \}\)/,
  'la fiche connaît le camp du lanceur');
assert.match(page, /const sorcier = camp === 'sorcier';/);
assert.match(page, /\$\{sorcier \? ' rpg-spell-played--sorcier' : ''\}/, 'elle reçoit sa variante sorcier');
assert.match(page, /sorcier \? 'SORT DU SORCIER' : 'MAGIE JOUÉE'/,
  'le sur-titre nomme le lanceur');
assert.match(page, /\$\{sorcier \? 'Magie du sorcier' : 'Magie jouée'\} : \$\{carte\.name\}/,
  'et le libellé lu par les lecteurs d’écran');

assert.match(page, /const \[sortJoueSorcier, setSortJoueSorcier\] = useState\(null\);/,
  'la table garde la fiche du sorcier à part de la vôtre');
assert.match(page, /const annoncerMagie = \(carte, cible, \{ contre = false, vague = false, sonForce = null, camp = 'joueur' \} = \{\}\) => \{/,
  'l’annonce connaît le camp du lanceur');
assert.match(page, /const annoncerMagieSorcier = \(carte, cible, options = \{\}\) => \{\s*if \(!carte\) return;\s*annoncerMagie\(carte, cible, \{ \.\.\.options, camp: 'sorcier' \}\);/s,
  'elle passe par la même annonce, avec le camp du sorcier');
assert.match(page, /<div className="rpg-spell-played-stack">[\s\S]{0,180}?sortJoueSorcier && <SpellAnnouncement annonce=\{sortJoueSorcier\} camp="sorcier" \/>/,
  'le sorcier utilise la même fiche centrale que le joueur');

// Les trois moments où le sorcier lance un sort.
assert.match(page, /const reponse = rpgSorcierMagieRapide\(duel, rng\);[\s\S]{0,700}?annoncerMagieSorcier\(carte, describeAnnouncedMagicTarget\(/,
  'sa magie rapide s’annonce chez lui');
assert.match(page, /if \(res\.ok && carteAnnoncee\?\.kind === 'magie'\) annoncerMagieSorcier\(carteAnnoncee, cibleAnnoncee\);/,
  'une magie annoncée qui se résout aussi — une créature ou une arme annoncée, non');
assert.match(page, /annoncerMagieSorcier\(contre, \{[\s\S]{0,220}?\}, \{ contre: true \}\);/,
  'et son contresort, qui vous défait une carte');

assert.match(page, /annoncerMagie\(carte, cibleDecrite, \{ vague: true, camp: lanceur === 'sorcier' \? 'sorcier' : 'joueur' \}\);/,
  'une seconde vague se pose chez son lanceur, pas chez vous');

// La fiche du sorcier garde le même gabarit, avec sa couleur rouge.
const regleSorcier = css.match(/\.rpg-spell-played--sorcier\s*\{([^}]*)\}/);
assert.ok(regleSorcier, 'la variante du sorcier est définie');
assert.match(regleSorcier[1], /border-color:\s*rgba\(255, 118, 92, \.92\);/,
  'la fiche de l’adversaire prend un anneau rouge');
assert.match(regleSorcier[1], /box-shadow:[^;]*rgba\(255, 84, 60, \.32\)/,
  'sa lueur est rouge elle aussi');
assert.doesNotMatch(regleSorcier[1], /(?:width|height|position|top|right|bottom|left):/,
  'la variante rouge ne change pas le gabarit commun de la fiche');
assert.match(css, /\.rpg-spell-played--sorcier \.rpg-spell-played__art \{[^}]*border-color:\s*#ff7a60;/s,
  'la vignette de la carte est cerclée du même rouge');
assert.match(css, /\.rpg-spell-played--sorcier \.rpg-spell-played__eyebrow \{ color:\s*#ff9d86; \}/,
  'le sur-titre prend la teinte du camp');

// Au doigt, rien ne masquait la fiche (elle n'est pas un aperçu de survol) :
// la règle qui cachait les aperçus n'a plus d'exception à porter.
assert.doesNotMatch(css, /@media \(pointer: coarse\)[\s\S]{0,4000}?rpg-spell-played\s*\{\s*display:/,
  'la fiche n’a pas besoin d’échapper au masquage des aperçus de survol');

console.log('✓ Magie jouée : fiche compacte, éphémère (3,6 s) et identique pour les deux camps ; sur mobile, largeur et vignette réduites, table toujours visible et sans voile');
