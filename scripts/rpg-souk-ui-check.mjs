/**
 * `npm run check:rpg-souk-ui` — l'écran du Souk, monté dans jsdom, plus les
 * gardes de source qui tiennent le branchement dans le menu.
 *
 * Le smoke (`scripts/rpg-souk-smoke.jsx`) est compilé par Vite en mode SSR et
 * exécuté ici : React est la vraie version, `act` compris. La graine des quêtes
 * est posée par le smoke lui-même, et rien ne dépend d'une minuterie.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── Le smoke : l'écran monté pour de vrai ───────────────────────────────────
const environnementPrecedent = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-souk-smoke.jsx', outDir: 'node_modules/.cache/rpg-souk-ui', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (environnementPrecedent === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = environnementPrecedent;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkRpgSoukEcran } = await import('../node_modules/.cache/rpg-souk-ui/rpg-souk-smoke.js');
try {
  await checkRpgSoukEcran(assert);
} finally {
  dom.window.close();
}

// ── Les gardes de source : le branchement dans le menu ──────────────────────
const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');
/** Le code sans ses commentaires : une garde de source ne doit pas lire la prose. */
const sansCommentaires = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const page = lire('src/games/RpgDuelPage.jsx');
const ecran = lire('src/games/RpgSouk.jsx');
const ecranCode = sansCommentaires(ecran);
const css = lire('src/games/rpg-souk.css');
const cssMenu = lire('src/games/rpg-battle.css');

// 1. L'onglet du menu : le solde, la pastille, et le chemin vers l'écran.
assert.match(page, /import RpgSouk from '\.\/RpgSouk\.jsx';/, 'l’écran est importé par la page');
assert.match(page, /className=\{`rpg-mode-menu__souk\$\{screen === 'souk' \? ' is-active' : ''\}`\}/,
  'le sixième onglet du menu est le Souk');
assert.match(page, /onChangeScreen\('souk'\)/, 'et il mène à l’écran');
assert.match(page, /data-souk-bourse=\{credits\}/, 'le solde ◈ est sur l’onglet');
assert.match(page, /data-souk-a-reclamer=\{aReclamer\}/, 'la pastille aussi');
assert.match(page, /aReclamer > 0 && \(/, 'et elle ne s’affiche que s’il y a quelque chose à réclamer');
assert.match(page, /aria-label=\{`Le Souk — \$\{credits\} crédits/, 'l’onglet est décrit pour les lecteurs d’écran');
assert.match(page, /\{aReclamer\} à réclamer|, \$\{aReclamer\} à réclamer/, 'la pastille compte à voix haute');
assert.ok(
  cssMenu.includes('@media (prefers-reduced-motion: reduce) {\n  .rpg-mode-menu__bourse-pastille { animation: none; }\n}'),
  'l’animation de la pastille est coupée par prefers-reduced-motion',
);

// 2. L'écran est rendu par le menu, et il reçoit de quoi vivre.
assert.match(page, /\) : screen === 'souk' \? \(\s*<RpgSouk/, 'l’écran du Souk est une branche du menu');
for (const prop of [
  'quetes={quetesSouk}', 'credits={credits}', 'portefeuille={portefeuilleSouk}',
  'progression={progressionHistoire}', 'collection={collection}', 'ouverture={ouvertureSouk}',
  'onReclamerQuete={reclamerUneQuete}', 'onReclamerCachet={reclamerLeCachet}',
  'onOuvrirBooster={acheterBooster}', 'onOuvrirCoffret={acheterCoffret}',
  'onAcheterCarteDirecte={acheterCarteDirecte}', 'onRafraichirEtal={rafraichirEtal}',
  'onFermerOuverture={fermerOuverture}',
]) {
  assert.ok(page.includes(prop), `la page passe ${prop} à l’écran`);
}
assert.match(page, /reclamerUneQuete, reclamerTutoriel,[\s\S]{0,220}acheterBooster, acheterCoffret, fermerOuverture/,
  'les gestes — réclamation, achat, fermeture — viennent du hook de bourse, pas de l’écran');
assert.match(page, /onCartesRangees: rafraichirCollection/, 'un achat rafraîchit la collection de l’atelier');

// 3. L'écran reste présentationnel : aucun stockage, aucune règle de crédits.
for (const interdit of ['localStorage', 'sauverPortefeuille', 'chargerPortefeuille', 'useSablierBourse']) {
  assert.ok(!ecranCode.includes(interdit), `l’écran ne touche pas à ${interdit} : la persistance vit dans le hook`);
}
assert.match(ecran, /import '\.\/rpg-souk\.css';/, 'et il porte sa propre feuille de style');
// Les prix, les taux et le barème ne sont pas écrits dans l'écran : ils sont lus
// dans `rpgBoosters.js` / `rpgCredits.js`, qui ont leurs tests.
assert.match(ecranCode, /etatRayons\(progression, collection\)/, 'l’étagère est une lecture pure des règles');
assert.match(ecranCode, /TAUX\.cartes/, 'les taux viennent du module, pas d’une phrase recopiée');
assert.match(ecranCode, /COFFRET\.remise/, 'la remise du coffret aussi');
assert.ok(!/\b(140|160|180|1260)\b/.test(ecranCode), 'aucun prix en dur dans l’écran');

// 4. Ce que l'écran doit montrer, et que le smoke lit dans le DOM.
for (const marque of [
  'data-souk-solde', 'data-souk-quetes', 'data-souk-quete=', 'data-souk-quete-etat',
  'data-souk-progres', 'data-souk-reclamer=', 'data-souk-reste', 'data-souk-attente',
  'data-souk-cachet', 'data-souk-cachet-reclamer', 'data-souk-retour',
  'data-souk-semaine', 'data-souk-semaine-reclamer', 'data-souk-journal', 'data-souk-journal-ligne',
  'data-souk-rayons', 'data-souk-rayon=', 'data-souk-rayon-etat', 'data-souk-rayon-taux',
  'data-souk-rayon-reste', 'data-souk-rayon-refus', 'data-souk-ouvrir=', 'data-souk-coffret=',
  'data-souk-direct', 'data-souk-direct-carte=', 'data-souk-direct-acheter=', 'data-souk-direct-rafraichir',
  'data-card-id={carte.id}',
]) {
  assert.ok(ecran.includes(marque), `l’écran expose ${marque}`);
}
// Le bouton Réclamer est désactivé tant que l’objectif n’est pas atteint, et le
// dit : c’est la règle D7 du dossier, et elle se vérifie à l’œil. Un achat
// refusé (rayon fermé, solde insuffisant) s’explique de la même façon.
assert.match(ecran, /disabled=\{!terminee\}/, 'le bouton Réclamer est désactivé avant l’objectif');
assert.match(ecran, /title=\{terminee \? .* : `Il reste \$\{reste\} à faire`\}/, 'et il écrit ce qu’il reste');
// Tant que l’objectif n’est pas atteint, le bouton est **secondaire** : le
// laiton du primaire est réservé au moment où la récompense est due.
assert.match(
  ecran,
  /className=\{`rpg-menu-button \$\{terminee \? 'rpg-menu-button--primary' : 'rpg-menu-button--secondary'\}`\}/,
  'le bouton Réclamer est secondaire tant que la quête n’est pas achevée',
);
assert.match(ecran, /data-souk-reclamer-etat=\{terminee \? 'pret' : 'attente'\}/,
  'et son état se lit dans le DOM');
assert.ok(cssMenu.includes('.rpg-menu-button--secondary {'),
  'la variante secondaire existe dans la feuille des boutons du menu');
assert.match(css, /\.rpg-souk__quete-pied \.rpg-menu-button--secondary:disabled/,
  'et le Souk la garde lisible quand elle est désactivée');
assert.match(ecran, /disabled=\{Boolean\(refus\)\}/, 'le bouton Ouvrir est désactivé quand l’achat est refusé');
assert.match(ecran, /Il manque \$\{creditsLisible\(etat\.prix - credits\)\}/, 'et il dit combien il manque');
assert.match(ecran, /import \{[^}]*GAINS[^}]*paquetsAvantMythique[^}]*\} from '\.\/rpgCredits\.js';/,
  'le montant du Cachet et la pitié viennent du barème, pas d’un chiffre écrit ici');

// 5. La cérémonie d'ouverture est son propre composant, monté par l'écran.
const ceremonie = lire('src/games/RpgBoosterOuverture.jsx');
const ceremonieCode = sansCommentaires(ceremonie);
assert.match(ecran, /import RpgBoosterOuverture from '\.\/RpgBoosterOuverture\.jsx';/,
  'l’écran monte la cérémonie');
assert.doesNotMatch(cssMenu, /\.rpg-souk__carte-art::after/,
  'les cartes ouvertes dans un booster n’ont pas le foil multicolore');
assert.doesNotMatch(css, /\.rpg-souk__carte\.is-nouvelle\s*\{[^}]*box-shadow:/s,
  'les cartes nouvelles gardent leur cadre doré mais sans halo extérieur');
for (const marque of ['data-souk-ceremonie', 'data-souk-carte=', 'data-souk-carte-dos',
  'data-souk-carte-tampon', 'data-souk-ceremonie-passer', 'data-souk-ceremonie-ranger']) {
  assert.ok(ceremonie.includes(marque), `la cérémonie expose ${marque}`);
}
assert.ok(ceremonie.includes('data-card-id={carte.id}'), 'chaque carte révélée ouvre sa prévisualisation au clic droit');
assert.match(ceremonie, /import RpgCardCopyBadge from '\.\/RpgCardCopyBadge\.jsx';/, 'la cérémonie affiche le stock possédé');
assert.ok(ceremonie.includes('rpg-souk__carte-volume'), 'les cartes révélées conservent leur volume 3D');
assert.ok(!ceremonieCode.includes('rpg-souk__carte-corps') && !ceremonieCode.includes('<PastillesCarte'),
  'la face révélée ne contient ni nom, ni description, ni pastilles d’effet');
assert.match(ceremonieCode, /disabled=\{!toutRevele\}/, 'on ne range pas des cartes encore face cachée');
assert.ok(!/localStorage|sauverPortefeuille/.test(ceremonieCode),
  'la cérémonie ne range rien elle-même : les cartes sont déjà achetées');
const colonnesCeremonie = [...css.matchAll(/\.rpg-souk__ceremonie-cartes\s*\{([^}]*)\}/g)]
  .flatMap(([, corps]) => [...corps.matchAll(/grid-template-columns:\s*([^;]+)/g)].map((regle) => regle[1].trim()));
assert.deepEqual(colonnesCeremonie, ['repeat(5, minmax(0, 1fr))'],
  'les cartes du booster restent en cinq colonnes à tous les paliers responsive');
assert.match(page, /if \(ecran === 'partie' && viewport\.portrait && apercuAppui\) fermerApercuAppui\(\);/,
  'seule la rotation du duel ferme un aperçu tactile : le Souk garde le sien en portrait');

// 6. Le journal et la série sont des règles, pas une mise en page.
assert.match(ecranCode, /import \{[\s\S]{0,120}joursAvantLeCachetDeLaSemaine[\s\S]{0,40}\} from '\.\/rpgQuetes\.js';/,
  'la série et son compte à rebours viennent des règles des quêtes');
assert.match(ecranCode, /cachetDeLaSemaineDisponible\(quetes\)/,
  'le Cachet de la semaine se demande aux règles, il ne se devine pas');
assert.ok(!/serie % [0-9]|serie % JOURS/.test(ecranCode) && !/serie % 7\b/.test(ecranCode),
  'l’écran ne refait pas l’arithmétique de la série');
const credits = lire('src/games/rpgCredits.js');
assert.match(credits, /export const JOURNAL_MAX = 20;/, 'le journal est borné à la source');
assert.match(credits, /journal: normaliserJournal\(brut\.journal\)/, 'et normalisé au chargement');
assert.match(credits, /journal: normaliserJournal\(\[\.\.\.ici\.journal, \.\.\.la\.journal\]\)/,
  'la fusion réunit les deux journaux');
assert.match(credits, /rayonId && cartes\s*\n?\s*\? noterOuvertureJournal/, 'une ouverture connue écrit au journal');

// 7. Le portefeuille du Souk entre dans la collection de l'appareil.
const decks = lire('src/games/useDecksSablier.js');
assert.match(decks, /souk: chargerPortefeuille\(\)\.cartes/, 'les cartes du Souk rejoignent la collection');
assert.match(decks, /export function useDecksSablier|[\s\S]*rafraichirCollection,/, 'et l’atelier peut la relire après un achat');
assert.match(decks, /\.\.\.etatLocalActuel\(acquisRef\.current\),/,
  'l’enregistrement d’un deck pousse l’état entier, économie comprise');
assert.match(decks, /bourse: chargerPortefeuille\(\),\n    quetes: chargerEtatQuetes\(\),/,
  'l’autre hook transporte l’économie sans la modifier');

// 7 bis. L’étal et les pastilles partagent les règles, sans prix recopiés.
assert.match(ecranCode, /import \{ SOUK_DIRECT_REGLES, vueCarteDeEtal \} from '\.\/rpgSoukDirect\.js';/,
  'le format, les prix et l’état d’une carte de l’étal viennent de son module de règles');
assert.ok(!/\b(80|150|300)\b/.test(ecranCode), 'aucun prix de carte à l’unité n’est écrit en dur dans l’écran');
assert.match(ecranCode, /const vue = vueCarteDeEtal\(\{ id, collection, exemplaires, acheteAujourdhui, credits \}\)/,
  'la carte de l’étal relit la vue pure : elle ne décide ni du quota ni du stock');
// Le bug d’origine : un « déjà possédée » affiché sur une carte à un seul
// exemplaire, alors qu’il restait sa seconde copie à acheter. L’écran ne doit
// plus jamais trancher la possession pour un bouton — seul le quota le fait.
assert.ok(!/Déjà possédée/.test(ecranCode),
  'plus de « déjà possédée » : l’étal dit l’exemplaire manquant ou le quota atteint');
assert.match(ecranCode, /etat === 'complet'/,
  'et le seul refus de possession qui reste s’appelle « complet »');
const badge = lire('src/games/RpgCardCopyBadge.jsx');
assert.ok(badge.includes('data-card-copies={exemplaires}'), 'la pastille expose le nombre d’exemplaires');
assert.ok(badge.includes('data-card-copies-max'), 'et le quota qui le borne, pour qu’un « 1/2 » se lise');
assert.ok(badge.includes('aria-label={libelle}'), 'et le vocalise pour les lecteurs d’écran');
assert.match(page, /const exemplaires = nombreExemplaires\(collection, carte\.id, portefeuille\?\.exemplaires\)/,
  'le catalogue lit le même stock que l’étal, au même endroit');
assert.match(page, /<RpgCardCopyBadge nombre=\{exemplaires\} className="rpg-card-catalogue__copies" \/>/,
  'chaque vignette du catalogue porte sa pastille');
const colonnesMarche = [...css.matchAll(/\.rpg-souk__direct-cartes\s*\{([^}]*)\}/g)]
  .flatMap(([, corps]) => [...corps.matchAll(/grid-template-columns:\s*([^;]+)/g)].map((regle) => regle[1].trim()));
assert.deepEqual(colonnesMarche, [
  'repeat(5, minmax(0, 1fr))',
  'repeat(3, minmax(0, 1fr))',
], 'le marché garde cinq colonnes sur PC et trois sur les écrans étroits');
assert.match(css, /@media \(max-width: 980px\), \(orientation: portrait\) \{\s*\.rpg-souk__direct-cartes \{/,
  'le marché passe à trois colonnes en portrait, quelle que soit la largeur de l’écran');

// 8. Tactile et mouvement : les règles reprises des autres écrans.
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'le mouvement se coupe');
assert.ok(css.includes('@media (max-width: 480px)'), 'le portrait étroit est prévu');
assert.ok(css.includes('@media (max-width: 640px)'), 'la cérémonie a son palier de téléphone');
assert.match(css, /min-height: 44px/, 'les boutons font leur taille au doigt');

// 9. Le paquet est un volume, et c'est lui qu'on achète.
assert.match(ecranCode, /data-souk-ouvrir=\{rayon\.id\}/, 'le paquet lui-même est le bouton d’achat');
assert.match(ecranCode, /data-souk-paquet=\{rayon\.couleur \?\? 'souk'\}/,
  'et il porte la couleur de son rayon');
assert.ok(!/data-souk-ouvrir-bouton/.test(ecranCode),
  'aucun second bouton d’achat ne double le paquet');
const faces = ['--dos', '--tranche', '--dessus', '--dessous', '--avant'];
for (const face of faces) {
  assert.ok(ecran.includes(`rpg-souk__paquet-face${face}`), `le paquet a sa face ${face}`);
}
assert.ok(ecran.includes('rpg-souk__paquet-sertissage'), 'et ses sertissages de sachet scellé');
assert.match(ecranCode, /aria-label=\{nom\}/, 'le paquet se nomme pour qui ne le voit pas');
assert.match(ecranCode, /aria-hidden="true"/, 'et sa scène 3D reste décorative');
for (const regle of ['perspective:', 'transform-style: preserve-3d', 'translateZ(', 'rotateY(24deg)',
  'backface-visibility: hidden', 'rpg-souk-paquet-sway', 'rpg-souk-paquet-reflet']) {
  assert.ok(css.includes(regle), `le volume tient grâce à ${regle}`);
}
assert.match(css, /\.rpg-souk__rayon--souk\s*\{/,
  'le paquet du Souk garde sa teinte de laiton');
for (const teinte of ['braise', 'sable', 'eau', 'neige']) {
  assert.ok(!css.includes(`.rpg-souk__rayon--${teinte}`),
    `la teinte ${teinte} est partie avec son rayon monochrome`);
}
assert.ok(!css.includes('rpg-souk__rayon-prix'),
  'le prix n’est plus écrit deux fois : l’étiquette du paquet suffit');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,600}rpg-souk__paquet-scene \{ animation: none; \}/,
  'et le balancement se coupe pour qui le demande');

// 9 bis. L'étagère passe juste sous les quêtes, tient sur trois colonnes, et
// la semaine se lit en sept cartes cachetées.
assert.ok(ecran.indexOf('aria-labelledby="souk-rayons-titre"') < ecran.indexOf('data-souk-cachet='),
  'le comptoir se trouve juste sous les quêtes du jour');
assert.match(css, /\.rpg-souk__rayons \{\s*display: grid;\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  'l’étagère garde sa grille, même avec un seul paquet centré');
assert.match(css, /@media \(max-width: 980px\) \{\s*\.rpg-souk__rayons \{ grid-template-columns: repeat\(2,/,
  'deux colonnes sur la tablette');
assert.match(css, /@media \(max-width: 600px\) \{[\s\S]{0,120}\.rpg-souk__rayons \{ grid-template-columns: minmax\(0, 1fr\)/,
  'une seule colonne sur le téléphone');
// Le prix est plus gros qu'avant (15 px mini), doré, et son reflet le balaie.
assert.match(css, /\.rpg-souk__paquet-prix \{[^}]*font: 800 clamp\(15px, 1\.45vw, 19px\)/, 'le prix a doublé de taille');
assert.match(css, /\.rpg-souk__prix-valeur \{[^}]*font-size: 1\.2em/, 'et le montant pèse plus lourd que le geste');
assert.match(css, /@keyframes rpg-souk-prix-brille/, 'l’étiquette est balayée par un reflet');
assert.match(css, /@keyframes rpg-souk-prix-appel/, 'et elle respire quand l’achat est possible');
assert.match(ecranCode, /etapesDeLaSerie\(quetes\)/, 'les sept cartes viennent des règles de la série');
assert.match(ecranCode, /data-souk-semaine-jour=\{etape\.jour\}/, 'chaque carte porte son jour');
assert.match(ecranCode, /data-souk-semaine-jour-etat=\{etape\.atteint \? 'atteint' : 'attente'\}/,
  'et son cachet se lit dans le DOM');
assert.match(ecranCode, /rpg-souk__jour-sceau/, 'le cachet du jour est dessiné');
assert.match(css, /\.rpg-souk__jour\.is-atteint \.rpg-souk__jour-sceau \{ opacity: 1;/, 'il n’apparaît que sur un jour atteint');
assert.match(css, /\.rpg-souk__jour\.is-aujourdhui/, 'le jour courant est marqué');
assert.ok(!/serie % [0-9]|serie % JOURS/.test(ecranCode),
  'l’écran ne refait toujours pas l’arithmétique de la série');

// 10. Le crédit a une pièce, et une seule façon de l'écrire à l'écran.
const piece = lire('src/games/RpgCreditIcon.jsx');
assert.match(piece, /export default function RpgCreditIcon/, 'la pièce est son propre composant');
assert.ok(piece.includes("import './rpg-credit.css';"), 'et elle porte sa feuille');
assert.match(piece, /aria-hidden="true"/, 'elle est décorative : le montant se lit déjà');
assert.match(piece, /useId\(\)/, 'deux pièces ne partagent pas leurs dégradés');
assert.match(piece, /anime = false/, 'la grande pièce s’allume par une prop, pas par une classe écrite à la main');
for (const ecranDuSouk of ['RpgSouk.jsx', 'RpgBoosterOuverture.jsx', 'RpgDuelPage.jsx']) {
  const code = sansCommentaires(lire(`src/games/${ecranDuSouk}`));
  assert.ok(!code.includes('◈'), `${ecranDuSouk} n’écrit plus le losange à l’écran`);
}
assert.match(page, /<RpgMarketIcon className="rpg-mode-menu__souk-piece" \/>/,
  'l’onglet du Souk porte la pièce');
assert.match(page, /creditsLisible\(credits\)/, 'et son solde s’écrit avec l’espace fine, comme au Souk');
assert.match(ecran, /<RpgCreditIcon anime \/>/, 'le grand solde porte la pièce qui respire');
for (const montant of ['rpg-souk__recompense', 'rpg-souk__paquet-prix', 'rpg-souk__rayon-refus', 'rpg-souk__journal-notes']) {
  assert.match(ecran, new RegExp(`${montant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,520}<RpgCreditIcon`),
    `la pièce est dans ${montant}`);
}
assert.match(credits, /export function creditsLisible/, 'le format des montants vit avec les règles');
const pieceCss = lire('src/games/rpg-credit.css');
assert.match(pieceCss, /width: 1em/, 'la pièce prend la taille du texte qui l’entoure');
assert.match(pieceCss, /drop-shadow/, 'elle a son halo d’or');
assert.match(pieceCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,400}animation: none/,
  'et elle cesse de battre pour qui le demande');
assert.match(css, /\.rpg-souk__solde-signe \{[^}]*font-size: clamp/, 'le solde donne sa taille à la pièce');
assert.match(cssMenu, /\.rpg-mode-menu__souk-piece \{[^}]*font-size/, 'l’onglet donne la sienne');

// 11. Les quêtes du jour sont aussi dans l'onglet Jouer, à droite du menu.
const panneau = lire('src/games/RpgQuetesDuJour.jsx');
const panneauCode = sansCommentaires(panneau);
assert.match(page, /import RpgQuetesDuJour from '\.\/RpgQuetesDuJour\.jsx';/,
  'le menu monte le panneau des quêtes');
assert.match(page, /<RpgQuetesDuJour[\s\S]{0,600}quetes=\{quetes\}/,
  'il lui passe les quêtes du jour');
for (const geste of ['onReclamerQuete', 'onReclamerCachet', 'onReclamerSemaine']) {
  assert.match(page, new RegExp(`<RpgQuetesDuJour[\\s\\S]{0,700}${geste}=\\{${geste}\\}`),
    `le panneau encaisse par ${geste}, le geste du hook`);
}
assert.match(page, /onOuvrirSouk=\{[^}]*onChangeScreen\('souk'\)[^}]*\}/,
  'et il mène au Souk');
// Il vit dans la colonne de droite de la grille du menu — celle qui existait
// déjà : le panneau ne réinvente pas la mise en page.
assert.match(cssMenu, /\.rpg-mode-menu__play \{[^}]*grid-template-columns: minmax\(0, 1\.52fr\) minmax\(260px, \.82fr\)/,
  'la colonne de droite du menu était déjà là');
assert.match(cssMenu, /@media \(max-width: 820px\) \{\s*\.rpg-mode-menu__play \{ grid-template-columns: minmax\(0, 1fr\); \}/,
  'et sous 820 px le panneau passe sous le menu');
// Le panneau des quêtes est plus haut que le récit du menu : la colonne de
// gauche s'aligne sur lui et laissait le titre collé au bas de la page, un
// grand vide au-dessus. Le récit se tient maintenant au milieu de la colonne
// (`safe` : plus haut que la place disponible, il repart du haut au lieu
// d'être rogné par l'`overflow: hidden` du héros).
assert.match(cssMenu, /\.rpg-mode-menu__hero \{[^}]*align-items: center;[^}]*align-items: safe center;/,
  'le récit de l’onglet Jouer est centré en vertical dans sa colonne');
// Le panneau lit la vue partagée : aucune arithmétique de quête ne vit ici.
assert.match(panneauCode, /import \{[\s\S]{0,200}vueDeLaQuete[\s\S]{0,200}\} from '\.\/rpgQuetes\.js';/,
  'le panneau lit la vue partagée des quêtes');
assert.match(panneauCode, /import \{ GAINS, creditsLisible \} from '\.\/rpgCredits\.js';/,
  'et les montants viennent du barème');
assert.ok(!/80|50 ◈|cachetDuCycle: /.test(panneauCode.replace(/GAINS\.\w+/g, 'GAINS.x')),
  'aucun montant n’est écrit à la main dans le panneau');
assert.ok(!/localStorage|sauver/.test(panneauCode),
  'il ne touche à aucun stockage : il reçoit des états et rend des gestes');
assert.ok(!/function etatDeLaQuete/.test(ecranCode),
  'l’écran du Souk n’a plus sa propre vue des quêtes — elle est partagée');
assert.match(ecranCode, /vueDeLaQuete\(quetes, id\)/, 'et il lit la même');
assert.ok(panneau.includes('<RpgCreditIcon'), 'la pièce des crédits est aussi dans le panneau');
const panneauCss = lire('src/games/rpg-quetes-jour.css');
assert.match(panneauCss, /min-height: 44px/, 'les boutons du panneau font leur taille au doigt');
assert.match(panneauCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,300}animation: none/,
  'et son appel clignotant se coupe');
assert.match(ecran, /vueDeLaQuete/, 'les deux écrans se servent de la même vue');

// 12. Les gestes du duel sont racontés au Souk sans piège.
const pageCode = sansCommentaires(page);
// Une clé écrite en abrégé (`{ type: 'x', cardId }`) lève un ReferenceError
// silencieux quand la variable n'existe pas : React le signale sans casser le
// geste, la quête n'avance jamais et rien ne le dit. La charge utile du contrat
// s'écrit donc toujours `cardId: <expression>`. (Trois sites étaient tombés
// dedans : sort, créature, arme — corrigés.)
assert.doesNotMatch(pageCode, /noterEvenementDuel\(\{\s*type: '[a-z-]+',\s*(cardId|carteId)\s*[,}]/,
  'aucun événement du duel ne passe sa carte en abrégé : le contrat lit `cardId`, et une abréviation d’une variable absente lève un ReferenceError silencieux');
assert.match(pageCode, /noterEvenementDuel\(\{ type: 'creature-invoquee', cardId: carteId \}\)/,
  'l’invocation d’une créature nomme la carte qu’elle raconte');
assert.match(pageCode, /noterEvenementDuel\(\{ type: 'magie-lancee', cardId: carteId \}\)/,
  'un sort lancé aussi');
assert.match(pageCode, /noterEvenementDuel\(\{ type: 'arme-jouee', cardId: carteId \}\)/,
  'une arme équipée aussi');
// Et le Souk est prévenu **après** le rendu du plateau : un état de bourse mis à
// jour avant `force()` fait passer le rendu du champ en tâche de fond (le
// plateau montrait l'ancien état juste après le clic).
for (const geste of ['creature-invoquee', 'magie-lancee', 'arme-jouee']) {
  assert.match(pageCode, new RegExp(`force\\(\\)[\\s\\S]{0,700}noterEvenementDuel\\(\\{ type: '${geste}'`),
    `« ${geste} » est raconté après le rendu du plateau`);
}

console.log('Le Souk (lots 3 à 5) est branché : sixième onglet, solde et pastille dessus,');
console.log('trois quêtes réclamables, Cachet du cycle et de la semaine, un paquet du Souk');
console.log('mélangé (une rare garantie, 1 % de mythique) dont le paquet en volume est le bouton');
console.log('d’achat, la cérémonie 3D sans description avec pastilles et aperçu au clic droit,');
console.log('l’étal quotidien de cinq inhabituelles/rares/mythiques à 80/150/300 crédits, son rafraîchissement unique,');
console.log('le journal des ouvertures, et les cartes achetées qui entrent dans la collection. Le crédit y a');
console.log('sa pièce — frappée or, une seule à l’écran, jamais deux fois le même dégradé.');
console.log('Les quêtes du jour attendent aussi dans l’onglet Jouer, à droite du menu :');
console.log('mêmes barres, mêmes montants, et le geste d’encaissement au même endroit.');
console.log('Les gestes du duel sont racontés au Souk après le rendu du plateau, et');
console.log('toujours avec la clé `cardId` que le contrat attend.');
