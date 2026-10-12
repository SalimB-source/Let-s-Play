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
assert.match(battlePage, /const ELEMENT_GLYPHS = \{ braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', hybride: '🔥⏳' \};/,
  'les éléments utilisent flamme, goutte d’eau, sablier, cristal de glace et repère bicolore');
assert.match(battlePage, /FILTRE_COULEUR_LABELS = \{ toutes: 'Toutes', sable: 'Sable', braise: 'Braise', eau: 'Eau', neige: 'Neige', hybride: 'Hybride' \};/,
  'la puce de filtre Neige existe, à côté des trois couleurs historiques');
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
assert.match(battleCss, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.rpg-card--type-creature:is\(:hover, :focus-visible\) \.rpg-card__img \{[^}]*animation: rpg-creature-hover-float 2\.2s ease-in-out infinite;/s,
  'les illustrations des créatures flottent uniquement au survol ou au focus sur un appareil avec pointeur précis');
assert.match(battleCss, /@keyframes rpg-creature-hover-float\s*\{\s*0%, 100% \{ transform: translate3d\(-1px, 0, 0\) scale\(1\.04\); \}\s*50% \{ transform: translate3d\(1px, -3px, 0\) scale\(1\.04\); \}\s*\}/s,
  'le mouvement des créatures combine un léger flottement et un balancement gauche-droite');
assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-card--type-creature:is\(:hover, :focus-visible\) \.rpg-card__img \{[^}]*animation: none !important;/s,
  'le flottement des créatures respecte la préférence de mouvement réduit');
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
// L'aperçu de la magie lancée (centré, 1,8 s) doit ressembler EXACTEMENT à l'aperçu rapide : on l'avait
// entouré d'un liseré turquoise, d'un halo cyan et d'une ombre portée avec sa propre animation.
const regleApercuMagie = battleCss.match(/\.rpg-hover-card-preview\.is-spell-preview\s*\{([^}]*)\}/);
assert.ok(regleApercuMagie, 'l’aperçu de la magie lancée garde sa classe is-spell-preview (z-index devant l’annonce)');
assert.match(regleApercuMagie[1].trim(), /^z-index:\s*\d+;?$/,
  'l’aperçu de la magie lancée ne déclare que son empilement : ni liseré, ni halo, ni ombre, ni animation propre');
assert.doesNotMatch(battleCss, /rpg-spell-card-preview|\.is-spell-preview[^{]*\{[^}]*(?:border|outline|box-shadow|background|filter|animation|scale|opacity)[\w-]*\s*:/s,
  'aucune autre règle ne décore l’aperçu de la magie lancée (il garde l’animation d’entrée de l’aperçu rapide)');
assert.match(battlePage, /\{apercuMagie && \(\s*<HoverCardPreview\s+carte=\{cardById\(apercuMagie\)\}\s+style=\{\{ left: '50%', top: '50%', transform: 'translate\(-50%, -50%\)' \}\}\s+spellPlayed\s*\/>/,
  'l’aperçu de la magie lancée réutilise le composant de l’aperçu rapide, posé au centre, sans style de décor en ligne');
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
assert.match(cardsSource, /export const RPG_ELEMENTS = \['braise', 'eau', 'sable', 'neige'\];/,
  'les quatre éléments sont déclarés une seule fois, dans l’ordre canonique des couleurs');
assert.match(cardsSource, /export const CARD_FRAME_COLORS = \{\s*braise:[\s\S]*?eau:[\s\S]*?sable:[\s\S]*?neige:[\s\S]*?'hybride-braise-eau':[\s\S]*?'hybride-braise-sable':[\s\S]*?'hybride-braise-neige':[\s\S]*?'hybride-eau-sable':[\s\S]*?'hybride-eau-neige':[\s\S]*?'hybride-sable-neige':[\s\S]*?'hybride-braise-eau-sable':/,
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
// ── Les plateaux du duel : le terrain vient du deck d'un des deux duellistes ─
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
assert.match(battlePage, /tirerPlateauDuDuel\(\{\s*deckJoueur: joueurDeck \?\? deckJoueurSelectionne,\s*deckAdverse: etageCourant \? etageCourant\.deck : sorcierDeck \?\? deckAdverse,\s*rng,\s*\}\)/,
  'chaque nouvelle partie prend le plateau du deck de l’un des deux duellistes, celui que le rng du duel désigne');
assert.doesNotMatch(battlePage, /choixPlateau|onSelectPlateau|[cs]hargerChoixPlateau|sauverChoixPlateau|RPG_PLATEAU_ALEATOIRE|plateauPrecedent/,
  'le joueur ne choisit plus son plateau : ni verrou, ni pastille aléatoire, ni sauvegarde sur l’appareil');
assert.doesNotMatch(battlePage, /rpg-mode-menu__boards|rpg-board-choice|rpg-board-grid/,
  'le bloc « Le terrain d’affrontement » a disparu du menu Jouer');
assert.doesNotMatch(battleCss, /\.rpg-board-choice|\.rpg-mode-menu__boards|\.rpg-board-grid/,
  'les styles du sélecteur de plateau ont été retirés de la feuille de combat');
assert.match(plateauxSource, /RPG_PLATEAUX_PAR_DECK = \{[\s\S]*?'veilleurs-du-desert': 'erg-du-sahara',[\s\S]*?'cour-des-djinns': 'terre-de-damnation',[\s\S]*?'sentiers-de-cendre': 'caravane-de-gourara',[\s\S]*?'maree-des-abysses': 'ruines-de-tipaza'/,
  'chaque deck du catalogue a son terrain attitré');
assert.match(plateauxSource, /couleurDominanteDeck/,
  'un deck sans identité connue (paquet brut) parle par sa couleur dominante');
assert.match(battlePage, /className=\{`card-table card-table--plateau-\$\{plateau\.id\}/,
  'la table porte le plateau tiré pour la partie en cours');
assert.match(battlePage, /Plateau : \$\{plateau\.nom\} — \$\{plateau\.lieu\}, imposé par \$\{originePlateau\}/,
  'le message d’ouverture annonce le terrain de la partie et le deck qui l’impose');
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
// La glace du fjord : la surface la plus claire du jeu, voile froid obligatoire.
assert.match(battleCss, /\.card-table--plateau-fjord-des-neuf-hivers\s*\{[^}]*background-color:/s,
  'le Fjord des Neuf Hivers a sa propre couleur de repli');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.card-table--plateau-fjord-des-neuf-hivers::before\s*\{[^}]*radial-gradient/s,
  'la glace du fjord reçoit son voile froid, sinon les cartes se noieraient dans le blanc');
assert.match(plateauxSource, /id: 'fjord-des-neuf-hivers'[\s\S]*?fichier: 'plateau-fjord-des-neuf-hivers\.jpg'/,
  'le fjord des Neuf Hivers est un plateau déclaré, avec son fond dans public/');
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

// ── Le voile noir haut/bas du plateau : la lisibilité des textes de la table ─
const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
assert.match(battlePage, /<HoverCardPreview carte=\{carteAnnoncee\} cible=\{cibleAnnoncee\} variante="annonce" \/>/,
  'la fenêtre de réponse affiche l’aperçu de la carte annoncée et lui transmet sa cible');
assert.match(hoverPreviewSource, /cibleAnnoncee && \([\s\S]*?rpg-hover-card-preview__target[\s\S]*?cibleAnnoncee\.nom/,
  'l’aperçu d’une magie rend le nom et l’illustration de sa cible');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce\s*\{[^}]*position:\s*relative;[^}]*display:\s*grid;[^}]*width:\s*100%;/s,
  'l’aperçu annoncé reste dans son panneau de réponse au lieu de flotter comme un tooltip');
assert.match(battleCss, /\.rpg-annonce-sort__pass\s*\{[^}]*display:\s*inline-flex;[^}]*flex-direction:\s*row;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*min-height:\s*36px;/s,
  'Laisser passer est un bouton compact dont le texte est centré verticalement');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hover-card-preview--annonce\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*42px minmax\(0, 1fr\);/s,
  'l’aperçu annoncé reste visible et lisible dans le rail tactile, alors que les tooltips au survol sont masqués');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-annonce-sort\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
  'sur tactile, l’aperçu et sa commande s’empilent dans le rail étroit');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-annonce-sort__pass\s*\{[^}]*justify-self:\s*center;[^}]*width:\s*auto;[^}]*min-width:\s*108px;[^}]*min-height:\s*44px;/s,
  'Laisser passer reste compact tout en gardant une zone de toucher de 44 px');
assert.match(battleCss, /--rpg-plateau-voile:\s*linear-gradient\(180deg,\s*var\(--rpg-plateau-voile-haut\) 0%,[\s\S]*?var\(--rpg-plateau-voile-bas\) 100%\);/,
  'le plateau porte un dégradé noir en haut et en bas, là où vivent les textes de la table');
assert.match(battleCss, /\.card-table::before\s*\{[^}]*background:[^}]*var\(--rpg-plateau-voile\),/s,
  'le voile haut/bas est posé sous l’interface, au-dessus du fond illustré');
for (const { id } of RPG_PLATEAUX) {
  assert.match(battleCss, new RegExp(`\\.card-table--plateau-${id}\\s*\\{[^}]*background-color:[^}]*--rpg-plateau-voile-haut:[^}]*--rpg-plateau-voile-bas:`, 's'),
    `le plateau ${id} règle la densité de son voile haut/bas avec sa couleur de repli`);
}
// Mesure sur les fonds livrés (haut du cadre, 0-255) : Erg 142, Tipaza 118,
// Gourara 102, Damnation 61, bois des Heures 54. Plus le fond est clair, plus
// l'ombre doit être dense pour tenir l'encre crème au-dessus de 3:1.
const densiteVoile = (id) => Number(battleCss.match(
  new RegExp(`\\.card-table--plateau-${id}\\s*\\{[^}]*--rpg-plateau-voile-haut:\\s*rgba\\([^)]*,\\s*([\\d.]+)\\)`, 's'),
)[1]);
for (const plateauClair of ['erg-du-sahara', 'caravane-de-gourara', 'ruines-de-tipaza', 'terre-de-damnation']) {
  assert.ok(densiteVoile(plateauClair) > densiteVoile('table-des-heures'),
    `${plateauClair} reçoit une ombre plus dense que le bois, déjà sombre`);
}
assert.ok(densiteVoile('erg-du-sahara') >= .8 && densiteVoile('ruines-de-tipaza') >= .8,
  'les deux fonds les plus clairs (sable et pierre) sont voilés à au moins 80 %');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table::before\s*\{\s*background:\s*var\(--rpg-plateau-voile\);\s*\}/,
  'au doigt le voile noir haut/bas reste posé : seule la vignette centrale disparaît');
assert.doesNotMatch(mobileCss, /\.card-table::before\s*\{\s*background:\s*none/,
  'le voile de lisibilité du plateau n’est plus supprimé en tactile');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table\s*\{[^}]*--rpg-plateau-voile-bas-debut:/s,
  'les bandes du voile suivent les rangées de la grille tactile (navigation, main et commandes)');

// ── L'aperçu au doigt : une seconde d'appui sur une carte ───────────────────
const longPressSource = readFileSync(new URL('../src/games/rpgLongPress.js', import.meta.url), 'utf8');
assert.match(longPressSource, /export const RPG_LONG_PRESS_MS = 1000;/,
  'l’aperçu au doigt demande une seconde d’appui, comme annoncé au joueur');
assert.match(longPressSource, /if \(!\['touch', 'pen'\]\.includes\(event\.pointerType\)[\s\S]*?return null;/,
  'la souris garde le survol : l’appui long ne concerne que le doigt et le stylet');
assert.match(battlePage, /startRpgLongPress\(event, \{\s*source: hote,\s*onTrigger:/,
  'la page arme l’appui long sur le `pointerdown` d’une carte');
assert.match(battlePage, /const hote = event\.target\?\.closest\?\.\('\[data-card-id\]'\);/,
  'toute carte affichée porte son identifiant : main, table, terrains, cimetière, catalogue, deck');
assert.match(battlePage, /data-scene="menu" onPointerDown=\{demarrerAppuiLongCarte\}/,
  'le menu (catalogue et decks) répond à l’appui long');
assert.match(battlePage, /data-scene="duel"\s*onPointerDown=\{demarrerAppuiLongCarte\}/,
  'le plateau répond au même appui long');
assert.match(battlePage, /touchDragRef\.current\?\.\(\);[\s\S]*?setApercuAppui\(carte\.id\)/,
  'consulter une carte désarme le glisser-déposer lancé par le même doigt');
assert.equal(battlePage.match(/<ApercuCarteAppuiLong carte=\{cardById\(apercuAppui\)\} onFermer=\{fermerApercuAppui\} \/>/g).length, 2,
  'le volet d’aperçu est rendu au menu comme en duel');
assert.match(battleCss, /\.rpg-card-peek\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*1250;/s,
  'le volet de l’aperçu couvre l’écran, au-dessus de l’écran de rotation');
assert.match(battleCss, /@media \(pointer: coarse\) \{[\s\S]*?\.rpg-hover-card-preview \{ display: none; \}[\s\S]*?\.rpg-card-peek \.rpg-hover-card-preview \{ display: grid; \}/,
  'au doigt le survol reste masqué, mais l’aperçu de l’appui long s’affiche');
assert.match(battleCss, /\.rpg-card-peek \.rpg-hover-card-preview\s*\{[^}]*position:\s*relative;/s,
  'dans le volet, l’aperçu n’est plus placé au survol : le volet le centre');
assert.match(battleCss, /@media \(max-height: 520px\) \{[\s\S]*?\.rpg-card-peek \.rpg-hover-card-preview\s*\{[^}]*grid-template-columns:\s*minmax\(104px, min\(232px, 42dvh\)\)/s,
  'en paysage de téléphone, l’illustration de l’aperçu se règle sur la hauteur disponible — au menu comme en duel');
assert.match(battleCss, /@media \(pointer: coarse\) \{[\s\S]*?\.rpg-battle \[data-card-id\]\s*\{[^}]*-webkit-touch-callout:\s*none;[^}]*user-select:\s*none;/s,
  'une carte tenue une seconde n’appelle ni le menu natif ni la sélection de texte');
assert.match(battlePage, /viewport\.mobile \? ' Appui long d’une seconde sur une carte : son aperçu, sans la jouer\.' : ''/,
  'l’ouverture du duel annonce le geste au doigt');

// ── Zone de jeu tactile élargie et piles de cartes homonymes ───────────────
const cardStacks = readFileSync(new URL('../src/games/rpgCardStacks.js', import.meta.url), 'utf8');
assert.match(cardStacks, /export function groupCartesMain\(main = \[\]\) \{/,
  'les exemplaires identiques de la main sont regroupés, dans l’ordre d’arrivée');
assert.match(cardStacks, /export function groupEntitesParCarte\(entites = \[\]\) \{/,
  'les créatures en jeu portant la même carte sont regroupées, camp par camp');
assert.match(cardStacks, /pile\.indices\.push\(index\);/,
  'chaque pile garde les index réels de la main : le jeu vise toujours un exemplaire précis');

assert.match(mobileCss, /grid-template-columns:\s*calc\(clamp\(116px, 16vw, 190px\) \+ var\(--terrain-inset\)\) minmax\(0, 1fr\) clamp\(200px, 27vw, 320px\);/,
  'la colonne centrale du duel tactile est élargie : les deux rails latéraux rendent de la place');
assert.match(mobileCss, /--terrain-inset:\s*clamp\(44px, 8vw, 160px\);/,
  'la marge qui tient les terrains hors du cadre illustré est conservée telle quelle');
assert.match(mobileCss, /--duel-card:\s*clamp\(48px, 17dvh, 100px\);/,
  'la taille des cartes ne bouge pas : des cartes plus grandes en montreraient moins');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.card-row \{[^}]*padding:\s*4px max\(8px, calc\(var\(--duel-card\) \* \.12\)\); gap:\s*max\(8px, calc\(var\(--duel-card\) \* \.22\)\);/s,
  'les gouttières des lignes de jeu sont resserrées pour montrer plus de cartes');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand-dock \.rpg-hand \{[^}]*padding:\s*4px 6px;[^}]*gap:\s*6px;/s,
  'la main tactile resserre ses propres gouttières');
assert.match(mobileCss, /\.card-row > \.rpg-card:first-child,\s*\.card-row > \.rpg-card-stack:first-child,\s*\.card-row > \.rpg-card-stack__toggle:first-child \{ margin-inline-start: auto; \}/,
  'les piles et leur puce ×N participent au centrage du groupe de cartes');

assert.match(mobileCss, /\.rpg-hand__pile,\s*\.rpg-card-stack \{\s*position: relative;\s*display: block;\s*flex: 0 0 auto;\s*\}/s,
  'une pile est un bloc relatif : son compteur flotte sur le coin sans masquer nom ni coût');
assert.match(mobileCss, /\.rpg-card-stack__count \{ position: absolute; top: -4px; right: -4px; z-index: 3; cursor: pointer; \}/,
  'le compteur ×N d’une créature se touche pour déplier le groupe');
assert.match(mobileCss, /\.rpg-hand__pile-count \{ position: absolute; top: -4px; right: -4px; z-index: 3; pointer-events: none; \}/,
  'le compteur ×N de la main laisse passer le geste : la carte garde son action de jeu');
assert.match(mobileCss, /\.rpg-card-stack__toggle \{[\s\S]{0,200}?min-height: 40px;[\s\S]{0,120}?cursor: pointer;\s*\}/,
  'la puce qui replie un groupe reste une cible tactile');
assert.match(mobileCss, /\.rpg-card-stack__count::after \{ content: ""; position: absolute; inset: -10px -10px -6px -2px; \}[\s\S]{0,120}?\.rpg-card-stack__toggle::after \{ content: ""; position: absolute; inset: -8px -6px; \}/,
  'compteur et puce débordent vers l’extérieur : la zone de toucher est large sans voler le clic de la carte');
assert.match(mobileCss, /\.rpg-card-stack \{\s*border-radius: 12px;\s*box-shadow: 3px 3px 0 #15121a, 6px 6px 0 var\(--rpg-frame-color, #f1f3f5\);\s*\}/s,
  'les ombres décalées disent qu’il reste des exemplaires sous la carte, comme pour les terrains');
assert.doesNotMatch(mobileCss, /\.rpg-card-stack > \.rpg-card \{[^}]*box-shadow/,
  'l’ombre de pile reste sur le bloc : la carte garde ses halos d’état (prête, ciblée, bloqueur)');
assert.match(battlePage, /className="rpg-card-stack"[\s\S]{0,120}?style=\{cardFrameStyle\(cardById\(pile\.carteId\)\)\}/,
  'la pile reprend la couleur de cadre de sa carte pour ses ombres décalées');

assert.match(battlePage, /import \{ groupCartesMain, groupEntitesParCarte \} from '\.\/rpgCardStacks\.js';/,
  'la page de duel regroupe les homonymes avec le même module que ses tests');
assert.match(battlePage, /const empilerCartes = viewport\.mobile;/,
  'les piles sont réservées au doigt : le grand écran garde une carte par emplacement');
assert.match(battlePage, /const groupesMain = empilerCartes\s*\?\s*groupCartesMain\(duel\.joueur\.main\)\s*:\s*duel\.joueur\.main\.map\(\(carteId, index\) => \(\{ carteId, indices: \[index\] \}\)\);/s,
  'sans empilement, chaque carte de la main reste son propre groupe');
assert.match(battlePage, /\{groupesMain\.map\(\(groupe\) => \{/, 'la main tactile est rendue pile par pile');
assert.match(battlePage, /data-pile-count=\{exemplaires\}/, 'chaque emplacement de la main annonce son nombre d’exemplaires');
assert.match(battlePage, /groupe\.indices\.includes\(carteEnVol\.handIndex\)/,
  'le vol de carte suit le groupe qui contient l’exemplaire joué');
assert.match(battlePage, /groupe\.indices\.includes\(animation\.handIndex\)/,
  'l’animation de pioche tombe sur le groupe qui reçoit la carte');
assert.match(battlePage, /return empilerCartes\s*\?\s*<span className="rpg-hand__pile" key=\{`\$\{carteId\}-\$\{i\}`\}>\{contenu\}<\/span>\s*:\s*<Fragment key=\{`\$\{carteId\}-\$\{i\}`\}>\{contenu\}<\/Fragment>;/,
  'à la souris, le DOM de la main reste exactement celui d’origine');
assert.match(battlePage, /pile de \$\{exemplaires\} exemplaires identiques/,
  'le libellé accessible de la main dit combien d’exemplaires la pile contient');

assert.match(battlePage, /\{duel\.sorcier\.creatures\.length \? campEnnemi\.piles\.map\(\(pile\) => \{/,
  'le camp du sorcier est rendu pile par pile');
assert.match(battlePage, /\{duel\.joueur\.creatures\.length \? campJoueur\.piles\.map\(\(pile\) => \{/,
  'le camp du joueur est rendu pile par pile');
assert.match(battlePage, /const cle = clePile\('ennemi', pile\.carteId\);/, 'chaque pile adverse a sa clé de dépliage');
assert.match(battlePage, /const cle = clePile\('joueur', pile\.carteId\);/, 'chaque pile du joueur a sa clé de dépliage');
assert.match(battlePage, /const affichees = deployee \? pile\.entites : \[teteDePile\('(ennemi|joueur)', pile\)\];/,
  'une pile repliée ne montre que sa carte de tête');
assert.match(battlePage, /className="rpg-card-stack__count"[\s\S]{0,200}?aria-label=\{`Déplier les \$\{pile\.entites\.length\}/,
  'le compteur ×N d’une pile repliée est un bouton qui déplie, avec son libellé');
assert.match(battlePage, /className="rpg-card-stack__toggle"[\s\S]{0,200}?aria-label=\{`Replier les \$\{pile\.entites\.length\}/,
  'un groupe déplié propose une puce ×N pour se replier');
assert.match(battlePage, /const pileDeployee = \(cote, pile\) => pile\.entites\.length < 2\s*\|\|\s*pile\.entites\.some\(\(entite\) => idsActionEnCours\.has\(entite\.id\)\)\s*\|\|\s*pilesDeployees\.has\(clePile\(cote, pile\.carteId\)\);/s,
  'un groupe se déplie dès qu’un de ses exemplaires participe à l’action en cours');
assert.match(battlePage, /const idsActionEnCours = new Set\(\[[\s\S]*?\.\.\.attaquants,[\s\S]*?combatEntrant\?\.attaquants[\s\S]*?blocages[\s\S]*?ciblesAttaque[\s\S]*?sortJoue\?\.cible\?\.targetIds[\s\S]*?bloqueurSelectionne[\s\S]*?cibleAttaqueEnCours[\s\S]*?animationsEntites/,
  'attaquants déclarés, bloqueurs, cibles de sort et effets en cours déplient leur groupe : flèches et destructions trouvent leur carte');
assert.match(battlePage, /entite\.ready && !entite\.attaquee && !attaquants\.includes\(entite\.id\)/,
  'la tête de pile est d’abord l’exemplaire prêt à agir');
assert.match(battlePage, /const element = elements\.get\(entite\.id\)\s*\?\?\s*table\?\.querySelector\(`\.card-row \[data-card-id="\$\{entite\.carteId\}"\], \.rpg-terrains \[data-card-id="\$\{entite\.carteId\}"\]`\);/s,
  'un exemplaire masqué emprunte la place de sa pile pour l’effet de destruction');
// Les peintures du set Neige sont datées dans l'URL : esquisses et figures
// repeintes portent les mêmes noms de fichiers, un cache ne doit jamais
// resservir l'ancienne image sous le nom de la nouvelle.
assert.match(battlePage, /const SET_NEIGE_ART_VERSION = 'peintures-definitives-v\d+';/,
  'la version des peintures Neige est déclarée et incrémentable');
assert.match(battlePage,
  /const revision = CARD_ART_CACHE_VERSIONS\[artId\]\s*\n\s*\?\? \(cardById\(artId\)\?\.element === 'neige' \? SET_NEIGE_ART_VERSION : undefined\);/,
  'chaque image d’une carte Neige reçoit sa version dans l’URL');
assert.match(battlePage, /cards\/\$\{artId\}\.jpg\$\{revision \? `\?v=\$\{revision\}` : ''\}/,
  'l’URL de l’illustration porte bien le paramètre de version');

// ── Les capacités de clan du Nord : Furie des vikings, Résonance des valkyries.
const { RPG_DECK_NEIGE_BASE, RPG_DUEL_CARDS } = await import('../src/games/rpgCards.js');
assert.match(duelEngine, /entite\.atk \+= furie;[\s\S]*?duel\.log\.push\(`\$\{entite\.name\} entre en furie : \+\$\{furie\}\/\+\$\{furie\}\.`\)/,
  'le moteur applique et journalise la Furie d’une créature blessée qui survit');
assert.match(duelEngine, /export function rpgResonanceEnJeu\(duel\)/,
  'la Résonance en jeu se compte sur toute la table, les deux camps compris');
assert.match(duelEngine, /cardColors\(carte\)\.includes\('neige'\) \? total : 0[\s\S]*?entite\.pv = Math\.max\(1, entite\.pv \+ delta\)/,
  'seule la Neige profite de l’aura, l’écart étant mémorisé par entité et les PV plancher à 1');
assert.match(aiBrain, /const furie = bloqueurFurie \* 0\.9 - attaquantFurie \* 1\.2;/,
  'l’IA sait qu’entamer un viking sans le tuer le nourrit');
assert.match(aiBrain, /rpgResonanceEnJeu\(duel\)[\s\S]*?atk: \(carte\.atk \?\? 0\) \+ resonance/,
  'l’IA compte la Résonance déjà en table quand elle évalue une arrivée Neige');
const jarl = RPG_DUEL_CARDS.find((carte) => carte.id === 'jarl-au-marteau-de-guerre');
assert.ok(jarl && jarl.element === 'neige' && jarl.furie === 3,
  'le Jarl au marteau de guerre porte la Furie 3 du set Neige');
assert.ok(RPG_DECK_NEIGE_BASE.includes('jarl-au-marteau-de-guerre'),
  'le Serment des Neuf Hivers aligne le Jarl');
for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.furie)) {
  assert.match(carte.typeLine, /viking/i, `${carte.id} est un viking`);
  assert.match(carte.text, new RegExp(`Furie ${carte.furie} — Chaque fois qu’il est blessé et survit`),
    `${carte.id} annonce sa Furie sur sa face`);
}
for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.resonance)) {
  assert.match(carte.typeLine, /valkyrie/i, `${carte.id} est une valkyrie`);
  assert.match(carte.text, /Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent \+1\/\+1/,
    `${carte.id} annonce sa Résonance sur sa face`);
}

console.log(
  'check:rpg-ui ✓ — aperçu au survol agrandi sans fond principal ni grand cadre ni son ombre, seul l’encadré des infos garde son fond sombre lisible, clic-action direct (poser la carte, attaquer, engager les terrains) avec confirmation des magies avant lancement et aperçu des magies jouées, '
  + 'icônes flamme/goutte/sablier, protection contre une couleur limitée au tour de pose et au suivant adverse, Rapidité du Fennec et de Fériel, Coup rapide de Fériel avec cible choisie et dégâts sans riposte, Envol de l’Anqa réservé aux bloqueurs volants dans l’IA comme à la main, icônes d’effets absentes des cartes en main, au catalogue, sur table et dans les aperçus, effets séparés ligne par ligne dans les aperçus, terrain Désert illustré, cadres pilotés par l’élément (bleu Eau, blanc Sable, rouge Braise, or bicolore), terrains agrandis, couleur à gauche et coût à droite, badge élémentaire hybride distinct du coût sans icônes de couleur, '
  + 'icône rouge d’attaque globale, icône de confirmation bleu clair, bouton Déclarer l’attaque retiré, type « Type », coût et ATQ/DÉF agrandis, mal d’invocation grisé pour les créatures non rapides, blessures tachées de sang et défense rouge, '
  + 'terrains engagés sans bord tronqué, deck et cimetière du joueur à gauche, vol de carte depuis la main, secousse d’écran sur impact direct et vignette rouge si le joueur est touché, '
  + 'attaque groupée avant confirmation, attaques sans bloqueur résolues automatiquement, faces full art, terrains sans coût, tour, halo jaune et paiement automatique, '
  + 'commandes de combat agrandies à toutes les tailles d’écran tout en restant discrètes, Fin du tour doré et compact, phases du duel indiquées par des icônes lumineuses agrandies, annulation réversible, magie avec cible, table continue, bloqueurs sélectionnables au clic ou glisser-déposer, flèches jaunes et animations, '
  + 'menu Jouer/Deck/Catalogue, catalogue de toutes les cartes avec filtres couleur/type, Cavalier amazigh rare inclus dans le deck et combat ciblé à l’arrivée, illustrations full art distinctes pour Veilleurs du Désert et 10 cartes de la Cour des Djinns, bordures unifiées par élément, paquets agrandis et vraies cartes qui glissent à taille réelle de gauche à droite dans les mains, '
  + 'plateaux du duel (la Table des Heures, l’Erg du Sahara, la Caravane de Gourara, la Terre de Damnation, les Ruines de Tipaza, le Fjord des Neuf Hivers) imposés par le deck de l’un des deux duellistes — celui que le rng du duel désigne, plus aucun choix ni verrou de plateau au menu —, voile noir dégradé en haut et en bas de chaque plateau — souris et doigt compris — pour tenir les textes de la table lisibles sur les fonds clairs, '
  + 'quatrième couleur Neige (cristal de glace, cadre bleu clair) avec le Serment des Neuf Hivers au complet : Furie des vikings (+X/+X sur une blessure qui survit, journalière dans le duel et pesée par l’IA) et Résonance des valkyries (+1/+1 à toute la Neige de la table, les deux camps, plancher de 1 PV quand l’aura se tait), les peintures du set datées dans l’URL `?v=` pour qu’un cache ne fige jamais une ancienne image, '
  + 'aperçu d’une carte par appui long d’une seconde au doigt (volet dédié, clic de jeu conservé sur un appui court), zone de jeu tactile élargie (colonne centrale rendue par les rails latéraux, gouttières resserrées, taille des cartes et marge des terrains inchangées) avec piles de cartes homonymes au doigt — main et deux champs de bataille, compteur ×N, tête de pile qui agit sur l’exemplaire prêt, dépliage au toucher et dépliage automatique pendant toute action en cours — le grand écran gardant une carte par emplacement, régression de l’éphémère qui élimine le dernier attaquant pendant la réponse.'
);
process.exit(0);
