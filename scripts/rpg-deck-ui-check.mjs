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
assert.match(pageSource, /useEffect\(\(\) => \{ if \(screen !== 'decks'\) \{ setOpenDeckId\(null\); setAtelier\(null\); \} \}, \[screen\]\);/,
  'quitter l’onglet Deck referme l’étagère et l’atelier');
assert.match(pageSource, /decksVisibles\.map\(\(deck\)/, 'tous les decks (catalogue et maison) sont présentés');

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
assert.match(pageSource, /useState\(\(\) => chargerDeckChoisi\(decksMaison, collection\)/,
  'le deck de jeu initial est celui mémorisé lors d’un lancement précédent (maison comprise)');
// Chaque sélection est enregistrée sur l'appareil ; le menu passe par cette fonction.
assert.match(pageSource, /const choisirDeck = \(deckId\) => \{[\s\S]*?deckSeJoue\(deck, collection\)[\s\S]*?setDeckSelectionneId\(deck\.id\);\s*return sauverDeckChoisi\(deck\.id, decksMaison, collection\);/,
  'sélectionner un deck le mémorise sur l’appareil (catalogue et maison, collection vérifiée)');
assert.match(pageSource, /onSelectDeck=\{choisirDeck\}/, 'le menu sélectionne par la fonction qui mémorise');
// Cliquer un boîtier ouvre seulement sa liste ; la sélection passe par le bouton dédié.
assert.match(pageSource, /className="rpg-deck-choice__button"[\s\S]*?setOpenDeckId\(ouvert \? null : deck\.id\)/,
  'cliquer un boîtier ne fait qu’ouvrir ou refermer le deck, sans le sélectionner');
assert.match(pageSource, /<\/button>\s*<button\s+type="button"\s+className=\{`rpg-deck-choice__select/,
  '« Sélectionner » est un bouton voisin, sous le boîtier (jamais imbriqué dans le bouton du boîtier)');
assert.match(pageSource, /disabled=\{!jouable\}/, 'un deck incomplet n’est pas sélectionnable');
// Aucun deck n'est réservé à un camp : la Cour des Djinns se sélectionne et se joue comme les autres.
assert.doesNotMatch(pageSource, /role === 'joueur'/, 'la sélection et le bouton de jeu ne dépendent pas du rôle du deck');
assert.doesNotMatch(pageSource, /Réservé à l’adversaire|DECK ADVERSAIRE|DECK ADVERSE/, 'plus de mention « réservé à l’adversaire »');
// Le sorcier joue la Cour des Djinns, sauf si le joueur la joue : le deck du duel, la plaque adverse
// et la carte « ADVERSAIRE » de l'écran Jouer suivent le même choix (jamais deux fois le même deck).
assert.match(pageSource, /const opponentDeck = deckAdversePour\(playerDeck\);/, 'la carte « ADVERSAIRE » annonce le deck que le sorcier jouera');
assert.match(pageSource, /const deckAdverse = modeTutoriel \|\| etageCourant \|\| sorcierDeck \|\| deckEssai \? null : deckAdversePour\(deckJoueurSelectionne\);/,
  'hors tutoriel et histoire, le sorcier prend le deck choisi par deckAdversePour');
assert.match(pageSource, /sorcierDeck \?\? deckAdverse\?\.cardIds/, 'le moteur reçoit les cartes de ce deck');
assert.match(pageSource, /setDeckAdverseId\(adversaireEssai\?\.id \?\? deckAdverse\?\.id \?\? deckTutorielAdverse\?\.id \?\? null\)/, 'la plaque adverse retient le deck réellement joué');
assert.match(pageSource, /\$\{deckAdverseAffiche\.name\} · \$\{deckColorLabel\(deckAdverseAffiche\)\}/, 'la plaque adverse nomme ce deck');
// « Jouer avec ce deck » démarre avec le deck ouvert sans attendre le rendu suivant ; le bouton
// « Mode histoire » (écran Jouer) ne doit pas transmettre son événement de clic comme identifiant.
assert.match(pageSource, /onStartGame\(deck\.id\)/, '« Jouer avec ce deck » démarre le duel avec le deck ouvert');
assert.match(pageSource, /onClick=\{\(\) => \{ play\('select'\); onContinueRecit\?\.\(\); \}\}/, '« Mode histoire » ne transmet pas l’événement de clic');
assert.match(pageSource, /typeof deckId === 'string'/, 'seul un identifiant de deck est pris en compte au démarrage');
assert.match(pageSource, /options\.deckId \?\? deckSelectionneId/, 'le duel prend le deck demandé, sinon le deck sélectionné');
// Le filtre de couleur écarte les decks de l'étagère elle-même (et non de la liste des cartes).
assert.match(pageSource, /const decksTous = \[\.\.\.RPG_DECKS, \.\.\.decksMaison\];/,
  'l’étagère fusionne le catalogue et les decks maison');
assert.match(pageSource, /decksVisibles\.map\(\(deck\) => \{\s*if \(!deckCorrespondCouleur\(deck, deckCouleur\)\) return null;/,
  'l’étagère n’affiche que les decks retenus par le filtre de couleur');
assert.match(pageSource, /className="rpg-deck-filter" role="group" aria-label="Filtrer les decks par couleur"/,
  'le filtre de couleur est un groupe nommé');
assert.match(pageSource, /aria-pressed=\{actif\}[\s\S]*?changerCouleur\(filtre\.id\)/, 'chaque puce indique si elle est active');
// La Neige, quatrième couleur du set : puce, emblème, boîtier et cadre de couleur.
assert.match(pageSource, /neige: 'Neige'/, 'la puce de filtre Neige existe dans le menu Deck');
assert.match(readSource('../src/games/RpgDeckBox.jsx'), /rpg-emblem--\$\{element\}/, 'les emblèmes de couleur sont dessinés par le même composant SVG');
assert.match(boxCss, /\.rpg-emblem--neige\s*\{\s*color:\s*#a9e0f5;/,
  'l’emblème Neige est un flocon bleu clair');
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

// ── Atelier de deck : la création vit dans l'onglet Deck, pleine largeur quand elle est ouverte ──
assert.match(pageSource, /screen === 'decks' \? \(atelier \? \(/,
  'l’atelier remplace l’étagère quand il est ouvert');
assert.match(pageSource, /<RpgDeckCreation[\s\S]*?onEnregistrer=\{enregistrerAtelier\}/,
  'l’enregistrement de l’atelier passe par le parent (casier + synchronisation)');
assert.match(pageSource, /mode=\{atelier\.mode\}/, 'le wrapper de création reçoit le mode d’ouverture (nouveau, édition, copie)');
assert.match(pageSource, /rpg-deck-choice--neuf/, 'la crate « Nouveau deck » est sur l’étagère');
assert.match(pageSource, /RPG_DECKS_MAISON_LIMITE/, 'l’étagère maison a un plafond affiché');
assert.match(pageSource, /rpg-deck-catalog__sync/, 'la ligne de synchronisation du compte est sur l’étagère');
assert.match(pageSource, /DECK MAISON/, 'les decks maison portent leur étiquette');
assert.match(pageSource, /onSupprimerDeckMaison\(openDeck\.id\)/, 'la suppression d’un deck maison passe par le parent');
assert.match(pageSource, /noterVictoireEtage\(histoireEtageId, maj\)/,
  'une victoire d’étage passe par le hook, qui ouvre ses cartes au Souk');
assert.match(boxCss, /\.rpg-deck-choice--neuf\s*\{/, 'la crate a son style de boîtier entrouvert');

// ── Collection & compte : modules purs, transport Supabase, table SQL ──────────────────────
const collectionSource = readSource('../src/games/rpgCollection.js');
const builderSource = readSource('../src/games/rpgDeckBuilder.js');
const remoteSource = readSource('../src/games/rpgSablierRemote.js');
const hookSource = readSource('../src/games/useDecksSablier.js');
const schemaSource = readSource('../supabase/schema.sql');
assert.match(collectionSource, /COLLECTION_DEPART = RPG_DUEL_CARDS[\s\S]*?rarity === 'commune' \|\| carte\.rarity === 'inhabituelle'/,
  'la dotation de départ est une règle (communes + inhabituelles), pas une liste figée');
assert.match(collectionSource, /RPG_REVELATIONS_PAR_ETAGE = \{/, 'les révélations d’étage sont du contenu déclaré');
assert.match(collectionSource, /export function figerAcquisitions/, 'le gel de migration reprend les cartes déjà gagnées');
assert.match(hookSource, /figerAcquisitions\(\)/, 'le hook pose le gel des acquis au montage');
assert.match(collectionSource, /const acquisNormalise = normaliserAcquis/, 'la collection ne lit des acquis que leur liste de cartes');
assert.match(builderSource, /fusionnerAcquisitions\(local\?\.acquis, distant\?\.acquis\)/, 'la fusion de compte transporte les acquis, gel compris');
assert.match(builderSource, /fusionnerEtatsSablier/, 'la fusion de compte est calculée côté client');
assert.match(builderSource, /normaliserCollection\(local\?\.collection\)/, 'la fusion compare les collections normalisées');
assert.match(remoteSource, /rpg_sablier_progress/, 'le transport parle à la table du compte');
assert.match(remoteSource, /maybeSingle/, 'la lecture tolère l’absence de ligne (compte neuf)');
assert.match(hookSource, /useContext\(AuthContext\)/, 'le hook lit le contexte d’authentification de façon défensive');
assert.match(hookSource, /chargerEtatSablier[\s\S]*sauverCasierMaison[\s\S]*sauverCollectionDistante/,
  'à la connexion, la fusion alimente le casier et le cache de collection locaux');
assert.match(schemaSource, /create table if not exists public\.rpg_sablier_progress/, 'la table du compte existe au schéma');
assert.match(schemaSource, /on public\.rpg_sablier_progress for select to authenticated using \(auth\.uid\(\) = user_id\)/,
  'la table est fermée par RLS à sa propre ligne');
assert.match(readSource('../src/games/RpgDeckAtelier.jsx'), /rpgValiderDeckMaison/, 'l’atelier valide structure ET collection en direct');
assert.match(readSource('../src/games/RpgDeckAtelier.jsx'), /carteReveleePar/, 'les cartes verrouillées annoncent où se débloquer');

// ── L'aperçu au doigt vaut aussi dans le créateur de deck ───────────────────────────────────
// Le geste est délégué par la page au menu entier (l’atelier y vit) : il suffit que les
// cartes de l’atelier portent leur `data-card-id` et que l’astuce annonce le geste au doigt.
const atelierSource = readSource('../src/games/RpgDeckAtelier.jsx');
const creationSource = readSource('../src/games/RpgDeckCreation.jsx');
const choixSource = readSource('../src/games/RpgDeckModeChoice.jsx');
const assistantSource = readSource('../src/games/RpgDeckAssistant.jsx');
const autoSource = readSource('../src/games/rpgDeckAuto.js');
// Le deck compte les exemplaires **payés** : l'atelier ne laisse pas aligner deux
// copies d'une carte achetée une fois (doc 13, D10). Trois portes, un seul stock lu.
const atelierStock = atelierSource;
assert.match(atelierStock, /const validation = useMemo\(\(\) => rpgValiderDeckMaison\(cardIds, collection, exemplaires\)/,
  'la validation de l’atelier consulte le stock, pas le seul quota de rareté');
assert.equal((atelierStock.match(/peutAjouterCarte\(carte\.id, cardIds, collection, exemplaires\)/g) ?? []).length, 3,
  'les trois portes d’ajout de l’atelier — ajout, grille, liste — lisent le même stock');
assert.match(atelierStock, /const limite = plafondVisible\(collection, carte\.id, exemplaires\)/,
  'le plafond affiché dans la grille est celui du deck, pas le quota brut de la carte');
assert.match(creationSource, /limiteDe: \(carte\) => \(carte \? plafondVisible\(collection, carte\.id, exemplaires\) : 0\)/,
  'la génération assistée compose dans le stock : un deck né assisté doit rester enregistrable');
assert.match(creationSource, /genererDeckAssiste\(\{[\s\S]*?style,/,
  'le wrapper transmet le style choisi au moteur de génération');

// ── Le seuil de création : deux portes, puis l'atelier ou l'assistant ────────────────────────
assert.match(choixSource, /rpg-creation__carte--assiste/, 'la porte assistée est identifiée');
assert.match(choixSource, /rpg-creation__carte--manuel/, 'la porte manuelle est identifiée');
assert.equal((choixSource.match(/type="button"/g) ?? []).length >= 2, true, 'les deux portes sont de vrais boutons');
assert.match(creationSource, /useState\(mode === 'nouveau' \? 'choix' : 'manuel'\)/,
  'une création neuve passe par le seuil ; édition et copie ouvrent directement l’atelier');
assert.match(creationSource, /onFermer=\{\(\) => setVue\('choix'\)\}/,
  'annuler l’assistant ramène au seuil, pas à l’étagère');

// ── L'assistant : deux étapes (couleurs, style), plus de choix carte par carte ──────────────
assert.match(assistantSource, /id: 'couleurs'/, 'la première étape reste le choix des couleurs');
assert.match(assistantSource, /id: 'style'/, 'la seconde étape est le style de jeu');
assert.doesNotMatch(assistantSource, /RPG_ASSISTANT_CREATURES|cartesPourEtape/,
  'l’assistant ne fait plus choisir 4 créatures et 4 sorts');
assert.match(assistantSource, /RPG_STYLES_JEU\.map/, 'les trois styles sont rendus depuis les profils du moteur');
assert.match(assistantSource, /onGenerer\(\{ couleurs: \[\.\.\.couleurs\], style \}\)/,
  'la génération ne reçoit que les couleurs et le style');
assert.match(autoSource, /export const RPG_STYLES_JEU = \[/, 'les profils de style sont déclarés dans le moteur pur');
assert.match(autoSource, /id: 'aggro'[\s\S]*?id: 'controle'[\s\S]*?id: 'mix'/,
  'les trois styles aggro, contrôle, mix sont déclarés dans cet ordre');
assert.match(autoSource, /export function bonusStyle/, 'le style pèse sur le score des candidats');

// ── L'atelier manuel minimaliste : filtres fins repliés, panneau allégé ─────────────────────
assert.match(atelierSource, /rpg-atelier__toggle--filtres/, 'un seul bouton déploie les filtres avancés');
assert.match(atelierSource, /aria-expanded=\{filtresAvances\}/, 'le bouton Filtres annonce son état aux lecteurs d’écran');
assert.match(atelierSource, /rpg-atelier__mini-stats/, 'les chiffres du deck tiennent sur une ligne ténue');
assert.match(atelierSource, /rpg-atelier__options/, 'la carte emblème est rangée dans des options repliées');
assert.doesNotMatch(atelierSource, /RpgDeckAssistant|genererDeckAssiste/,
  'l’atelier manuel ne contient plus l’assistant : le choix se fait en amont');
const collectionRules = readSource('../src/games/rpgCollection.js');
assert.match(collectionRules, /export function carteEnPlayset\(carteOuId\)/,
  'le playset (communes et dotation) est une règle nommée, pas une exception éparse');
assert.match(collectionRules, /if \(carte\.rarity === 'commune'\) return true;/,
  'les communes restent au playset : l’étal n’en vend pas, les borner serait une impasse');
assert.match(collectionRules, /return exemplairesPossedables\(collection, cardId, comptes\);/,
  'la pastille du catalogue dit ce que le deck laisse jouer : un seul chiffre, deux écrans');
assert.match(builderSource, /export function reparerDeckHorsStock\(cardIds, collection = null, comptes = null\)/,
  'les decks hérités sont rangés dans leur stock, pas refusés ni gâtés');
assert.match(builderSource, /export function reparerCasierHorsStock\(casier, collection = null, comptes = null\)/,
  'la passe de réparation connaît le casier entier');
assert.match(hookSource, /function etatDeDepart\(acquis\)/,
  'la réparation se joue à la lecture du casier, en même temps que la collection');
assert.match(hookSource, /reparerCasierHorsStock\(fusion\.casier, collectionFusionnee, exemplairesFusionnes\)/,
  'et après la fusion du compte : le stock fusionné décide, sinon on jetterait des copies payées ailleurs');
const atelierCss = stripComments(readSource('../src/games/rpg-deck-atelier.css'));
const battleCss = stripComments(readSource('../src/games/rpg-battle.css'));
const atelierCardOverlay = atelierCss.match(/\.rpg-atelier__carte-art::after\s*\{([^}]*)\}/)?.[1] ?? '';
assert.ok(atelierCardOverlay, 'le voile des illustrations de l’atelier est défini');
assert.doesNotMatch(atelierCardOverlay, /radial-gradient|conic-gradient|color-mix/,
  'les cartes de l’atelier n’ont plus de halo multicolore');
assert.doesNotMatch(atelierCardOverlay, /rgba\(255, 255, 255|repeating-linear-gradient|--rpg-foil-/,
  'les cartes de l’atelier n’ont plus de reflet ni de grain qui glissent sur l’illustration');
assert.equal((atelierCardOverlay.match(/gradient\(/g) ?? []).length, 1,
  'le voile des cartes de l’atelier n’a qu’une couche, celle de la lisibilité');
assert.match(atelierCardOverlay, /linear-gradient\(0deg, rgba\(5, 4, 7, \.55\)/,
  'le voile sombre de lisibilité reste sous les noms des cartes');
assert.equal((atelierSource.match(/data-card-id=/g) ?? []).length, 2,
  'les deux listes de l’atelier — bibliothèque et deck en cours — portent `data-card-id`');
assert.match(pageSource, /data-scene="menu" onPointerDown=\{demarrerAppuiLongCarte\}/,
  'l’écran de menu — atelier compris — arme l’appui long d’aperçu');
assert.match(atelierSource, /rpg-atelier__astuce/, 'l’atelier annonce le geste d’aperçu');
assert.match(atelierCss, /\.rpg-atelier__astuce\s*\{[^}]*display:\s*none/,
  'l’astuce reste masquée au pointeur fin : le survol ouvre déjà l’aperçu');
assert.match(atelierCss, /@media \(pointer: coarse\)\s*\{[^{}]*\.rpg-atelier__astuce\s*\{\s*display:\s*block/,
  'au doigt, l’astuce s’affiche');
assert.match(battleCss, /\.rpg-battle \[data-card-id\] img,[\s\S]{0,120}\.rpg-battle img\[data-card-id\]\s*\{\s*-webkit-user-drag:\s*none/,
  'toute carte affichée — créateur de deck compris — refuse le drag natif de son illustration');

console.log('✓ Atelier de decks : crate « Nouveau deck » → seuil assistée/manuelle, assistant couleurs → style (aggro, contrôle, mix) générant dans la collection, éditeur manuel minimaliste (filtres repliés, nom, emblème, cartes, validation live collection), brouillons enregistrables, decks maison jouables en duel libre, édition/renommage/suppression en deux temps, copie, compte Supabase et fusion d’appareils');
