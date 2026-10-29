import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface du duel : rendu jsdom, aperçu instantané au survol,
// aperçu au clic/sur magie, Rapidité, commandes, cadres par élément et bloqueurs.
const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
assert.match(mobileCss, /@supports \(height:\s*100svh\)\s*\{\s*\.rpg-battle--touch \.card-table\s*\{[^}]*--duel-card:\s*clamp\(44px, 15\.55svh, 104px\);/s,
  'au doigt, la carte garde 15,55 % de la hauteur — la carte du PC (140 px sur 900) — sur une hauteur stable, indépendante des barres du navigateur');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch\.is-immersive \.card-table\s*\{[^}]*--duel-card:\s*clamp\(44px, 15\.55svh/s,
  'l’échelle stable n’est plus réservée au plein écran immersif : la coque du duel est toujours une couche fixe plein viewport, et le plein écran natif peut se refermer en pleine partie');
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
const guideCss = readFileSync(new URL('../src/games/rpg-card-guide.css', import.meta.url), 'utf8');
const atelierCss = readFileSync(new URL('../src/games/rpg-deck-atelier.css', import.meta.url), 'utf8');
const { RPG_PLATEAUX } = await import('../src/games/rpgPlateaux.js');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const duelEngine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const aiBrain = readFileSync(new URL('../src/games/rpgAI.js', import.meta.url), 'utf8');
const cardsSource = readFileSync(new URL('../src/games/rpgCards.js', import.meta.url), 'utf8');
const tableCardSource = battlePage.slice(battlePage.indexOf('function TableCard('), battlePage.indexOf('function HoverCardPreview('));
const compteursSource = readFileSync(new URL('../src/games/RpgVieCompteurs.jsx', import.meta.url), 'utf8');
const hoverPreviewSource = battlePage.slice(battlePage.indexOf('function HoverCardPreview('), battlePage.indexOf('function ConfirmationSort('));
const confirmSortSource = battlePage.slice(battlePage.indexOf('function ConfirmationSort('), battlePage.indexOf('function SpellAnnouncement('));
assert.match(battlePage, /const ELEMENT_GLYPHS = \{ braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '💀', hybride: '🔥⏳' \};/,
  'les éléments utilisent flamme, goutte d’eau, sablier, flocon de neige, tête de mort et repère bicolore');
assert.match(battlePage, /FILTRE_COULEUR_LABELS = \{ toutes: 'Toutes', sable: 'Sable', braise: 'Braise', eau: 'Eau', neige: 'Neige', tenebres: 'Ténèbres', hybride: 'Hybride' \};/,
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
for (const [css, classe] of [
  [battleCss, 'rpg-mana-cost--hybride'],
  [battleCss, 'rpg-card-catalogue__cost--hybride'],
  [atelierCss, 'rpg-atelier__cout--hybride'],
  [guideCss, 'rpg-card-guide__cost--hybride'],
]) {
  assert.match(css, new RegExp(`\\.${classe}\\s*\\{[^}]*background:\\s*var\\(--rpg-hybrid-cost-bg\\)`),
    `le coût ${classe} partage son disque en deux couleurs`);
}
assert.match(battlePage, /aria-label=\{`Coût : \$\{cardCostLabel\(carte\)\}`\}/,
  'le libellé accessible conserve le détail des couleurs exigées pour payer le coût hybride');
assert.match(battlePage, /RPG_DUEL_CARDS\.filter\(\(carte\) => \{[\s\S]*?catalogueCouleur === 'hybride'[\s\S]*?colors\.includes\(catalogueCouleur\)/,
  'le catalogue filtre les hybrides seuls ou via chacune de leurs couleurs');
assert.match(battleCss, /\.rpg-terrain-mana-choice\s*\{[^}]*position:\s*absolute;[^}]*z-index:/s,
  'le sélecteur de couleur de Pétra reste lisible au-dessus du rail des terrains');
assert.match(battleCss, /\.rpg-card\[data-combat-tilted="true"\]\s*\{\s*transform:\s*rotate\(10deg\) !important;/,
  'les créatures engagées gardent une inclinaison de 10° vers la droite');
assert.match(battleCss, /\.rpg-card\.is-attacked\.fx-lunge\s*\{[^}]*box-shadow:[^}]*rgba\(239, 49, 43, \.74\)/s,
  'les cartes engagées gardent le halo rouge uniquement pendant l’animation d’attaque');
assert.doesNotMatch(tableCardSource, /rpg-card__(?:engagee|action-fx)|(?:BLOCAGE|RETIRÉ|IMPACT|ATTAQUE|RENFORCÉ)/,
  'aucun texte d’état ou d’action n’est superposé sur les cartes');
assert.doesNotMatch(battleCss, /\.rpg-card__(?:engagee|action-fx)\b/,
  'les anciens styles des étiquettes posées sur les cartes sont supprimés');
assert.match(mobileCss, /\.rpg-terrain\.rpg-terrain-stack\.is-tapped\s*\{[^}]*transform:\s*rotate\(12deg\)/s,
  'un terrain engagé reste incliné sur écran tactile');
assert.match(mobileCss, /\.rpg-terrain\.rpg-terrain-stack\.is-stacked\s*\{[^}]*box-shadow:/s,
  'hors disposition tactile, seules les vraies piles de terrains montrent une épaisseur décalée');
assert.match(battlePage, /groupe\.count > 1 && <span className="rpg-terrain-stack__count"/,
  'un terrain seul n’affiche pas de compteur de pile');
assert.match(battlePage, /groupe\.count > 1 && groupe\.tapped > 0[\s\S]*?rpg-terrain-stack__engagement/,
  'une pile renseigne le nombre de terrains déjà engagés');
assert.match(battlePage, /groupe\.available === 0 && groupe\.tapped > 0 \? ' is-tapped' : ''/,
  'une pile entièrement utilisée prend l’état visuel engagé');
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
assert.doesNotMatch(hoverPreviewSource, /rpg-hover-card-preview__rules/,
  'l’aperçu n’imprime plus de bloc de règles : ses mots-clés portent la règle');
assert.match(hoverPreviewSource, /aMotsClesExplicables && \([\s\S]*?Survolez un mot-clé pour lire son effet/s,
  'l’aperçu indique que chaque mot-clé s’explique au survol');
assert.match(hoverPreviewSource, /armesEquipees\.map\(\(arme, index\) => \([\s\S]*?data-arme-equipee=\{arme\.id\}[\s\S]*?src=\{cardArt\(arme\)\}[\s\S]*?<strong>\{arme\.name\}<\/strong>[\s\S]*?<small>\{arme\.text\}<\/small>/,
  'la créature montre une petite carte par arme équipée, avec illustration, nom et effet');
assert.match(battleCss, /\.rpg-hover-card-preview--catalogue \.rpg-hover-card-preview__weapon small\s*\{[^}]*overflow:\s*visible;/,
  'la fiche ouverte révèle le texte complet de chaque arme');
assert.doesNotMatch(hoverPreviewSource, /rpg-hover-card-preview__rule--equipment/,
  'plus de ligne bleue d’équipement : le bonus se lit sur la miniature de l’arme et dans le libellé accessible');
assert.match(tableCardSource, /<CardElementBadge carte=\{carte\} \/>[\s\S]*?rpg-card__compteurs\$\{hybride \? ' rpg-card__compteurs--hybride' : ''\}[\s\S]*?<CompteurCarte type="heures"[\s\S]*?<CompteurCarte type="sable"/,
  'les compteurs d’Heures et de sable restent accessibles, sous le coût d’une hybride et sous la couleur d’une mono');
assert.match(compteursSource, /data-compteur=\{type\}/,
  'le losange des compteurs animés porte toujours son repère `data-compteur`');
assert.match(tableCardSource, /<CompteurCarte type="heures" valeur=\{entite\.heures\.restants\} \/>/,
  'le compteur d’Heures reçoit sa valeur restante — c’est elle qui règle le geste de la dernière Heure');
assert.match(tableCardSource, /<CompteurCarte type="sable" valeur=\{entite\.arme\.compteurs\} \/>/,
  'le compteur de sable d’une arme reçoit son nombre de compteurs');
assert.match(battleCss, /\.rpg-card__compteurs\s*\{[^}]*top:\s*calc\(var\(--rpg-card-element-marker-top,[^}]*\+ var\(--rpg-card-marker-size,[^}]*\+ var\(--rpg-card-counter-size\)/,
  'les compteurs sont placés juste en dessous du repère de couleur ou de coût');
assert.match(battleCss, /\.rpg-card__compteurs--hybride\s*\{[^}]*--rpg-card-counter-size:\s*clamp\(8px,[^}]*left:\s*auto;[^}]*right:\s*calc\(6% \+ \(var\(--rpg-card-marker-size, 26px\) - var\(--rpg-card-counter-size\)\) \/ 2 - 1px\);/,
  'les compteurs d’une créature hybride sont sous son coût à droite, réduits sur une carte étroite pour ne pas toucher ses deux pastilles');
assert.match(battleCss, /\.rpg-card__compteur\s*\{[^}]*transform:\s*rotate\(45deg\);/,
  'chaque compteur est un petit losange');
assert.match(battleCss, /\.rpg-card__compteur > span\s*\{[^}]*transform:\s*rotate\(-45deg\);/,
  'le chiffre du losange reste droit et lisible');
assert.doesNotMatch(tableCardSource, /bonusArmeTexte\(armeCarte\)|title=\{`\$\{effetsAccordesParArme\(armeCarte\)/,
  'ni bonus ni infobulle de texte d’effet de l’arme ne figurent sur la face jouée');
assert.match(hoverPreviewSource, /effets d’équipement[\s\S]*?effet \$\{effet\}/,
  'le libellé accessible annonce les effets d’équipement avant l’effet de la carte');
assert.match(battlePage, /const afficherApercuSurvol = \(carte, event, armes = \[\]\) => \{[\s\S]*?setApercuSurvol\(/,
  'le survol déclenche l’aperçu instantané de la carte');
assert.match(tableCardSource, /onHoverCard\?\.\(carte, event, armes\)/,
  'les créatures en jeu utilisent le même aperçu sans icône d’état');
assert.match(battleCss, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.rpg-card--type-creature:is\(:hover, :focus-visible\) \.rpg-card__img \{[^}]*animation: rpg-creature-hover-float 2\.2s ease-in-out infinite;/s,
  'les illustrations des créatures flottent uniquement au survol ou au focus sur un appareil avec pointeur précis');
assert.match(battleCss, /@keyframes rpg-creature-hover-float\s*\{\s*0%, 100% \{ transform: translate3d\(-1px, 0, 0\) scale\(1\.04\); \}\s*50% \{ transform: translate3d\(1px, -3px, 0\) scale\(1\.04\); \}\s*\}/s,
  'le mouvement des créatures combine un léger flottement et un balancement gauche-droite');
assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-card--type-creature:is\(:hover, :focus-visible\) \.rpg-card__img \{[^}]*animation: none !important;/s,
  'le flottement des créatures respecte la préférence de mouvement réduit');
assert.match(tableCardSource, /entite\.envol \? 'is-envol' : ''/,
  'les créatures qui possèdent Envol reçoivent leur état visuel sur la table');
assert.match(battleCss, /\.rpg-card\.is-envol\s*\{[^}]*translate:\s*0 -6px;[^}]*filter:[^}]*drop-shadow\(0 17px 11px rgba\(0, 0, 0, \.42\)\)/s,
  'une créature avec Envol flotte au-dessus du plateau avec une ombre plus profonde');
assert.match(battleCss, /\.rpg-card\.is-envol\s*\{[^}]*animation:\s*rpg-envol-levite var\(--rpg-envol-duree, 5\.1s\) ease-in-out infinite;/s,
  'la lévitation est une animation CSS : une animation d’API masquerait l’arrivée et les cinématiques de combat');
assert.match(battlePage, /const dureeVol = \(entite\) => \(6\.8 \+ phaseVol\(entite\) \* 0\.8\)\.toFixed\(2\);/,
  'chaque créature reçoit sa propre durée de lévitation, tirée de son identifiant');
assert.doesNotMatch(tableCardSource, /element\.animate\(/,
  'plus aucune animation d’API sur la carte de la table : les cinématiques CSS gardent la main');
assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-card\.is-envol \{ animation: none; \}/,
  'le vol s’arrête si le joueur préfère limiter les mouvements');
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
assert.match(battlePage, /className=\{`rpg-hover-card-preview__type\$\{ligneFamille\}`\}[\s\S]*?rpg-hover-card-preview__pastilles[\s\S]*?className="rpg-hover-card-preview__stats"/,
  'l’aperçu au survol affiche nom, type, mots-clés et statistiques — le type seul prend la teinte de la famille de sort');
assert.doesNotMatch(battlePage, /rpg-hover-card-preview__cost/,
  'l’aperçu n’affiche plus le coût : il se lit sur la face de la carte');
assert.match(battleCss, /\.rpg-hover-card-preview\s*\{[^}]*grid-template-columns:\s*minmax\(190px, 232px\) minmax\(0, 1fr\);[^}]*width:\s*min\(680px, calc\(100vw - 20px\)\);/s,
  'l’aperçu au survol est agrandi à 680 px');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview\s*\{[^}]*background:/s,
  'l’aperçu au survol n’a plus de fond principal');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview__cost/,
  'plus aucun style de coût dans l’aperçu');
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
assert.match(battleCss, /\.rpg-hover-card-preview__details\s*\{[^}]*background:\s*rgba\(5, 8, 11, \.8\);/s,
  'seul le fond de l’encadré des infos reste pour la lisibilité');
assert.match(battlePage, /function placerApercuSurvol\(rectangle, panneau\) \{[\s\S]*?panneau\?\.getBoundingClientRect\?\.\(\)/,
  'l’aperçu au survol se place d’après la boîte réelle de son panneau, pas d’une taille estimée');
assert.match(battlePage, /function placerApercuSurvol\(rectangle, panneau\) \{[\s\S]*?getComputedStyle\(panneau\)[\s\S]*?paddingLeft/,
  'le placement retire la marge intérieure du panneau : c’est la face qui se colle à la carte survolée');
assert.match(battlePage, /let left = rectangle\.right \+ espace - margeGauche;\s*if \(left \+ largeur > largeurVue - marge\) \{\s*left = rectangle\.left - largeur - espace \+ margeDroite;/,
  'l’aperçu choisit le côté qui a la place et bascule à gauche si son bord droit déborderait');
assert.match(battlePage, /useLayoutEffect\(\(\) => \{\s*if \(!apercuSurvol\?\.rectangle \|\| !panelRef\.current\) return;\s*const style = placerApercuSurvol\(apercuSurvol\.rectangle, panelRef\.current\);/,
  'l’aperçu est reposé avant peinture (useLayoutEffect), dès que son panneau est rendu');
assert.match(battlePage, /function HoverCardPreview\(\{[^}]*panelRef = null/,
  'l’aperçu rapide expose son panneau au placement');
assert.match(battlePage, /<aside\s+ref=\{panelRef\}/,
  'le panneau de l’aperçu porte la référence mesurée par le placement');
assert.match(battlePage, /style=\{apercuSurvol\.style\}\s+panelRef=\{panelRef\}/,
  'l’aperçu du survol est mesuré par son panneau');
assert.doesNotMatch(battlePage, /variante="mulligan"/,
  'aucun aperçu rapide au survol n’est rendu dans le mulligan');
assert.match(battleCss, /\.rpg-hover-card-preview__hint-tactile \{ display: none; \}[\s\S]*?\.rpg-battle--touch \.rpg-hover-card-preview__hint-tactile \{ display: inline; \}/s,
  'l’indication des mots-clés suit le geste : la souris survole, le doigt touche');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview__rules/,
  'plus aucun style de bloc de règles dans l’aperçu');
assert.match(duelEngine, /ready: Boolean\(carte\.rapidite\)/,
  'la Rapidité rend la créature prête dès son arrivée, sans badge d’effet sur la carte');
// L’Attaque ciblée frappe avant les blessures de combat : la cible encaisse
// l'attaque de la créature (`degatsAvantCombat`), sans riposte, et le résumé
// du combat relate chaque frappe.
assert.match(duelEngine, /const cibleRapideId = ciblesRapides\[attaquant\.id\];[\s\S]*?frappesRapides\.push\([\s\S]*?degats: forceCombat\(attaquant\),[\s\S]*?degatsAvantCombat\.push\(\{\s*cote: adv,\s*entiteId: cible\.id,\s*amount: forceCombat\(attaquant\),[\s\S]*?coupsRapides: frappesRapides,[\s\S]*?for \(const coup of resume\.coupsRapides\)/s,
  'l’Attaque ciblée inflige l’attaque de la créature choisie, sans combat de riposte');
// L’Attaque ciblée se CHOISIT : une frappe sur une créature clôt l’attaque de
// l’attaquant — `attaquantsArretes` l’écarte du blocage, des blessures de
// combat et du sorcier —, sinon il attaque normalement, sans cible exigée.
assert.match(duelEngine, /const attaquantsArretes = new Set\(frappesRapides\s*\n?\s*\.filter\(\(frappe\) => !frappe\.annule\)/,
  'la frappe rapide qui a trouvé sa cible arrête l’attaque de son attaquant');
assert.match(duelEngine, /if \(attaquantsArretes\.has\(attaquant\.id\)\) continue;/,
  'l’attaquant arrêté sur sa frappe ne passe pas aux blessures de combat');
assert.match(duelEngine, /export function rpgPeutBloquerAttaquant\(bloqueur, attaquant, frappeRapide = false\)\s*\{[\s\S]*?if \(frappeRapide\) return false;[\s\S]*?if \(attaquant\.infiltration\) return false;[\s\S]*?!attaquant\.envol \|\| Boolean\(bloqueur\.envol\)/,
  'rien ne se met en travers d’une frappe rapide, et l’Infiltration comme l’Envol gardent leurs refus');
assert.match(aiBrain, /peutBloquerAttaquant\(bloqueur, attaquant\)\s*&&\s*!estProtegee\(attaquant, cardColors\(duelCardById\(bloqueur\.carteId\)\)\)/,
  'l’IA écarte les bloqueurs sans Envol face à un attaquant volant');
assert.match(duelEngine, /if \(!rpgPeutBloquerAttaquant\(bloqueur, attaquant, frappeRapide\)\) \{\s*return \{ ok: false, raison: frappeRapide \? 'blocage' : attaquant\.infiltration \? 'infiltration' : 'envol' \};/,
  'le moteur refuse un blocage contre un attaquant avec Envol ou Infiltration, et contre une frappe rapide, avec la raison qui convient');
assert.match(battlePage, /if \(!retireDeCetteAttaque && !rpgPeutBloquerAttaquant\(bloqueur, attaquant, frappeRapide\)\) \{\s*setBloqueurSelectionne\(null\);\s*jouerSfx\('erreur'\);/,
  'un bloqueur sans Envol est refusé par le bruitage d’erreur, sans phrase d’explication');
assert.match(battlePage, /canDragBlocker=\{Boolean\(reponseActive && !reponseApresBlocage && bloqueursDisponibles\.some/,
  'seuls les bloqueurs légaux restent saisissables : l’attaque adverse n’a pas besoin d’annonce écrite');
assert.match(duelEngine, /export function rpgLancerAttaque\([\s\S]*?appliquerDegatsDeCombatSimultanes\(duel, degatsAvantCombat\)[\s\S]*?const coupsNormaux = degatsCombat[\s\S]*?appliquerDegatsDeCombatSimultanes\(duel, coupsNormaux\)/,
  'les capacités de combat du Sahir se résolvent avant les blessures normales');
assert.match(duelEngine, /appliquerDegatsDeCombatSimultanes\(apresCapacites, degatsAvantCombat\)[\s\S]*?const repartitionFinale/,
  'le partage tient compte des survivants après les capacités préalables');
assert.match(battlePage, /attaquantsVivants,\s*blocages,\s*null, \/\/ Le moteur partage/,
  'la défense ne transmet pas de partage figé avant les capacités');
assert.match(battlePage, /attaquantsVivants,\s*blocages,\s*null, \/\/ Ne pas figer/,
  'l’attaque du joueur ne transmet pas de partage figé avant les capacités');
// La cible de l’Attaque ciblée reste un CHOIX : l’invitation à désigner se déduit
// de la sélection, le bouton de confirmation ne dépend que des attaquants, et
// un second clic sur la même créature retire la désignation.
assert.match(battlePage, /const cibleAttaqueEnCours = phase \? prochainCoupRapideSansCible\(attaquants\) : null;/,
  'la proie invitée se déduit de la sélection d’attaquants, sans état de ciblage séparé');
assert.match(battlePage, /disabled=\{!attaquants\.length\} onClick=\{\(\) => lancerAttaque\(\)\}/,
  'la confirmation ne réclame plus la cible d’une attaque ciblée : elle part vers le sorcier sans proie');
assert.match(battlePage, /const dejaVisee = candidats\.find\(\(candidate\) => ciblesAttaque\[candidate\.id\] === entite\.id\);[\s\S]*?if \(dejaVisee\) delete cibles\[dejaVisee\.id\];\s*\n\s*else cibles\[libre\.id\] = entite\.id;/,
  'un second clic sur la même créature retire la désignation de la proie');
// Une seule phase d’attaque par tour : le moteur refuse la seconde déclaration
// du camp (`attaqueJouee`, remis à null par `rpgFinDeTour`), et la page range
// l’étape du rail en « jouée » — le bouton « Attaquer avec tous » se ferme.
assert.match(duelEngine, /if \(duel\.attaqueJouee === cote\) return \{ ok: false, raison: 'attaque-jouee' \};/,
  'le moteur refuse une seconde phase d’attaque du même camp dans le tour');
assert.match(duelEngine, /duel\.attaqueJouee = cote;\s*\n\s*\/\/ Appliquer réellement cette étape une seule fois/,
  'la phase d’attaque n’est consommée que par une déclaration acceptée');
assert.match(duelEngine, /duel\.tour = autre\(duel\.tour\);\s*\n\s*duel\.phase = 'debut';[\s\S]{0,200}?duel\.attaqueJouee = null;/,
  'la fin du tour rend sa phase d’attaque au camp suivant');
assert.match(battlePage, /const attaqueJouee = duel\.attaqueJouee === 'joueur' \|\| combatEntrant\?\.coteAttaquant === 'joueur';/,
  'la page lit la phase d’attaque déjà jouée, combat en attente compris');
assert.match(battlePage, /<PhaseTrack current=\{phaseDuelActive\} jouees=\{attaqueJouee \? \['attaque'\] : \[\]\} \/>/,
  'le rail des phases marque l’étape d’attaque comme jouée');
assert.match(battleCss, /\.rpg-phase-step\.is-jouee\s*\{[^}]*color:/s,
  'l’étape d’attaque jouée se range au lieu de s’allumer');
assert.match(battlePage, /disabled=\{!monTour \|\| attaqueJouee \|\| !prets\.length \|\| Boolean\(combatEntrant\) \|\| Boolean\(sacrificeEnCours\) \|\| defausseOuverte\}/,
  '« Attaquer avec tous » se verrouille une fois la phase d’attaque du tour jouée');
// Lueur rouge « visée » : la victime d’une attaque ciblée, la cible d'une magie,
// d'une sorcellerie ou de tout autre effet de carte portent le même rouge, de
// l'annonce du sorcier jusqu'à la résolution — on sait toujours qui va être
// frappé. La pulsation passe par `box-shadow` et cède la place aux
// cinématiques (`fx-hit`, `fx-lunge`…) dès qu'elles jouent.
assert.match(battleCss, /\.rpg-card\.is-spell-target,\s*\.rpg-card\.is-coup-rapide-cible\s*\{[^}]*outline:\s*4px solid #ff534c/s,
  'la créature visée par une attaque ou un effet porte la lueur rouge « visée »');
assert.match(battleCss, /\.rpg-card\.is-spell-target:not\(\.fx-enter, \.fx-lunge, \.fx-hit, \.fx-glow, \.fx-block, \.fx-unblock\),\s*\.rpg-card\.is-coup-rapide-cible:not\(\.fx-enter, \.fx-lunge, \.fx-hit, \.fx-glow, \.fx-block, \.fx-unblock\)\s*\{\s*animation:\s*rpg-cible-visee 1\.1s ease-in-out infinite alternate;/s,
  'le halo de visée respire sans écraser les cinématiques d’impact et d’attaque');
assert.match(battleCss, /\.rpg-wizard-plate\.is-spell-target\s*\{[^}]*outline:\s*3px solid #ff534c/s,
  'la plaque du sorcier visé par un effet prend le même rouge');
assert.match(battlePage, /spellTarget=\{Boolean\(sortJoue\?\.cible\.targetIds\.includes\(entite\.id\)\) \|\| idsVisesParAnnonce\.has\(entite\.id\)\}/,
  'la carte annoncée par le sorcier allume sa cible en rouge dès la fenêtre de réponse');
assert.match(battlePage, /Object\.values\(combatEntrant\?\.ciblesAttaque \?\? \{\}\)\.includes\(entite\.id\) \|\| Object\.values\(ciblesAttaque\)\.includes\(entite\.id\)/,
  'la proie d’une attaque ciblée brille dès sa désignation, avant même l’attaque lancée');
assert.match(battlePage, /rpg-wizard-plate--joueur\$\{sortJoue\?\.cible\.targetPlate === 'joueur' \|\| annonceViseVotrePlate \? ' is-spell-target' : ''\}/,
  'votre plaque s’allume en rouge quand l’annonce du sorcier vous vise');
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
// ── Le dos de carte gravé ────────────────────────────────────────────────────
assert.match(battlePage, /const DOS_DE_CARTE_STYLE = Object\.freeze\(\{\s*'--rpg-dos-de-carte': `url\("\$\{import\.meta\.env\.BASE_URL\}dos-de-carte\.jpg"\)`/,
  'le chemin du dos de carte suit BASE_URL et descend en variable CSS depuis la racine du duel');
assert.match(battlePage, /data-scene="duel"\s*\n\s*style=\{DOS_DE_CARTE_STYLE\}/,
  'la racine du duel porte la variable du dos de carte');
assert.match(battleCss, /\.rpg-hidden-hand__card\s*\{[^}]*background:\s*var\(--rpg-dos-de-carte\) center \/ cover no-repeat,\s*linear-gradient/s,
  'la main cachée du sorcier montre le dos gravé, le dégradé restant dessous en repli');
assert.match(battleCss, /\.rpg-card-pile__card--back\s*\{\s*background:\s*var\(--rpg-dos-de-carte\) center \/ cover no-repeat,\s*linear-gradient/s,
  'les cartes empilées montrent le dos gravé, le dégradé restant dessous en repli');
assert.match(battleCss, /\.rpg-card-pile--deck \.rpg-card-pile__card--back\s*\{\s*background:\s*var\(--rpg-dos-de-carte\) center \/ cover no-repeat,\s*linear-gradient/s,
  'le paquet agrandi montre le dos gravé, le dégradé restant dessous en repli');
assert.doesNotMatch(battleCss, /\.rpg-hidden-hand__card::after/,
  'le losange ◈ dessiné en CSS disparaît : la rune du dos le remplace');
assert.match(battleCss, /\.rpg-hidden-hand__card\s*\{[^}]*width:\s*78px;[^}]*height:\s*101px;[^}]*margin-left:\s*-26px;/s,
  'la main cachée du sorcier se lit en vraies cartes (78 × 101), pas en vignettes');
assert.match(battleCss, /@media \(max-width: 620px\) \{\s*\.rpg-hidden-hand \{ top: 1%; \}\s*\.rpg-hidden-hand__card \{ width: 52px; height: 67px; margin-left: -18px;/s,
  'sur un écran étroit, la main cachée garde la même proportion, un cran plus petite');
// ── La main du sorcier, au doigt ─────────────────────────────────────────────
// Elle était effacée sur téléphone (`display: none`) : on jouait sans voir la
// main d'en face. Elle revient dans la bande de navigation, en dos de cartes —
// jamais une face — et sans prendre le moindre toucher.
assert.doesNotMatch(mobileCss, /\.card-table > \.rpg-hidden-hand\s*\{[^}]*display:\s*none/s,
  'la main adverse n’est plus effacée sur téléphone');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-hidden-hand\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;[^}]*pointer-events:\s*none;/s,
  'au doigt, l’éventail du sorcier se range dans la rangée de navigation et ne capte aucun toucher');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hidden-hand__card\s*\{[^}]*width:\s*var\(--rpg-hidden-card-w\);[^}]*height:\s*calc\(var\(--rpg-hidden-card-w\) \* 1\.3\);/s,
  'la carte cachée du doigt suit l’échelle de la rangée, sans quitter le format du dos de carte (1,3)');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.rpg-hidden-hand__card\s*\{[^}]*background-image:\s*none/s,
  'le dos gravé de la main adverse reste au doigt : rien de sa face n’est montré');

assert.match(battleCss, /\.rpg-card-piles--player\s*\{\s*top:\s*44%;\s*right:\s*auto;\s*left:\s*14px;/,
  'le deck et le cimetière du joueur sont à gauche sur grand écran, centrés dans la bande libre au lieu de coller à la plaque du joueur');
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
assert.match(battlePage, /canTarget=\{Boolean\([\s\S]*?cibleEnCours && \['ennemi', 'tous'\]\.includes\(modeCible\) && !rpgEstProtegee/,
  'une créature protégée ne se présente pas comme cible légale contre sa couleur');
assert.match(cardsSource, /export function cardFrameClass\(carte\)[\s\S]*?cardFrameInfo\(carte\)\.key/,
  'les cartes convertissent leur élément en classe de cadre commune à toutes les vues');
assert.match(battlePage, /function cardFrameStyle\(carte\)[\s\S]*?--rpg-frame-color/,
  'les cartes transmettent la couleur de leur élément à leur cadre');
assert.doesNotMatch(battlePage, /rpg-card--rarity-/,
  'plus aucun cadre n’est piloté par la rareté');
assert.match(cardsSource, /export const RPG_ELEMENTS = \['braise', 'eau', 'sable', 'neige', 'tenebres'\];/,
  'les cinq éléments sont déclarés une seule fois, dans l’ordre canonique des couleurs');
assert.match(cardsSource, /export const CARD_FRAME_COLORS = \{\s*braise:[\s\S]*?eau:[\s\S]*?sable:[\s\S]*?neige:[\s\S]*?'hybride-braise-eau':[\s\S]*?'hybride-braise-sable':[\s\S]*?'hybride-braise-neige':[\s\S]*?'hybride-eau-sable':[\s\S]*?'hybride-eau-neige':[\s\S]*?'hybride-sable-neige':[\s\S]*?'hybride-braise-eau-sable':/,
  'le catalogue déclare un cadre pour chaque couleur et chaque combinaison, y compris celles qui n’existent pas encore');
assert.match(cardsSource, /export function cardFrameColor\(carte\)\s*\{\s*return cardFrameInfo\(carte\)\.color;\s*\}/,
  'la couleur du cadre est celle de l’élément, y compris pour une mythique');
assert.doesNotMatch(cardsSource, /MYTHIC_FRAME_COLOR/,
  'aucune couleur violette ne supplante plus celle de l’élément');
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
const statsCreatureMain = battleCss.match(/\.rpg-hand__card--type-creature \.rpg-hand__stat\s*\{([^}]*)\}/)?.[1] ?? '';
assert.match(statsCreatureMain, /background:\s*rgba\(0, 0, 0, \.68\);/,
  'ATQ et DÉF des créatures (héros compris) en main reprennent les plaques noires translucides du champ');
assert.match(statsCreatureMain, /border-color:\s*rgba\(255, 255, 255, \.34\);[\s\S]*?color:\s*#fff8e8;/,
  'les icônes et chiffres restent lisibles sur les nouvelles plaques');
assert.doesNotMatch(battleCss, /\.rpg-hand__card--type-arme \.rpg-hand__stat\s*\{/,
  'les bonus des armes en main ne sont pas recolorés avec les ATQ/DÉF des créatures');
const attaqueEnnemie = battlePage.slice(battlePage.indexOf('const resoudreAttaqueEnnemie = () => {'),
  battlePage.indexOf('const resoudreAttaqueJoueur ='));
const attaqueJoueur = battlePage.slice(battlePage.indexOf('const resoudreAttaqueJoueur = (combat = combatEntrant) => {'),
  battlePage.indexOf('const resoudreCombat ='));
for (const [source, camp] of [[attaqueEnnemie, 'ennemi'], [attaqueJoueur, 'joueur']]) {
  assert.match(source, /const sonAttaque = rpgCombatSound\(duel, attaquantsVivants, blocages\);[\s\S]*?if \(frappeCreature\) jouerSfx\(sonAttaque \?\? 'player_attack_hit', 0\.015\);/,
    `un blocage résolu côté ${camp} conserve l’impact d’attaque, ou son équivalent Braise`);
}
assert.match(battlePage, /if \(res\.resume\.frappeSorcier > 0\) declencherImpactEcran\('dealt'\)/,
  'une attaque directe sur le sorcier déclenche la secousse après acceptation des blocages');
assert.match(battlePage, /const frappeDirecte = res\.resume\.frappeSorcier > 0;[\s\S]*?if \(frappeDirecte\) declencherImpactEcran\('received'\);\s*apresCombatSorcier\(\)/,
  'une attaque directe reçue déclenche l’effet de dégâts du joueur, puis le sorcier entre en deuxième phase principale');
assert.match(battlePage, /const passerFinTourSorcier = \(\) => \{[\s\S]*?terminerTourEtDetecterDegatsJoueur\(\)\) declencherImpactEcran\('received'\)/,
  'un écho qui tombe à la fermeture du tour du sorcier déclenche l’effet de dégâts du joueur');
assert.match(battlePage, /const degatsJoueurAvantResolution = prendreInstantaneDegatsJoueur\(\);[\s\S]*?const res = rpgSorcierResoudreAnnonce\(duel\);[\s\S]*?if \(res\.ok && joueurToucheDepuis\(degatsJoueurAvantResolution\)\) \{\s*declencherImpactEcran\('received'\);/,
  'un sort ou une capacité d’arrivée adverse qui touche les PV ou le bouclier déclenche le même impact rouge');
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
  'le sorcier choisit ses bloqueurs après la déclaration, hors attaquants de l’Attaque ciblée');
assert.match(battlePage, /if \(!attaquantsBloques\.length\) \{[\s\S]*?resoudreAttaqueJoueur\(combat\);[\s\S]*?return;/,
  'une attaque sans bloqueur est résolue immédiatement, sans étape d’acceptation');
assert.match(battlePage, /const resoudreAttaqueJoueur = \(combat = combatEntrant\)/,
  'la résolution accepte aussi le combat fraîchement déclaré sans attendre un rendu');
assert.match(battlePage, /rpg-actions__combat[\s\S]*?rpg-actions__turn[\s\S]*?rpg-btn--endturn/,
  'les actions de combat restent dans la barre, les actions de tour vivent dans le rail');
assert.match(battlePage, /disabled=\{!monTour \|\| phase \|\| Boolean\(cibleEnCours\) \|\| Boolean\(combatEntrant\) \|\| Boolean\(sacrificeEnCours\) \|\| mulliganOuvert \|\| choixManaEssaiOuvert\}/,
  'Fin du tour attend le mulligan, le choix coloré ou la fin des sélections de combat et de cible');
assert.match(battlePage, /const RPG_PHASE_STEPS = \[[\s\S]*?id: 'debut'[\s\S]*?id: 'principale'[\s\S]*?id: 'attaque'[\s\S]*?id: 'blocage'[\s\S]*?id: 'principale2'[\s\S]*?id: 'fin'/,
  'le rail représente les six phases du tour : début, principale, attaque, blocage, deuxième principale, fin');
assert.match(battlePage, /const phaseDuelActive = vainqueur[\s\S]*?finTourJoueur \|\| fenetreFinTour[\s\S]*?combatEntrant[\s\S]*?phase[\s\S]*?debutVisible[\s\S]*?duel\.phase/,
  'la phase lumineuse suit l’état réel du duel');
assert.match(battlePage, /const fenetreFinTour = Boolean\(duel\.finDeTour\?\.cote === 'sorcier'/,
  'la fin de tour du sorcier ouvre une fenêtre où le joueur peut jouer une magie rapide');
assert.match(battlePage, /rpgOuvrirFinDeTour\(duel\);[\s\S]*?rpgSorcierMagieRapide\(duel, rng\)/,
  'à la fin du tour du joueur, le sorcier a la main pour une magie rapide avant la fermeture du tour');
// ── Le rail du tour : phases, indicateur et « Fin du tour » au milieu ───────
assert.match(battlePage, /<div className="rpg-turn-rail" role="group" aria-label="Déroulé du tour">[\s\S]*?rpg-turn-indicator[\s\S]*?<PhaseTrack current=\{phaseDuelActive\}[^>]*\/>[\s\S]*?rpg-actions__turn[\s\S]*?rpg-btn--endturn/,
  'l’indicateur, les phases et « Fin du tour » forment le rail du tour, au milieu de la table');
assert.doesNotMatch(battlePage, /rpg-bottombar__status/,
  'la barre du bas ne porte plus l’indicateur de tour : elle garde le journal et les actions de combat');
assert.match(battleCss, /\.rpg-turn-rail\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*42;[^}]*top:\s*50%;[^}]*right:\s*max\(16px, env\(safe-area-inset-right, 0px\)\);[^}]*flex-direction:\s*column;[^}]*transform:\s*translateY\(-50%\);[^}]*pointer-events:\s*none;/s,
  'le rail du tour est une colonne posée à droite de la table, qui laisse passer les gestes');
assert.match(battleCss, /\.rpg-turn-rail \.rpg-btn\s*\{[^}]*pointer-events:\s*auto;/s,
  'seuls les boutons du rail attrapent le clic : une carte posée dessous reste jouable');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-turn-rail \.rpg-btn:disabled\s*\{\s*pointer-events:\s*none;\s*\}/,
  'sur PC, un bouton de tour désactivé ne bloque pas les actions de combat sous le rail');
assert.match(battleCss, /\.rpg-phase-track\s*\{[^}]*flex-direction:\s*column;/s,
  'la disposition de base des phases (hors rail du tour) reste verticale');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-turn-rail \.rpg-phase-track\s*\{[^}]*flex-direction:\s*row;[^}]*background:\s*rgba\(8, 7, 9, \.62\);/s,
  'sur PC, les phases sont en ligne sur un fond sombre transparent');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-turn-rail \.rpg-phase-step\s*\{[^}]*--rpg-phase-lit:\s*#f29a4a;[^}]*color:\s*#f29a4a;/s,
  'sur PC, toutes les phases utilisent la même couleur orange');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-turn-rail \.rpg-phase-step__label\s*\{[^}]*clip-path:\s*inset\(50%\);/s,
  'sur PC, les libellés disparaissent visuellement sans perdre leur texte accessible');
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
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-actions__turn \.rpg-btn--undo,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-actions__combat \.rpg-btn--attaque-tous,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-actions__combat \.rpg-btn--cancel-attack\s*\{\s*background:\s*rgba\(4, 3, 3, \.9\);\s*\}/,
  'sur PC, Annuler, Attaquer avec tous et Annuler l’attaque partagent le même fond sombre');
assert.doesNotMatch(battleCss, /\.rpg-actions__combat \.rpg-btn--(?:confirmer-attaque|resolve-combat)\s*\{\s*background:\s*rgba\(4, 3, 3, \.9\);/,
  'les deux commandes principales du combat ne prennent plus le fond sombre des commandes en retrait');
assert.doesNotMatch(mobileCss, /\.rpg-actions__combat \.rpg-btn--(?:confirmer-attaque|resolve-combat)[^{]*\{\s*background:\s*rgba\(4, 3, 3, \.9\);/,
  'la fenêtre étroite pilotée à la souris garde, elle aussi, l’aplat clair des commandes principales');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--attaque,\s*\.rpg-actions__turn \.rpg-btn--endturn\s*\{[^}]*font: 600 11px\/1\.1 var\(--display\);[^}]*text-transform:\s*none;/s,
  'les actions restent compactes et sans capitales envahissantes');
assert.match(battleCss, /\.rpg-actions__turn \.rpg-btn--endturn\s*\{[^}]*border-color:\s*rgba\(235, 194, 98, \.76\);[^}]*background:\s*linear-gradient\(180deg, rgba\(238, 202, 112, \.98\), rgba\(202, 158, 61, \.96\)\);[^}]*font-weight:\s*800;/s,
  'Fin du tour garde un repère doré compact et bien visible');
assert.match(battleCss, /\/\* Commandes de duel compactes[\s\S]*?\.rpg-bottombar\s*\{[^}]*width: min\(340px, calc\(100vw - 230px\)\);/s,
  'la barre inférieure ne garde que les actions de combat, dans une largeur discrète');
// ── La colonne des actions : le combat sous le rail, la main dessous ──────
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \{\s*--rpg-actions-column:\s*330px;[\s\S]*?--rpg-actions-bottom:\s*216px;[\s\S]*?--rpg-actions-reserve:\s*124px;\s*\}/,
  'rail et barre de combat partagent la même colonne de droite, sous les mêmes repères');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\):has\(\.rpg-annonce-sort__compact\) \{\s*--rpg-actions-reserve:\s*204px;\s*\}/,
  'la fenêtre de réponse à une magie annoncée relève le rail de sa hauteur');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-turn-rail \{\s*top:\s*auto;\s*bottom:\s*calc\(var\(--rpg-actions-bottom\) \+ max\(var\(--rpg-actions-reserve\), calc\(var\(--rpg-controles-h, 0px\) \+ 12px\)\)\);\s*height:\s*max-content;\s*margin-block:\s*0;\s*transform:\s*none;\s*\}/,
  'sur PC, le rail s’arrête juste au-dessus de la barre de combat');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-bottombar \{\s*right:\s*max\(16px, env\(safe-area-inset-right, 0px\)\);\s*bottom:\s*var\(--rpg-actions-bottom\);\s*width:\s*var\(--rpg-actions-column\);\s*gap:\s*8px;\s*\}/,
  'les commandes de combat rejoignent la colonne des actions, juste au-dessus de la main du joueur');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-actions__combat > \.rpg-btn \{\s*width:\s*100%;\s*margin:\s*0;\s*\}/,
  'sur PC, les deux commandes du combat s’empilent sur toute la largeur de la colonne');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--confirmer-attaque,\s*\.rpg-actions__combat \.rpg-btn--resolve-combat \{\s*display:\s*inline-flex;[\s\S]*?background:\s*var\(--rpg-combat-fill,[\s\S]*?font:\s*800 15px\/1\.1 var\(--display\);[\s\S]*?animation:\s*rpg-combat-appel/s,
  'Confirmer l’attaque et Résoudre le combat portent l’aplat clair de la commande principale et son halo qui respire');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--confirmer-attaque \{\s*--rpg-combat-edge:[^}]*--rpg-combat-fill:\s*linear-gradient\(180deg, #e2f4ff, #86ccf3 60%, #3f90c5\);[^}]*--rpg-combat-ink:\s*#08202e;/s,
  'Confirmer l’attaque passe au bleu glacé, écrit en sombre');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--resolve-combat \{\s*--rpg-combat-edge:[^}]*--rpg-combat-fill:\s*linear-gradient\(180deg, #ffe9ab, #e0b458 60%, #b0852c\);[^}]*--rpg-combat-ink:\s*#241a05;/s,
  'Résoudre le combat prend l’or du tour, écrit en sombre');
assert.match(battleCss, /\.rpg-actions__combat \.rpg-btn--confirmer-attaque:disabled,\s*\.rpg-actions__combat \.rpg-btn--resolve-combat:disabled \{\s*border-color:[^}]*animation:\s*none;/s,
  'une commande principale indisponible s’éteint et cesse de battre');
assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-actions__combat \.rpg-btn--confirmer-attaque,\s*\.rpg-actions__combat \.rpg-btn--resolve-combat \{ animation: none; \}\s*\}/,
  'le battement du halo respecte « animations réduites »');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-actions__combat \.rpg-btn--confirmer-attaque,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-actions__combat \.rpg-btn--resolve-combat \{\s*min-height:\s*58px;\s*padding:\s*12px 18px;\s*font-size:\s*15px;\s*\}/,
  'sur PC, la commande principale du combat dépasse d’une tête les boutons de tour');
assert.doesNotMatch(battleCss, /rpg-actions__wait|rpg-empty-lane/,
  'les styles du bandeau d’indications et des rangées vides ont été retirés de la feuille de combat');
assert.match(battleCss, /\.rpg-phase-step__icon\s*\{\s*display:\s*grid;\s*width:\s*24px;\s*height:\s*24px;/,
  'les icônes de phase sont agrandies partout');
assert.match(battleCss, /@media \(max-width: 620px\) \{\s*\.rpg-bottombar \{[\s\S]*?\.rpg-actions__row \.rpg-btn \{ min-height: 39px; padding: 6px 9px; font-size: 11px; \}/,
  'la barre de commandes reste nettement lisible sur un écran étroit');
assert.match(battleCss, /@media \(max-width: 620px\) \{\s*\.rpg-turn-rail \{[^}]*max-width: clamp\(118px, 26vw, 148px\); \}[\s\S]*?\.rpg-phase-step__icon \{ width: 22px; height: 22px; \}/,
  'le rail du tour et ses phases se resserrent sur un écran étroit');
assert.match(battlePage, /reponseApresBlocage \? 'À VOUS · RÉPONSE'/,
  'la priorité revient au joueur après le choix des bloqueurs adverses');
assert.match(battlePage, /Accepter les blocages/,
  'le joueur peut accepter les bloqueurs adverses sans lancer de magie rapide');
assert.match(battlePage, /reponseApresBlocage \? carte\.instant/,
  'seuls les magies rapides jouables restent actifs pendant cette fenêtre de réponse');
assert.match(battleCss, /\.rpg-blocker-arrow__shaft\s*\{[^}]*stroke:\s*rgba\(255, 219, 54, \.72\)/s,
  'chaque bloqueur assigné garde une flèche jaune visible');
assert.match(battlePage, /setBloqueurSelectionne\(entite\.id\)/,
  'un bloqueur peut être sélectionné au clic, y compris sur écran tactile');
assert.match(battlePage, /assignerBloqueur\(entite\.id, bloqueurSelectionne\)/,
  'un second clic sur l’attaquant attribue le bloqueur sans enlever le glisser-déposer');
// L'étagère fusionne le catalogue et les decks maison, puis n'affiche que les
// decks retenus par le filtre de couleur (l'atelier les rejoint depuis son onglet).
assert.match(battlePage, /const decksTous = \[\.\.\.RPG_DECKS, \.\.\.decksMaison\];[\s\S]*?decksVisibles\.map\(\(deck\)/,
  'le menu Deck présente le catalogue de decks existants, étagère maison comprise');
assert.match(battlePage, /RPG_DUEL_CARDS\.filter\(\(carte\)/,
  'le catalogue complet filtre dynamiquement toutes les cartes du duel');
assert.match(battlePage, /className="rpg-card-catalogue"[\s\S]*?Filtrer par couleur[\s\S]*?Filtrer par type/,
  'l’onglet Catalogue propose les filtres de couleur et de type');
assert.match(battlePage, /onChangeScreen\('catalogue'\)[\s\S]*?Catalogue/,
  'Catalogue est accessible depuis le menu des modes');
// Une créature se pose **avant** de désigner : la carte vole, `finaliserPoseCreature`
// entre en jeu (arrivée différée), et la table s'allume — le clic referme l'attente.
assert.match(battlePage, /demarrerVolCarte\(carte, index, \(\) => poserCarte\(carteId\)\)/,
  'la carte d’une créature vole vers la table dès qu’elle est jouée : la pose passe avant la cible');
assert.match(battlePage, /const poserCarte = \(carteId\) => \{[\s\S]*?finaliserPoseCreature\(carteId\);\s*\};/,
  'la créature arrivée au bout de son vol se pose sans relancer une seconde animation');
assert.match(battlePage, /rpgJouerCreature\(duel, 'joueur', carteId, null, \{ cibleDifferee: true, sacrificeId \}\)[\s\S]*?if \(res\.arriveeEnAttente\) setCibleEnCours\(carteId\);/,
  'le Cavalier entre en jeu, puis la page ouvre la désignation de sa victime');
assert.match(battlePage, /if \(arriveeCiblePortee\(carteSource\) && duel\.arriveeEnAttente\?\.carteId === cibleEnCours\) \{[\s\S]*?rpgResoudreArriveeCiblee\(duel, 'joueur', entite\.id\)/,
  'la cible cliquée referme l’attente ouverte à la pose, sans reposer la créature');
assert.match(duelEngine, /export function rpgResoudreArriveeCiblee\(duel, cote, cibleId\)/,
  'le moteur expose la reprise de l’arrivée en attente');
assert.match(duelEngine, /export function arriveeCiblePortee\(carte\)/,
  'la portée d’une arrivée ciblée est une seule règle, partagée par le moteur et la page');
assert.match(battleCss, /\.rpg-card-catalogue__art\s*\{[\s\S]*?aspect-ratio:\s*4\s*\/\s*5;[\s\S]*?border:\s*var\(--rpg-card-border-large, 6px\) solid var\(--rpg-frame-color/s,
  'les illustrations du catalogue sont moins étirées verticalement en 4:5 et gardent un cadre piloté par l’élément, au grand gabarit');
assert.match(battleCss, /\.rpg-card-catalogue__cost\s*\{[^}]*top:\s*9px;[^}]*right:\s*9px;[^}]*bottom:\s*auto;/s,
  'le coût des cartes du catalogue est affiché en haut à droite de l’illustration');
assert.match(battlePage, /⚔<\/span> Jouer\s*<\/button>/,
  'le menu comporte un mode Jouer');
assert.match(battlePage, /cardFrameClass\(carte\)/,
  'les cartes en main, sur table et les aperçus portent leur élément');
const frameCss = battleCss.slice(battleCss.lastIndexOf('/* Le cadre suit la COULEUR'));
// Plus aucun cadre : les quatre gabarits d'épaisseur valent zéro, en clair,
// sur la coque du duel comme sur la coque tactile. C'est ce qui couvre aussi
// les faces sans classe de cadre (une carte en Furie, la vignette de l'atelier).
for (const gabarit of ['', '-large', '-small', '-strong']) {
  assert.match(battleCss, new RegExp(`--rpg-card-border${gabarit}:\\s*0px;`),
    `le gabarit ${gabarit || 'normal'} vaut zéro : plus d'anneau sur les faces`);
}
assert.doesNotMatch(battleCss, /--rpg-card-border[\w-]*:\s*clamp\(/,
  'aucun gabarit de cadre ne mesure plus une épaisseur');
for (const gabarit of ['', '-strong']) {
  assert.match(mobileCss, new RegExp(`--rpg-card-border${gabarit}:\\s*0px;`),
    `au doigt aussi, le gabarit ${gabarit || 'normal'} vaut zéro`);
}
assert.doesNotMatch(mobileCss, /--rpg-card-border[\w-]*:\s*clamp\(/,
  'la feuille tactile ne mesure plus aucun cadre');
// Plus aucune épaisseur propre aux armes : la plaque est commune à toutes
// les cartes, sur chaque face du duel, au doigt, dans l'atelier et le guide.
for (const [nom, css] of [['le duel', battleCss], ['le tactile', mobileCss], ['l’atelier', atelierCss], ['le guide', guideCss]]) {
  assert.doesNotMatch(css, /\.rpg-card--frame-arme[^{,]*\{[^}]*border-width/s,
    `${nom} ne donne plus aux armes une épaisseur de cadre à part`);
  assert.doesNotMatch(css, /\* 1\.6\)/, `${nom} ne multiplie plus aucun gabarit par 1,6 : la plaque est dans le gabarit lui-même`);
}
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.rpg-terrain(?:\.rpg-terrain-stack)?\s*\{[^}]*border-width:\s*(?!0\b)\d/s,
  'au doigt, les terrains n’ont aucun filet fixe : ni la couleur de l’élément (le petit gabarit hors disposition tactile), ni un cran de 1 ou 2 px');
// AUCUNE face ne porte de cadre, nulle part (voir « PLUS AUCUN CADRE », en fin
// de `rpg-battle.css`, et son jumeau tactile en fin de `rpg-mobile.css`) : bord
// à zéro sur toute la coque tactile, et la même condition pour le menu, qui n'a
// pas la classe tactile. Les piles perdent leur ombre décalée, colorée du cadre
// de la carte.
const sansCadre = mobileCss.slice(mobileCss.indexOf('/* ── Sans cadre, au doigt'));
assert.ok(sansCadre.length > 1000, 'la feuille tactile porte le bloc « Sans cadre, au doigt »');
assert.match(sansCadre, /\.rpg-battle--touch \.rpg-hand \.rpg-hand__card,\s*\.rpg-battle--touch \.card-row \.rpg-card,\s*\.rpg-battle--touch \.rpg-terrain \{\s*border-width: 0 !important;/,
  'la main, la table et les terrains du doigt partagent la même règle : plus de bord');
assert.match(sansCadre, /\.rpg-battle\.rpg-battle--touch \[class\*="rpg-card--frame-"\]\[class\] \{\s*border-width: 0 !important;/,
  'au doigt, toutes les faces de la coque tactile — aperçu, mulligan, piles, annonces, catalogue — perdent leur cadre');
assert.match(sansCadre, /@media \(pointer: coarse\), \(max-width: 1100px\) \{[\s\S]*?\.rpg-battle \.rpg-atelier__carte-art\[class\*="rpg-card--frame-"\]\[class\],\s*\n\s*\.rpg-battle \.rpg-card-catalogue__art\[class\*="rpg-card--frame-"\]\[class\] \{\s*\n\s*border-width: 0 !important;/,
  'le menu (atelier, catalogue), qui n’a pas la classe tactile, perd son cadre à la même condition : doigt, stylet ou fenêtre étroite');
assert.doesNotMatch(battleCss, /--rpg-card-filet:\s*[1-9]/,
  'le filet de couleur a disparu : aucun écran ne mesure plus un anneau');
assert.match(sansCadre, /\.rpg-battle--touch \.rpg-card-stack,\s*\.rpg-battle--touch \.rpg-terrain\.rpg-terrain-stack\.is-stacked \{\s*box-shadow: none;\s*\}/,
  'au doigt, une pile — cartes homonymes ou terrains — n’a plus d’ombre de pile : le compteur ×N la dit');
assert.match(sansCadre, /\.rpg-battle--touch \.rpg-terrain\.rpg-terrain-stack\.is-partially-tapped \{\s*box-shadow: 0 0 0 1px rgba\(255, 217, 168, \.45\);\s*\}/,
  'l’engagement partiel d’une pile de terrains garde sa bague : c’est un état, pas une épaisseur');
assert.doesNotMatch(sansCadre, /border-width:\s*var\(--rpg-card-filet/,
  'la feuille tactile ne redessine plus aucun filet : elle les retire tous');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand__card--img \.rpg-card-element-badge \{ width: 16px; border-width: 1\.5px;/,
  'le retrait ne touche que le cadre : la pastille d’élément garde son bord');
assert.doesNotMatch(sansCadre, /outline:/,
  'le retrait ne pose aucun liseré à la place du cadre : les états (sélection, cible, attaquant) gardent leurs outlines');
assert.match(frameCss, /\.rpg-card\[class\*="rpg-card--frame-"\],\s*\.rpg-hand__card\[class\*="rpg-card--frame-"\],\s*\.rpg-card-destruction-fx\s*\{\s*border:\s*var\(--rpg-card-border, 4px\) solid var\(--rpg-frame-color, #f1f3f5\);\s*\}/,
  'main, table et animations partagent le gabarit normal, pour toute combinaison de couleurs');
assert.match(frameCss, /\.rpg-hover-card-preview__face\s*\{\s*border:\s*var\(--rpg-card-border-large, 6px\) solid var\(--rpg-frame-color, #f1f3f5\);\s*\}/,
  'la face de l’aperçu rapide — une carte agrandie — prend le grand gabarit');
assert.match(frameCss, /\.rpg-terrain\[class\*="rpg-card--frame-"\],\s*\.rpg-spell-played__art,\s*\.rpg-card-pile__card--top,\s*\.rpg-card-pile--deck \.rpg-card-pile__card--top\s*\{\s*border:\s*var\(--rpg-card-border-small, 3px\) solid var\(--rpg-frame-color, #f1f3f5\);\s*\}/,
  'terrains, dessus de piles et vignette de magie jouée prennent le petit gabarit');
assert.match(battleCss, /\.rpg-mulligan__card\s*\{[^}]*border:\s*var\(--rpg-card-border-large, 6px\) solid var\(--rpg-frame-color/s,
  'les grandes faces du mulligan prennent le grand gabarit');
assert.doesNotMatch(frameCss.slice(0, frameCss.indexOf('/* ── Cadres ornés')), /border:\s*\d+(\.\d+)?px solid/,
  'plus aucun cadre de carte n’a d’épaisseur fixe en pixels : tous passent par un gabarit');
assert.doesNotMatch(battleCss, /--rpg-rarity-color/,
  'la variable de rareté ne pilote plus aucune bordure');
assert.match(battleCss, /\.rpg-hand__card--img \.rpg-hand__rarity\s*\{[\s\S]*?color:\s*var\(--rarity-color/s,
  'le badge de rareté des cartes en main garde sa couleur propre');
// Tout cadre est un anneau orné : bordure transparente, trois couches — le fond
// de la face sur la padding-box, le motif puis la matière (couleur unie,
// diagonale hybride ou dégradé brillant mythique) sur la border-box. Le motif commun est posé sur
// `.rpg-battle`, donc hérité partout ; la mythique pose le sien.
const ringRule = frameCss.slice(frameCss.indexOf('/* ── Cadres ornés'), frameCss.indexOf('/* ── Cadres brillants'));
assert.match(ringRule, /\.rpg-battle\s*\{\s*--rpg-frame-motif:\s*url\("data:image\/svg\+xml,%3Csvg [^"]+"\);\s*--rpg-frame-motif-size:\s*8px 8px;\s*\}/,
  'le motif commun des cadres — la résille — est déclaré une fois, sur `.rpg-battle`, en SVG en ligne de 8 px');
const resille = ringRule.match(/--rpg-frame-motif:\s*url\("([^"]+)"\)/);
const resilleDom = new JSDOM('<!doctype html><body></body>');
const resilleDoc = new resilleDom.window.DOMParser().parseFromString(
  decodeURIComponent(resille[1].replace(/^data:image\/svg\+xml,/, '')), 'image/svg+xml');
assert.equal(resilleDoc.querySelector('parsererror'), null, 'le SVG de la résille est bien formé une fois décodé');
assert.ok(resilleDoc.querySelector('path[stroke="#000"][stroke-opacity]') && resilleDoc.querySelector('circle[fill="#fff"][fill-opacity]'),
  'la résille n’est faite que d’ombre et de reflet translucides : elle se lit sur toute couleur de cadre, beige du Sable compris');
resilleDom.window.close();
for (const element of ['.rpg-card', '.rpg-hand__card', '.rpg-terrain', '.rpg-hover-card-preview__face', '.rpg-spell-played__art', '.rpg-card-destruction-fx', '.rpg-card-pile__card--top', '.rpg-mulligan__card']) {
  assert.ok(ringRule.includes(`${element}[class*="rpg-card--frame-"]`), `${element} porte l’anneau orné`);
}
assert.ok(ringRule.includes('.rpg-card-catalogue__art {') || ringRule.includes('.rpg-card-catalogue__art,'), 'le catalogue porte l’anneau orné');
assert.match(ringRule, /border-color:\s*transparent;\s*background-image:\s*linear-gradient\(var\(--rpg-frame-fill, #0c0c0e\), var\(--rpg-frame-fill, #0c0c0e\)\),\s*var\(--rpg-frame-motif, none\),\s*var\(--rpg-frame-gradient, linear-gradient\(var\(--rpg-frame-color, #f1f3f5\), var\(--rpg-frame-color, #f1f3f5\)\)\);\s*background-origin:\s*padding-box, border-box, border-box;\s*background-clip:\s*padding-box, border-box, border-box;\s*background-size:\s*100% 100%, var\(--rpg-frame-motif-size, 8px 8px\), var\(--rpg-frame-material-size, 100% 100%\);\s*background-repeat:\s*no-repeat, repeat, no-repeat;\s*background-position:\s*0 0, 0 0, 0% 0;/,
  'l’anneau orné empile fond de face, motif et matière, et sans dégradé déclaré la matière est la couleur unie de l’élément');
assert.match(ringRule, /\.rpg-mulligan__card\[class\*="rpg-card--frame-"\]\s*\{\s*--rpg-frame-fill:\s*#0b0c10;\s*\}[\s\S]*?\.rpg-card-catalogue__art\s*\{\s*--rpg-frame-fill:\s*#171218;\s*\}/,
  'le mulligan et le catalogue gardent leur propre fond sous l’illustration');
assert.match(battleCss, /\.rpg-mulligan__card\.is-selected\s*\{[^}]*--rpg-frame-gradient:\s*linear-gradient\(#ff4646, #ff4646\);[^}]*box-shadow:[^}]*rgba\(255, 72, 72, \.72\)[^}]*rgba\(255, 45, 45, \.72\)/s,
  'au mulligan, la carte mise de côté repeint son anneau en rouge et reçoit une lueur rouge');
assert.match(battleCss, /\.rpg-mulligan__card\.is-selected\s+\.rpg-mulligan__img\s*\{[^}]*filter:\s*grayscale\(1\) brightness\(\.72\);/s,
  'l’illustration d’une carte choisie pour le mulligan est en niveaux de gris');
assert.doesNotMatch(battleCss, /\.rpg-mulligan__card\.is-selected\s*\{[^}]*border-color:/s,
  'la lueur rouge du mulligan ne passe pas par une `border-color` invisible');
const shineRule = frameCss.slice(frameCss.indexOf('/* ── Cadres brillants'), frameCss.indexOf('/* Hybrides : deux aplats francs'));
assert.match(shineRule, /\.rpg-card--frame-brillant\s*\{\s*--rpg-frame-material-size:\s*240% 100%;\s*\}/,
  'seuls les cadres mythiques mono utilisent une matière large pour leur reflet');
// Le duel ne joue plus le reflet : ses faces n'ont plus d'anneau (expérimentation
// « plus aucun cadre »), et cette animation, déclarée après les cinématiques,
// leur volait la propriété `animation` sur les cartes brillantes et mythiques —
// l'arrivée, le bond, le choc et la lévitation de l'Envol disparaissaient.
assert.doesNotMatch(shineRule, /animation:\s*rpg-frame-shine-sweep/,
  'le reflet d’un cadre brillant ne prend plus la propriété `animation` des cartes du duel');
assert.match(shineRule, /\.rpg-card--frame-brillant\s*\{\s*--rpg-frame-material-size:\s*240% 100%;\s*\}/,
  'la matière large du reflet reste déclarée pour les feuilles qui peignent encore l’anneau');
assert.doesNotMatch(shineRule, /linear-gradient\(115deg|background-image/,
  'la mécanique du cadre brillant est partagée : chaque variante ne fournit que son dégradé');
// Toute combinaison déclarée au catalogue doit exister en CSS : une future
// carte multicolore obtient son cadre sans retouche du composant. Les couleurs
// seules, elles, peignent leur cadre via la variable --rpg-frame-color.
const { CARD_FRAME_COLORS } = await import('../src/games/rpgCards.js');
// Le Sable n'est plus blanc : son cadre est un beige de dune — chaud (rouge
// nettement au-dessus du bleu), ni blanc cassé ni brun.
const sableRvb = CARD_FRAME_COLORS.sable.color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1).map((canal) => parseInt(canal, 16));
assert.ok(sableRvb[0] > sableRvb[2] + 40 && Math.max(...sableRvb) < 0xe8 && Math.min(...sableRvb) > 0x80,
  `le cadre du Sable est un beige de dune, plus un blanc (reçu : ${CARD_FRAME_COLORS.sable.color})`);
for (const cle of Object.keys(CARD_FRAME_COLORS).filter((key) => key.startsWith('hybride-'))) {
  const colors = cle.replace('hybride-', '').split('-');
  const stops = colors.map((element) => CARD_FRAME_COLORS[element].color);
  const rule = frameCss.match(new RegExp(`\\.rpg-card--frame-${cle}\\s*\\{([^}]*)\\}`));
  assert.ok(rule, `la combinaison ${cle} a son propre cadre`);
  assert.match(rule[1], /--rpg-frame-gradient:\s*linear-gradient\(135deg,/,
    `la combinaison ${cle} utilise une diagonale`);
  assert.ok(stops.every((color) => rule[1].includes(color)),
    `la combinaison ${cle} montre chaque couleur élémentaire sans les mélanger`);
  assert.doesNotMatch(rule[1], /animation:|--rpg-frame-material-size:|background-color:/,
    `la combinaison ${cle} n'ajoute ni balayage ni fond coloré artificiel`);
  if (colors.length === 2) {
    assert.match(rule[1], new RegExp(`linear-gradient\\(135deg, ${stops[0]} 50%, ${stops[1]} 50%\\)`),
      `les deux moitiés de ${cle} se rejoignent sans transition à 50 %`);
  }
}
const mythicRule = frameCss.slice(frameCss.indexOf('.rpg-card--mythique {'), frameCss.indexOf('/* Les reflets des mythiques mono'));
const mythicBase = mythicRule.slice(0, mythicRule.indexOf('}'));
assert.doesNotMatch(mythicBase, /--rpg-frame-gradient|background-color/,
  'le zellige mythique ne remplace pas la diagonale bicolore');
for (const [element, teinte] of Object.entries({ braise: '#e0412a', eau: '#3f9fe8', sable: '#d8bc86', neige: '#a9e0f5' })) {
  assert.match(mythicRule,
    new RegExp(`\\.rpg-card--mythique\\.rpg-card--frame-${element}\\s*\\{[^}]*--rpg-frame-gradient:\\s*linear-gradient\\(115deg,[^}]*${teinte}`),
    `la mythique ${element} garde un dégradé lumineux de son élément`);
}
assert.doesNotMatch(mythicRule, /#2a0a45|#7a2bd0|#f2e6ff|#f0e2ff/,
  'l’ancien cadre mythique violet, y compris son motif lilas, a disparu');
assert.match(mythicRule, /\.rpg-mulligan__card\.is-selected\.rpg-card--mythique,\s*\.rpg-mulligan__card\.is-selected\[class\*="rpg-card--frame-hybride-"\]\s*\{\s*--rpg-frame-gradient:\s*linear-gradient\(#ff4646, #ff4646\);/,
  'la lueur rouge du mulligan reste visible sur les mythiques comme sur les hybrides');
// Le motif est une image encodée dans la feuille : une URI mal échappée ne
// lèverait aucune erreur, elle ne peindrait simplement rien. On la décode et on
// la fait relire par un analyseur XML avant d'y croire.
const mythicMotif = mythicRule.match(/--rpg-frame-motif:\s*url\("([^"]+)"\)/);
assert.ok(mythicMotif, 'le cadre mythique porte un motif');
assert.match(mythicMotif[1], /^data:image\/svg\+xml,%3Csvg /,
  'le motif du cadre mythique est un SVG en ligne');
const mythicMotifDom = new JSDOM('<!doctype html><body></body>');
const mythicMotifDoc = new mythicMotifDom.window.DOMParser().parseFromString(
  decodeURIComponent(mythicMotif[1].replace(/^data:image\/svg\+xml,/, '')), 'image/svg+xml');
assert.equal(mythicMotifDoc.querySelector('parsererror'), null,
  'le SVG du motif mythique est bien formé une fois décodé');
assert.ok(mythicMotifDoc.querySelectorAll('path').length >= 2 && mythicMotifDoc.querySelectorAll('circle').length >= 1,
  'le zellige du cadre mythique superpose au moins deux tracés et un point central');
mythicMotifDom.window.close();
assert.match(mythicRule, /--rpg-frame-motif-size:\s*12px 12px;/,
  'le motif du cadre mythique se répète tous les 12 px le long de l’anneau');
assert.match(mythicRule, /--rpg-frame-shine-duration:\s*2\.8s;/,
  'le reflet des mythiques mono-élément garde sa cadence');
// Les armes n’ont plus de cadre spécifique : leur présentation suit les
// mêmes couleurs et les mêmes motifs que les autres cartes de leur élément.
assert.doesNotMatch(frameCss, /rpg-card--frame-arme|rpg-arme-ciselle|--rpg-arme-cadre/,
  'aucune matière, épaisseur ou découpe de cadre ne reste réservée aux armes');
assert.doesNotMatch(cardsSource, /armeCadreClass|rpg-card--frame-arme|CARD_FRAME_COLORS\[`arme-/,
  'le catalogue ne fabrique plus de variante de cadre pour les armes');
assert.match(frameCss, /\.rpg-hover-card-preview\[class\*="rpg-card--frame-"\],\s*\.rpg-hover-card-preview__face\[class\*="rpg-card--frame-"\]\s*\{\s*background-color:\s*transparent;\s*\}/,
  'l’aperçu rapide ne garde aucune teinte de repli, ni sur son encadré entier ni derrière l’illustration');
// Le foil partagé a remplacé le vernis des mythiques. Une seule face brille
// maintenant, avec le même calque partout : superposer un second reflet en
// boucle se lisait comme un défaut de rendu, pas comme une carte brillante.
// Et surtout, ce calque bouge avec la carte au lieu de tourner dans le vide.
assert.doesNotMatch(frameCss, /rpg-mythic-art-gloss/,
  'aucun reflet ne tourne en boucle sur une face : le foil est posé par la lumière');
assert.doesNotMatch(frameCss, /rpg-card--mythique::before[^{]*\{[^}]*\b(?:background|animation)\s*:/s,
  'les faces mythiques ne portent plus de calque de reflet séparé du foil');
const foilCss = frameCss.slice(frameCss.indexOf('LE FOIL'), frameCss.indexOf("/* ── La face de l'aperçu en 3D"));
// Le foil reste sur les fiches du guide, mais pas sur les aperçus du duel ni
// sur les cartes révélées pendant l'ouverture d'un booster.
const foilRule = foilCss.slice(0, foilCss.indexOf('{'));
assert.match(foilRule,
  /\.rpg-card-guide__example::after\s*$/,
  'le foil reste réservé aux fiches du guide');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview__face::after/,
  'les cartes dans la preview ne portent plus le glow multicolore');
assert.doesNotMatch(battleCss, /\.rpg-souk__carte-art::after/,
  'les cartes révélées dans un booster ne portent plus le glow multicolore');
assert.doesNotMatch(hoverPreviewSource, /--rpg-foil-/,
  'l’inclinaison 3D de la preview ne déplace plus de reflet foil');
assert.match(hoverPreviewSource, /--rpg-face-3d-x/,
  'l’aperçu continue de s’incliner vers le curseur');
assert.match(battleCss, /\.rpg-hover-card-preview \.rpg-hover-card-preview__face\s*\{[^}]*perspective\(var\(--rpg-face-3d-focale/s,
  'la preview conserve son inclinaison 3D sans le glow multicolore');
for (const face of [
  '.rpg-card--img::after',
  '.rpg-hand__card--img::after',
  '.rpg-mulligan__card::after',
  '.rpg-terrain::after',
  '.rpg-card-pile__card--top::after',
]) {
  assert.ok(!foilRule.includes(face), `${face} ne porte plus le foil : la table reste sans reflet`);
}
// La face du catalogue n'a plus de foil, seulement son voile du bas : sa règle
// est vérifiée à part. Elle est écrite bien avant `frameCss`, on la cherche donc
// dans toute la feuille plutôt que dans la tranche des cadres.
const catalogueArtCss = battleCss.match(/\.rpg-card-catalogue__art::after\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
assert.doesNotMatch(catalogueArtCss, /radial-gradient|--rpg-foil-/,
  'la vignette du catalogue reste sans foil : la grille ne doit pas onduler sous le curseur');
assert.match(catalogueArtCss, /linear-gradient\(0deg, rgba\(5, 4, 7/,
  'la vignette du catalogue garde son voile du bas, qui rend le nom et le coût lisibles');
assert.match(foilCss, /repeating-linear-gradient[\s\S]*?radial-gradient\(ellipse[\s\S]*?mix-blend-mode: screen;/,
  'le foil du guide mêle grain, reflets colorés et lumière ajoutée');
assert.match(foilCss, /var\(--rpg-foil-cx, 0%\)/,
  'le foil restant est placé par l’angle de vue, et non par une trame qui défile');
assert.match(foilCss, /\* 1\.35\)[\s\S]*?\* 0\.7\)[\s\S]*?\* 1\.7\)/,
  'les taches d’arc-en-ciel glissent à des vitesses différentes, sinon la carte resterait plate');
// Le foil restant continue à mêler le grain du support et les taches
// d'arc-en-ciel, en lumière ajoutée : c'est ce qui en fait une carte brillante
// sous la lumière, et non une image teintée.
assert.match(foilCss, /repeating-linear-gradient\(118deg[\s\S]*?linear-gradient\(112deg, transparent 30%/,
  'le foil du guide garde ses taches, son grain et son éclat, dans l’ordre');
// Le mythe reste reconnaissable, mais par son cadre et son relief — plus par un
// reflet qui lui serait propre.
assert.match(frameCss, /filter: saturate\(1\.1\) contrast\(1\.04\);/,
  'la peinture mythique garde son relief, sans calque de reflet ajouté');
// Le guide habille chaque fiche du même anneau orné que les autres faces, à
// l'épaisseur commune de 6 px : couleur unie d'une mono ou diagonale d'une
// hybride — plus de filet de 1 px ni de 3 px.
assert.match(guideCss, /\.rpg-card-guide__example\s*\{[^}]*border:\s*6px solid transparent;[^}]*var\(--rpg-frame-gradient, linear-gradient\(var\(--rpg-frame-color, var\(--rpg-guide-frame, #d3ab62\)\), var\(--rpg-frame-color, var\(--rpg-guide-frame, #d3ab62\)\)\)\)[^}]*background-size:\s*100% 100%, var\(--rpg-frame-motif-size, 8px 8px\), var\(--rpg-frame-material-size, 100% 100%\);/s,
  'le guide peint le même anneau orné sur toutes ses fiches, à 6 px');
assert.doesNotMatch(guideCss, /\.rpg-card-guide__example[^{]*\{[^}]*border(?:-width)?:\s*(?:1px|3px)/s,
  'aucune fiche du guide ne garde un cadre plus fin que la plaque commune');
assert.match(guideCss, /\.rpg-card-guide__example\.rpg-card--frame-brillant\s*\{\s*animation:\s*rpg-frame-shine-sweep/,
  'le guide n’anime que les cadres mythiques mono-élément');
assert.match(guideCss, /\.rpg-card-guide__cost\s*\{\s*position: absolute;\s*z-index: 2;/,
  'le coût du guide reste au-dessus du reflet de l’illustration');
{
  assert.match(atelierCss, /\.rpg-atelier__carte-art\s*\{[^}]*background-size:\s*100% 100%, var\(--rpg-frame-motif-size, 8px 8px\), var\(--rpg-frame-material-size, 100% 100%\);/s,
    'l’atelier peint lui aussi la diagonale à la bonne taille');
  const states = new JSDOM(`<!doctype html><style>${battleCss}\n${atelierCss}</style><div class="rpg-battle">
    <button class="rpg-card rpg-card--img rpg-card--mythique"><img class="rpg-card__img" data-filter="prete"></button>
    <button class="rpg-card rpg-card--img rpg-card--mythique is-summoning-sick"><img class="rpg-card__img" data-filter="fatiguee"></button>
    <button class="rpg-card rpg-card--img rpg-card--mythique is-attacked"><img class="rpg-card__img" data-filter="engagee"></button>
    <div class="rpg-atelier__carte"><div class="rpg-atelier__carte-art rpg-card--mythique"><img data-filter="libre"></div></div>
    <div class="rpg-atelier__carte is-full"><div class="rpg-atelier__carte-art rpg-card--mythique"><img data-filter="pleine"></div></div>
    <div class="rpg-atelier__carte is-locked"><div class="rpg-atelier__carte-art rpg-card--mythique"><img data-filter="verrouillee"></div></div>
    <article class="rpg-card-catalogue__card is-locked">
      <div class="rpg-card-catalogue__art rpg-card--mythique rpg-card--frame-brillant">
        <img data-filter="catalogue-verrouillee">
        <span class="rpg-card-catalogue__lock" data-catalogue-lock>🔒</span>
      </div>
      <div class="rpg-card-catalogue__details" data-catalogue-locked-details></div>
    </article>
  </div>`);
  const filtre = (etat) => states.window.getComputedStyle(states.window.document.querySelector(`[data-filter="${etat}"]`)).filter;
  assert.equal(filtre('prete'), 'saturate(1.1) contrast(1.04)', 'la peinture mythique prête gagne un léger relief');
  assert.match(filtre('fatiguee'), /grayscale\(1\)/, 'le mal d’invocation reste visible sur la mythique');
  assert.match(filtre('engagee'), /grayscale\(\.5\)/, 'l’engagement reste visible sur la mythique');
  assert.equal(filtre('libre'), 'saturate(1.1) contrast(1.04)', 'l’atelier vernit la carte mythique libre');
  assert.match(filtre('pleine'), /brightness\(\.45\)/, 'l’atelier assombrit toujours la mythique au quota');
  assert.match(filtre('verrouillee'), /grayscale\(\.85\)/, 'l’atelier ne vernit pas la mythique verrouillée');
  assert.equal(filtre('catalogue-verrouillee'), 'grayscale(1) brightness(.62)',
    'les cartes verrouillées du catalogue restent en gris, même si elles sont mythiques');
  const cadenasCatalogue = states.window.getComputedStyle(states.window.document.querySelector('[data-catalogue-lock]'));
  assert.equal(cadenasCatalogue.top, '50%', 'le cadenas verrouillé est centré verticalement sur l’illustration');
  assert.equal(cadenasCatalogue.left, '50%', 'le cadenas verrouillé est centré horizontalement sur l’illustration');
  assert.equal(cadenasCatalogue.pointerEvents, 'none', 'le cadenas ne bloque pas le bouton qui ouvre la fiche');
  assert.equal(states.window.getComputedStyle(states.window.document.querySelector('[data-catalogue-locked-details]')).filter,
    'grayscale(1)', 'les informations des cartes verrouillées sont elles aussi en gris');
  states.window.close();
}
// La règle ne suffit pas : l'aperçu porte les classes de cadre sur sa racine ET
// sur sa face, et chaque variante brillante peint une teinte de repli. On fait
// calculer la cascade réelle de `rpg-battle.css` à jsdom sur une mythique mono,
// une hybride ordinaire et la même hybride devenue mythique : aucun fond dans
// l'aperçu, mais la bonne teinte de repli pour chacune en main.
{
  const { RPG_DUEL_CARDS: cartesDuel, cardFrameClass, cardFrameInfo, cardHasMythicFrame } = await import('../src/games/rpgCards.js');
  const anqa = cartesDuel.find((carte) => carte.id === 'anqa-des-braises');
  const bicolore = cartesDuel.find((carte) => cardFrameInfo(carte).key.startsWith('hybride-') && carte.rarity !== 'mythique');
  assert.ok(anqa && cardHasMythicFrame(anqa), 'l’Anqa des braises est bien une mythique du duel');
  assert.ok(bicolore, 'le duel compte au moins une carte bicolore non mythique');
  const mythiqueHybride = { ...bicolore, rarity: 'mythique' };
  const apercu = (carte, suffixe) => `
    <aside class="rpg-hover-card-preview rpg-hover-card-preview--${carte.element} rpg-hover-card-preview--type-creature ${cardFrameClass(carte)}" data-test="racine-${suffixe}">
      <div class="rpg-hover-card-preview__face ${cardFrameClass(carte)}" data-test="face-${suffixe}"><img alt=""></div>
      <div class="rpg-hover-card-preview__details"></div>
    </aside>
    <div class="rpg-card-peek"><aside class="rpg-hover-card-preview ${cardFrameClass(carte)}" data-test="volet-${suffixe}"></aside></div>
    <button class="rpg-hand__card rpg-hand__card--img ${cardFrameClass(carte)}" data-test="main-${suffixe}"></button>`;
  const cascade = new JSDOM(`<!doctype html><html><head><style>${battleCss}</style></head><body>${apercu(anqa, 'mythique')}${apercu(bicolore, 'bicolore')}${apercu(mythiqueHybride, 'mythique-hybride')}</body></html>`, { pretendToBeVisual: true });
  const fondDe = (test) => cascade.window.getComputedStyle(cascade.window.document.querySelector(`[data-test="${test}"]`)).backgroundColor;
  const transparent = /^(rgba\(0, 0, 0, 0\)|transparent)$/;
  for (const suffixe of ['mythique', 'bicolore', 'mythique-hybride']) {
    assert.match(fondDe(`racine-${suffixe}`), transparent,
      `l’encadré entier de l’aperçu d’une carte ${suffixe} reste sans fond (reçu : ${fondDe(`racine-${suffixe}`)})`);
    assert.match(fondDe(`face-${suffixe}`), transparent,
      `la face de l’aperçu d’une carte ${suffixe} reste sans fond derrière l’illustration (reçu : ${fondDe(`face-${suffixe}`)})`);
    assert.match(fondDe(`volet-${suffixe}`), transparent,
      `le volet d’appui long d’une carte ${suffixe} reste sans fond (reçu : ${fondDe(`volet-${suffixe}`)})`);
  }
  assert.doesNotMatch(fondDe('main-bicolore'), transparent,
    'la carte bicolore ordinaire garde sa teinte de repli');
  assert.match(fondDe('main-mythique'), transparent,
    'sans cadre, la mythique Braise n’a plus de teinte de repli derrière son image');
  assert.match(fondDe('main-mythique-hybride'), transparent,
    'une mythique hybride reste aussi sans aplat derrière son illustration');
  const degradeDe = (test) => cascade.window.getComputedStyle(cascade.window.document.querySelector(`[data-test="${test}"]`))
    .getPropertyValue('--rpg-frame-gradient');
  assert.match(degradeDe('main-mythique'), /#e0412a/,
    'le reflet de l’Anqa mythique porte le rouge Braise, pas un violet de rareté');
  assert.equal(degradeDe('main-mythique-hybride'), degradeDe('main-bicolore'),
    'la mythique hybride garde exactement la diagonale de sa combinaison');
  assert.match(degradeDe('main-bicolore'), /linear-gradient\(135deg,\s*#e0412a 50%,\s*#d8bc86 50%\)/,
    'Braise + Sable montre rouge et beige à parts égales sans transition ni violet');
  for (const suffixe of ['bicolore', 'mythique-hybride']) {
    const main = cascade.window.document.querySelector(`[data-test="main-${suffixe}"]`);
    assert.ok(!main.classList.contains('rpg-card--frame-brillant'),
      `le cadre de ${suffixe} ne porte pas de reflet animé`);
    assert.equal(cascade.window.getComputedStyle(main).backgroundSize,
      '100% 100%, var(--rpg-frame-motif-size, 8px 8px), var(--rpg-frame-material-size, 100% 100%)',
      'la diagonale remplit toute la surface du cadre à sa taille normale');
  }
  const mulliganHybride = cascade.window.document.createElement('button');
  mulliganHybride.className = `rpg-mulligan__card is-selected ${cardFrameClass(bicolore)}`;
  mulliganHybride.innerHTML = '<img class="rpg-mulligan__img" alt="">';
  cascade.window.document.body.appendChild(mulliganHybride);
  assert.match(cascade.window.getComputedStyle(mulliganHybride).getPropertyValue('--rpg-frame-gradient'), /#ff4646/,
    'la sélection du mulligan recouvre la diagonale de l’hybride en rouge');
  assert.equal(cascade.window.getComputedStyle(mulliganHybride.querySelector('.rpg-mulligan__img')).filter,
    'grayscale(1) brightness(.72)', 'l’illustration choisie au mulligan devient grise');
  assert.match(cascade.window.getComputedStyle(mulliganHybride).boxShadow, /rgba\(255, 72, 72, \.72\)/,
    'la carte choisie au mulligan reçoit un halo rouge');
  const mulliganChoisi = cascade.window.document.createElement('button');
  mulliganChoisi.className = `rpg-mulligan__card is-selected ${cardFrameClass(anqa)}`;
  cascade.window.document.body.appendChild(mulliganChoisi);
  assert.match(cascade.window.getComputedStyle(mulliganChoisi).getPropertyValue('--rpg-frame-gradient'), /#ff4646/,
    'une mythique sélectionnée au mulligan garde son cadre rouge de sélection');
  cascade.window.close();
}
assert.doesNotMatch(frameCss, /\.rpg-card[\.\w-]*\s*\{\s*animation:\s*rpg-frame-shine-sweep/s,
  'aucune face du duel ne porte le reflet : elles n’ont plus d’anneau');
const shinePositions = [...frameCss.slice(frameCss.indexOf('@keyframes rpg-frame-shine-sweep'))
  .matchAll(/background-position:\s*0 0, 0 0,\s*(-?[\d.]+)%/g)].map((match) => Number(match[1]));
assert.ok(shinePositions.length >= 2, 'le reflet est animé sur toute la largeur du cadre');
assert.ok(shinePositions.every((position) => position >= 0 && position <= 100),
  `le reflet reste entre 0 % et 100 % (reçu : ${shinePositions.join(', ')}) — hors de cette plage le dégradé non répété ne couvre plus l'anneau et le cadre redevient noir`);
assert.match(frameCss, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-card--frame-brillant\s*\{\s*animation:\s*none !important;/s,
  'les cadres brillants respectent la préférence de mouvement réduit');
assert.match(cardsSource, /export function cardFrameClass\(carte\)[\s\S]*?cardHasShinyFrame\(carte\)[\s\S]*?rpg-card--frame-brillant[\s\S]*?cardHasMythicFrame\(carte\)[\s\S]*?rpg-card--mythique/,
  'la même fabrique de classe ajoute le reflet et le zellige aux mythiques sans changer leur couleur');
assert.match(battlePage, /function cardFrameStyle\(carte\)[\s\S]*?cardFrameColor\(carte\)/,
  'le duel utilise la couleur du cadre définie par le catalogue');
assert.match(battlePage, /rpg-card-catalogue__art \$\{cardFrameClass\(carte\)\}/,
  'les cadres du catalogue reprennent les dégradés et reflets des cartes du duel');
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
for (const selector of ['.rpg-mana-cost', '.rpg-card-element-badge', '.rpg-card-element-badge--hybride', '.rpg-card-catalogue__cost']) {
  const debutBloc = battleCss.indexOf(`\n${selector} {`) + 1;
  assert.ok(debutBloc > 0, `${selector} possède une règle dédiée`);
  const block = battleCss.slice(debutBloc).split('}')[0];
  assert.match(block, /width: var\(--rpg-card-marker-size, 24px\);/,
    `${selector} utilise le diamètre commun de la face`);
}
assert.match(battleCss, /\.rpg-mana-cost\s*\{[^}]*height: var\(--rpg-card-marker-size, 24px\);[^}]*min-width: var\(--rpg-card-marker-size, 24px\);/s,
  'le coût reste carré et ne rétrécit pas dans le bandeau');
assert.match(battleCss, /\.rpg-card-element-badge__pip\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*1;/s,
  'chaque couleur hybride garde le même diamètre que le coût');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-card--img \{ --rpg-card-marker-size: 30px; \}/,
  'sur PC, couleur et coût partagent le diamètre de 30 px');
assert.match(battleCss, /\.rpg-hand__card--img \{ --rpg-card-marker-size: 28px; \}/,
  'la main partage le diamètre de 28 px');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand__card--img \{ --rpg-card-marker-size: 22px; \}/,
  'au doigt, les deux repères partagent le diamètre de 22 px');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand__card--img \.rpg-card-element-badge \{ width: 16px; border-width: 1\.5px; font-size: 10px; \}/,
  'la pastille de couleur de la main rétrécit à 16 px au doigt, le disque de coût garde 22 px');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand__card--img \.rpg-card-element-badge__pip \{ border-width: 1\.5px; \}/,
  'les deux couleurs d’une hybride en main suivent le filet réduit');
assert.match(battleCss, /\.rpg-mulligan__card \{ --rpg-card-marker-size: clamp\(16px, 15cqw, 30px\); \}/,
  'le mulligan utilise une seule taille responsive pour les deux repères');
assert.match(mobileCss, /\.rpg-battle\.rpg-battle--touch \[class\*="rpg-card--frame-"\]\[class\]\s*\{[^}]*border-width: 0 !important;/s,
  'mobile et APK retirent aussi les cadres des faces de lecture, sans retirer les pastilles');
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
// ── Les plateaux du duel : un terrain par camp, choisi par son propre deck ───
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
const choixPlateauPartie = battlePage.slice(
  battlePage.indexOf('const resolutionPlateaux = resoudrePlateauxDuDuel'),
  battlePage.indexOf('const plateau = resolutionPlateaux.joueur.plateau'),
);
assert.match(choixPlateauPartie, /deckJoueur: deckEssai \?\? \(modeTutoriel \? deckJoueurSelectionne : joueurDeck \?\? deckJoueurSelectionne\)/,
  'le tutoriel et les duels historiques tirent leur plateau comme avant ; l’essai utilise son deck');
assert.match(choixPlateauPartie, /deckAdverse: adversaireEssai \?\? \(modeTutoriel[\s\S]*?RPG_TUTORIAL_OPPONENT_DECK[\s\S]*?etageCourant \? etageCourant\.deck : sorcierDeck \?\? deckAdverse\)/,
  'le plateau du tutoriel tient compte du deck d’entraînement, les autres duels du deck adverse');
assert.match(choixPlateauPartie, /rng,/,
  'les plateaux restent résolus par le générateur aléatoire du duel');
assert.match(battlePage, /setPlateauAdverseId\(resolutionPlateaux\.adversaire\.plateau\.id\)/,
  'la moitié haute de la table reçoit le plateau du deck adverse : un terrain par camp');
const decoupeTerrainAdverse = battleCss.match(/\.rpg-plateau-moitie--adverse\s*\{[^}]*\}/)?.[0] ?? '';
assert.match(decoupeTerrainAdverse, /clip-path: inset\(0 0 calc\(100% - var\(--rpg-frontiere, 50%\)\) 0\);/,
  'le terrain adverse suit la frontière par une découpe franche');
assert.doesNotMatch(decoupeTerrainAdverse, /mask-image/,
  'la séparation des plateaux ne repose plus sur un masque');
assert.match(battleCss, /@property --rpg-frontiere \{[^}]*inherits: true;/,
  'la frontière est animable et partagée par les peintures et le trait doré');
assert.match(battleCss, /\.rpg-plateau-lisere \{[\s\S]*?top: var\(--rpg-frontiere, 50%\);[\s\S]*?background: #f0cf78;/,
  'le trait doré suit la frontière sans déplacer les zones de jeu');
assert.doesNotMatch(battlePage, /choixPlateau|onSelectPlateau|[cs]hargerChoixPlateau|sauverChoixPlateau|RPG_PLATEAU_ALEATOIRE|plateauPrecedent/,
  'le joueur ne choisit plus son plateau : ni verrou, ni pastille aléatoire, ni sauvegarde sur l’appareil');
assert.doesNotMatch(battlePage, /rpg-mode-menu__boards|rpg-board-choice|rpg-board-grid/,
  'le bloc « Le terrain d’affrontement » a disparu du menu Jouer');
assert.doesNotMatch(battleCss, /\.rpg-board-choice|\.rpg-mode-menu__boards|\.rpg-board-grid/,
  'les styles du sélecteur de plateau ont été retirés de la feuille de combat');
// La barre d'onglets du menu, dans la fenêtre tactile du jeu (téléphone en
// paysage, petites tablettes) : une deuxième ligne pleine largeur, jamais
// d'onglets qui débordent de l'écran ni passent sous le bouton plein écran.
assert.match(battleCss, /@media \(min-width: 821px\) and \(max-width: 1100px\) \{\s*\.rpg-mode-menu__header \{ flex-wrap: wrap; \}\s*\.rpg-mode-menu__switch \{ order: 3;[^}]*flex: 0 0 calc\(100% \+ clamp\(14px, 4\.6vw, 74px\) \* 2\);[^}]*overflow-x: auto; scrollbar-width: none; \}\s*\.rpg-mode-menu__switch::-webkit-scrollbar \{ display: none; \}\s*\.rpg-mode-menu__switch button, \.rpg-mode-menu__switch button\.rpg-mode-menu__souk \{ flex: 1 0 auto; min-height: 46px;[^}]*\}\s*\}/,
  'entre 821 et 1100 px, les sept onglets passent sur leur propre ligne, pleine largeur, et se la partagent ; en dernier recours la barre défile sans onglet coupé');
assert.match(plateauxSource, /RPG_PLATEAUX_PAR_DECK = \{[\s\S]*?'veilleurs-du-desert': 'erg-du-sahara',[\s\S]*?'cour-des-djinns': 'table-des-heures',[\s\S]*?'sentiers-de-cendre': 'caravane-de-gourara',[\s\S]*?'maree-des-abysses': 'ruines-de-tipaza'/,
  'chaque deck du catalogue a son terrain attitré');
assert.match(plateauxSource, /couleurDominanteDeck/,
  'un deck sans identité connue (paquet brut) parle par sa couleur dominante');
assert.match(battlePage, /className=\{`card-table card-table--plateau-\$\{plateau\.id\}/,
  'la table porte le plateau tiré pour la partie en cours');
assert.doesNotMatch(battlePage, /rpg-actions__wait|rpg-card-peek__hint|rpg-empty-lane/,
  'le duel ne porte plus de texte d’indications — bandeau, légende d’aperçu, rangées vides : la table, les flèches et le journal suffisent');
assert.doesNotMatch(battlePage, /prendront place ici|gardiens du sorcier attendent/,
  'une rangée de créatures vide reste vide : aucune phrase ne la commente');
assert.match(plateauxSource, /id: 'caravane-de-gourara'[\s\S]*?fichier: 'plateau-caravane-de-gourara\.jpg'/,
  'la piste de caravane du Gourara est un second plateau saharien');
for (const plateauSombre of ['table-des-heures']) {
  assert.match(battleCss, new RegExp(`\\.card-table--plateau-${plateauSombre}\\s*\\{[^}]*background-color:`),
    `le plateau ${plateauSombre} a sa propre couleur de repli`);
}
for (const plateauSable of ['erg-du-sahara', 'caravane-de-gourara']) {
  assert.match(battleCss, new RegExp(`\\.card-table--plateau-${plateauSable}\\s*\\{[^}]*background-color:`),
    `le plateau ${plateauSable} a sa propre couleur de repli`);
}
// Le village viking : la surface enneigée du Nord, sa couleur de repli.
assert.match(battleCss, /\.card-table--plateau-village-viking\s*\{[^}]*background-color:/s,
  'Le Village Viking a sa propre couleur de repli');
assert.match(plateauxSource, /id: 'village-viking'[\s\S]*?fichier: 'plateau-village-viking\.jpg'/,
  'Le Village Viking est un plateau déclaré, avec son fond dans public/');
assert.match(plateauxSource, /id: 'ruines-de-tipaza'[\s\S]*?fichier: 'plateau-ruines-de-tipaza\.jpg'/,
  'les ruines romaines de Tipaza sont un plateau déclaré, avec son fond dans public/');
assert.match(plateauxSource, /id: 'cour-de-l-empereur'[\s\S]*?fichier: 'plateau-cour-de-l-empereur\.jpg'/,
  'la cour de l’Empereur est un plateau déclaré, avec sa peinture japonaise dans public/');
assert.match(plateauxSource, /'serment-du-soleil-rouge': 'cour-de-l-empereur'/,
  'le deck du Serment du Soleil rouge se bat dans la cour de l’Empereur');
assert.match(battleCss, /\.card-table--plateau-cour-de-l-empereur\s*\{[^}]*background-color:/s,
  'le parvis de la cour a sa propre couleur de repli');
assert.match(battleCss, /\.card-table--plateau-ruines-de-tipaza\s*\{[^}]*background-color:/s,
  'la pierre des ruines a sa propre couleur de repli');
// La clairière des neuf nuits, terrain de la Tour du Corbeau.
assert.match(plateauxSource, /id: 'cercle-des-corbeaux'[\s\S]*?fichier: 'plateau-cercle-des-corbeaux\.jpg'/,
  'le Cercle des corbeaux est un plateau déclaré, avec sa peinture dans public/');
assert.match(plateauxSource, /'corbeaux-du-givre': 'cercle-des-corbeaux'/,
  'les quatre paquets du Corbeau se battent dans la clairière des neuf nuits');
assert.match(battleCss, /\.card-table--plateau-cercle-des-corbeaux\s*\{[^}]*background-color:/s,
  'la neige de la clairière a sa propre couleur de repli');
// La chambre de verre du sablier retourné, terrain de la tour terminale.
assert.match(plateauxSource, /id: 'sablier-renverse'[\s\S]*?fichier: 'plateau-sablier-renverse\.jpg'/,
  'le Sablier renversé est un plateau déclaré, avec sa peinture dans public/');
assert.match(plateauxSource, /'le-sablier': 'sablier-renverse'/,
  'le sommet de la tour terminale reçoit dans le sablier retourné');
assert.match(battleCss, /\.card-table--plateau-sablier-renverse\s*\{[^}]*background-color:/s,
  'l’albâtre du sablier a sa propre couleur de repli');
// Les Ténèbres : deux terrains, le désert du Nil et la salle du trône.
assert.match(plateauxSource, /id: 'necropole-des-dalles'[\s\S]*?fichier: 'plateau-necropole-des-dalles\.jpg'/,
  'la Nécropole des dalles est un plateau déclaré, avec sa peinture égyptienne dans public/');
assert.match(plateauxSource, /id: 'palais-du-pharaon'[\s\S]*?fichier: 'plateau-palais-du-pharaon\.jpg'/,
  'Le Palais du Pharaon est un plateau déclaré, avec son intérieur dans public/');
assert.match(plateauxSource, /'balance-des-heures': 'necropole-des-dalles'/,
  'la Balance des Heures se bat sur les dalles de la Nécropole');
assert.match(plateauxSource, /'juges-de-la-necropole': 'palais-du-pharaon'/,
  'le tribunal de la Nécropole siège au Palais du Pharaon');
assert.match(plateauxSource, /tenebres: 'necropole-des-dalles'/,
  'un paquet Ténèbres sans identité prend les dalles, pas la table d’origine');

// ── Contrôles PC et plaques : tactile inchangé ───────────────────────────
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand\s*\{[^}]*width:\s*100%;[^}]*overflow:\s*visible;[^}]*pointer-events:\s*none;[^}]*mask-image:\s*none;[^}]*-webkit-mask-image:\s*none;/s,
  'sur PC, le conteneur plein écran de la main laisse passer les clics en dehors des cartes');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand__card\s*\{[^}]*min-width:\s*0;[^}]*flex:\s*0 1 clamp\(76px, 9vw, 136px\);[^}]*pointer-events:\s*auto;/s,
  'les cartes restent cliquables et se resserrent pour être toutes visibles sur PC');
// ── L'éventail de la main (souris) ───────────────────────────────────────
assert.match(battlePage, /'--hand-fan': eventail,\s*'--hand-fan-arc': eventail \* eventail,/,
  'chaque carte de la main reçoit sa place dans la rangée et son carré : l’éventail se calcule sans mesurer le DOM');
assert.match(battleCss, /\.rpg-hand__card\s*\{\s*--hand-fan-step:\s*min\(3\.6deg, calc\(22deg \/ max\(1, var\(--hand-count, 1\) - 1\)\)\);\s*--hand-fan-angle:\s*calc\(var\(--hand-fan, 0\) \* var\(--hand-fan-step\)\);\s*--hand-fan-spread:[^;]*;\s*--hand-fan-drop:[^;]*;/s,
  'l’angle, l’ouverture et la descente de l’éventail sortent de la place de la carte, et se resserrent quand la main s’allonge');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand__card\s*\{[^}]*--hand-fan-lift:\s*6px;[^}]*transform:\s*translateY\(calc\(var\(--hand-fan-drop\) - var\(--hand-fan-lift\)\)\)\s*translateX\(var\(--hand-fan-spread\)\)\s*rotate\(var\(--hand-fan-angle\)\)\s*scale\(var\(--hand-fan-scale\)\);/s,
  'à la souris, la carte s’incline, s’écarte du centre et descend en arc : la main se tient en éventail');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand__card:hover:not\(:disabled\) \{\s*--hand-fan-lift:\s*32px;\s*--hand-fan-scale:\s*1\.06;/s,
  'la carte survolée se soulève dans son axe, sans perdre son inclinaison ni sa place');
assert.match(mobileCss, /@media \(hover: none\), \(pointer: coarse\) \{\s*\.rpg-battle--touch \.rpg-hand \.rpg-hand__card \{\s*--hand-fan-step: 0deg;\s*--hand-fan-spread-scale: 0%;\s*--hand-fan-arc-scale: 0%;/s,
  'au doigt, l’éventail est mis à zéro : les cartes restent droites et jointives, une carte = une cible');
assert.match(mobileCss, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.rpg-battle--touch \.rpg-hand-dock \.rpg-hand \.rpg-hand__card \{\s*--hand-fan-lift:\s*0px;[\s\S]*?rotate\(var\(--hand-fan-angle\)\)/,
  'une fenêtre étroite pilotée à la souris garde l’éventail');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand__card\.is-targeting \{\s*--hand-fan-lift:\s*48px;\s*--hand-fan-scale:\s*1\.08;/s,
  'la carte choisie pour une cible garde, elle aussi, son inclinaison et sa place dans l’éventail');
assert.match(battleCss, /@keyframes rpg-player-card-draw \{\s*0% \{ opacity: 0; transform: translate3d\(-100%, 0, 0\) translateY\(var\(--hand-fan-drop\)\) translateX\(var\(--hand-fan-spread\)\) rotate\(var\(--hand-fan-angle\)\); \}/,
  'la carte piochée arrive dans son inclinaison d’éventail, sans se redresser puis retomber');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-bottombar \.rpg-log \{ display: none; \}/,
  'le journal qui commente la partie est masqué sur PC au-dessus des commandes');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-bottombar \.rpg-log \{ display: none; \}/,
  'le journal reste masqué sur tactile comme avant');
assert.match(battlePage, /function WizardManaCounters\(\{ mana \}\) \{[\s\S]*?const available = resources\.filter\(\(\[color\]\) => Number\(mana\?\.\[color\]\) > 0\);[\s\S]*?if \(!available\.length\) return null;/,
  'les pastilles de mana à zéro disparaissent et les réserves positives restent affichées');
assert.match(battlePage, /<WizardManaCounters mana=\{duel\.sorcier\.mana\} \/>[\s\S]*?<WizardManaCounters mana=\{duel\.joueur\.mana\} \/>/,
  'le sorcier adverse et le joueur utilisent le même affichage des réserves actives');
assert.match(battlePage, /supabase\.from\('profiles'\)\.select\('display_name, username'\)\.eq\('id', authUser\.id\)\.maybeSingle\(\)/,
  'le nom affiché vient du profil public Let’s Play, avec repli sur le nom du compte');
assert.match(battlePage, /className="rpg-wizard-plate__profile-name">\{nomProfilJoueur\}<\/span>/,
  'le nom du profil du joueur est rendu sur sa plaque');
assert.match(battlePage, /const nomSorcierAdverse = etageHistoire\?\.nom \?\? \(tutorielActif \? 'Sorcier d’entraînement' : duel\.modeMana === RPG_MODE_MANA_ESSAI \? 'Sorcier d’essai' : 'Ifrit al-Ahmar'\);/,
  'le sorcier adverse porte un nom cohérent avec le mode histoire, le tutoriel, l’essai ou le duel libre');
assert.match(battlePage, /className="rpg-wizard-plate__enemy-name">\{nomSorcierAdverse\}<\/span>/,
  'le nom du sorcier adverse est rendu sur sa plaque');

const playerPlateStart = battlePage.indexOf('className={`rpg-wizard-plate rpg-wizard-plate--joueur');
const playerPlateEnd = battlePage.indexOf('<div className="rpg-terrains rpg-terrains--joueur"', playerPlateStart);
const playerPlateMarkup = battlePage.slice(playerPlateStart, playerPlateEnd);
assert.ok(playerPlateMarkup.indexOf('rpg-wizard-plate__avatar') < playerPlateMarkup.indexOf('rpg-wizard-plate__profile-name')
  && playerPlateMarkup.indexOf('rpg-wizard-plate__profile-name') < playerPlateMarkup.indexOf('rpg-wizard-plate__pv'),
'le nom du profil se place entre le portrait et les PV');
const opponentPlateStart = battlePage.indexOf('className={`rpg-wizard-plate rpg-wizard-plate--ennemi');
const opponentPlateEnd = battlePage.indexOf('<div className="rpg-terrains rpg-terrains--ennemi"', opponentPlateStart);
const opponentPlateMarkup = battlePage.slice(opponentPlateStart, opponentPlateEnd);
assert.ok(opponentPlateMarkup.indexOf('rpg-wizard-plate__avatar') < opponentPlateMarkup.indexOf('rpg-wizard-plate__enemy-name')
  && opponentPlateMarkup.indexOf('rpg-wizard-plate__enemy-name') < opponentPlateMarkup.indexOf('rpg-wizard-plate__pv'),
'le nom du sorcier adverse se place entre le portrait et les PV');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*clamp\(44px, 3\.6vw, 52px\) minmax\(0, 1fr\);[^}]*width:\s*clamp\(176px, 15vw, 224px\);[^}]*border:\s*1px solid rgba\(226, 190, 119, \.78\);[^}]*border-radius:\s*999px;[^}]*background:\s*linear-gradient\(135deg, rgba\(18, 15, 15, \.96\), rgba\(7, 9, 14, \.94\)\);[^}]*box-shadow:\s*0 0 0 1px rgba\(15, 11, 10, \.86\), inset 0 0 0 1px rgba\(255, 235, 193, \.3\);/s,
  'sur PC, les plaques à fond sombre ont un cadre double très arrondi et des dimensions compactes');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate--joueur\s*\{[^}]*border-color:\s*rgba\(246, 211, 132, \.94\);[^}]*box-shadow:[^}]*rgba\(235, 188, 91, \.2\)/s,
  'la plaque du joueur reçoit un cadre doré');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate--ennemi\s*\{[^}]*border-color:\s*rgba\(226, 145, 111, \.95\);[^}]*box-shadow:[^}]*rgba\(211, 111, 79, \.22\)/s,
  'la plaque adverse reçoit un cadre cuivré distinct');
assert.match(battleCss, /\.rpg-wizard-plate__profile-name \{ display: none; \}[\s\S]*?\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__profile-name,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__enemy-name\s*\{[^}]*display:\s*block;/s,
  'le nom du profil et celui du sorcier adverse sont ajoutés uniquement au rendu PC');
assert.match(battleCss, /\.rpg-wizard-plate__enemy-name \{ display: none; \}/,
  'le nom de l’adversaire ne modifie pas le rendu tactile');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate--ennemi \.rpg-wizard-plate__pv\s*\{[^}]*grid-row:\s*2;[^}]*align-self:\s*center;/s,
  'les PV adverses restent centrés sous le nom sur PC');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__identity,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__sable,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__zones \{ display: none; \}/,
  'noms, mana et compteurs de zones sont retirés des fenêtres sur PC');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__shield-value \{ display: none; \}/,
  'le bouclier chiffré n’encombre pas les fenêtres réduites au portrait et aux PV sur PC');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__avatar\s*\{[^}]*width:\s*clamp\(44px, 3\.6vw, 52px\);[^}]*height:\s*clamp\(44px, 3\.6vw, 52px\);/s,
  'sur PC, les deux portraits sont agrandis');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__pv\s*\{[^}]*grid-column:\s*2;[^}]*display:\s*flex;[^}]*justify-content:\s*flex-start;[^}]*font-size:\s*clamp\(22px, 1\.9vw, 27px\);/s,
  'sur PC, les PV agrandis sont lisibles dans la colonne à droite du portrait');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__hp-icon--shield \{ display: none; \}[\s\S]*?\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__hp-icon--heart\s*\{[^}]*display:\s*inline-block;[^}]*color:\s*#f06468;/s,
  'sur PC, un cœur rouge remplace le bouclier devant les PV');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-wizard-plate__avatar \{ grid-row: 1 \/ 3; width: 28px; height: 28px;/,
  'les portraits gardent leur format tactile');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-wizard-plate__pv \{ grid-column: 3; grid-row: 1; font-size: 20px; \}/,
  'les points de vie gardent leur taille tactile');
assert.match(battleCss, /\.rpg-wizard-plate__hp-icon--heart \{ display: none; \}/,
  'le symbole de bouclier existant reste affiché au doigt, sans le cœur PC');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand-dock \{ background: transparent; overflow: visible; \}/,
  'le dock transparent ne concerne que le rendu PC');
assert.match(mobileCss, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.rpg-battle--touch \.card-table > \.rpg-wizard-plate\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*clamp\(44px, 3\.6vw, 52px\) minmax\(0, 1fr\);[^}]*width:\s*clamp\(176px, 15vw, 224px\);[^}]*border:\s*1px solid rgba\(226, 190, 119, \.78\);[^}]*border-radius:\s*999px;[^}]*background:\s*linear-gradient\(135deg, rgba\(18, 15, 15, \.96\), rgba\(7, 9, 14, \.94\)\);[^}]*box-shadow:\s*0 0 0 1px rgba\(15, 11, 10, \.86\), inset 0 0 0 1px rgba\(255, 235, 193, \.3\);[\s\S]*?\.rpg-battle--touch \.rpg-wizard-plate__profile-name,\s*\.rpg-battle--touch \.rpg-wizard-plate__enemy-name\s*\{[^}]*display:\s*block;/s,
  'un petit écran PC avec souris reçoit lui aussi le fond sombre, les cadres très arrondis et le layout compact');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-wizard-plate--joueur\s*\{[^}]*border-color:\s*rgba\(246, 211, 132, \.94\);[^}]*box-shadow:[^}]*rgba\(235, 188, 91, \.2\)/s,
  'le cadre doré du joueur existe aussi sur un petit écran PC');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-wizard-plate--ennemi\s*\{[^}]*border-color:\s*rgba\(226, 145, 111, \.95\);[^}]*box-shadow:[^}]*rgba\(211, 111, 79, \.22\)/s,
  'le cadre cuivré adverse existe aussi sur un petit écran PC');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-wizard-plate--ennemi \.rpg-wizard-plate__pv\s*\{[^}]*grid-row:\s*2;[^}]*align-self:\s*center;/s,
  'les PV et le nom adverses sont également empilés sur PC étroit');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand-dock \.rpg-hand__pile\s*\{[^}]*display:\s*flex;[^}]*min-width:\s*0;[^}]*flex:\s*0 1 clamp\(/s,
  'les piles de la main peuvent elles aussi se resserrer sur un petit écran PC');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand-dock \.rpg-hand__pile > \.rpg-hand__card\s*\{[^}]*width:\s*100%;[^}]*flex:\s*1 1 0;/s,
  'la carte d’une pile suit la largeur resserrée de son emplacement');

assert.doesNotMatch(plateauxSource, /terre-de-damnation|plateau-terre-de-damnation/i,
  'le plateau de la Terre de Damnation a été retiré du catalogue et de ses correspondances');
assert.doesNotMatch(battleCss, /card-table--plateau-terre-de-damnation/,
  'la couleur de repli du plateau retiré a également disparu');
assert.equal(existsSync(new URL('../public/plateau-terre-de-damnation.jpg', import.meta.url)), false,
  'le fond du plateau retiré n’est plus livré dans public/');
assert.match(plateauxSource, /braise: 'table-des-heures'/,
  'les decks de Braise utilisent la Table des Heures après le retrait du plateau des Brûlés');

// ── Réponse à une annonce : aperçu, commandes et capsule translucide ───────
assert.match(battlePage, /<HoverCardPreview[\s\S]*?carte=\{carteAnnoncee\}[\s\S]*?cible=\{cibleAnnoncee\}[\s\S]*?variante="annonce"[\s\S]*?controls=\{\s*\(/,
  'la fenêtre de réponse affiche la carte annoncée, sa cible et ses commandes');
assert.match(hoverPreviewSource, /cibleAnnoncee && \([\s\S]*?rpg-hover-card-preview__target[\s\S]*?cibleAnnoncee\.nom/,
  'l’aperçu d’une magie rend le nom et l’illustration de sa cible');
assert.match(hoverPreviewSource, /<div className="rpg-hover-card-preview__details-column">\s*<div className="rpg-hover-card-preview__details">\{details\}<\/div>\s*\{controls\}/,
  'les boutons sont dans la colonne et suivent naturellement la fenêtre de texte');
assert.match(battleCss, /\.rpg-annonce-sort\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*950;[^}]*inset:\s*0;[^}]*pointer-events:\s*auto;/s,
  'la couche de réponse recouvre le plateau et bloque les clics sous l’aperçu');
assert.match(battleCss, /\.rpg-annonce-sort\s*\{[^}]*background:\s*rgba\(0, 0, 0, \.46\) !important;[^}]*background-color:\s*rgba\(0, 0, 0, \.46\) !important;/s,
  'un voile noir semi-transparent assombrit le plateau sans le cacher');
assert.match(battleCss, /\.rpg-annonce-sort__panel\s*\{[^}]*background:\s*transparent !important;[^}]*background-color:\s*transparent !important;/s,
  'le panneau intérieur reste transparent et ne repeint pas le voile noir');
assert.match(battleCss, /\.rpg-annonce-sort__panel\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*pointer-events:\s*none;/s,
  'le panneau visuel laisse les commandes interactives gérer leurs propres clics');
assert.match(battlePage, /const apercuAnnonceOuvert = Boolean\(fenetreSort && annonceApercueFermeePour !== duel\.annonce\);/,
  'le bouton Répondre peut fermer seulement l’aperçu courant sans terminer la fenêtre de réponse');
assert.match(battlePage, /inert=\{apercuAnnonceOuvert \? true : undefined\}/,
  'la main devient inerte et ne peut pas être cliquée pendant l’aperçu de l’annonce');
assert.match(battlePage, /apercuSurvol && !apercuMagie && !mulligan && !apercuAnnonceOuvert/,
  'les aperçus de survol des cartes sont masqués pendant l’annonce');
assert.match(battlePage, /const aReponseJouableEnMain = Boolean\(apercuAnnonceOuvert && duel\.joueur\.main\.some\(\(carteId\) => \{[\s\S]*?carte\?\.instant && peutJouerCarte\(carte\)[\s\S]*?\}\)\);/,
  'la lueur dépend réellement d’une carte rapide jouable dans la main et payable maintenant');
assert.match(battlePage, /className=\{`rpg-btn rpg-annonce-sort__respond\$\{aReponseJouableEnMain \? ' is-response-available' : ''\}`\}[\s\S]*?onClick=\{repondreAAnnonce\}[\s\S]*?<span>Répondre<\/span>/,
  'un bouton Répondre bleu seulement si une réponse jouable est réellement en main');
assert.doesNotMatch(battlePage, /rpg-annonce-sort__hint|Répondez avec une magie rapide/,
  'le texte explicatif de réponse est supprimé de l’aperçu');
assert.match(battlePage, /const repondreAAnnonce = \(\) => \{[\s\S]*?setAnnonceApercueFermeePour\(duel\.annonce\);\s*\};/,
  'Répondre mémorise l’annonce courante sans la résoudre ni la laisser passer');
assert.match(battlePage, /fenetreSort && !apercuAnnonceOuvert && \([\s\S]*?rpg-annonce-sort__compact[\s\S]*?onClick=\{laisserPasser\}/,
  'après fermeture de l’aperçu, Laisser passer reste accessible comme action distincte');
assert.match(battleCss, /\.rpg-annonce-sort__respond\s*\{[^}]*min-height:\s*46px;[^}]*background:\s*rgba\(7, 12, 19, \.82\);[^}]*color:\s*#fff;[^}]*pointer-events:\s*auto;/s,
  'sans réponse jouable, Répondre garde un fond sombre semi-transparent et un texte blanc');
assert.match(battleCss, /\.rpg-annonce-sort__respond\.is-response-available\s*\{[^}]*background:\s*linear-gradient\(180deg, #c9f4ff, #67c4e5\);[^}]*color:\s*#062b3a;/s,
  'Répondre devient bleu clair seulement quand une carte jouable est disponible');
assert.doesNotMatch(battleCss, /rpg-annonce-respond-glow|is-response-ready|@keyframes[^}]*respond/i,
  'aucune lueur ni animation ne subsiste sur le bouton Répondre');
assert.match(battleCss, /\.rpg-spell-confirm-backdrop\s*\{[^}]*z-index:\s*1000;/s,
  'la confirmation d’une magie jouée en réponse passe au-dessus de l’annonce adverse');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce\s*\{[^}]*--rpg-annonce-card-width:\s*clamp\(140px, min\(28vw, 42dvh\), 280px\);[^}]*--rpg-annonce-column-width:\s*min\(360px,[^}]*position:\s*absolute;[^}]*inset:\s*0;/s,
  'l’aperçu annoncé réserve une grande carte et sa colonne de texte/actions');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce \.rpg-hover-card-preview__layout\s*\{[^}]*top:\s*50%;[^}]*left:\s*50%;[^}]*grid-template-columns:\s*var\(--rpg-annonce-card-width\) minmax\(0, var\(--rpg-annonce-column-width\)\);[^}]*width:\s*calc\(var\(--rpg-annonce-card-width\) \+ var\(--rpg-annonce-column-gap\) \+ var\(--rpg-annonce-column-width\)\);[^}]*transform:\s*translate\(-50%, -50%\);/s,
  'la carte et sa colonne forment un seul ensemble centré dans l’écran');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce \.rpg-hover-card-preview__face\s*\{[^}]*position:\s*relative;[^}]*width:\s*var\(--rpg-annonce-card-width\);[^}]*transform:\s*none;/s,
  'la carte occupe la colonne gauche de l’ensemble centré');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce \.rpg-hover-card-preview__face\s*\{[^}]*border-width:\s*var\(--rpg-card-border-large, 6px\);/s,
  'la carte annoncée par l’adversaire garde le grand gabarit de cadre des autres grandes cartes, pas un filet fixe plus fin');
assert.doesNotMatch(battleCss, /\.rpg-hover-card-preview--annonce \.rpg-hover-card-preview__face\s*\{[^}]*border-width:\s*\d+(?:\.\d+)?px;/s,
  'aucune épaisseur de cadre fixe en pixels ne rétrécit le cadre de la carte annoncée');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce \.rpg-card-element-badge\s*\{[^}]*border-width:\s*2px;[^}]*font-size:\s*19px;/s,
  'le glyphe de couleur de la carte annoncée reste lisible (19 px, liseré 2 px), comme sur les grandes faces du catalogue');
assert.match(battleCss, /\.rpg-hover-card-preview__face \.rpg-card-element-badge,\s*\.rpg-mulligan__card \.rpg-card-element-badge\s*\{[^}]*border-width:\s*2px;[^}]*font-size:\s*calc\(var\(--rpg-card-marker-size, 38px\) \* \.5\);/s,
  'les glyphes de l’aperçu rapide et du mulligan suivent le diamètre du repère, avec un liseré de 2 px');
assert.match(battleCss, /@media \(max-width: 620px\)[\s\S]*?\.rpg-hover-card-preview--annonce\s*\{[^}]*--rpg-annonce-column-width:\s*min\(210px, calc\(100vw/s,
  'sur mobile, la colonne est dimensionnée pour centrer tout l’aperçu sans couper son contenu');
assert.match(battleCss, /\.rpg-hover-card-preview--annonce \.rpg-hover-card-preview__details-column\s*\{[^}]*position:\s*relative;[^}]*width:\s*var\(--rpg-annonce-column-width\);/s,
  'la colonne de texte et de boutons se place à droite de la carte');
assert.match(battleCss, /\.rpg-annonce-sort__controls\s*\{[^}]*display:\s*grid;[^}]*grid-template-areas:\s*"respond pass";[^}]*width:\s*100%;/s,
  'Répondre et Laisser passer sont côte à côte sous la fenêtre de texte');
assert.doesNotMatch(battleCss, /rpg-annonce-sort__hint/,
  'aucun style ne conserve le texte explicatif supprimé');
assert.match(battleCss, /\.rpg-annonce-sort__pass\s*\{[^}]*grid-area:\s*pass;[^}]*display:\s*inline-flex;[^}]*flex-direction:\s*row;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*min-height:\s*46px;[^}]*pointer-events:\s*auto;/s,
  'Laisser passer est un bouton central et facilement cliquable');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hover-card-preview--annonce\s*\{\s*display:\s*grid;\s*\}/,
  'l’aperçu annoncé reste visible sur tactile, alors que les tooltips au survol sont masqués');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-annonce-sort__pass,[\s\S]*?\.rpg-battle--touch \.rpg-annonce-sort__respond,[\s\S]*?\.rpg-battle--touch \.rpg-annonce-sort__compact-preview,[\s\S]*?\.rpg-battle--touch \.rpg-annonce-sort__compact-pass \{ min-height: 44px; \}/,
  'Répondre, Laisser passer et leurs commandes compactes gardent une zone tactile de 44 px sur mobile');
// Victoire : pas de voile noir plein écran, le plateau final reste visible.
assert.match(battlePage, /vainqueur === 'joueur' \? ' rpg-overlay--win' : ' rpg-overlay--loss'/,
  'l’écran de fin distingue la victoire (panneau) de la défaite et de la double chute (voile)');
assert.match(battleCss, /\.rpg-overlay--win\s*\{[^}]*inset:\s*auto;[^}]*left:\s*50%;[^}]*top:\s*50%;[^}]*backdrop-filter:\s*none;/s,
  'en victoire, l’annonce est un panneau centré et borné, sans voile ni flou plein écran : le plateau reste visible autour');
assert.match(battleCss, /\.rpg-overlay\s*\{[^}]*inset:\s*0;[^}]*background:\s*rgba\(4, 4, 10, \.86\);/s,
  'la défaite et la double chute gardent leur voile plein écran d’origine');

// Le plateau est peint, pas voilé : les capsules tiennent la lisibilité. La
// seule ombre revenue est la **vignette** des deux bords (voir plus bas) — un
// calque borné, jamais le voile d'autrefois ni ses variables.
assert.doesNotMatch(battleCss, /--rpg-plateau-voile/,
  'aucun voile noir plein cadre n’habille plus les plateaux : la peinture reste entière');
assert.doesNotMatch(battleCss, /card-table--plateau-(?!cour-de-l-empereur)[a-z-]+::before/,
  'les plateaux ne gardent plus les vignettes qui composaient avec le voile');
assert.match(battleCss, /\.card-table--plateau-cour-de-l-empereur::before\s*\{[^}]*background-image:\s*inherit;[^}]*transform:\s*scale\(1\.16\);/s,
  'la Cour de l’Empereur conserve son zoom de fond indépendant du voile');
assert.doesNotMatch(battleCss, /\.card-table::before\s*\{/,
  'la table n’a plus de calque d’ombre posé au-dessus de son fond');
for (const { id } of RPG_PLATEAUX) {
  assert.match(battleCss, new RegExp(`\\.card-table--plateau-${id}\\s*\\{[^}]*background-color:`, 's'),
    `le plateau ${id} garde sa couleur de repli, le temps que la peinture arrive`);
}
// Le chrome de la table : les capsules qui remplacent le voile.
assert.match(battleCss, /\.rpg-card-pile\s*\{[^}]*background:\s*linear-gradient\(180deg, rgba\(9, 7, 6, \.66\), rgba\(7, 7, 11, \.58\)\);/s,
  'les compteurs de paquet et de cimetière portent leur capsule, là où le voile travaillait');
assert.match(battleCss, /\.rpg-wizard-plate\s*\{[^}]*background:\s*linear-gradient\(135deg,/s,
  'les plaques des deux sorciers gardent leur fond translucide');
assert.match(battleCss, /\.rpg-bottombar \.rpg-log\s*\{[^}]*background:\s*rgba\(6, 6, 14, \.56\);/s,
  'le journal du duel se détache sur les plateaux clairs');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-duel-nav\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s,
  'au doigt, le conteneur du menu hamburger reste sans fond ni bordure');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-wizard-plate\s*\{[^}]*background:\s*linear-gradient\(180deg, rgba\(9, 7, 6, \.66\), rgba\(7, 7, 11, \.58\)\);/s,
  'au doigt, les plaques des deux sorciers portent leur capsule, elles aussi');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.card-table::before/,
  'le doigt ne reçoit pas de voile non plus : seul le chrome tient la lisibilité');

// ── La vignette des deux bords : deux dégradés noirs, haut et bas du plateau ─
// Elle remplace le voile par une ombre bornée : en haut le cadre se referme sous
// la navigation, en bas sous la main — jamais au milieu du champ de bataille.
const vignetteCss = battleCss.match(/\.rpg-plateau-vignette\s*\{([^}]*)\}/s)?.[1] ?? '';
assert.ok(vignetteCss, 'le plateau porte une vignette, en haut et en bas du cadre');
assert.match(vignetteCss, /position:\s*absolute;[^}]*inset:\s*0;/s,
  'la vignette couvre toute la table, sans déplacer un seul élément');
assert.match(vignetteCss, /pointer-events:\s*none;/,
  'la vignette ne prend jamais le pointeur : c’est un fond, pas une cible');
assert.match(vignetteCss, /z-index:\s*0;/,
  'la vignette passe derrière les cartes et la main (z-index 42), pas devant');
assert.match(vignetteCss, /linear-gradient\(to bottom,/,
  'la première bande tombe depuis le haut du plateau');
assert.match(vignetteCss, /linear-gradient\(to top,/,
  'la seconde remonte depuis le bas, sous la main');
// Deux bandes qui se fondent : le milieu de la table garde sa peinture nette.
assert.match(vignetteCss, /rgba\(6, 5, 9, 0\) 17%/,
  'la bande du haut s’éteint à 17 % de la hauteur');
assert.match(vignetteCss, /rgba\(6, 5, 9, 0\) 23%/,
  'la bande du bas s’éteint à 23 % : elle couvre la main, jamais les champs');
assert.doesNotMatch(vignetteCss, /0 0 0 100px|inset 0 0/,
  'la vignette n’est pas un aplat : uniquement deux dégradés');
assert.match(battlePage, /<span className="rpg-plateau-vignette" aria-hidden="true" \/>/,
  'la table monte la vignette');
// Elle est montée juste après le jumeau de la peinture : donc avant les cartes,
// les rangées et la main dans l’ordre du document — la main la recouvre.
assert.ok(battlePage.indexOf('rpg-plateau-vignette') > battlePage.indexOf('className="rpg-plateau-fond"')
  && battlePage.indexOf('rpg-plateau-vignette') < battlePage.indexOf('className={`rpg-hand-dock'),
  'la vignette est peinte avant la main : c’est la main qui passe dessus');

// ── L'aperçu au doigt : appui long réactif (320 ms) sur une carte ───────────
const longPressSource = readFileSync(new URL('../src/games/rpgLongPress.js', import.meta.url), 'utf8');
assert.match(longPressSource, /export const RPG_LONG_PRESS_MS = 320;/,
  'l’aperçu au doigt répond en 320 ms d’appui');
assert.match(longPressSource, /export function peutDemarrerAppuiLong\(event\) \{[\s\S]*?\['touch', 'pen'\]\.includes\(event\.pointerType\)[\s\S]*?\n\}/,
  'la souris garde le survol : l’appui long ne concerne que le doigt et le stylet');
assert.match(longPressSource, /if \(declenche\) armerAvalageClic\(\);/,
  'le clic qui suit l’aperçu est avalé quelle que soit la fin du geste : levée, annulation, défilement ou page cachée');
assert.match(battlePage, /startRpgLongPress\(event, \{\s*source: hote,\s*onTrigger:/,
  'la page arme l’appui long sur le `pointerdown` d’une carte');
assert.match(battlePage, /const hote = event\.target\?\.closest\?\.\('\[data-card-id\]'\);/,
  'toute carte affichée porte son identifiant : main, table, terrains, cimetière, catalogue, deck');
assert.match(battlePage, /data-scene="menu" onPointerDown=\{demarrerAppuiLongCarte\}/,
  'le menu (catalogue et decks) répond à l’appui long');
assert.match(battlePage, /data-scene="duel"\s*(?:style=\{DOS_DE_CARTE_STYLE\}\s*)?onPointerDown=\{demarrerAppuiLongCarte\}/,
  'le plateau répond au même appui long');
assert.match(battlePage, /touchDragRef\.current\?\.\(\);[\s\S]*?setApercuAppui\(carte\.id\)/,
  'consulter une carte désarme le glisser-déposer lancé par le même doigt');
assert.equal(battlePage.match(/<ApercuCarteAppuiLong carte=\{cardById\(apercuAppui\)\}(?: armes=\{[^}]*\})? onFermer=\{fermerApercuAppui\} \/>/g).length, 2,
  'le volet d’aperçu est rendu au menu comme en duel, avec les armes portées quand elles existent');
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
assert.match(battlePage, /function ApercuCarteAppuiLong\(\{ carte, armes = \[\], onFermer \}\)[\s\S]*?<HoverCardPreview carte=\{carte\} armes=\{armes\} variante="appui-long" \/>/,
  'l’appui long ouvre l’aperçu de la carte et des armes portées, sans légender le geste');

// ── Zone de jeu tactile élargie et piles de cartes homonymes ───────────────
const cardStacks = readFileSync(new URL('../src/games/rpgCardStacks.js', import.meta.url), 'utf8');
assert.match(cardStacks, /export function groupCartesMain\(main = \[\]\) \{/,
  'les exemplaires identiques de la main sont regroupés, dans l’ordre d’arrivée');
assert.match(cardStacks, /export function groupEntitesParCarte\(entites = \[\]\) \{/,
  'les créatures en jeu portant la même carte sont regroupées, camp par camp');
assert.match(cardStacks, /pile\.indices\.push\(index\);/,
  'chaque pile garde les index réels de la main : le jeu vise toujours un exemplaire précis');

assert.match(mobileCss, /grid-template-columns:\s*var\(--rpg-touch-left\) minmax\(0, 1fr\) var\(--rpg-touch-controls\);/,
  'la grille tactile reprend les trois colonnes du PC : identité et terrains à gauche, champs au centre, tour et commandes à droite');
assert.match(mobileCss, /grid-template-areas:\s*"coin nav nav"\s*"enemy-mana enemy controls"\s*"mana allies controls"\s*"hand hand hand";/,
  'la table au doigt suit la composition du PC : la navigation en haut, les plaques et leurs terrains à gauche, les deux champs au centre, la main sur toute la largeur');
assert.match(mobileCss, /--rpg-touch-controls:\s*min\(calc\(var\(--duel-card\) \* 2\.47\), 23vw\);/,
  'la colonne des commandes fait 2,47 cartes — la largeur du rail du PC (330 px pour une carte de 140), plafonnée à 23 % de la largeur — et le rail du tour s’y aligne');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-turn-rail \{[^}]*width:\s*var\(--rpg-touch-controls\);/s,
  'le rail du tour prend exactement la largeur de la colonne des commandes');
assert.match(mobileCss, /--terrain-inset:\s*clamp\(24px, 4\.2vw, 160px\);/,
  'la marge qui tient les terrains hors du cadre illustré suit le cadre peint (4,2 % de la largeur)');
assert.match(mobileCss, /--duel-card:\s*clamp\(44px, 15\.55dvh, 104px\);/,
  'sans `svh`, les cartes gardent la proportion du PC en repli, sans en montrer moins');
assert.match(mobileCss, /@supports \(height:\s*100svh\)\s*\{\s*\.rpg-battle--touch \.card-table\s*\{[^}]*--duel-card:\s*clamp\(48px, 17svh, 100px\);[^}]*--rpg-touch-hand:\s*clamp\(84px, 28svh, 146px\);/s,
  'au doigt, la table et la main utilisent une hauteur stable, indépendante des barres du navigateur — plein écran ou non');
assert.match(mobileCss, /--rpg-field-gap:\s*max\(6px, calc\(var\(--duel-card\) \* \.16\)\);/,
  'les gouttières des lignes de jeu sont resserrées pour montrer plus de cartes');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.card-row \{[^}]*padding:\s*4px max\(8px, calc\(var\(--duel-card\) \* \.12\)\); gap:\s*var\(--rpg-field-gap\); overflow:\s*visible;/s,
  'les champs de bataille tactiles ne recadrent plus leurs cartes : aucune zone de défilement');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.card-table > \.card-row \{[^}]*overflow-x:\s*auto;/s,
  'plus de masque ni de défilement horizontal autour des cartes posées');
assert.match(mobileCss, /--rpg-field-card:\s*calc\(var\(--duel-card\) \* \.95\);/,
  'les cartes posées sur la table sont agrandies à 95 % de la main, toujours un peu sous elle');
assert.match(mobileCss, /\.rpg-battle \.card-row \.rpg-card \.rpg-card__title \.rpg-mana-cost \{ display: none; \}/,
  'le coût ne s’imprime plus sur la carte posée, au doigt comme à la souris ; le bouton de capacité activée, hors du titre, garde son disque');
assert.match(mobileCss, /\.rpg-battle--touch \.card-row > :is\(\.rpg-card, \.rpg-card-stack\) \{[^}]*width:\s*clamp\(var\(--rpg-field-min\), calc\(\(100% - \(var\(--row-count\) - 1\) \* var\(--rpg-field-gap\)\) \/ var\(--row-count\)\), var\(--rpg-field-card\)\);/s,
  'les cartes posées partagent la largeur de leur rangée : le groupe tient toujours sans défiler');
assert.match(mobileCss, /\.rpg-battle--touch \.card-row:has\(> :nth-child\(2\)\) \{ --row-count: 2; \}/,
  'le nombre d’emplacements d’un champ est compté en CSS');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand-dock \.rpg-hand \{[^}]*--rpg-hand-gap:\s*6px;[^}]*justify-content:\s*center;[^}]*gap:\s*var\(--rpg-hand-gap\);[^}]*overflow:\s*visible;/s,
  'la main tactile se centre, garde un espacement constant et ne recadre rien : la pioche qui glisse depuis la gauche n’est plus coupée au bord de la rangée');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.rpg-hand-dock \.rpg-hand \{[^}]*overflow:\s*hidden;/s,
  'plus de masque autour de la main : aucune carte n’est rognée sur les côtés');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand \.rpg-hand__card,\s*\.rpg-battle--touch \.rpg-hand \.rpg-hand__pile \{[^}]*flex:\s*1 1 0;[^}]*min-width:\s*0;[^}]*max-width:\s*var\(--duel-card\);/s,
  'les cartes et piles de la main se partagent la largeur, jusqu’à la taille normale des cartes');
assert.match(battleCss, /\.rpg-terrains\s*\{[^}]*z-index:\s*41;/s,
  'le rail des terrains reste derrière les cartes de la main');
assert.match(battleCss, /\.rpg-hand-dock\s*\{[^}]*z-index:\s*42;/s,
  'le dock de la main passe au premier plan devant le rail des terrains');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-hand-dock \{[^}]*padding:\s*0 0 env\(safe-area-inset-bottom, 0px\);[^}]*z-index:\s*42;/s,
  'le dock tactile garde ses bords sans marge et passe devant les terrains');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.card-table > \.rpg-hand-dock \{[^}]*overflow:\s*hidden;/s,
  'le dock de la main ne recadre plus les cartes du bout : plus de masque autour de la main');
assert.match(battleCss, /\.rpg-hand-dock \{[^}]*padding:\s*8px 0 5px;/s,
  'à la souris, le dock de la main est nu lui aussi : padding latéral nul');
assert.match(battleCss, /\.rpg-hand \{[^}]*max-width:\s*100vw;[^}]*padding:\s*46px 0 50px;/s,
  'la main occupe toute la largeur de la table, sans marge ni recadrage');
// Le rail du tour, au doigt : même colonne centrale, à l'échelle du téléphone.
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-turn-rail \{[^}]*top:\s*auto;[^}]*bottom:\s*calc\(var\(--rpg-touch-hand\) \+ var\(--rpg-touch-combat\) \+ var\(--rpg-touch-pad\) \* 2 \+ var\(--rpg-touch-gap\)\);[^}]*margin-block:\s*0;[^}]*left:\s*auto;[^}]*right:\s*max\(6px, env\(safe-area-inset-right, 0px\)\);/s,
  'au doigt, le rail du tour se cale juste au-dessus de la rangée de combat, au-dessus de la main — la colonne du PC');
assert.match(mobileCss, /\.rpg-battle--touch \.card-table \{[^}]*--rpg-touch-nav:\s*clamp\(38px, calc\(var\(--duel-card\) \* \.62\), 52px\);[^}]*--rpg-touch-hand:\s*calc\(var\(--duel-card\) \* 1\.38 \+ env\(safe-area-inset-bottom, 0px\)\);[^}]*grid-template-rows:\s*var\(--rpg-touch-nav\)[\s\S]*?var\(--rpg-touch-hand\);/s,
  'la grille tactile et le rail du tour partagent les mêmes repères de rangée : la navigation (0,62 carte) et la main (1,38 carte), comme le PC');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-turn-rail \.rpg-phase-track \{[^}]*flex-direction:\s*row;[^}]*background:\s*rgba\(8, 7, 9, \.62\);/s,
  'au doigt aussi, les phases forment la rangée d’icônes orange du PC, dans sa capsule sombre');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-turn-rail \.rpg-phase-step__icon \{[^}]*width:\s*clamp\(20px, calc\(var\(--duel-card\) \* \.34\), 30px\);[^}]*height:\s*clamp\(20px, calc\(var\(--duel-card\) \* \.34\), 30px\);/s,
  'les icônes de phase du rail tactile suivent la carte (0,34) sans envahir la table');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-turn-rail \.rpg-phase-step__label \{[^}]*clip-path:\s*inset\(50%\);/s,
  'comme sur PC, les noms de phase sont masqués à l’écran mais restent accessibles');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-turn-rail \.rpg-btn \{[^}]*min-height:\s*32px;/s,
  'les boutons du rail de droite sont compacts au doigt');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-actions__row \.rpg-btn \{[^}]*min-height:\s*var\(--rpg-touch-combat, 32px\);/s,
  'les commandes de combat de droite suivent la rangée de combat du PC, avec le plancher tactile de 32 px');
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
// Une créature équipée (ou une pile) est un item flex de la rangée. Elle doit se
// rétrécir comme les cartes seules dès que la rangée se remplit — sinon, en
// plein écran, elle restait à sa taille pleine et paraissait plus grande.
assert.match(battleCss, /@media \(min-width: 621px\) \{\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.card-row > \.rpg-card-stack \{[^}]*width: auto;[^}]*min-width: 0;[^}]*flex: 0 1 auto;\s*\}/s,
  'sur grand écran, la créature armée et la pile suivent la largeur de leur carte et rétrécissent avec la rangée');
assert.match(battleCss, /\.rpg-battle:not\(\.rpg-battle--touch\) \.card-row > \.rpg-card-stack > \.rpg-card \{\s*max-width: 100%;\s*\}/,
  'la carte d’une pile se cale sur la largeur du bloc : elle réduit avec lui au lieu de déborder');
assert.doesNotMatch(battleCss, /\.rpg-card-stack--arme \{[\s\S]{0,80}?flex: 0 0 max-content/,
  'plus de `flex-shrink: 0` sur la créature armée : elle ne reste plus plus grande que ses voisines en plein écran');
// Une créature équipée garde son cadre ordinaire. L’équipement reste
// consultable dans les effets et les aperçus, mais ne change ni la classe ni
// la couleur de la face jouée.
assert.match(battlePage, /cardFrameClass\(carte\)/,
  'la face jouée utilise toujours le cadre de sa propre carte');
assert.doesNotMatch(battlePage, /armeCadre|is-arme-equipee|rpg-card--frame-arme/,
  'aucun cadre d’arme ne remplace le cadre de la créature équipée');
assert.doesNotMatch(battleCss, /is-arme-equipee|rpg-card--frame-arme|rpg-arme-ciselle|--rpg-arme-cadre/,
  'aucun style de cadre d’arme ne subsiste dans le duel');
assert.doesNotMatch(mobileCss, /is-arme-equipee|rpg-card--frame-arme|rpg-arme-ciselle|--rpg-arme-cadre/,
  'aucun style de cadre d’arme ne subsiste au doigt');

assert.match(battlePage, /className="rpg-card-stack"[\s\S]{0,120}?style=\{cardFrameStyle\(cardById\(pile\.carteId\)\)\}/,
  'la pile reprend la couleur de cadre de sa carte pour ses ombres décalées');

assert.match(battlePage, /import \{ armesPortees, groupCartesMain, groupEntitesParCarte \} from '\.\/rpgCardStacks\.js';/,
  'la page de duel regroupe les homonymes et lit les armes portées dans le même module que ses tests');
assert.match(battlePage, /const empilerCartes = viewport\.mobile && duel\.modeMana !== RPG_MODE_MANA_ESSAI;/,
  'les piles sont réservées au doigt et jamais au mode essai : le grand écran et le mode sans terrains gardent une carte par emplacement');
assert.match(battlePage, /const groupesMain = empilerCartes\s*\?\s*groupCartesMain\(duel\.joueur\.main\)\s*:\s*duel\.joueur\.main\.map\(\(carteId, index\) => \(\{ carteId, indices: \[index\] \}\)\);/s,
  'sans empilement, chaque carte de la main reste son propre groupe');
assert.match(battlePage, /\{groupesMain\.map\(\(groupe, position\) => \{/, 'la main est rendue pile par pile, dans l’ordre de la rangée (l’éventail a besoin de la place de chaque carte)');
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

// ── Les capacités de clan du Nord : Furie des vikings, Résonance samouraï.
const { RPG_DECK_NEIGE_BASE, RPG_DUEL_CARDS } = await import('../src/games/rpgCards.js');
assert.match(duelEngine, /const defenseBase = Math\.max\(0, Number\(carte\?\.def\) \|\| 0\);[\s\S]*?duel\.log\.push\(`\$\{entite\.name\} entre en furie : \+\$\{furie\}\/\+0\.`\)/,
  'le moteur synchronise et journalise la Furie +X/+0 sous la DEF de base');
assert.match(duelEngine, /duel\.log\.push\(`\$\{entite\.name\} retrouve sa DEF de base : la furie retombe\.`\)/,
  'et retire ce seul bonus quand la créature retrouve sa DEF de base');
assert.match(duelEngine, /export function rpgResonanceEnJeu\(duel(?:, element = 'neige')?\)/,
  'la Résonance en jeu se compte sur toute la table, par élément et pour les deux camps');
assert.match(duelEngine, /const groupes = GROUPES_RESONANCE\.filter\(\(groupe\) => cardReceivesResonance\(duelCardById\(entite\.carteId\), groupe\)\);[\s\S]*?entite\.pv = Math\.max\(1, entite\.pv \+ delta\)/,
  'chaque groupe de Résonance ne renforce que ses créatures, avec un plancher de 1 PV');
assert.match(aiBrain, /const furie = bloqueurFurie \* 0\.9 - attaquantFurie \* 1\.2;/,
  'l’IA sait qu’entamer un viking sans le tuer le nourrit');
assert.match(aiBrain, /moteur\.rpgBonusResonance\(duel, carte\)[\s\S]*?atk: \(carte\.atk \?\? 0\) \+ resonance/,
  'l’IA compte la Résonance déjà en table quand elle évalue une arrivée de carte renforcée');
const jarl = RPG_DUEL_CARDS.find((carte) => carte.id === 'jarl-au-marteau-de-guerre');
assert.ok(jarl && jarl.element === 'neige' && jarl.furie === 3,
  'le Jarl au marteau de guerre porte la Furie 3 du set Neige');
assert.ok(RPG_DECK_NEIGE_BASE.includes('jarl-au-marteau-de-guerre'),
  'le Serment des Neuf Hivers aligne le Jarl');
// La Furie est nordique : trois vikings, le Maître du marteau et le Loup des
// neiges. Les faces nomment sobrement « Furie X. » : la règle complète vit
// dans la pastille et les leçons, pas dans un pavé imprimé sur la carte.
for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.furie)) {
  assert.equal(carte.element, 'neige', `${carte.id} appartient au set Neige`);
  assert.match(carte.text, new RegExp(`(?:^|\\. )Furie ${carte.furie}\\.`),
    `${carte.id} annonce sa Furie sur sa face`);
  assert.doesNotMatch(carte.text, /première fois|gagne \+\d+\/\+\d+/,
    `${carte.id} ne récite plus l’ancienne Furie unique en +X/+X`);
}
for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.resonance)) {
  assert.equal(carte.resonanceTribu, 'samourai',
    `${carte.id} : la Résonance du catalogue est désormais uniquement samouraï`);
  assert.match(carte.text, /Résonance samouraï — Tant qu’il est en jeu, toutes les créatures de type Samouraï de la table, dans les deux camps, gagnent \+1\/\+1/,
    `${carte.id} annonce sa Résonance de tribu sur sa face`);
}
assert.equal(RPG_DUEL_CARDS.some((carte) => carte.resonanceTribu === 'viking' || /Résonance viking/.test(carte.text ?? '')), false,
  'aucune carte n’affiche encore de Résonance viking');
const valkyrieCorbeau = RPG_DUEL_CARDS.find((carte) => carte.id === 'valkyrie-au-corbeau');
assert.ok(valkyrieCorbeau?.cost === 5 && valkyrieCorbeau.atk === 3 && valkyrieCorbeau.def === 4
  && valkyrieCorbeau.furie === 2,
  'la Valkyrie au corbeau est une 3/4 pour cinq manas avec Furie 2');
assert.match(valkyrieCorbeau.text, /piochez une carte de type Viking au hasard dans votre deck/,
  'sa face annonce la pioche tribale aléatoire');
const brumeFjord = RPG_DUEL_CARDS.find((carte) => carte.id === 'brume-du-fjord');
assert.equal(brumeFjord?.touteZone?.gelChance, 0.25,
  'Brume du fjord gèle chaque survivante avec une probabilité de 25 %');
assert.match(brumeFjord.text, /25 % de chances de la geler/,
  'la face de Brume affiche ce taux sans ambiguïté');
assert.match(battlePage, /'brume-du-fjord': 'brume-personnes-gelees-v2'/,
  'la nouvelle peinture des soldats gelés dans la brume est datée contre les caches');

// ── Retouches du catalogue : bonus borné, écho, coût et peintures reprises ─
// Ces quatre règles vivent dans le moteur, pas dans le texte des cartes : le
// garde-fou vérifie les deux extrémités (octroi + effacement, promesse + chute).
assert.match(duelEngine, /const temporaire = Number\(effet\.tours\) > 0;[\s\S]*?carnet\.push\(\{ entiteId: entite\.id, atk: bonusAttaque, def: bonusDefense, tribut: bonusTribut, overkill: bonusOverkill, tour: duel\.tour \}\)/,
  'un bonus déclaré avec `tours` — Overkill prêté compris — est accordé puis consigné dans le carnet du camp');
assert.match(duelEngine, /annulerBonusTemporaires\(duel, duel\.tour\);[\s\S]*?duel\.tour = autre\(duel\.tour\)/,
  'les renforts du tour qui se termine s’effacent avant que l’autre camp ne commence');
assert.match(duelEngine, /if \(entry\.tour && entry\.tour !== tourFerme\) \{\s*restants\.push\(entry\);/,
  'un bonus né pendant un autre tour que celui qui se ferme reste attendu dans le carnet');
assert.match(duelEngine, /differerEcho\(duel, cote, adv, effet, sourceElement, sourceType, sourceCarteId\)/,
  'la seconde vague d’un sort à écho est promise à la résolution des dégâts');
assert.match(duelEngine, /const promesses = \(duel\[adv\]\.degatsEchos \?\?= \[\]\);[\s\S]{0,400}?coteSource: cote,/,
  'la promesse est écrite même sur une table vide, et datée du camp qui l’a lancée');
assert.match(duelEngine, /resoudreEchos\(duel\);/,
  'l’écho retombe au début d’un tour, quand son tour de lanceur revient');
assert.match(duelEngine, /if \(echo\.coteSource && echo\.coteSource !== lanceur\) \{\s*camp\.degatsEchos\.push\(echo\);\s*continue;/,
  'tant que c’est l’autre camp qui commence, la promesse reste en suspens — il a son tour pour jouer');
assert.match(duelEngine, /const cibles = \[\.\.\.camp\.creatures\];\s*if \(!cibles\.length\) \{\s*duel\.log\.push\(`L’écho de \$\{nomSource\} se dissipe : plus rien à brûler sur la table\.`\);/,
  'un écho qui ne trouve personne à son heure se dissipe, et le journal le dit');
// La vague venue d'écho se voit : l'interface photographie le registre des
// promesses avant de fermer le tour, puis réaffiche la carte de la promesse
// éteinte en preview — comme au premier lancer, avec un bandeau qui nomme
// la vague au lieu d'une magie jouée.
assert.match(battlePage, /const echosAvantRetour = \(duel\.joueur\.degatsEchos \?\? \[\]\)\s*\.concat\(duel\.sorcier\.degatsEchos \?\? \[\]\);/,
  'le registre des échos est photographié avant que le tour ne se ferme');
assert.match(battlePage, /annoncerEchosRetombes\(echosAvantRetour\);/,
  'l’ouverture du tour réaffiche la carte de la promesse venue d’écho');
assert.match(battlePage, /\(echo\.coteSource === lanceur \|\| !echo\.coteSource\)\s*&& \(Number\(echo\.toursRestants\) \|\| 1\) <= 1\s*&& !promessesRestantes\.has\(echo\)/,
  'seule la promesse éteinte — celle du tour qui vient de s’ouvrir — repart en preview, pas celles qui attendent encore');
assert.match(battlePage, /annoncerMagie\(carte, cibleDecrite, \{ vague: true \}\);/,
  'la vague retombe avec la preview et le bandeau du sort, marqués « vague »');
assert.match(battlePage, /setSortJoue\(\{ carteId: carte\.id, cible, contre, vague \}\);/,
  'l’état du bandeau porte le drapeau vague jusqu’au rendu');
assert.match(battlePage, /contre \? 'CONTRE DU SORCIER' : vague \? 'SECONDE VAGUE' : sorcier \? 'SORT DU SORCIER' : 'MAGIE JOUÉE'/,
  'le bandeau nomme la seconde vague au lieu d’une magie jouée');
assert.match(battleCss, /\.rpg-spell-played--vague\s*\{[^}]*border-color:\s*rgba\(255, 158, 100, \.9\);/s,
  'la vague a sa teinte braise, entre la magie neuve (turquoise) et le contre (or)');
assert.match(aiBrain, /const durable = Number\(effet\.tours\) > 0 \? 0\.5 : 1;/,
  'l’IA ne paie pas un renfort de magie rapide au prix d’un renfort durable');
assert.match(aiBrain, /const echoMontant = Math\.max\(0, Number\(effet\.echo\?\.amount\) \|\| 0\);/,
  'l’IA compte la seconde vague d’un sort à écho sans la surpayer');
assert.equal(RPG_DUEL_CARDS.find((carte) => carte.id === 'rapport-du-greffier').cost, 3,
  'le Rapport du greffier se paie trois manas');
assert.deepEqual(RPG_DUEL_CARDS.find((carte) => carte.id === 'rempart-de-dunes').effet,
  { type: 'buff', atk: 0, def: 3, tours: 1 },
  'le Rempart de dunes donne +0/+3 jusqu’à la fin du tour');
assert.equal(RPG_DUEL_CARDS.find((carte) => carte.id === 'tempete-de-sable').effet.amount, 3,
  'la Tempête de sable inflige trois dégâts');
assert.equal(RPG_DUEL_CARDS.find((carte) => carte.id === 'maree-contraire').name, 'Déflection',
  'Marée contraire a rendu son nom : la carte s’appelle Déflection');
// Une peinture remplacée sous le même nom de fichier doit changer d’URL.
const cacheVersions = battlePage.match(/const CARD_ART_CACHE_VERSIONS = \{([\s\S]*?)\};/)?.[1] ?? '';
for (const illustration of ['brisure-de-verre', 'parade-du-verre', 'maree-contraire', 'ressac', 'courant-de-retour']) {
  assert.match(cacheVersions, new RegExp(`(?:'|\\b)${illustration}'?\\s*:`),
    `${illustration} est datée dans l’URL pour qu’aucun cache ne fige l’ancienne peinture`);
}

// Les commandes de tour, réunies dans le rail : attaque générale puis fin du tour.
assert.match(battlePage, /aria-label="Actions de tour">[\s\S]*?rpg-btn--attaque-tous[\s\S]*?rpg-btn--endturn/, 'attaque générale et fin du tour partagent le même groupe');
// La main au doigt : une carte = une cible. Plus de grille qui superpose les
// cartes (deux cartes sous le même doigt, l'une jouée pour l'autre) : chaque
// carte ou pile partage la largeur disponible sans dépasser l’échelle du champ.
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-hand \.rpg-hand__card,\s*\.rpg-battle--touch \.rpg-hand \.rpg-hand__pile \{[^}]*flex:\s*1 1 0;[^}]*min-width:\s*0;[^}]*max-width:\s*var\(--duel-card\);/s,
  'la largeur de chaque carte ou pile se partage entre les emplacements, sans dépasser la taille du champ');
assert.doesNotMatch(mobileCss, /grid-template-columns: repeat\(var\(--hand-count\), minmax\(0, var\(--duel-card\)\)\)/,
  'la main ne superpose plus ses cartes : chacune reste entièrement cliquable');

// ── Compteurs d'effet au doigt : des losanges sous la couleur ────────────────
// Les chiffres suivent la taille du repère de couleur, sans recouvrir le pied
// ATQ/DEF ; ils restent affichés même si la carte se resserre dans sa rangée.
assert.match(mobileCss, /--rpg-field-stat-font:\s*clamp\(8px, calc\(var\(--duel-card\) \* \.145\), 12px\);/,
  'la taille des statistiques d’une carte posée est nommée une fois (`--rpg-field-stat-font`)');
assert.match(mobileCss, /--rpg-field-foot:\s*3%;/,
  'le bas du pied posé est nommé (`--rpg-field-foot`)');
assert.match(mobileCss, /\.rpg-card--img \.rpg-card__foot,\s*\.rpg-hand__card--img \.rpg-hand__stats\s*\{[^}]*bottom:\s*var\(--rpg-field-foot, 3%\);/s,
  'le pied garde son bas mesuré, y compris hors disposition tactile (repli à 3 %)');
assert.match(battleCss, /--rpg-card-counter-size:\s*clamp\(10px, calc\(var\(--rpg-card-marker-size, 26px\) \* \.58\), 18px\);/,
  'le petit losange suit la largeur réelle du repère de couleur, même au doigt');
assert.doesNotMatch(battlePage, /rpg-card__weapons/,
  'aucune vignette de carte d’arme ne recouvre la face d’une créature équipée');
assert.doesNotMatch(battleCss, /\.rpg-card__weapons\b/,
  'la miniature d’arme sur la face n’a plus de style');
assert.doesNotMatch(mobileCss, /\.rpg-card__weapons\b/,
  'la miniature d’arme sur la face n’existe plus au doigt non plus');
assert.doesNotMatch(battlePage, /is-arme-equipee/,
  'l’équipement n’est plus signalé par un cadre spécial sur la créature');
assert.match(mobileCss, /\.rpg-battle--touch \.card-row \.rpg-card\s*\{\s*container-type:\s*inline-size;\s*\}/,
  'une carte posée au doigt est un conteneur de requête : sa largeur vient de sa rangée');
assert.doesNotMatch(mobileCss, /\.rpg-battle--touch \.rpg-card__compteurs\s*\{[^}]*display:\s*none/,
  'les compteurs ne disparaissent plus sur les cartes étroites');

console.log(
  'check:rpg-ui ✓ — aperçu au survol agrandi sans fond principal ni grand cadre ni son ombre, seul l’encadré des infos garde son fond sombre lisible, clic-action direct (poser la carte, attaquer, engager les terrains) avec confirmation des magies avant lancement et aperçu des magies jouées, '
  + 'icônes flamme/goutte/sablier, protection contre une couleur limitée au tour de pose et au suivant adverse, Rapidité du Fennec et de Fériel, Attaque ciblée de Fériel avec cible choisie et dégâts sans riposte, Envol de l’Anqa réservé aux bloqueurs volants dans l’IA comme à la main, créatures avec Envol surélevées et animées d’un léger mouvement latéral sur le plateau, icônes d’effets absentes des cartes en main, au catalogue, sur table et dans les aperçus, aperçus réduits aux mots-clés, chacun ouvrant sa description au survol, terrain Désert illustré, cadres pilotés par l’élément (bleu Eau, beige Sable, rouge Braise, bleu glacé Neige, mythiques mono brillantes de leurs couleurs, hybrides à deux aplats diagonaux sans reflet), terrains agrandis, couleur à gauche et coût à droite, badge élémentaire hybride distinct du coût sans icônes de couleur, '
  + 'icône rouge d’attaque globale, icône de confirmation bleu clair, bouton Déclarer l’attaque retiré, type « Type », coût et ATQ/DÉF agrandis, mal d’invocation grisé pour les créatures non rapides, blessures tachées de sang et défense rouge, '
  + 'terrains engagés sans bord tronqué, deck et cimetière du joueur à gauche, vol de carte depuis la main, secousse d’écran sur impact direct et vignette rouge si le joueur est touché, '
  + 'attaque groupée avant confirmation, attaques sans bloqueur résolues automatiquement, faces full art, terrains sans coût, tour, halo jaune et paiement automatique, '
  + 'rail du tour remonté au milieu de la table — indicateur et « Fin du tour » doré en colonne à la verticale du centre; sur PC, six phases en icônes seules orange à l’horizontale sur fond foncé transparent, même rangée d’icônes au doigt, boutons de droite compacts —, commandes de combat agrandies à toutes les tailles d’écran tout en restant discrètes, fond foncé commun aux boutons Annuler, Attaquer avec tous, Confirmer et Annuler l’attaque sur PC, icônes de phase orange agrandies sur PC, sur PC, plaques sombres, compactes et arrondies : cadre doré pour le joueur, cuivré pour l’adversaire; portrait à gauche, nom du profil ou du sorcier au-dessus des PV, tactile préservé, main sans masque autour d’elle (ni marge latérale ni recadrage : la rangée occupe toute la largeur), annulation réversible, magie avec cible, table continue, bloqueurs sélectionnables au clic ou glisser-déposer, flèches jaunes et animations, '
  + 'menu Jouer/Deck/Catalogue, catalogue de toutes les cartes avec filtres couleur/type, Cavalier amazigh rare inclus dans le deck et combat ciblé à l’arrivée, illustrations full art distinctes pour Veilleurs du Désert et 10 cartes de la Cour des Djinns, bordures unifiées par élément, paquets agrandis et vraies cartes qui glissent à taille réelle de gauche à droite dans les mains, '
  + 'plateaux du duel (la Table des Heures, l’Erg du Sahara, la Caravane de Gourara, les Ruines de Tipaza, le Village Viking) attribués selon le deck — la Braise rejoint la Table des Heures après le retrait du plateau des Brûlés —; peintures visibles sans voile, capsules sombres pour la lisibilité; plaques PC compactes en capsule, cadre doré joueur et cuivré adversaire, nom du profil et d’Ifrit al-Ahmar affichés, nom d’étage conservé, tactile préservé, '
  + 'quatrième couleur Neige (flocon de neige, cadre bleu clair) avec le Serment des Neuf Hivers au complet : Furie du Nord (+X/+0 tant que la défense reste sous sa DEF de base, journalisée dans le duel et pesée par l’IA), Valkyrie au corbeau 3/4 qui pioche un Viking au hasard, Brume du fjord qui gèle à 25 %, et Résonance samouraï (+1/+1 aux créatures de type Samouraï de la table, les deux camps, plancher de 1 PV quand l’aura se tait), les peintures du set datées dans l’URL `?v=` pour qu’un cache ne fige jamais une ancienne image, '
  + 'retouches du catalogue Eau et Sable : Rapport du greffier à trois manas, Rempart de dunes en +0/+3 borné au tour (le carnet du camp l’efface à la fin du tour, et une créature réduite à zéro par ce retrait tombe), Nuage de cendres dont la seconde vague reste suspendue jusqu’au tour suivant de son lanceur — elle brûle ce que le sorcier a posé entre-temps, même si la première vague avait vidé la table, et se dissipe en le disant si rien ne s’y trouve —, Tempête de sable à trois dégâts, Marée contraire devenue Déflection, et sept magies peintes en plein art 4:5 sur leur propre fichier, '
  + 'aperçu d’une carte par appui long d’une seconde au doigt (volet dédié, clic de jeu conservé sur un appui court), zone de jeu tactile élargie (colonne centrale rendue par les rails latéraux, gouttières resserrées, taille des cartes et marge des terrains inchangées) avec piles de cartes homonymes au doigt — main et deux champs de bataille, compteur ×N, tête de pile qui agit sur l’exemplaire prêt, dépliage au toucher et dépliage automatique pendant toute action en cours — le grand écran gardant une carte par emplacement, éventail de la souris (angle, ouverture latérale et descente en arc, carte survolée qui se soulève dans son axe, mise à zéro au doigt), main du sorcier agrandie à la taille d’une carte, colonne des actions sous le rail et commandes du combat en aplat clair qui respire, régression de la magie rapide qui élimine le dernier attaquant pendant la réponse.'
);
process.exit(0);
