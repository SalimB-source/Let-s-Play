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
assert.equal((page.match(/<SpellAnnouncement /g) ?? []).length, 1,
  'la fiche n’est rendue qu’une fois, dans les piles');

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
assert.match(page, /setSortJoue\(\{ carteId: carte\.id, cible, contre, vague \}\);/,
  'le sort joué ouvre la fiche');
assert.match(page, /timerSortRef\.current = window\.setTimeout\(\(\) => \{\s*timerSortRef\.current = null;\s*setSortJoue\(null\);\s*\}, 3600\);/s,
  'la fiche s’efface seule au bout de 3,6 s');
assert.match(page, /if \(timerSortRef\.current\) window\.clearTimeout\(timerSortRef\.current\);\s*setSortJoue\(\{/s,
  'un second sort remplace le premier : jamais deux fiches empilées');

// Au doigt, rien ne masquait la fiche (elle n'est pas un aperçu de survol) :
// la règle qui cachait les aperçus n'a plus d'exception à porter.
assert.doesNotMatch(css, /@media \(pointer: coarse\)[\s\S]{0,4000}?rpg-spell-played\s*\{\s*display:/,
  'la fiche n’a pas besoin d’échapper au masquage des aperçus de survol');

console.log('✓ Magie jouée : plus d’aperçu plein cadre ni de voile — la fiche compacte se pose juste au-dessus du cimetière et du paquet, petite carte à gauche et texte à droite, décorative et éphémère (3,6 s), sans jamais flouter la table');
