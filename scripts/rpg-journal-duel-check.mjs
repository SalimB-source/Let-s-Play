/**
 * Le journal du duel ne recouvre plus le jeu.
 * node scripts/rpg-journal-duel-check.mjs
 *
 * Au doigt (784 × 356), le panneau du journal restait déplié dans l'angle
 * inférieur gauche : quatre échanges, vignettes comprises, par-dessus la plaque
 * du sorcier joueur — la vie, la main, le paquet, le cimetière — et la première
 * carte de la main. Le journal devient un **onglet fermé par défaut** dans le
 * coin libre de la table, qui n'affiche que les faits non lus ; le récit
 * s'ouvre sur demande, par-dessus le champ, et se referme d'un toucher.
 *
 * Le contrôle tient les deux moitiés du contrat :
 *   — le rendu réel (`CombatFeed` : fermé → ouvert → refermé, badge des faits
 *     non lus, absence de journal sans événement) ;
 *   — la feuille de style (l'onglet et son panneau ancrés en haut à gauche,
 *     jamais en bas ; le doigt les range dans la cellule `coin` de la grille,
 *     devant la plaque du sorcier et non dessus).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── 1. Le rendu réel de l'onglet ────────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-journal-duel-smoke.jsx', outDir: 'node_modules/.cache/rpg-journal-duel', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { rendreJournal } = await import('../node_modules/.cache/rpg-journal-duel/rpg-journal-duel-smoke.js');
const { ferme, ouvert, referme, hors, echap, nouveau, vide } = await rendreJournal();
dom.window.close();

assert.equal(ferme.bouton.exists, true, 'le journal est un onglet, présent dès le premier échange');
assert.equal(ferme.bouton.expanded, 'false', 'il est fermé par défaut : le récit ne s’impose plus sur la table');
assert.equal(ferme.panneau.hidden, true, 'le panneau reste caché tant qu’on ne l’a pas demandé');
assert.equal(ferme.panneau.lignes, 2, 'les faits déjà arrivés attendent dans le panneau, prêts à s’ouvrir');
assert.equal(ferme.bouton.controls, ferme.panneau.id,
  'l’onglet déclare le panneau qu’il commande (`aria-controls`)');
assert.equal(ferme.bouton.title, 'Journal du duel', 'l’infobulle nomme le journal, comme la capsule de navigation');
assert.equal(ferme.badge, '2', 'deux faits non lus : la capsule le dit sans déplier le récit');
assert.match(ferme.bouton.label, /2 faits non lus/, 'le lecteur d’écran entend le même compte');

assert.equal(ouvert.bouton.expanded, 'true', 'le toucher déplie le journal');
assert.equal(ouvert.panneau.hidden, false, 'le panneau est alors visible');
assert.equal(ouvert.badge, null, 'une fois ouvert, il n’y a plus de fait « non lu »');
assert.match(ouvert.texte, /Tercio de cuivre/, 'le panneau raconte le premier échange');
assert.match(ouvert.texte, /−2/, 'et les dégâts du second');

assert.equal(referme.panneau.hidden, true, 'un second toucher referme le panneau');
assert.equal(referme.badge, null, 'les faits déjà lus ne rallument pas le badge');
assert.equal(hors.panneau.hidden, true, 'un toucher ailleurs referme le panneau, comme une infobulle');
assert.equal(echap.panneau.hidden, true, 'Échap le referme aussi, sans quitter la table');
assert.equal(nouveau.badge, '1', 'un fait qui arrive après la lecture rallume le badge — seulement lui');
assert.equal(vide.bouton.exists, false, 'sans échange à raconter, la table ne porte aucun onglet vide');

// ── 2. Où vit l'onglet dans la feuille ──────────────────────────────────────
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

const onglet = css.slice(css.indexOf('.rpg-combat-feed {'), css.indexOf('.rpg-combat-feed__toggle {'));
assert.ok(onglet.length > 0, 'la feuille porte l’onglet du journal');
assert.match(onglet, /position:\s*absolute;/, 'l’onglet se pose dans la table');
assert.match(onglet, /top:\s*12px;/, 'il s’aligne sur la rangée de la navigation, en haut');
assert.match(onglet, /left:\s*12px;/, 'et sur le bord gauche — le coin que rien ne joue');
assert.doesNotMatch(onglet, /bottom:/,
  'plus d’ancrage en bas à gauche : c’est là qu’il recouvrait la plaque du joueur et la main');
assert.match(onglet, /pointer-events:\s*none;/, 'l’onglet ne capte aucun geste : la table reste jouable dessous');

const panneau = css.slice(css.indexOf('.rpg-combat-feed__panel {'), css.indexOf('.rpg-combat-feed__panel[hidden]'));
assert.match(panneau, /position:\s*absolute;/, 'le panneau se pose sous son onglet');
assert.match(panneau, /top:\s*calc\(100% \+ 6px\);/, 'il tombe juste sous la capsule');
assert.match(panneau, /width:\s*min\(286px, calc\(100vw - 24px\)\);/, 'sa largeur se mesure au viewport');
assert.match(panneau, /max-height:\s*min\(200px, 56vh\);/, 'sa hauteur aussi : il ne prend jamais la table entière');
assert.match(panneau, /pointer-events:\s*auto;/, 'ouvert, il peut défiler sous le doigt');
assert.match(css, /\.rpg-combat-feed__panel\[hidden\]\s*\{\s*display:\s*none;/, 'la règle `hidden` l’emporte sur le `display` du panneau');
assert.match(css, /\.rpg-combat-feed__toggle\s*\{[^}]*pointer-events:\s*auto;/s, 'seule la capsule prend le pointeur');

assert.doesNotMatch(css, /\.rpg-combat-feed \{[^}]*width:\s*min\(286px/s,
  'le panneau déplié ne donne plus sa largeur ni sa hauteur à l’onglet');
assert.doesNotMatch(css, /\.rpg-combat-feed \{[^}]*left:\s*6px;[^}]*bottom:/s,
  'la variante téléphone ne recolle plus le journal en bas à gauche');

// ── 3. Au doigt : la cellule `coin`, devant le trésor ───────────────────────
assert.match(mobileCss, /@supports \(height:\s*100svh\)/, 'le gabarit tactile reste en place');
assert.match(mobileCss,
  /\.rpg-battle--touch \.card-table > :is\([^)]*\.rpg-combat-feed[^)]*\)\s*\{/s,
  'au doigt, l’onglet suit les autres pièces de la grille (position rendue au flux)');
assert.match(mobileCss,
  /\.rpg-battle--touch \.card-table > \.rpg-combat-feed \{\s*grid-area:\s*coin;\s*align-self:\s*center;\s*justify-self:\s*start;\s*\}/s,
  'il occupe la cellule `coin` de la rangée de navigation, à gauche, sans toucher aux plaques');
assert.match(mobileCss,
  /\.rpg-battle--touch \.rpg-combat-feed__toggle \{[^}]*min-height:\s*32px;/s,
  'la cible tactile garde le plancher des commandes secondaires (32 px)');

// Le journal reste monté une seule fois, dans la table, et à côté du plateau
// — pas dans le bas de page du duel ni dans la colonne des commandes.
assert.equal((page.match(/<CombatFeed events=\{duel\.combatFeed\} \/>/g) ?? []).length, 1,
  'la table monte un seul journal, avec les faits du moteur');
assert.doesNotMatch(page, /<CombatFeed[^>]*className=/,
  'le journal ne se glisse pas dans une colonne de commandes');

console.log('✓ journal du duel : onglet fermé par défaut, panneau à la demande, badge des faits non lus');
console.log('✓ ancrage en haut à gauche sur PC, cellule `coin` au doigt — plus rien sur la plaque du joueur ni sur la main');
