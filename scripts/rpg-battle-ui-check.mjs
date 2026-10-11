import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface du duel : rendu jsdom, aperçu instantané au survol,
// aperçu au clic/sur magie, Rapidité, commandes, cadres par élément et bloqueurs.
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
const { RPG_PLATEAUX } = await import('../src/games/rpgPlateaux.js');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const duelEngine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const aiBrain = readFileSync(new URL('../src/games/rpgAI.js', import.meta.url), 'utf8');
const cardsSource = readFileSync(new URL('../src/games/rpgCards.js', import.meta.url), 'utf8');
const tableCardSource = battlePage.slice(battlePage.indexOf('function TableCard('), battlePage.indexOf('function HoverCardPreview('));
const hoverPreviewSource = battlePage.slice(battlePage.indexOf('function HoverCardPreview('), battlePage.indexOf('function ConfirmationSort('));
const confirmSortSource = battlePage.slice(battlePage.indexOf('function ConfirmationSort('), battlePage.indexOf('function SpellAnnouncement('));
assert.match(battlePage, /const ELEMENT_GLYPHS = \{ braise: '🔥', eau: '💧', sable: '⏳', hybride: '🔥⏳' \};/,
  'les éléments utilisent flamme, goutte d’eau, sablier et repère bicolore');
assert.match(battleCss, /\.rpg-card-element-badge--sable\s*\{[^}]*drop-shadow\(0 0 2px rgba\(255, 215, 98, \.8\)\)/,
  'le sablier Sable est souligné par un halo doré pour rester lisible');
assert.match(battlePage, /terrainManaColors\(terrain\.carteId\)[\s\S]*?rpg-terrain-mana-choice__option--\$\{couleur\}[\s\S]*?engager\(terrainId, couleur\)/,
  'Pétra ouvre un choix manuel de couleur et engage le mana sélectionné');
assert.match(battleCss, /\.rpg-card-element-badge--hybride\s*\{[^}]*flex-direction:\s*column;[^}]*gap:\s*2px;/s,
  'les icônes de couleur hybrides sont empilées verticalement');
assert.match(battleCss, /\.rpg-card-element-badge__pip\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*1;[^}]*border-radius:\s*50%;[^}]*font:\s*inherit;/s,
  'chaque icône hybride garde la taille normale d’un badge couleur');
assert.doesNotMatch(battlePage, /rpg-mana-cost__hybrid-pips|rpg-mana-cost__pip/,
  'les cartes hybrides n’affichent plus d’icônes de couleur à côté du coût numérique');
assert.doesNotMatch(battleCss, /\.rpg-mana-cost__(?:hybrid-pips|pip)\b/,
  'les styles des icônes de couleur accolées au coût hybride ont été supprimés');
assert.match(battlePage, /aria-label=\{`Coût : \$\{cardCostLabel\(carte\)\}`\}/,
  'le libellé accessible conserve le détail des couleurs exigées pour payer le coût hybride');
assert.match(battlePage, /RPG_DUEL_CARDS\.filter\(\(carte\) => \{[\s\S]*?catalogueCouleur === 'hybride'[\s\S]*?colors\.includes\(catalogueCouleur\)/,
  'le catalogue filtre les hybrides seuls ou via chacune de leurs couleurs');
assert.match(battleCss, /\.rpg-terrain-mana-choice\s*\{[^}]*position:\s*absolute;[^}]*z-index:/s,
  'le sélecteur de couleur de Pétra reste lisible au-dessus du rail des terrains');
assert.match(battlePage, /rpgDestructionsDepuis\(duel, debutJournalDestructions\)[\s\S]*?evenement\.sourceElements\.includes\('braise'\)/,
  'la combustion dépend des sources réelles de chaque destruction');
assert.match(battlePage, /effet\.bruleeParBraise \? ' is-burning' : ''/,
  'la variante de combustion n’est ajoutée qu’aux victimes de Braise');
assert.match(battleCss, /\.rpg-card-destruction-fx\.is-burning > img\s*\{[^}]*rpg-card-burn-art/s,
  'une victime de Braise voit son illustration se consumer');
assert.match(battleCss, /@keyframes rpg-burn-flames/,
  'la combustion affiche des flammes qui montent sur la carte');
assert.match(duelEngine, /journaliserDestruction\(duel, \{ id: terrainDetruit\.id \}, sourceElement\)/,
  'la destruction aléatoire d’un terrain garde l’identité de la victime et sa source Braise');
assert.match(battlePage, /querySelectorAll\('\[data-entity-id\], \[data-terrain-id\]'\)[\s\S]*?duel\.joueur\.terrains\.map[\s\S]*?duel\.sorcier\.terrains\.map/s,
  'les deux rangées de terrains sont incluses dans les instantanés d’animation de destruction');
assert.match(battlePage, /data-terrain-id=\{terrain\.id\}/,
  'chaque terrain visible fournit son identifiant pour animer sa destruction sans confondre le Djinn source');
assert.doesNotMatch(battlePage, /function CardRapidityBadge|function CardEvasionBadge|CardProtectionBadge|rpg-card-(rapidity|evasion|protection|stat-boost)/,
  'aucun badge d’effet n’est rendu dans les visuels de cartes');
assert.doesNotMatch(battleCss, /\.rpg-card-(rapidity|evasion|protection|stat-boost)\b/,
  'les styles des icônes d’effet sur carte ont été retirés');
assert.doesNotMatch(tableCardSource, /CardRapidityBadge|CardEvasionBadge|CardProtectionBadge|rpg-card-stat-boost/,
  'les icônes d’effets sont absentes des cartes posées');
assert.doesNotMatch(confirmSortSource, /CardRapidityBadge|CardEvasionBadge|CardProtectionBadge|rpg-card-stat-boost/,
  'la confirmation de sort ne montre aucune icône d’effet');
assert.doesNotMatch(hoverPreviewSource, /CardRapidityBadge|CardEvasionBadge|CardProtectionBadge|rpg-card-stat-boost/,
  'l’aperçu au survol ne montre aucune icône d’effet');
assert.match(battlePage, /function cardEffectLines\(text\)[\s\S]*?\.split\(/,
  'les effets des cartes sont séparés pour les afficher sur plusieurs lignes');
assert.match(confirmSortSource, /rpg-spell-confirm__rules[\s\S]*?effets\.map/,
  'chaque effet occupe une ligne dans la confirmation de sort');
assert.match(hoverPreviewSource, /rpg-hover-card-preview__rules[\s\S]*?effets\.map/,
  'chaque effet occupe une ligne dans l’aperçu au survol');
assert.match(battlePage, /const afficherApercuSurvol = \(carte, event\) => \{[\s\S]*?setApercuSurvol\(/,
  'le survol déclenche l’aperçu instantané de la carte');
assert.match(tableCardSource, /onHoverCard\?\.\(carte, event\)/,
  'les créatures en jeu utilisent le même aperçu sans icône d’état');
assert.match(battlePage, /onMouseEnter=\{\(event\) => afficherApercuSurvol\(carte, event\)\}/,
  'les cartes affichent leur aperçu dès l’entrée de la souris');
assert.match(battlePage, /const cliquerCarteMain = \(carteId, handIndex\) => \{[\s\S]*?jouerCarteDepuisMain\(carteId, handIndex\)/,
  'cliquer une carte de la main la joue directement');
assert.match(battlePage, /carte\.kind === 'magie' && peutJouerCarte\(carte\)[\s\S]*?setConfirmationSort\(\{ carteId, handIndex \}\)/,
  'cliquer une magie demande une confirmation avant le lancement');
assert.doesNotMatch(battlePage, /function CardPreview\(|setCarteEnApercu|ouvrirApercuEntite/,
  'l’aperçu détaillé au clic a été retiré au profit du clic action');
assert.doesNotMatch(battleCss, /\.rpg-card-preview\b/,
  'les styles de l’aperçu au clic ont été retirés');
assert.match(battleCss, /\.rpg-spell-confirm\s*\{/,
  'la confirmation de lancement des magies est stylée');
assert.match(battlePage, /onClick=\{\(\) => cliquerCreatureJoueur\(entite\)\}/,
  'le clic sur une créature alliée agit directement, sans aperçu');
assert.match(battlePage, /onClick=\{\(\) => cliquerCreatureEnnemie\(entite\)\}/,
  'le clic sur une créature adverse agit directement, sans aperçu');
assert.match(battlePage, /if \(!terrainInactif\) demanderCouleurMana\(event, terrain\);/,
  'le clic sur un terrain produit le mana directement, sans aperçu');
assert.match(battlePage, /className="rpg-hover-card-preview__type"[\s\S]*?className="rpg-hover-card-preview__cost"[\s\S]*?className="rpg-hover-card-preview__rules"[\s\S]*?className="rpg-hover-card-preview__stats"/,
  'l’aperçu au survol ne contient que le type, le coût, les effets et les statistiques');
assert.match(battleCss, /\.rpg-hover-card-preview\s*\{[^}]*grid-template-columns:\s*minmax\(190px, 232px\) minmax\(0, 1fr\);[^}]*width:\s*min\(680px, calc\(100vw - 20px\)\);/s,
  'l’aperçu au survol est agrandi à 680 px');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview\s*\{[^}]*background:/s,
  'l’aperçu au survol n’a plus de fond principal');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview\s*\{[^}]*(?:border|box-shadow):/s,
  'l’aperçu au survol n’a plus de grand cadre ni l’ombre du cadre autour du contenu');
assert.match(battleCss, /\.rpg-hover-card-preview__details\s*\{[^}]*background:\s*rgba\(5, 8, 11, \.8\);/s,
  'seul le fond de l’encadré des infos reste pour la lisibilité');
assert.match(battlePage, /const largeurApercu = Math\.min\(680,[\s\S]*?const hauteurApercu = Math\.min\(400,/,
  'le calcul de placement prend en compte la nouvelle taille de l’aperçu');
assert.match(battleCss, /\.rpg-hover-card-preview__rules\s*\{[^}]*display:\s*grid;[^}]*gap:\s*7px;[\s\S]*?\.rpg-hover-card-preview__rules > span\s*\{\s*display:\s*block;/s,
  'chaque effet occupe sa propre ligne dans l’aperçu au survol');
assert.match(duelEngine, /ready: Boolean\(carte\.rapidite\)/,
  'la Rapidité rend la créature prête dès son arrivée, sans badge d’effet sur la carte');
assert.match(duelEngine, /cibleRapideId[\s\S]*?resume\.coupsRapides\.push[\s\S]*?for \(const coup of resume\.coupsRapides\)[\s\S]*?enregistrerDegatsCombat\(\s*degatsCombat,\s*adv,\s*coup\.cibleId,\s*coup\.degats/s,
  'le Coup rapide inflige l’attaque de la créature choisie, sans combat de riposte');
assert.match(duelEngine, /export function rpgPeutBloquerAttaquant\(bloqueur, attaquant\)\s*\{[\s\S]*?!attaquant\.envol \|\| Boolean\(bloqueur\.envol\)/,
  'l’Envol n’autorise que les créatures volantes à bloquer un attaquant volant');
assert.match(aiBrain, /peutBloquerAttaquant\(bloqueur, attaquant\)\s*&&\s*!estProtegee\(attaquant, cardColors\(duelCardById\(bloqueur\.carteId\)\)\)/,
  'l’IA écarte les bloqueurs sans Envol face à un attaquant volant');
assert.match(duelEngine, /if \(!rpgPeutBloquerAttaquant\(bloqueur, attaquant\)\) return \{ ok: false, raison: 'envol' \}/,
  'le moteur refuse un blocage terrestre contre un attaquant avec Envol');
assert.match(battlePage, /a Envol : seules les créatures avec Envol peuvent le bloquer\./,
  'l’interface explique pourquoi un bloqueur sans Envol est refusé');
assert.match(battlePage, /Aucune de vos créatures n’a Envol : leurs créatures volantes ne peuvent pas être bloquées\./,
  'l’annonce de l’attaque adverse signale les volants impossibles à bloquer');
assert.match(duelEngine, /export function rpgLancerAttaque\([\s\S]*?appliquerDegatsDeCombatSimultanes\(duel, degatsAvantCombat\)[\s\S]*?const coupsNormaux = degatsCombat[\s\S]*?appliquerDegatsDeCombatSimultanes\(duel, coupsNormaux\)/,
  'les capacités de combat du Sahir se résolvent avant les blessures normales');
assert.match(duelEngine, /appliquerDegatsDeCombatSimultanes\(apresCapacites, degatsAvantCombat\)[\s\S]*?const repartitionFinale/,
  'le partage tient compte des survivants après les capacités préalables');
assert.match(battlePage, /attaquantsVivants,\s*blocages,\s*null, \/\/ Le moteur partage/,
  'la défense ne transmet pas de partage figé avant les capacités');
assert.match(battlePage, /attaquantsVivants,\s*blocages,\s*null, \/\/ Ne pas figer/,
  'l’attaque du joueur ne transmet pas de partage figé avant les capacités');
assert.match(battlePage, /cibleAttaqueEnCours[\s\S]*?prochainCoupRapideSansCible[\s\S]*?ciblesAttaque/,
  'l’interface exige la cible de chaque Coup rapide avant de confirmer les attaquants');
assert.match(battleCss, /\.rpg-card\.is-coup-rapide-cible\s*\{[^}]*outline:\s*4px solid #ffb15e/s,
  'la victime du Coup rapide est mise en évidence pendant la résolution');
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
assert.match(battlePage, /canTarget=\{Boolean\([\s\S]*?cibleEnCours && modeCible === 'ennemi' && !rpgEstProtegee/,
  'une créature protégée ne se présente pas comme cible légale contre sa couleur');
assert.match(battlePage, /function cardFrameClass\(carte\)[\s\S]*?cardFrameInfo\(carte\)\.key/,
  'les cartes convertissent leur élément en classe de cadre');
assert.match(battlePage, /function cardFrameStyle\(carte\)[\s\S]*?--rpg-frame-color/,
  'les cartes transmettent la couleur de leur élément à leur cadre');
assert.doesNotMatch(battlePage, /rpg-card--rarity-/,
  'plus aucun cadre n’est piloté par la rareté');
assert.match(cardsSource, /export const CARD_FRAME_COLORS = \{\s*braise:[\s\S]*?eau:[\s\S]*?sable:[\s\S]*?'hybride-braise-eau':[\s\S]*?'hybride-braise-sable':[\s\S]*?'hybride-eau-sable':[\s\S]*?'hybride-braise-eau-sable':/,
  'le catalogue déclare un cadre pour chaque couleur et chaque combinaison, y compris celles qui n’existent pas encore');
assert.match(cardsSource, /export const MYTHIC_FRAME_COLOR = '#e8b745';/,
  'le cadre doré des cartes mythiques est déclaré à part de la couleur');
assert.match(cardsSource, /CARD_FRAME_COLOR_ORDER/,
  'la clé d’une carte bicolore ne dépend pas de l’ordre de ses couleurs');
assert.doesNotMatch(battlePage, /rarete\.label|rpg-card-catalogue__rarity|rpg-card-preview__rarity/,
  'la rareté n’est annoncée nulle part dans le duel : l’aperçu au clic qui la montrait a été retiré');
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
assert.match(battlePage, /const jouerCarteDepuisMain = \(carteId, handIndex = null\) => \{[\s\S]*?demarrerVolCarte\(carte, index, \(\) => poserTerrain\(carteId\)\)/,
  'la pose d’un terrain déclenche le vol de sa carte réelle depuis la main');
assert.match(battlePage, /demarrerVolCarte\(carte, index, \(\) => poserCarte\(carteId\)\)/,
  'la pose d’une créature déclenche le vol de sa carte réelle depuis la main');
assert.match(battlePage, /data-hand-index=\{i\}/,
  'la carte animée reste liée à son emplacement stable dans la main');
assert.match(battleCss, /\.rpg-card-flight\s*\{[^}]*position:\s*fixed/s,
  'le bouton de carte de la main devient le seul élément volant');
assert.match(battleCss, /\.rpg-terrains::-webkit-scrollbar\s*\{\s*display:\s*none/s,
  'la barre de défilement bleue des terrains est masquée sans supprimer le défilement horizontal');
assert.match(battleCss, /\.rpg-terrain\s*\{\s*width:\s*clamp\(74px, 6\.6vw, 96px\)/,
  'les terrains posés sont nettement plus grands et restent responsifs');
assert.match(battlePage, /const malInvocation = cote === 'joueur' && playerTurn && !entite\.ready/,
  'le gris du mal d’invocation dépend bien du tour du joueur propriétaire');
assert.match(battlePage, /rpgChoisirBloqueurs\(duel, 'joueur', ids, ciblesFinales\)/,
  'le sorcier choisit ses bloqueurs après la déclaration, hors attaquants du Coup rapide');
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
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn,\s*\.rpg-actions__turn \.rpg-btn\s*\{[^}]*min-height:\s*35px;[^}]*background:\s*rgba\(10, 9, 9, \.58\);[^}]*box-shadow:\s*none;/s,
  'les actions sont agrandies tout en restant compactes, sans couleurs criardes ni ombres');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--attaque,\s*\.rpg-actions__turn \.rpg-btn--endturn\s*\{[^}]*font: 600 11px\/1\.1 var\(--display\);[^}]*text-transform:\s*none;/s,
  'les actions restent compactes et sans capitales envahissantes');
assert.match(battleCss, /\.rpg-actions__turn \.rpg-btn--endturn\s*\{[^}]*border-color:\s*rgba\(235, 194, 98, \.76\);[^}]*background:\s*linear-gradient\(180deg, rgba\(238, 202, 112, \.98\), rgba\(202, 158, 61, \.96\)\);[^}]*font-weight:\s*800;/s,
  'Fin du tour garde un repère doré compact et bien visible');
assert.match(battleCss, /\/\* Commandes de duel compactes[\s\S]*?\.rpg-bottombar\s*\{[^}]*width: min\(500px, calc\(100vw - 230px\)\);/s,
  'la barre inférieure agrandie est visible à toutes les tailles d’écran');
assert.match(battleCss, /\.rpg-bottombar__status \.rpg-actions__wait\s*\{[^}]*max-width:\s*320px;[^}]*font-size:\s*11px;/s,
  'le message du tour est agrandi et plus lisible');
assert.match(battleCss, /\.rpg-phase-step__icon\s*\{\s*display:\s*grid;\s*width:\s*24px;\s*height:\s*24px;/,
  'les icônes de phase sont agrandies partout');
assert.match(battleCss, /@media \(max-width: 620px\) \{\s*\.rpg-bottombar \{[\s\S]*?\.rpg-actions__row \.rpg-btn \{ min-height: 39px; padding: 6px 9px; font-size: 11px; \}/,
  'la barre de commandes reste nettement lisible sur un écran étroit');
assert.match(battleCss, /@media \(max-width: 620px\) \{\s*\.rpg-phase-track \{[^}]*gap: 7px; \}[\s\S]*?\.rpg-phase-step__icon \{ width: 24px; height: 24px; \}/,
  'les phases restent espacées et lisibles sur un écran étroit');
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
assert.match(battleCss, /\.rpg-card-catalogue__art\s*\{[\s\S]*?aspect-ratio:\s*4\s*\/\s*5;[\s\S]*?border:\s*3px solid var\(--rpg-frame-color/s,
  'les illustrations du catalogue sont moins étirées verticalement en 4:5 et gardent un cadre piloté par l’élément');
assert.match(battlePage, /⚔<\/span> Jouer\s*<\/button>/,
  'le menu comporte un mode Jouer');
assert.match(battlePage, /cardFrameClass\(carte\)/,
  'les cartes en main, sur table et les aperçus portent leur élément');
const frameCss = battleCss.slice(battleCss.lastIndexOf('/* Le cadre suit la COULEUR'));
assert.match(frameCss, /\.rpg-card\[class\*="rpg-card--frame-"\],[\s\S]*?\.rpg-hand__card\[class\*="rpg-card--frame-"\],[\s\S]*?\.rpg-terrain\[class\*="rpg-card--frame-"\],[\s\S]*?\.rpg-hover-card-preview__face,[\s\S]*?\{\s*border:\s*3px solid var\(--rpg-frame-color, #f1f3f5\);/s,
  'main, terrains, aperçus et animations partagent un cadre solide de 3 px, pour toute combinaison de couleurs');
assert.doesNotMatch(battleCss, /--rpg-rarity-color/,
  'la variable de rareté ne pilote plus aucune bordure');
assert.match(battleCss, /\.rpg-hand__card--img \.rpg-hand__rarity\s*\{[\s\S]*?color:\s*var\(--rarity-color/s,
  'le badge de rareté des cartes en main garde sa couleur propre');
const shineRule = frameCss.slice(frameCss.indexOf('/* ── Cadres brillants'), frameCss.indexOf('/* Braise + Sable'));
assert.match(shineRule, /\.rpg-card\.rpg-card--frame-brillant,[\s\S]*?\.rpg-hand__card\.rpg-card--frame-brillant,[\s\S]*?\.rpg-terrain\.rpg-card--frame-brillant,[\s\S]*?border-color:\s*transparent;[\s\S]*?var\(--rpg-frame-gradient\);[\s\S]*?background-clip:\s*padding-box, border-box;[\s\S]*?animation:\s*rpg-frame-shine-sweep/s,
  'un cadre brillant peint son dégradé dans l’anneau de bordure, en main, sur table et dans les aperçus au survol');
assert.doesNotMatch(shineRule, /linear-gradient\(115deg/,
  'la mécanique du cadre brillant est partagée : chaque variante ne fournit que son dégradé');
// Toute combinaison déclarée au catalogue doit exister en CSS : une future
// carte bicolore obtient son cadre sans retouche du composant. Les couleurs
// seules, elles, peignent leur cadre via la variable --rpg-frame-color.
const { CARD_FRAME_COLORS } = await import('../src/games/rpgCards.js');
for (const cle of Object.keys(CARD_FRAME_COLORS).filter((key) => key.startsWith('hybride-'))) {
  assert.match(battleCss, new RegExp(`\\.rpg-card--frame-${cle}\\s*\\{[^}]*--rpg-frame-gradient:`, 's'),
    `la combinaison ${cle} a son propre dégradé de cadre`);
}
const shinyVariants = {
  'hybride-braise-sable': '#ff9a34',
  'hybride-braise-eau': '#b06ad8',
  'hybride-eau-sable': '#7fd8e8',
  'hybride-braise-eau-sable': '#ffb44d',
};
for (const [variante, teinte] of Object.entries(shinyVariants)) {
  assert.match(frameCss,
    new RegExp(`\\.rpg-card--frame-${variante}\\s*\\{[^}]*--rpg-frame-gradient:\\s*linear-gradient\\(115deg,[^}]*${teinte}`, 's'),
    `la combinaison ${variante} a son propre dégradé de cadre`);
}
assert.match(frameCss, /\.rpg-card--mythique\s*\{[^}]*--rpg-frame-gradient:\s*linear-gradient\(115deg, #7d5415 0%, #ffe6a3 24%/s,
  'les cartes mythiques portent le cadre doré, quelle que soit leur couleur');
assert.match(frameCss, /\.rpg-card--mythique\s*\{[^}]*--rpg-frame-shine-duration:\s*2\.8s;/s,
  'le reflet doré des mythiques est un peu plus rapide que celui des bicolores');
assert.ok(frameCss.indexOf('.rpg-card--mythique {') > frameCss.indexOf('.rpg-card--frame-hybride-braise-sable {'),
  'le cadre doré est déclaré après les combinaisons : une carte mythique ET bicolore garde l’or');
assert.match(frameCss, /animation:\s*rpg-frame-shine-sweep[^;]*\binfinite alternate;/,
  'les reflets font des allers-retours, sans saut au retour du cycle');
const shinePositions = [...frameCss.slice(frameCss.indexOf('@keyframes rpg-frame-shine-sweep'))
  .matchAll(/background-position:\s*0 0,\s*(-?[\d.]+)%/g)].map((match) => Number(match[1]));
assert.ok(shinePositions.length >= 2, 'le reflet est animé sur toute la largeur du cadre');
assert.ok(shinePositions.every((position) => position >= 0 && position <= 100),
  `le reflet reste entre 0 % et 100 % (reçu : ${shinePositions.join(', ')}) — hors de cette plage le dégradé non répété ne couvre plus l'anneau et le cadre redevient noir`);
assert.match(frameCss, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-card--frame-brillant\s*\{\s*animation:\s*none !important;/s,
  'les cadres brillants respectent la préférence de mouvement réduit');
assert.match(battlePage, /function cardFrameClass\(carte\)[\s\S]*?cardHasShinyFrame\(carte\)[\s\S]*?rpg-card--frame-brillant[\s\S]*?cardHasMythicFrame\(carte\)[\s\S]*?rpg-card--mythique/,
  'la même fabrique de classe ajoute le cadre brillant et le cadre doré des mythiques');
assert.match(battlePage, /function cardFrameStyle\(carte\)[\s\S]*?cardFrameColor\(carte\)/,
  'la couleur de cadre transmise tient compte de l’or mythique');
assert.doesNotMatch(battleCss, /\.rpg-card__flames|rpg-mythic-flame/,
  'l’effet de flammes autour des cartes mythiques a été retiré');
assert.doesNotMatch(battlePage, /rpg-card__flames|MYTHIC_FLAME_TONGUES|cardHasMythicFlames|rpg-card--mythic-braise/,
  'plus aucune langue de feu n’est rendue dans le duel');
assert.doesNotMatch(battleCss, /\.rpg-hand__card\.is-playable\s*\{[^}]*border-color:/s,
  'la jouabilité conserve son halo sans recolorer la bordure');
assert.doesNotMatch(battleCss, /\.rpg-card\.rpg-card--type-creature\.is-blocker-selected\s*\{[^}]*border-color:/s,
  'la sélection des bloqueurs conserve son halo sans recolorer la bordure');
assert.match(battlePage, /instantanePiocheRef\.current = instantaneActuel/,
  'les changements de paquet déclenchent une détection de pioche pour les deux camps');
assert.match(battlePage, /piocheEnCours \? 'rpg-hand-card--drawing' : ''/,
  'l’animation s’applique à la vraie carte directement dans la main du joueur');
const cardMetricsCss = battleCss.slice(battleCss.lastIndexOf('/* Coût, attaque et défense'));
assert.match(cardMetricsCss, /\.rpg-card--img \.rpg-mana-cost\.is-compact\s*\{[^}]*min-width:\s*30px;[^}]*height:\s*21px;[^}]*font-size:\s*11px;/s,
  'le badge de coût est agrandi sur les cartes posées');
assert.match(cardMetricsCss, /\.rpg-hand__card--img \.rpg-mana-cost\s*\{[^}]*min-width:\s*31px;[^}]*height:\s*23px;[^}]*font-size:\s*12\.5px;/s,
  'le badge de coût est agrandi dans la main');
assert.match(cardMetricsCss, /\.rpg-card--img \.rpg-card__stat--atk,[\s\S]*?\.rpg-card--img \.rpg-card__pt,[\s\S]*?\.rpg-hand__stat\s*\{[^}]*min-width:\s*38px;[^}]*font-size:\s*13px;/s,
  'les indicateurs d’attaque et de défense sont agrandis sur les cartes');
assert.match(cardMetricsCss, /@media \(max-width: 620px\)[\s\S]*?\.rpg-card--img \.rpg-card__stat--atk,[\s\S]*?\.rpg-card--img \.rpg-card__pt,[\s\S]*?\.rpg-hand__stat\s*\{[^}]*min-width:\s*29px;[^}]*font-size:\s*9\.5px;/s,
  'les repères agrandis restent adaptés aux petites cartes mobiles');
assert.match(battleCss, /\.rpg-card-pile--deck \.rpg-card-pile__stack\s*\{[^}]*width:\s*clamp\(66px/s,
  'les paquets des deux joueurs sont agrandis sur la table');
assert.match(battleCss, /\.rpg-hand__card\.rpg-hand-card--drawing\s*\{[^}]*animation-name:\s*rpg-player-card-draw/s,
  'la pioche anime les vraies cartes en taille réelle dans la main');
assert.match(battleCss, /@keyframes rpg-player-card-draw\s*\{[\s\S]*?translate3d\(-100%, 0, 0\)[\s\S]*?translate3d\(0, 0, 0\)/,
  'les cartes piochées glissent de gauche à droite jusqu’à leur place dans la main');
// ── Les plateaux du duel : le terrain change de partie en partie ────────────
const plateauxSource = readFileSync(new URL('../src/games/rpgPlateaux.js', import.meta.url), 'utf8');
// Un fond ne doit porter aucun texte : l'interface du jeu se superpose toujours
// (RPG-CARD-ART.md). Les métadonnées sont un bon témoin d'une image retouchée.
for (const { fichier } of RPG_PLATEAUX) {
  const octets = readFileSync(new URL(`../public/${fichier}`, import.meta.url));
  const marqueursTexte = /Photoshop|GIMP|Duparcq|signature|watermark|Adobe|exiftool|Canva/i;
  assert.doesNotMatch(octets.toString('latin1'), marqueursTexte,
    `le fond ${fichier} ne porte ni métadonnée d'éditeur ni signature`);
}
assert.match(plateauxSource, /id: 'erg-du-sahara'[\s\S]*?fichier: 'plateau-erg-du-sahara\.jpg'/,
  'le désert du Sahara est un plateau déclaré, avec son fond dans public/');
assert.match(battlePage, /tirerPlateau\(\{ choix: choixPlateau, rng, precedentId: plateauPrecedentRef\.current \}\)/,
  'chaque nouvelle partie retire un plateau en écartant celui du duel précédent');
assert.match(battlePage, /sauverChoixPlateau\(choix\)/,
  'le plateau verrouillé au menu est mémorisé sur l’appareil');
assert.match(battlePage, /className=\{`card-table card-table--plateau-\$\{plateau\.id\}/,
  'la table porte le plateau tiré pour la partie en cours');
assert.match(battlePage, /Plateau : \$\{plateau\.nom\}/,
  'le message d’ouverture annonce le terrain de la partie');
assert.match(plateauxSource, /id: 'caravane-de-gourara'[\s\S]*?fichier: 'plateau-caravane-de-gourara\.jpg'/,
  'la piste de caravane du Gourara est un second plateau saharien');
for (const plateauSombre of ['table-des-heures', 'terre-de-damnation']) {
  assert.match(battleCss, new RegExp(`\\.card-table--plateau-${plateauSombre}\\s*\\{[^}]*background-color:`),
    `le plateau ${plateauSombre} a sa propre couleur de repli`);
}
for (const plateauSable of ['erg-du-sahara', 'caravane-de-gourara']) {
  assert.match(battleCss, new RegExp(`\\.card-table--plateau-${plateauSable}\\s*\\{[^}]*background-color:`),
    `le plateau ${plateauSable} a sa propre couleur de repli`);
}
assert.match(plateauxSource, /id: 'ruines-de-tipaza'[\s\S]*?fichier: 'plateau-ruines-de-tipaza\.jpg'/,
  'les ruines romaines de Tipaza sont un plateau déclaré, avec son fond dans public/');
assert.match(battleCss, /\.card-table--plateau-ruines-de-tipaza\s*\{[^}]*background-color:/s,
  'la pierre des ruines a sa propre couleur de repli');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.card-table--plateau-ruines-de-tipaza::before\s*\{[^}]*radial-gradient/s,
  'les ruines reçoivent un voile dense et froid : pierre claire au bord de la mer');
assert.match(plateauxSource, /id: 'terre-de-damnation'[\s\S]*?fichier: 'plateau-terre-de-damnation\.jpg'/,
  'la terre de damnation est un plateau déclaré, avec son fond dans public/');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.card-table--plateau-terre-de-damnation::before\s*\{[^}]*radial-gradient/s,
  'la terre brûlée reçoit son propre voile : vignette appuyée, centre laissé aux cartes');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) :is\(\.card-table--plateau-erg-du-sahara, \.card-table--plateau-caravane-de-gourara\)::before\s*\{[^}]*radial-gradient/s,
  'les sables reçoivent un voile chaud pour garder libellés et cartes lisibles');

console.log(
  'check:rpg-ui ✓ — aperçu au survol agrandi sans fond principal ni grand cadre ni son ombre, seul l’encadré des infos garde son fond sombre lisible, clic-action direct (poser la carte, attaquer, engager les terrains) avec confirmation des magies avant lancement et aperçu des magies jouées, '
  + 'icônes flamme/goutte/sablier, protection contre une couleur limitée au tour de pose et au suivant adverse, Rapidité du Fennec et de Fériel, Coup rapide de Fériel avec cible choisie et dégâts sans riposte, Envol de l’Anqa réservé aux bloqueurs volants dans l’IA comme à la main, icônes d’effets absentes des cartes en main, au catalogue, sur table et dans les aperçus, effets séparés ligne par ligne dans les aperçus, terrain Désert illustré, cadres pilotés par l’élément (bleu Eau, blanc Sable, rouge Braise, or bicolore), terrains agrandis, couleur à gauche et coût à droite, badge élémentaire hybride distinct du coût sans icônes de couleur, '
  + 'icône rouge d’attaque globale, icône de confirmation bleu clair, bouton Déclarer l’attaque retiré, type « Type », coût et ATQ/DÉF agrandis, mal d’invocation grisé pour les créatures non rapides, blessures tachées de sang et défense rouge, '
  + 'terrains engagés sans bord tronqué, deck et cimetière du joueur à gauche, vol de carte depuis la main, secousse d’écran sur impact direct et vignette rouge si le joueur est touché, '
  + 'attaque groupée avant confirmation, attaques sans bloqueur résolues automatiquement, faces full art, terrains sans coût, tour, halo jaune et paiement automatique, '
  + 'commandes de combat agrandies à toutes les tailles d’écran tout en restant discrètes, Fin du tour doré et compact, phases du duel indiquées par des icônes lumineuses agrandies, annulation réversible, magie avec cible, table continue, bloqueurs sélectionnables au clic ou glisser-déposer, flèches jaunes et animations, '
  + 'menu Jouer/Deck/Catalogue, catalogue de toutes les cartes avec filtres couleur/type, Cavalier amazigh rare inclus dans le deck et combat ciblé à l’arrivée, illustrations full art distinctes pour Veilleurs du Désert et 10 cartes de la Cour des Djinns, bordures unifiées par élément, paquets agrandis et vraies cartes qui glissent à taille réelle de gauche à droite dans les mains, '
  + 'plateaux du duel (la Table des Heures, l’Erg du Sahara, la Caravane de Gourara, la Terre de Damnation, les Ruines de Tipaza) tirés à chaque nouvelle partie sans jamais reprendre le terrain du duel précédent, verrou de plateau mémorisé depuis le menu et voile de lisibilité du sable, régression Rafale.'
);
process.exit(0);
