/**
 * La magie qui vient d'être jouée.
 * node scripts/rpg-sort-joue-check.mjs
 *
 * Un sort lancé n'ouvre plus d'aperçu plein cadre : ni couche dédiée, ni voile
 * sombre, ni carte géante au centre de la table. Sa fiche reste petite et se
 * pose juste au-dessus du cimetière et du paquet du joueur — la carte en
 * miniature à gauche, son texte à côté. La table garde sa netteté et ses gestes :
 * la fiche est décorative (`pointer-events: none`), et elle s'efface d'elle-même
 * pour rendre la main.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const page = lire('RpgDuelPage.jsx');
const css = lire('rpg-battle.css');

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

// ── 2. La fiche compacte, au-dessus des piles ───────────────────────────────
assert.match(page,
  /<div className="rpg-card-piles rpg-card-piles--player" aria-label="Vos zones de cartes">\s*\{[^}]*\}\s*\{sortJoue && <SpellAnnouncement annonce=\{sortJoue\} \/>\}/s,
  'la fiche est enfant des piles du joueur : elle suit le cimetière et le paquet à tous les formats');
assert.equal((page.match(/<SpellAnnouncement /g) ?? []).length, 2,
  'la fiche n’est rendue qu’une fois par camp : la vôtre dans vos piles, celle du sorcier dans les siennes');

const bloc = css.slice(css.indexOf('.rpg-spell-played {'), css.indexOf('.rpg-spell-played--contre'));
assert.ok(bloc.length > 0, 'la feuille porte la fiche du sort');
assert.match(bloc, /position:\s*absolute;/, 'elle se pose dans la table');
assert.match(bloc, /bottom:\s*calc\(100% \+ 10px\);/,
  'elle flotte juste au-dessus des piles, pas au milieu de l’écran');
assert.match(bloc, /left:\s*0;/, 'elle s’aligne sur le bord gauche des piles');
assert.match(bloc, /grid-template-columns:\s*58px minmax\(0, 1fr\);/,
  'petite carte à gauche, texte à côté');
assert.match(bloc, /width:\s*min\(360px, calc\(100vw - 40px\)\);/,
  'sa largeur se mesure au viewport : les piles sont étroites et ne la contraignent pas');
assert.match(bloc, /pointer-events:\s*none;/, 'elle ne capte aucun geste : la table reste jouable dessous');
assert.match(bloc, /animation:\s*rpg-spell-arrival/, 'elle arrive avec son animation, comme avant');
assert.doesNotMatch(bloc, /transform:\s*translateX\(-50%\)/, 'plus de centrage horizontal hérité de l’ancien bandeau');
assert.match(css, /@media \(max-width: 560px\) \{\s*\.rpg-spell-played \{[^}]*width:\s*min\(300px, calc\(100vw - 24px\)\);/s,
  'au format étroit, elle se mesure encore au viewport : 100 % y vaudrait la largeur des piles');
assert.doesNotMatch(css, /\.rpg-spell-played \{[^}]*width:\s*calc\(100%/, 'aucune largeur relative aux piles');

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
assert.match(page, /<div className="rpg-card-piles rpg-card-piles--opponent" aria-label="Zones du sorcier">\s*\{[^}]*\}\s*\{sortJoueSorcier && <SpellAnnouncement annonce=\{sortJoueSorcier\} camp="sorcier" \/>\}/s,
  'elle se pose dans SES piles : sous son cimetière et son paquet');

// Les trois moments où le sorcier lance un sort.
assert.match(page, /const reponse = rpgSorcierMagieRapide\(duel, rng\);[\s\S]{0,700}?annoncerMagieSorcier\(carte, describeAnnouncedMagicTarget\(/,
  'sa magie rapide s’annonce chez lui');
assert.match(page, /if \(res\.ok && carteAnnoncee\?\.kind === 'magie'\) annoncerMagieSorcier\(carteAnnoncee, cibleAnnoncee\);/,
  'une magie annoncée qui se résout aussi — une créature ou une arme annoncée, non');
assert.match(page, /annoncerMagieSorcier\(contre, \{[\s\S]{0,220}?\}, \{ contre: true \}\);/,
  'et son contresort, qui vous défait une carte');

assert.match(page, /annoncerMagie\(carte, cibleDecrite, \{ vague: true, camp: lanceur === 'sorcier' \? 'sorcier' : 'joueur' \}\);/,
  'une seconde vague se pose chez son lanceur, pas chez vous');

// La feuille : un anneau rouge, et une place qui ne se rogne pas.
assert.match(css, /\.rpg-spell-played--sorcier\s*\{[^}]*top:\s*calc\(100% \+ 8px\);[^}]*right:\s*0;[^}]*bottom:\s*auto;[^}]*left:\s*auto;[^}]*border-color:\s*rgba\(255, 118, 92, \.92\);/s,
  'la fiche du sorcier se glisse sous ses piles, entre son deck et le rail du tour, et prend un anneau rouge');
assert.match(css, /\.rpg-spell-played--sorcier\s*\{[^}]*bottom:\s*auto;/s,
  'elle ne remonte plus au-dessus de son paquet');
assert.match(css, /\.rpg-spell-played--sorcier\s*\{[^}]*box-shadow:[^}]*rgba\(255, 84, 60, \.32\)/s,
  'la lueur qui l’accompagne est rouge elle aussi');
assert.match(css, /\.rpg-spell-played--sorcier \.rpg-spell-played__art \{[^}]*border-color:\s*#ff7a60;/s,
  'la vignette de la carte est cerclée du même rouge');
assert.match(css, /\.rpg-spell-played--sorcier \.rpg-spell-played__eyebrow \{ color:\s*#ff9d86; \}/,
  'le sur-titre prend la teinte du camp');
assert.doesNotMatch(css, /@media \(max-height: 800px\) \{\s*\.rpg-spell-played--sorcier/s,
  'aucune table basse ne renvoie la fiche au-dessus ou à côté de son deck : elle reste sous les piles');

// Au doigt, rien ne masquait la fiche (elle n'est pas un aperçu de survol) :
// la règle qui cachait les aperçus n'a plus d'exception à porter.
assert.doesNotMatch(css, /@media \(pointer: coarse\)[\s\S]{0,4000}?rpg-spell-played\s*\{\s*display:/,
  'la fiche n’a pas besoin d’échapper au masquage des aperçus de survol');

console.log('✓ Magie jouée : plus d’aperçu plein cadre ni de voile — la fiche compacte se pose juste au-dessus du cimetière et du paquet, petite carte à gauche et texte à droite, décorative et éphémère (3,6 s), sans jamais flouter la table ; le sorcier a la même, glissée sous SES piles entre son deck et le rail du tour, cerclée de rouge');
