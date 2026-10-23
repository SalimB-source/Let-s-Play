/**
 * `npm run check:rpg-profil` — le profil joueur du Sablier : la barre d'XP, le
 * paquet offert à chaque palier, et le branchement dans le menu.
 *
 * Deux moitiés, comme pour le Souk :
 *
 *   - le **smoke** (`scripts/rpg-profil-smoke.jsx`), compilé par Vite en mode
 *     SSR et exécuté ici : l'écran monté pour de vrai, branché sur le vrai hook,
 *     l'XP versée par les gestes du contrat, les boutons cliqués dans le DOM, et
 *     la vraie page pour l'onglet du menu ;
 *   - les **gardes de source** : ce que le DOM ne peut pas dire — où vit la
 *     persistance, qui tire le paquet au hasard, ce qu'un niveau annoncé ne
 *     répète pas, et à quelle hauteur la cérémonie passe au-dessus de la table.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── Le smoke : l'écran monté pour de vrai ───────────────────────────────────
const environnementPrecedent = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-profil-smoke.jsx', outDir: 'node_modules/.cache/rpg-profil', emptyOutDir: true },
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

const { checkRpgProfilEcran } = await import('../node_modules/.cache/rpg-profil/rpg-profil-smoke.js');
try {
  await checkRpgProfilEcran(assert);
} finally {
  dom.window.close();
}

// ── Les gardes de source ────────────────────────────────────────────────────
const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');
/** Le code sans sa prose : une garde de source ne doit pas lire les commentaires. */
const sansCommentaires = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const page = lire('src/games/RpgDuelPage.jsx');
const pageCode = sansCommentaires(page);
const ecran = lire('src/games/RpgProfilJoueur.jsx');
const ecranCode = sansCommentaires(ecran);
const regles = lire('src/games/rpgProfil.js');
const reglesCode = sansCommentaires(regles);
const hook = lire('src/games/useSablierBourse.js');
const hookCode = sansCommentaires(hook);
const evenements = lire('src/games/rpgEvenementsDuel.js');
const boosters = lire('src/games/rpgBoosters.js');
const css = lire('src/games/rpg-profil.css');
const cssMenu = lire('src/games/rpg-battle.css');
const decks = lire('src/games/useDecksSablier.js');
const fusion = lire('src/games/rpgDeckBuilder.js');

// 1. Les règles vivent dans le module : la courbe, la dette, le journal.
assert.match(reglesCode, /export const COURBE = Object\.freeze\(\{[\s\S]*?exposant: 1\.62/,
  'la courbe est une puissance écrite une fois');
assert.match(reglesCode, /Math\.max\(1, Math\.round\(COURBE\.base \* Math\.pow\(index \+ 1, COURBE\.exposant\)\)\)/,
  'et le seuil d’un palier se calcule, il ne s’écrit pas en table');
assert.match(reglesCode, /const SEUILS = Object\.freeze\(Array\.from\(\{ length: COURBE\.niveauMax \}/,
  'soixante seuils calculés une fois, au chargement');
assert.match(reglesCode, /export function boostersDus\(profil\) \{[\s\S]{0,220}franchis - base\.boostersOfferts/,
  'la dette de paquets est déduite du niveau et des paquets déjà offerts');
assert.ok(!/boostersDus: /.test(reglesCode) && !/niveau: niveauDeXp/.test(reglesCode),
  'ni la dette ni le niveau ne sont des champs stockés : aucune sauvegarde ne peut mentir');
assert.match(reglesCode, /export const RPG_PROFIL_STORAGE_KEY = 'letsplay_sablier_profil_v1';/,
  'la clé de l’appareil suit la convention des autres moitiés');
assert.match(reglesCode, /export function fusionnerProfils\(local, distant\)/, 'et la fusion est monotone');
assert.match(reglesCode, /export function chargerProfil\(/, 'le profil se relit');
assert.match(reglesCode, /export function sauverProfil\(/, 'et s’écrit');

// 2. L'écran reste présentationnel : aucune règle, aucun stockage.
for (const interdit of ['localStorage', 'chargerProfil', 'sauverProfil', 'useSablierBourse', 'gagnerXp']) {
  assert.ok(!ecranCode.includes(interdit), `l’écran ne touche pas à ${interdit} : la persistance vit dans le hook`);
}
assert.match(ecran, /import '\.\/rpg-profil\.css';/, 'et il porte sa propre feuille de style');
assert.match(ecranCode, /progressionDeXp\(profil\?\.xp \?\? 0\)/, 'la barre est une lecture pure des règles');
assert.match(ecranCode, /paliersAVenir\(profil/, 'la courbe à venir aussi');
assert.match(ecranCode, /BAREME_XP\.map/, 'le barème est lu dans le module, pas recopié');
assert.ok(!/\b(26|80|154|246|353)\b/.test(ecranCode.replace(/data-profil[^ ]*/g, '')),
  'aucun seuil écrit à la main dans l’écran');
assert.ok(ecran.includes('<RpgCreditIcon'), 'les crédits gardent leur pièce');

// 3. La page branche l'onglet, l'écran et la cérémonie.
assert.match(page, /import RpgProfilJoueur from '\.\/RpgProfilJoueur\.jsx';/, 'la page importe l’écran');
assert.match(page, /import RpgBoosterOuverture from '\.\/RpgBoosterOuverture\.jsx';/,
  'et la cérémonie — montée par la page, pas par l’écran, parce qu’un palier tombe aussi en plein duel');
assert.match(page, /from '\.\/rpgProfil\.js';/, 'les règles viennent du module');
assert.match(pageCode, /className=\{`rpg-mode-menu__profil\$\{screen === 'profil' \? ' is-active' : ''\}`\}/,
  'l’onglet Profil est dans le menu');
assert.match(pageCode, /onChangeScreen\('profil'\)/, 'et il mène à l’écran');
assert.match(pageCode, /screen === 'profil' \? \(\s*<RpgProfilJoueur/, 'l’écran est une branche du menu');
assert.match(pageCode, /data-profil-onglet=\{niveauOnglet\}/, 'l’onglet affiche le niveau');
assert.match(pageCode, /data-profil-pastille/, 'et la pastille des paquets dus');
assert.match(pageCode, /paquetsDePalierEnAttente > 0 &&/, 'qui ne s’affiche que s’il y a quelque chose à offrir');
assert.match(pageCode, /aria-label=\{ariaOngletProfil\}/, 'l’onglet se décrit pour qui ne le voit pas');
// L'`aria-label` est construit dans une variable : un gabarit multiligne
// injecterait l'indentation dans le nom accessible.
assert.match(pageCode, /const ariaOngletProfil = \[[\s\S]{0,400}?\.filter\(Boolean\)\.join\(', '\);/,
  'le nom accessible est une liste filtrée, pas un gabarit indenté');

// La page donne le profil au menu…
for (const prop of [
  'profil={profilJoueur}', 'barreXp={barreXp}', 'paquetsDePalierEnAttente={paquetsDePalierEnAttente}',
  'nomCompte={nomProfilJoueur}', 'onRenommerProfil={renommerLeProfil}', 'onChoisirEmbleme={choisirUnEmblemeProfil}',
]) {
  assert.ok(pageCode.includes(prop), `le menu reçoit ${prop}`);
}
// …et le menu le rend à l'écran, avec les gestes qui remontent au hook.
for (const prop of [
  'profil={profil}', 'portefeuille={portefeuille}', 'quetes={quetes}', 'collection={collection}',
  'statutSync={statutSync}', 'nomCompte={nomCompte}', 'onRenommer={onRenommerProfil}',
  'onChoisirEmbleme={onChoisirEmbleme}', 'onPlaySfx={play}', "onExit={() => onChangeScreen('jouer')}",
]) {
  assert.ok(pageCode.includes(prop), `l’écran reçoit ${prop}`);
}
assert.match(pageCode, /<RpgProfilJoueur[\s\S]{0,600}onOuvrirSouk=\{\(\) => \{ play\('menu'\); onChangeScreen\('souk'\); \}\}/,
  'et l’écran mène au Souk, là où les paquets dus s’ouvrent');

// 4. Le profil vient du hook, et le hook seul écrit.
assert.match(pageCode, /const \{[\s\S]{0,900}?profil: profilJoueur,[\s\S]{0,900}?barreXp,[\s\S]{0,900}?boostersEnAttente: paquetsDePalierEnAttente,[\s\S]{0,900}?monteeNiveau,[\s\S]{0,900}?fermerMonteeNiveau,[\s\S]{0,900}?renommerLeProfil,[\s\S]{0,900}?choisirUnEmblemeProfil/,
  'le profil, sa barre et ses gestes viennent du hook de bourse');
assert.ok(!pageCode.includes('chargerProfil(') && !pageCode.includes('sauverProfil('),
  'la page n’écrit jamais le profil elle-même');
assert.match(hookCode, /profil: normaliserProfil\(chargerProfil\(\)\)|profil: chargerProfil\(\)/,
  'le hook relit le profil de l’appareil au montage');
assert.match(hookCode, /sauverProfil\(suivant\.profil\)/, 'et l’écrit à chaque geste');
assert.match(hookCode, /barreXp: progressionDuProfil\(profil\)/, 'la barre affichée est celle des règles');
assert.match(hookCode, /boostersEnAttente: boostersDus\(profil\)/, 'la dette est déduite, jamais recopiée');
assert.match(hookCode, /renommerLeProfil|choisirUnEmbleme/, 'les deux gestes d’identité sont du hook');

// 5. Le paquet offert : tiré au hasard, jamais payé, marqué au journal.
assert.match(hookCode, /ouvrirBoosterOffert\(\{/, 'la montée de niveau ouvre un paquet offert');
assert.match(boosters, /export function ouvrirBoosterOffert/, 'dont la règle vit avec les autres paquets');
assert.match(sansCommentaires(boosters), /prix: 0/, 'et il ne coûte rien');
assert.match(hookCode, /const rayon = tirerParmi\(rayons, rngRef\.current\);/,
  'le rayon est tiré **à chaque paquet** : « au hasard » veut dire à chaque fois');
assert.match(hookCode, /profil = marquerBoosterOffert\(profil\);/,
  'chaque paquet ouvert solde un palier dû');
assert.match(hookCode, /paquets: paquets\.length,\n\s*prix: 0,/, 'la cérémonie annonce un paquet offert, à zéro');
assert.match(hookCode, /offert: true,/, 'et le dit à l’écran');
// La dette attend au lieu de se perdre, et ne se répète pas en boucle.
assert.match(hookCode, /if \(ouvertureRef\.current \|\| monteeRef\.current\) return null;/,
  'une cérémonie à l’écran reporte le paquet : la dette attend');
assert.match(hookCode, /essaiPaliersRef\.current === dus/,
  'et une dette qu’on n’a pas pu régler n’est pas réannoncée à chaque geste');
assert.match(hookCode, /essaiPaliersRef\.current = null;/, 'un paquet tiré remet le compteur à zéro');
assert.match(hookCode, /fermerMonteeNiveau = useCallback\(\(\) => \{\n\s*monteeRef\.current = null;\n\s*setMonteeNiveau\(null\);\n\s*reglerPaliers\(\);/,
  'fermer l’annonce règle ce qui reste dû');
assert.match(hookCode, /if \(suite\.niveaux > 0 \|\| boostersDus\(suite\.profil\) > 0\) reglerPaliers\(\);/,
  'un palier sonné règle sa dette tout de suite');

// 6. L'XP suit les gestes du duel, et le butin de la tour seulement s'il est versé.
assert.match(sansCommentaires(evenements), /export function xpDeLEvenement/, 'l’XP d’un geste est une règle du contrat');
assert.match(sansCommentaires(evenements), /if \(butin\) \{[\s\S]{0,200}xp \+= XP\.tourTerminee;/,
  'la tour ne monte la barre que si le butin a été payé');
assert.match(sansCommentaires(evenements), /toursTerminees: \(stats\?\.toursTerminees \?\? 0\) \+ 1/,
  'et le compteur suit le butin');
assert.ok(!/'creature-invoquee'|'magie-lancee'|'arme-jouee'/.test(
  sansCommentaires(evenements).split('export function xpDeLEvenement')[1]?.split('}')[0] ?? '',
), 'une carte posée ne paie qu’une fois : les gestes précis ne doublent pas `carte-jouee`');
assert.match(hookCode, /verserXp\(/, 'les gains hors duel — quête, Cachet, leçon — montent la même barre');
assert.match(pageCode, /setAnnonceGain\(\{[\s\S]{0,400}?xp: paiement\.xp/, 'la victoire annonce l’XP gagnée');
assert.match(pageCode, /data-victoire-xp=\{annonceGain\.xp \?\? 0\} data-victoire-niveaux=\{annonceGain\.niveaux \?\? 0\}/,
  'et l’écran de fin la montre, avec les paliers qui ont sonné');
assert.match(pageCode, /className="rpg-overlay__gain rpg-overlay__gain--xp" data-victoire-xp-ligne/,
  'dans sa propre pastille, à côté des crédits');
assert.match(pageCode, /\{annonceGain\.xp > 0 && \(/, 'qui ne s’affiche que si quelque chose a été versé');
assert.match(pageCode, /niveau \$\{barreXp\.niveau\} atteint, un paquet s’ouvre/,
  'et qui promet le paquet quand un palier vient de sonner');

// 7. La cérémonie passe au-dessus de la table, et l'annonce seule existe aussi.
assert.match(pageCode, /function MonteeDeNiveau\(\{ montee, profil, cardArt, onFermer, onPlaySfx \}\)/,
  'la montée de niveau est son propre composant de page');
assert.match(pageCode, /if \(montee\.ouverture\) \{[\s\S]{0,200}<RpgBoosterOuverture/,
  'un paquet tiré monte la cérémonie du Souk');
assert.match(pageCode, /<RpgBoosterOuverture\s+key=\{montee\.token\}/,
  'et la cérémonie porte `key` : deux paquets dus de suite repartent du sachet');
assert.match(hookCode, /token: \(tokenPalierRef\.current \+= 1\)/,
  'le jeton est un compteur, pas une horloge : deux règlements tombent dans le même tick');
assert.match(pageCode, /className="rpg-niveau-toast" role="status" aria-live="polite"/,
  'sinon une annonce seule, polie pour les lecteurs d’écran');
assert.match(pageCode, /data-niveau-toast=\{montee\.vers\}/, 'qui dit le niveau atteint');
assert.match(pageCode, /data-niveau-dus=\{dus\}/, 'et les paquets qui attendent');
assert.equal(pageCode.match(/<MonteeDeNiveau/g)?.length, 2,
  'montée dans le menu **et** dans le duel : un palier tombe aussi en pleine table');
assert.match(pageCode, /montee=\{monteeNiveau\}[\s\S]{0,200}onFermer=\{fermerMonteeNiveau\}/,
  'et elle se ferme par le geste du hook');
assert.match(css, /\.rpg-battle \.rpg-souk__ceremonie\[data-souk-ceremonie-offert\] \{ z-index: 10045; \}/,
  'la cérémonie offerte passe au-dessus de la table (nav 900, journal 80)');
assert.match(css, /\.rpg-niveau-toast \{[\s\S]{0,200}z-index: 10040;/,
  'l’annonce seule passe au-dessus aussi, sous la cérémonie');
assert.ok(css.indexOf('.rpg-niveau-toast') > css.indexOf('z-index: 10045'),
  'et l’ordre des feuilles tient : le profil vient après le combat');

// 8. L'onglet tient sur téléphone, où le menu empile ses libellés.
assert.match(css, /\.rpg-mode-menu__switch button\.rpg-mode-menu__profil \.rpg-mode-menu__profil-embleme,[\s\S]{0,400}?\.rpg-mode-menu__profil-pastille \{\s*display: inline;/,
  'les `span` de l’onglet sont qualifiés et gardent leur ligne : sous 560 px le menu les empile tous');
assert.match(css, /\.rpg-mode-menu__switch button\.rpg-mode-menu__profil \.rpg-mode-menu__profil-xp \{[\s\S]{0,120}display: block/,
  'et la piste d’XP reste un bloc, elle');
assert.match(cssMenu, /\.rpg-mode-menu__switch button span \{[^}]*display: block/,
  'c’est bien la règle du menu qui empile — d’où la spécificité');
assert.match(css, /@media \(max-width: 1100px\) \{[\s\S]{0,320}rpg-mode-menu__onglet-libelle \{ display: none; \}/,
  'sous 1100 px, le libellé s’efface et l’emblème reste');
assert.match(css, /@media \(max-width: 1100px\) \{[\s\S]{0,400}button\.rpg-mode-menu__profil \.rpg-mode-menu__profil-xp \{ width: 26px; \}/,
  'et la piste réduite garde la même spécificité que celle qu’elle réduit');

// 9. Le profil voyage avec le reste de l'état, jamais seul.
assert.match(decks, /profil: chargerProfil\(\),/, 'l’atelier de decks transporte le profil');
assert.match(decks, /sauverProfil\(fusion\.etat\.profil\);/, 'et ne l’écrase pas au passage');
assert.match(sansCommentaires(fusion), /const profil = fusionnerProfils\(local\?\.profil, distant\?\.profil\)\.profil;/,
  'la fusion de l’état entier fusionne le profil');
assert.match(sansCommentaires(fusion), /const modifie = JSON\.stringify\(\{ decks, supprimes, collection, acquis, bourse, quetes, histoire, profil \}\)/,
  'et sait dire si le profil a bougé');
assert.match(hookCode, /const profil = fusionnerProfils\(chargerProfil\(\), fusion\.etat\.profil\)\.profil;/,
  'le hook fusionne ce que le compte renvoie — l’XP au maximum, jamais le dernier arrivé');

// 10. Tactile et mouvement : les règles reprises des autres écrans.
assert.match(css, /min-height: 44px/, 'les boutons font leur taille au doigt');
assert.ok(css.includes('@media (max-width: 640px)'), 'le téléphone a son palier');
assert.ok(css.includes('@media (max-width: 420px)'), 'et le portrait étroit aussi');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'le mouvement se coupe');
assert.ok((css.match(/prefers-reduced-motion: reduce/g) ?? []).length >= 3,
  'la barre, l’annonce et l’onglet se tiennent tranquilles pour qui le demande');

console.log('Le profil du Sablier est branché : un onglet Profil dans le menu, une carte');
console.log('de gardien (pseudo, emblème, rang, compteurs, journal des paliers), une barre');
console.log('d’XP qui monte vite au début puis devient gourmande, et un paquet du Souk offert');
console.log('à chaque niveau — tiré au hasard parmi les rayons ouverts, sans un crédit dépensé,');
console.log('avec la pitié et les doublons d’un vrai paquet. La dette attend derrière une');
console.log('cérémonie déjà ouverte, se règle à la fermeture, et ne se réannonce pas en boucle.');
