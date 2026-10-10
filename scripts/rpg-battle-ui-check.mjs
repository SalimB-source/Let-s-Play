import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface du duel : rendu jsdom, aperçu instantané au survol,
// aperçu au clic/sur magie, Rapidité, commandes, cadres par rareté et bloqueurs.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-battle-smoke.jsx', outDir: 'node_modules/.cache/rpg-battle', emptyOutDir: true },
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

const { checkRpgBattle } = await import('../node_modules/.cache/rpg-battle/rpg-battle-smoke.js');
try {
  await checkRpgBattle(assert);
} finally {
  dom.window.close();
}

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const duelEngine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
assert.match(battlePage, /const ELEMENT_GLYPHS = \{ braise: '🔥', eau: '💧', sable: '⏳', hybride: '🔥⏳' \};/,
  'les éléments utilisent flamme, goutte d’eau, sablier et repère bicolore');
assert.match(battlePage, /cardColorCost\(carte\)[\s\S]*?rpg-mana-cost__hybrid-pips/,
  'les coûts hybrides montrent leurs deux pips colorés');
assert.match(battlePage, /const demanderCouleurMana = \(event, terrain\) => \{[\s\S]*?terrainManaColors\(terrain\.carteId\)[\s\S]*?setTerrainManaChoix/,
  'Pétra ouvre un choix de production de mana dans l’interface');
assert.match(battlePage, /rpg-terrain-mana-choice__options[\s\S]*?couleurLabel\(couleur\)/,
  'le choix de mana affiche Braise et Sable comme options accessibles');
assert.match(duelEngine, /export function rpgEngagerTerrain\([\s\S]*?couleurChoisie = null[\s\S]*?terrainManaColors\(terrain\.carteId\)/,
  'le moteur accepte explicitement une des couleurs produites par Pétra');
assert.match(battleCss, /\.rpg-card-element-badge--sable\s*\{[^}]*drop-shadow\(0 0 2px rgba\(255, 215, 98, \.8\)\)/,
  'le sablier Sable est souligné par un halo doré pour rester lisible');
assert.match(battlePage, /rpgDestructionsDepuis\(duel, debutJournalDestructions\)[\s\S]*?evenement\.sourceElements\.includes\('braise'\)/,
  'la combustion dépend des sources réelles de chaque destruction');
assert.match(battlePage, /effet\.bruleeParBraise \? ' is-burning' : ''/,
  'la variante de combustion n’est ajoutée qu’aux victimes de Braise');
assert.match(battleCss, /\.rpg-card-destruction-fx\.is-burning > img\s*\{[^}]*rpg-card-burn-art/s,
  'une victime de Braise voit son illustration se consumer');
assert.match(battleCss, /@keyframes rpg-burn-flames/,
  'la combustion affiche des flammes qui montent sur la carte');
assert.match(battlePage, /rpg-card-protection/,
  'les créatures protégées affichent un marqueur de protection');
assert.match(battlePage, /function CardEvasionBadge\([\s\S]*?className="rpg-card-evasion"[\s\S]*?<svg viewBox="0 0 24 24"[\s\S]*?<b>\{esquive\}<\/b>/,
  'Esquive dispose d’une icône SVG avec son niveau');
assert.match(battleCss, /\.rpg-card-evasion\s*\{/,
  'le badge d’Esquive a un style visuel dédié');
assert.match(battlePage, /const afficherApercuSurvol = \(carte, event\) => \{[\s\S]*?setApercuSurvol\(/,
  'le survol déclenche instantanément le calcul de position et l’affichage de l’aperçu');
assert.match(battlePage, /onMouseEnter=\{\(event\) => afficherApercuSurvol\(carte, event\)\}/,
  'les cartes affichent leur aperçu dès l’entrée de la souris');
assert.match(battlePage, /const cliquerCarteMain = \(carteId\) => \{[\s\S]*?setCarteEnApercu\(carteId\)/,
  'l’aperçu détaillé au clic reste accessible');
assert.match(battlePage, /className="rpg-hover-card-preview__type"[\s\S]*?className="rpg-hover-card-preview__cost"[\s\S]*?className="rpg-hover-card-preview__rules"[\s\S]*?className="rpg-hover-card-preview__stats"/,
  'l’aperçu au survol ne contient que le type, le coût, les effets et les statistiques');
assert.match(battleCss, /\.rpg-hover-card-preview\s*\{[^}]*position:\s*fixed;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s,
  'l’aperçu laisse la table visible derrière lui');
assert.match(battlePage, /function CardRapidityBadge\([\s\S]*?className="rpg-card-rapidity"[\s\S]*?<svg viewBox="0 0 24 24"/,
  'Rapidité reçoit une icône SVG dédiée');
assert.match(duelEngine, /ready: Boolean\(carte\.rapidite\)/,
  'la Rapidité rend la créature prête dès son arrivée');
assert.match(battleCss, /\.rpg-card-rapidity\s*\{[^}]*background:\s*radial-gradient/s,
  'l’icône Rapidité est visible et différenciée de l’Esquive');
assert.match(battlePage, /CombatActionIcon type="attack-all"/,
  'Attaquer avec tous possède son icône rouge dédiée');
assert.match(battlePage, /CombatActionIcon type="confirm"/,
  'Confirmer possède son icône bleu clair dédiée');
assert.doesNotMatch(battlePage, /rpg-btn--declare-attack|CombatActionIcon type="declare"|Déclarer l’attaque/,
  'le bouton Déclarer l’attaque a été retiré');
assert.match(battleCss, /\.rpg-combat-action-icon--attack-all\s*\{[^}]*color:\s*#f26a61/s,
  'l’icône Attaquer avec tous est rouge');
assert.match(battleCss, /\.rpg-combat-action-icon--confirm\s*\{[^}]*color:\s*#9bdcff/s,
  'l’icône Confirmer est bleu clair');
assert.match(battleCss, /\.rpg-terrain\s*\{[^}]*overflow:\s*visible;/s,
  'les cartes de terrain ne sont plus masquées sur leurs bords');
assert.match(battleCss, /\.rpg-terrains\s*\{[^}]*padding:\s*10px 12px 12px;/s,
  'la marge du rail de terrains laisse dépasser sans couper les cartes engagées');
assert.match(battleCss, /\.rpg-card-piles--player\s*\{\s*top:\s*52%;\s*right:\s*auto;\s*left:\s*14px;/,
  'le deck et le cimetière du joueur sont à gauche sur grand écran');
assert.match(battleCss, /\.rpg-card-piles--player\s*\{\s*top:\s*68%;\s*right:\s*auto;\s*left:\s*4px;/,
  'le deck et le cimetière restent à gauche sur mobile');
assert.match(battlePage, /carte\.kind === 'terrain'\) return null;/,
  'les terrains ne rendent pas de badge d’icône élémentaire');
assert.match(battleCss, /\.rpg-card-element-badge\s*\{[^}]*left:\s*var\(--rpg-card-element-marker-left,\s*6%\);/s,
  'le repère de couleur est positionné à gauche de la carte');
assert.match(battlePage, /if \(apres\.atk > entite\.atk \|\| apres\.def > entite\.def\) statsAugmentees\.push\(entite\.entityId\)/,
  'la flèche de gain est réservée aux augmentations d’attaque ou de défense');
assert.match(battlePage, /animerEntites\(renforcees, 'glow', 1100, statsAugmentees\)/,
  'les gains d’attaque ou de défense transmettent leur indicateur à l’animation');
assert.match(battlePage, /<CardElementBadge carte=\{carte\} \/>[\s\S]*?actionFx\?\.statsUp && <span className="rpg-card-stat-boost"/,
  'la flèche de gain apparaît juste après le badge de couleur sur la carte');
assert.match(battleCss, /\.rpg-card--img\s*\{[^}]*--rpg-card-element-marker-top:\s*5%;[^}]*--rpg-card-element-marker-left:\s*6%;[^}]*--rpg-card-element-marker-size:\s*clamp\(16px, 18%, 23px\);[^}]*--rpg-card-element-marker-size-y:\s*clamp\(16px, 14\.4%, 23px\);[^}]*--rpg-card-boost-marker-gap:\s*3px/s,
  'le badge et la flèche partagent leurs repères, avec le décalage vertical adapté au format 4:5');
assert.match(battleCss, /\.rpg-card-element-badge\s*\{[^}]*top:\s*var\(--rpg-card-element-marker-top,\s*5%\);[^}]*left:\s*var\(--rpg-card-element-marker-left,\s*6%\);[^}]*width:\s*var\(--rpg-card-element-marker-size,\s*clamp\(16px, 18%, 23px\)\);/s,
  'l’icône Sable conserve sa position et sa taille, y compris dans les aperçus');
assert.match(battleCss, /\.rpg-card-stat-boost\s*\{[^}]*top:\s*calc\(var\(--rpg-card-element-marker-top\) \+ var\(--rpg-card-element-marker-size-y\) \+ var\(--rpg-card-boost-marker-gap\)\);[^}]*left:\s*var\(--rpg-card-element-marker-left\);[^}]*width:\s*var\(--rpg-card-element-marker-size\);[^}]*#7df190/s,
  'la flèche verte reste juste sous l’icône Sable sur toutes les tailles de carte');
assert.match(battleCss, /\.rpg-card-protection\s*\{[^}]*top:\s*calc\(6% \+ 18px \+ 3px\);[^}]*right:\s*6%;/s,
  'le bouclier de protection temporaire reste visible sous le coût de la carte');
assert.match(battlePage, /canTarget=\{Boolean\(cibleEnCours && modeCible === 'ennemi' && !rpgEstProtegee/,
  'une créature protégée ne se présente pas comme cible légale contre sa couleur');
assert.match(battlePage, /function cardRarityClass\(carte\)[\s\S]*?cardRarityInfo\(carte\)\.key/,
  'les cartes convertissent leur rareté en classe de bordure');
assert.match(battlePage, /function cardRarityStyle\(carte\)[\s\S]*?--rpg-rarity-color/,
  'les cartes transmettent la couleur de rareté à leur style');
assert.match(battleCss, /\.rpg-card\.is-summoning-sick \.rpg-card__img\s*\{[^}]*grayscale\(1\)/s,
  'le mal d’invocation désature visiblement la créature');
assert.match(battleCss, /\.rpg-card__blood\s*\{/, 'les blessures disposent d’un calque de sang dédié');
assert.match(battleCss, /\.rpg-card\.is-wounded \.rpg-card__pt,[^{]+\{[^}]*color:\s*#fff1ee;/s,
  'la défense blessée est affichée en rouge');
assert.match(battleCss, /font:\s*900 11px\/1\.15 Georgia/,
  'les statistiques du champ ont une taille supérieure');
assert.match(battlePage, /if \(res\.resume\.frappeSorcier > 0\) declencherImpactEcran\('dealt'\)/,
  'une attaque directe sur le sorcier déclenche la secousse après acceptation des blocages');
assert.match(battlePage, /if \(res\.resume\.frappeSorcier > 0\) declencherImpactEcran\('received'\)/,
  'une attaque directe reçue déclenche l’effet de dégâts du joueur');
assert.match(battleCss, /\.card-table\.rpg-screen-shake--a\s*\{\s*animation:\s*rpg-screen-shake-a/,
  'la table possède une animation de tremblement dédiée');
assert.match(battleCss, /\.card-table\.rpg-screen-hit--a::after[\s\S]*?radial-gradient\(ellipse at center/,
  'les dégâts reçus affichent une vignette rouge en bord d’écran');
assert.match(battleCss, /\.rpg-card-flight\.is-flying\s*\{\s*animation:\s*rpg-card-flight-to-table/,
  'une carte jouée vole de la main jusqu’à sa destination');
assert.match(battlePage, /demarrerVolCarte\(carte, carteOrigineVolRef\.current\?\.handIndex, \(\) => poserTerrain\(carteId\)\)/,
  'la pose d’un terrain déclenche le vol de sa carte réelle depuis la main');
assert.match(battlePage, /demarrerVolCarte\(carte, carteOrigineVolRef\.current\?\.handIndex, \(\) => poserCarte\(carteId\)\)/,
  'la pose d’une créature déclenche le vol de sa carte réelle depuis la main');
assert.match(battlePage, /data-hand-index=\{i\}/,
  'la carte animée reste liée à son emplacement stable dans la main');
assert.match(battleCss, /\.rpg-card-flight\s*\{[^}]*position:\s*fixed/s,
  'le bouton de carte de la main devient le seul élément volant');
assert.match(battleCss, /\.rpg-terrains::-webkit-scrollbar\s*\{\s*display:\s*none/s,
  'la barre de défilement bleue des terrains est masquée sans supprimer le défilement horizontal');
assert.match(battleCss, /\.rpg-terrain\s*\{\s*width:\s*clamp\(58px, 5\.2vw, 70px\)/,
  'les terrains posés sont plus grands et restent responsifs');
assert.match(battlePage, /const malInvocation = cote === 'joueur' && playerTurn && !entite\.ready/,
  'le gris du mal d’invocation dépend bien du tour du joueur propriétaire');
assert.match(battlePage, /rpgChoisirBloqueurs\(duel, 'joueur', ids\)/,
  'le sorcier choisit ses bloqueurs après la déclaration des attaquants du joueur');
assert.match(battlePage, /if \(!attaquantsBloques\.length\) \{[\s\S]*?resoudreAttaqueJoueur\(combat\);[\s\S]*?return;/,
  'une attaque sans bloqueur est résolue immédiatement, sans étape d’acceptation');
assert.match(battlePage, /const resoudreAttaqueJoueur = \(combat = combatEntrant\)/,
  'la résolution accepte aussi le combat fraîchement déclaré sans attendre un rendu');
assert.match(battlePage, /rpg-actions__combat[\s\S]*?rpg-actions__turn[\s\S]*?rpg-btn--endturn/,
  'les actions de combat sont séparées des actions de tour dans la barre');
assert.match(battlePage, /disabled=\{!monTour \|\| phase \|\| Boolean\(cibleEnCours\) \|\| Boolean\(combatEntrant\)\}/,
  'Fin du tour est indisponible pendant une sélection de combat ou de cible');
assert.match(battlePage, /const RPG_PHASE_STEPS = \[[\s\S]*?id: 'principal'[\s\S]*?id: 'combat'[\s\S]*?id: 'reponse'[\s\S]*?id: 'adverse'[\s\S]*?id: 'termine'/,
  'le rail représente les grandes phases de la partie');
assert.match(battlePage, /const phaseDuelActive = vainqueur[\s\S]*?reponseActive[\s\S]*?combatEntrant \|\| phase[\s\S]*?monTour/,
  'la phase lumineuse suit l’état réel du duel');
assert.match(battlePage, /<PhaseTrack current=\{phaseDuelActive\} \/>/,
  'les phases sont intégrées au groupe de commandes du duel');
assert.match(battleCss, /\.rpg-phase-step\.is-active \.rpg-phase-step__icon\s*\{[^}]*animation:\s*rpg-phase-icon-light/s,
  'l’icône de la phase actuelle s’allume avec un halo animé');
assert.match(battleCss, /\.rpg-bottombar \.rpg-actions__row\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-end;/s,
  'les commandes sont alignées discrètement en bas de table');
assert.match(battleCss, /\/\* Commandes de duel compactes[\s\S]*?\.rpg-bottombar\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s,
  'les commandes restent sans panneau massif ni fond visible');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn,\s*\.rpg-actions__turn \.rpg-btn\s*\{[^}]*display:\s*inline-flex;[^}]*flex-direction:\s*row;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s,
  'les libellés des commandes sont centrés verticalement et horizontalement');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn,\s*\.rpg-actions__turn \.rpg-btn\s*\{[^}]*min-height:\s*30px;[^}]*background:\s*rgba\(10, 9, 9, \.58\);[^}]*box-shadow:\s*none;/s,
  'les actions utilisent des boutons compacts, sans couleurs criardes ni ombres');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--attaque,\s*\.rpg-actions__turn \.rpg-btn--endturn\s*\{[^}]*font: 600 10px\/1\.1 var\(--display\);[^}]*text-transform:\s*none;/s,
  'les actions restent compactes et sans capitales envahissantes');
assert.match(battleCss, /\.rpg-actions__turn \.rpg-btn--endturn\s*\{[^}]*border-color:\s*rgba\(235, 194, 98, \.76\);[^}]*background:\s*linear-gradient\(180deg, rgba\(238, 202, 112, \.98\), rgba\(202, 158, 61, \.96\)\);[^}]*font-weight:\s*800;/s,
  'Fin du tour garde un repère doré compact et bien visible');
assert.match(battlePage, /reponseApresBlocage \? 'À VOUS · RÉPONSE'/,
  'la priorité revient au joueur après le choix des bloqueurs adverses');
assert.match(battlePage, /Accepter les blocages/,
  'le joueur peut accepter les bloqueurs adverses sans lancer d’éphémère');
assert.match(battlePage, /reponseApresBlocage \? carte\.instant/,
  'seuls les éphémères jouables restent actifs pendant cette fenêtre de réponse');
assert.match(battleCss, /\.rpg-blocker-arrow__shaft\s*\{[^}]*stroke:\s*rgba\(255, 219, 54, \.72\)/s,
  'chaque bloqueur assigné garde une flèche jaune visible');
assert.match(battlePage, /setBloqueurSelectionne\(entite\.id\)/,
  'un bloqueur peut être sélectionné au clic, y compris sur écran tactile');
assert.match(battlePage, /assignerBloqueur\(entite\.id, bloqueurSelectionne\)/,
  'un second clic sur l’attaquant attribue le bloqueur sans enlever le glisser-déposer');
assert.match(battlePage, /RPG_DECKS\.map\(\(deck\)/,
  'le menu Deck présente le catalogue de decks existants');
assert.match(battlePage, /RPG_DUEL_CARDS\.filter\(\(carte\)/,
  'le catalogue complet filtre dynamiquement toutes les cartes du duel');
assert.match(battlePage, /className="rpg-card-catalogue"[\s\S]*?Filtrer par couleur[\s\S]*?Filtrer par type/,
  'l’onglet Catalogue propose les filtres de couleur et de type');
assert.match(battlePage, /onChangeScreen\('catalogue'\)[\s\S]*?Catalogue/,
  'Catalogue est accessible depuis le menu des modes');
assert.match(battlePage, /carte\.arrivee\?\.type === 'combat'[\s\S]*?Choisissez une créature adverse/,
  'l’arrivée du Cavalier demande le choix d’une créature adverse');
assert.match(battlePage, /demarrerVolCarte\(carteSource, handIndex, \(\) => finaliserPoseCreature\(carteId, entite\.id\)\)/,
  'la carte réelle vole depuis la main après la sélection de la cible');
assert.match(battleCss, /\.rpg-card-catalogue__art\s*\{[\s\S]*?border:\s*3px solid var\(--rpg-rarity-color/s,
  'les illustrations du catalogue sont plein art avec un cadre piloté par la rareté');
assert.match(battlePage, /⚔<\/span> Jouer\s*<\/button>/,
  'le menu comporte un mode Jouer');
assert.match(battlePage, /cardRarityClass\(carte\)/,
  'les cartes en main, sur table et les aperçus portent leur rareté');
const rarityFrameCss = battleCss.slice(battleCss.lastIndexOf('/* Le bord reste identique'));
assert.match(rarityFrameCss, /\.rpg-card\.rpg-card--rarity-commune,[\s\S]*?\.rpg-card\.rpg-card--rarity-inhabituelle,[\s\S]*?\.rpg-card\.rpg-card--rarity-rare,[\s\S]*?\.rpg-card\.rpg-card--rarity-mythique,[\s\S]*?\.rpg-hand__card\.rpg-card--rarity-commune,[\s\S]*?\.rpg-terrain\.rpg-card--rarity-mythique,[\s\S]*?\.rpg-card-preview__art,[\s\S]*?\.rpg-hover-card-preview__face,[\s\S]*?\{\s*border:\s*3px solid var\(--rpg-rarity-color, #f1f3f5\);/s,
  'main, terrains, aperçus et animations partagent un cadre solide de 3 px piloté par la rareté');
assert.doesNotMatch(battleCss, /\.rpg-hand__card\.is-playable\s*\{[^}]*border-color:/s,
  'la jouabilité conserve son halo sans recolorer la bordure');
assert.doesNotMatch(battleCss, /\.rpg-card\.rpg-card--type-creature\.is-blocker-selected\s*\{[^}]*border-color:/s,
  'la sélection des bloqueurs conserve son halo sans recolorer la bordure');
assert.match(battlePage, /instantanePiocheRef\.current = instantaneActuel/,
  'les changements de paquet déclenchent une détection de pioche pour les deux camps');
assert.match(battlePage, /piocheEnCours \? 'rpg-hand-card--drawing' : ''/,
  'l’animation s’applique à la vraie carte directement dans la main du joueur');
assert.match(battleCss, /\.rpg-card-pile--deck \.rpg-card-pile__stack\s*\{[^}]*width:\s*clamp\(66px/s,
  'les paquets des deux joueurs sont agrandis sur la table');
assert.match(battleCss, /\.rpg-hand__card\.rpg-hand-card--drawing\s*\{[^}]*animation-name:\s*rpg-player-card-draw/s,
  'la pioche anime les vraies cartes en taille réelle dans la main');
assert.match(battleCss, /@keyframes rpg-player-card-draw\s*\{[\s\S]*?translate3d\(-100%, 0, 0\)[\s\S]*?translate3d\(0, 0, 0\)/,
  'les cartes piochées glissent de gauche à droite jusqu’à leur place dans la main');

console.log(
  'check:rpg-ui ✓ — aperçu instantané au survol, concis et transparent, aperçu détaillé au clic et aperçu des magies jouées, '
  + 'icônes flamme/goutte/sablier, protection contre une couleur limitée au tour de pose et au suivant adverse, Rapidité du Fennec avec attaque immédiate et icône, Esquive avec son icône, bouclier visible et flèche verte sous l’icône pour les gains d’ATQ/DÉF, terrain Désert illustré, cadres pilotés par la rareté, couleur à gauche et coût à droite, '
  + 'icône rouge d’attaque globale, icône de confirmation bleu clair, bouton Déclarer l’attaque retiré, type « Type », ATQ/DÉF agrandis, mal d’invocation grisé pour les créatures non rapides, blessures tachées de sang et défense rouge, '
  + 'terrains engagés sans bord tronqué, deck et cimetière du joueur à gauche, vol de carte depuis la main, secousse d’écran sur impact direct et vignette rouge si le joueur est touché, '
  + 'attaque groupée avant confirmation, attaques sans bloqueur résolues automatiquement, faces full art, terrains sans coût, tour, halo jaune et paiement automatique, '
  + 'commandes de combat discrètes, Fin du tour compact et bien visible, phases du duel indiquées par des icônes lumineuses, annulation réversible, magie avec cible, table continue, bloqueurs sélectionnables au clic ou glisser-déposer, flèches jaunes et animations, '
  + 'menu Jouer/Deck/Catalogue, deck hybride Sable/Braise de 40 cartes réellement sélectionné au lancement, coûts à deux couleurs, Pétra cité des géants avec choix de mana manuel et automatique, catalogue filtrable par identité hybride, Cavalier amazigh rare inclus dans le deck et combat ciblé à l’arrivée, illustrations pleines d’action avec figurants et lieux habités, bordures unifiées par rareté, paquets agrandis et vraies cartes qui glissent à taille réelle de gauche à droite dans les mains, régression Rafale.'
);
process.exit(0);
