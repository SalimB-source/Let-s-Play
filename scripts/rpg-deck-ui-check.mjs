import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface de l'onglet Deck : boîtiers 3D illustrés, liste des cartes qui
// n'apparaît qu'une fois un deck cliqué (étagère fermée / deck ouvert), bouton « Sélectionner »
// dont le choix est mémorisé sur l'appareil (Cour des Djinns comprise), et filtre par couleur.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-deck-smoke.jsx', outDir: 'node_modules/.cache/rpg-deck', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
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

const { checkRpgDecks } = await import('../node_modules/.cache/rpg-deck/rpg-deck-smoke.js');
try {
  await checkRpgDecks(assert);
} finally {
  dom.window.close();
}

// ── Garde-fous sur les sources (le rendu réel a été mesuré au navigateur) ──────────────────
const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const pageSource = readSource('../src/games/RpgDuelPage.jsx');
const boxCss = stripComments(readSource('../src/games/rpg-deckbox.css'));

// La liste des cartes n'est rendue que dans la fiche d'un deck ouvert, jamais à côté de l'étagère.
assert.match(pageSource, /\{openDeck && \(\s*<section id="rpg-deck-detail"/,
  'la fiche du deck (et sa liste) n’est rendue que lorsqu’un deck est ouvert');
assert.equal((pageSource.match(/className="rpg-deck-list"/g) ?? []).length, 1, 'une seule liste de cartes, dans la fiche');
assert.ok(pageSource.indexOf('className="rpg-deck-list"') > pageSource.indexOf('{openDeck && ('),
  'la liste des cartes se trouve dans la fiche du deck ouvert');
assert.match(pageSource, /useEffect\(\(\) => \{ if \(screen !== 'decks'\) setOpenDeckId\(null\); \}, \[screen\]\);/,
  'quitter l’onglet Deck referme l’étagère');
assert.match(pageSource, /RPG_DECKS\.map\(\(deck\)/, 'tous les decks sont présentés');

// Le boîtier est bien de la 3D CSS : perspective, faces posées dans l'espace, volume conservé.
assert.match(boxCss, /\.rpg-deckbox\s*\{[^}]*perspective:/, 'le boîtier pose une perspective');
assert.equal((boxCss.match(/transform-style:\s*preserve-3d/g) ?? []).length >= 2, true, 'les calques du boîtier préservent la 3D');
for (const face of ['front', 'back', 'left', 'right', 'top', 'bottom']) {
  assert.match(boxCss, new RegExp(`\\.rpg-deckbox__face--${face}\\s*\\{[^}]*transform:[^;]*translateZ|\\.rpg-deckbox__face--${face}\\s*\\{[^}]*transform:[^;]*rotate[XY]`),
    `la face « ${face} » est placée dans l'espace`);
}
assert.match(boxCss, /backface-visibility:\s*hidden/, 'les faces cachées du boîtier ne transparaissent pas');
assert.match(boxCss, /@media \(prefers-reduced-motion: reduce\)[^{]*\{[^}]*\.rpg-deckbox__sway\s*\{\s*animation:\s*none/,
  'le balancement s’arrête pour qui préfère les animations réduites');
// Le clic est porté par un bouton voisin du décor 3D (un <button> aplatit parfois la 3D de ses enfants).
assert.match(pageSource, /<DeckBox deck=\{deck\}[^>]*\/>\s*<button/, 'le bouton de choix est voisin du boîtier 3D, pas son parent');

// ── Sélection du deck de jeu et mémorisation locale ──────────────────────────────────────────
// Au lancement du jeu, le deck de jeu est celui que le joueur avait sélectionné (sinon le défaut).
assert.match(pageSource, /useState\(\(\) => chargerDeckChoisi\(\)/,
  'le deck de jeu initial est celui mémorisé lors d’un lancement précédent');
// Chaque sélection est enregistrée sur l'appareil ; le menu passe par cette fonction.
assert.match(pageSource, /const choisirDeck = \(deckId\) => \{[\s\S]*?setDeckSelectionneId\(deck\.id\);\s*return sauverDeckChoisi\(deck\.id\);/,
  'sélectionner un deck le mémorise sur l’appareil');
assert.match(pageSource, /onSelectDeck=\{choisirDeck\}/, 'le menu sélectionne par la fonction qui mémorise');
// Cliquer un boîtier ouvre seulement sa liste ; la sélection passe par le bouton dédié.
assert.match(pageSource, /className="rpg-deck-choice__button"[\s\S]*?onClick=\{\(\) => setOpenDeckId\(deck\.id\)\}/,
  'cliquer un boîtier ne fait qu’ouvrir le deck, sans le sélectionner');
assert.match(pageSource, /<\/button>\s*<button\s+type="button"\s+className=\{`rpg-deck-choice__select/,
  '« Sélectionner » est un bouton voisin, sous le boîtier (jamais imbriqué dans le bouton du boîtier)');
assert.match(pageSource, /disabled=\{!jouable\}/, 'un deck incomplet n’est pas sélectionnable');
// Aucun deck n'est réservé à un camp : la Cour des Djinns se sélectionne et se joue comme les autres.
assert.doesNotMatch(pageSource, /role === 'joueur'/, 'la sélection et le bouton de jeu ne dépendent pas du rôle du deck');
assert.doesNotMatch(pageSource, /Réservé à l’adversaire|DECK ADVERSAIRE|DECK ADVERSE/, 'plus de mention « réservé à l’adversaire »');
// Le sorcier joue la Cour des Djinns, sauf si le joueur la joue : le deck du duel, la plaque adverse
// et la carte « ADVERSAIRE » de l'écran Jouer suivent le même choix (jamais deux fois le même deck).
assert.match(pageSource, /const opponentDeck = deckAdversePour\(playerDeck\);/, 'la carte « ADVERSAIRE » annonce le deck que le sorcier jouera');
assert.match(pageSource, /const deckAdverse = etageCourant \|\| sorcierDeck \? null : deckAdversePour\(deckJoueurSelectionne\);/,
  'en duel libre, le sorcier prend le deck choisi par deckAdversePour');
assert.match(pageSource, /sorcierDeck \?\? deckAdverse\?\.cardIds/, 'le moteur reçoit les cartes de ce deck');
assert.match(pageSource, /setDeckAdverseId\(deckAdverse\?\.id \?\? null\)/, 'la plaque adverse retient le deck réellement joué');
assert.match(pageSource, /\$\{deckAdverseAffiche\.name\} · \$\{deckColorLabel\(deckAdverseAffiche\)\}/, 'la plaque adverse nomme ce deck');
// « Jouer avec ce deck » démarre avec le deck ouvert sans attendre le rendu suivant ; le bouton
// « Lancer le duel » ne doit pas transmettre son événement de clic comme identifiant de deck.
assert.match(pageSource, /onStartGame\(deck\.id\)/, '« Jouer avec ce deck » démarre le duel avec le deck ouvert');
assert.match(pageSource, /onClick=\{\(\) => onStartGame\(\)\}/, '« Lancer le duel » ne transmet pas l’événement de clic');
assert.match(pageSource, /typeof deckId === 'string'/, 'seul un identifiant de deck est pris en compte au démarrage');
assert.match(pageSource, /options\.deckId \?\? deckSelectionneId/, 'le duel prend le deck demandé, sinon le deck sélectionné');
// Le filtre de couleur écarte les decks de l'étagère elle-même (et non de la liste des cartes).
assert.match(pageSource, /RPG_DECKS\.map\(\(deck\) => \{\s*if \(!deckCorrespondCouleur\(deck, deckCouleur\)\) return null;/,
  'l’étagère n’affiche que les decks retenus par le filtre de couleur');
assert.match(pageSource, /className="rpg-deck-filter" role="group" aria-label="Filtrer les decks par couleur"/,
  'le filtre de couleur est un groupe nommé');
assert.match(pageSource, /aria-pressed=\{actif\}[\s\S]*?changerCouleur\(filtre\.id\)/, 'chaque puce indique si elle est active');
// La Neige, quatrième couleur du set : puce, emblème, boîtier et cadre de couleur.
assert.match(pageSource, /neige: 'Neige'/, 'la puce de filtre Neige existe dans le menu Deck');
assert.match(pageSource, /rpg-emblem--\$\{element\}/, 'les emblèmes de couleur sont dessinés par le même composant SVG');
assert.match(boxCss, /\.rpg-emblem--neige\s*\{\s*color:\s*#a9e0f5;/,
  'l’emblème Neige est un cristal de glace bleu clair');
assert.match(boxCss, /\.rpg-deckbox--neige\s*\{[^}]*--accent:\s*#a9e0f5;/,
  'le boîtier du deck Neige a son laiton bleu clair');
assert.match(boxCss, /\.rpg-deck-filter__chip--neige\.is-active\s*\{/,
  'la puce Neige active a sa teinte');

// Le bouton passe AU-DESSUS de la zone cliquable étirée du boîtier, sinon son clic ouvrirait le deck.
assert.match(boxCss, /\.rpg-deck-choice__button::before\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0/,
  'la zone cliquable du boîtier est étirée sur toute la carte');
assert.match(boxCss, /\.rpg-deck-choice__select\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*[1-9]/,
  '« Sélectionner » est posé au-dessus de la zone cliquable du boîtier');
// Dans la disposition « deck ouvert » (grille à deux colonnes), il occupe toute la largeur de la carte.
assert.match(boxCss, /\.rpg-deck-catalog--open \.rpg-deck-choice__select\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/,
  'deck ouvert : le bouton s’étend sous le boîtier et sa légende');
// Au doigt, des cibles d'au moins 44 px ; le deck de jeu courant se distingue du bouton « Sélectionner ».
assert.match(boxCss, /@media \(pointer: coarse\)\s*\{[^{}]*\.rpg-deck-choice__select[^{}]*\{[^}]*min-height:\s*44px/,
  'au doigt, le bouton « Sélectionner » fait au moins 44 px de haut');
assert.match(boxCss, /\.rpg-deck-choice__select\.is-selected\s*\{/, 'le deck sélectionné a son propre style');
assert.match(boxCss, /\.rpg-deck-choice__select:disabled\s*\{/, 'le bouton du deck adverse a son propre style');

console.log('✓ Onglet Deck : boîtiers 3D illustrés, liste des cartes masquée tant qu’aucun deck n’est cliqué, sélection mémorisée sur l’appareil, filtre par couleur, fermeture et retour sur l’onglet');
