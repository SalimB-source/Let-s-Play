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
import { existsSync, readFileSync } from 'node:fs';
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
const piste = lire('src/games/RpgPisteGains.jsx');
const pisteCode = sansCommentaires(piste);
const gains = lire('src/games/rpgProfilGains.js');
const gainsCode = sansCommentaires(gains);
const seuil = lire('src/games/RpgStoryBabEl.jsx');
const seuilCode = sansCommentaires(seuil);
const vignettes = lire('tools/make-profil-vignettes.mjs');
const css = lire('src/games/rpg-profil.css');
const cssPiste = lire('src/games/rpg-piste-gains.css');
const cssSeuil = lire('src/games/rpg-story-bab-el.css');
const cssMenu = lire('src/games/rpg-battle.css');
const cssMana = lire('src/games/rpg-mana-essai.css');
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
assert.ok(!/\b(26|80|154|246|353)\b/.test(ecranCode.replace(/data-profil[^ ]*/g, '')),
  'aucun seuil écrit à la main dans l’écran');

// La carte est **dépouillée** : ce que le joueur voulait, c'est un écran lisible,
// pas un tableau de bord. Les chiffres existent toujours — dans `rpgProfil.js` et
// au Souk — mais aucun ne s'affiche ici.
for (const interdit of ['paliersAVenir', 'BAREME_XP', 'RANGS', 'rangDeNiveau', 'RpgCreditIcon',
  'rpg-profil__section', 'rpg-profil__stats', 'rpg-profil__bareme', 'rpg-profil__journal',
  'rpg-profil__courbe', 'rpg-profil__sync', 'rpg-profil__rang']) {
  assert.ok(!ecranCode.includes(interdit), `l’écran n’affiche plus ${interdit}`);
}
// Ce qui reste : l'identité, le niveau, la barre, le chemin vers les paquets, et
// trois gestes — un visage, un emblème, une table.
for (const attendu of ['rpg-profil__medaillon', 'data-profil-niveau', 'data-profil-xp', 'data-profil-emblemes',
  'data-profil-avatars', 'data-profil-plateaux', 'data-profil-medaille',
  'data-profil-pseudo-saisie', 'data-profil-retour', 'data-profil-cadre', 'data-profil-titre']) {
  assert.ok(ecranCode.includes(attendu), `l’écran garde ${attendu}`);
}
// La piste des gains a quitté la carte pour l'écran Jouer : la carte **porte** ce
// qui est gagné (un cadre peint, un titre écrit), elle n'annonce plus ce qui
// reste à gagner. Une carte qui remonterait la piste remettrait un tableau de
// bord là où le joueur voulait un écran lisible.
for (const interdit of ['RpgPisteGains', 'RpgProfilPiste', 'data-piste', 'pisteDesGains', 'onChoisirCadre', 'onChoisirTitre']) {
  assert.ok(!ecranCode.includes(interdit), `la carte ne monte plus la piste des gains (${interdit})`);
}
// Ce qui reste des gains sur la carte se **peint** : le cadre est un attribut que
// la feuille de style transforme en anneau, le titre une ligne sous le pseudo.
assert.match(css, /\.rpg-profil__tete\[data-profil-cadre='astrolabe'\]::before \{/,
  'les cadres sont peints en CSS, sans un asset de plus');
assert.match(css, /animation: rpg-profil-astrolabe 64s linear infinite;/, 'l’astrolabe tourne lentement');
assert.match(css, /@keyframes rpg-profil-astrolabe \{ to \{ transform: rotate\(360deg\); \} \}/,
  'sa rotation est une image clé');
assert.match(css, /\.rpg-profil__titre \{/, 'et le titre gagné a sa ligne');
assert.ok(ecranCode.includes('data-profil-attente-aller'), 'et le bandeau des paquets dus mène au Souk');
// Les vignettes sont des **fonds peints** des boutons, pas des `<img>` dans le
// flux : ce sont des décors de choix, le nom accessible porte déjà le personnage
// et le lieu — et jsdom ne charge de toute façon aucun fond.
assert.ok(!/<img/.test(ecranCode) && !/<img/.test(pisteCode) && !/<img/.test(seuilCode),
  'ni la carte, ni la piste, ni le seuil ne chargent d’image dans le flux du document');
assert.ok(ecranCode.includes('backgroundImage'), 'les vignettes arrivent par `background-image`');
// Chaque geste **nomme** ce qu'il choisit : le nom de la table est peint sur sa
// tuile, l'étiquette du geste écrit le nom du choix courant, et l'emblème se
// pose en sceau sur le visage. Cliquer doit se lire, pas seulement déplacer un
// anneau de 44 px autour d'un glyphe.
for (const attendu of ['rpg-profil__plateau-nom', 'rpg-profil__cachet', 'emblemeChoisi', 'tableChoisie',
  'data-profil-cachet={emblemeChoisi.id}', 'Visage{avatar ? <b>']) {
  assert.ok(ecranCode.includes(attendu), `l’écran nomme ce qu’il choisit (${attendu})`);
}
assert.ok(ecran.split('\n').length < 330,
  `la carte tient en un seul écran et trois gestes (${ecran.split('\n').length} lignes)`);
assert.ok(piste.split('\n').length < 280,
  `la piste a son propre fichier, et reste courte (${piste.split('\n').length} lignes)`);

// 3. La page branche l'onglet, l'écran et la cérémonie.
assert.match(page, /import RpgProfilJoueur from '\.\/RpgProfilJoueur\.jsx';/, 'la page importe l’écran');
assert.match(page, /import RpgPisteGains from '\.\/RpgPisteGains\.jsx';/, 'et la piste des gains');
assert.match(page, /import RpgStoryBabEl from '\.\/RpgStoryBabEl\.jsx';/, 'et le seuil de Bab El');
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
// Dépouillé jusque dans ses props : l'écran ne reçoit que le profil et le nom du
// compte. Ni collection, ni portefeuille, ni quêtes, ni état de synchronisation.
for (const prop of [
  'profil={profil}', 'nomCompte={nomCompte}', 'onRenommer={onRenommerProfil}',
  'onChoisirEmbleme={onChoisirEmbleme}', 'onChoisirAvatar={onChoisirAvatar}',
  'onChoisirPlateau={onChoisirPlateau}', 'onPlaySfx={play}', "onExit={() => onChangeScreen('jouer')}",
]) {
  assert.ok(pageCode.includes(prop), `l’écran reçoit ${prop}`);
}
for (const prop of [
  'onChoisirAvatar={choisirUnAvatarProfil}', 'onChoisirPlateau={choisirUnPlateauProfil}',
  'onChoisirCadre={choisirUnCadreProfil}', 'onChoisirTitre={choisirUnTitreProfil}',
]) {
  assert.ok(pageCode.includes(prop), `le menu reçoit ${prop}`);
}
// Les gestes du hook sont **renommés** en entrant dans la page : écrire
// `choisirUnEmblemeProfil` tout seul déstructure un champ qui n'existe pas, le
// prop part `undefined`, et cliquer un emblème ne fait plus rien — sans erreur,
// sans trace. Le renommage est donc gardé ici, nom par nom.
for (const [duHook, deLaPage] of [
  ['choisirUnEmbleme', 'choisirUnEmblemeProfil'],
  ['choisirUnAvatar', 'choisirUnAvatarProfil'],
  ['choisirUnPlateau', 'choisirUnPlateauProfil'],
  ['choisirUnCadre', 'choisirUnCadreProfil'],
  ['choisirUnTitre', 'choisirUnTitreProfil'],
]) {
  assert.match(pageCode, new RegExp(`${duHook}:\\s*${deLaPage}`), `la page renomme ${duHook} en ${deLaPage}`);
}
assert.match(pageCode, /data-profil-onglet-avatar=\{avatarOnglet\.id\}/,
  'l’onglet Profil porte le visage choisi, à la place du glyphe');
const brancheProfil = pageCode.split('<RpgProfilJoueur')[1]?.split('/>')[0] ?? '';
for (const retiree of ['portefeuille=', 'quetes=', 'collection=', 'statutSync=', 'onChoisirCadre=', 'onChoisirTitre=']) {
  assert.ok(!brancheProfil.includes(retiree), `l’écran ne reçoit plus ${retiree}`);
}
assert.match(pageCode, /<RpgProfilJoueur[\s\S]{0,600}onOuvrirSouk=\{\(\) => \{ play\('menu'\); onChangeScreen\('souk'\); \}\}/,
  'et l’écran mène au Souk, là où les paquets dus s’ouvrent');

// 4. Le profil vient du hook, et le hook seul écrit.
assert.match(pageCode, /const \{[\s\S]{0,900}?profil: profilJoueur,[\s\S]{0,900}?barreXp,[\s\S]{0,900}?boostersEnAttente: paquetsDePalierEnAttente,[\s\S]{0,900}?monteeNiveau,[\s\S]{0,900}?fermerMonteeNiveau,[\s\S]{0,900}?renommerLeProfil,[\s\S]{0,900}?choisirUnEmbleme: choisirUnEmblemeProfil/,
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
// L'écran de fin porte une vraie barre : elle monte du total d'avant la partie
// à celui du moment, et se voit donc franchir un palier.
assert.match(pageCode, /function BarreXpFinDeDuel\(\{ depart = 0, arrivee = 0, legende = null \}\)/,
  'la barre de fin de duel est son propre composant');
assert.match(pageCode, /const xpAvantDuelRef = useRef\(\{ session: sessionDuelRef\.current, xp: profilJoueur\?\.xp \?\? 0 \}\)/,
  'elle part de l’XP d’avant la partie');
assert.match(pageCode, /xpAvantDuelRef\.current = \{ session: sessionDuelRef\.current, xp: xpProfilRef\.current \};/,
  'que chaque nouvelle partie remet à l’heure');
assert.match(pageCode, /const xpFinDeDuel = !modePvp && vainqueur && xpAvantDuel\?\.session === sessionDuelRef\.current/,
  'elle vaut pour la victoire comme pour la défaite — jamais en ligne');
assert.match(pageCode, /<BarreXpFinDeDuel\s+depart=\{xpFinDeDuel\.depart\}\s+arrivee=\{xpFinDeDuel\.arrivee\}/,
  'et c’est l’écran de fin qui la monte');
assert.match(pageCode, /if \(depuis === cible\) return undefined;/,
  'sans rien animer quand rien n’a bougé');
assert.match(pageCode, /trameRef\.current = requestAnimationFrame\(pas\);/,
  'la montée se joue trame par trame, pas d’un coup');
assert.match(pageCode, /\(prefers-reduced-motion: reduce\)/,
  'et respecte le réglage « réduire les animations »');
assert.match(pageCode, /niveau \$\{barre\.niveau\} atteint, un paquet s’ouvre/,
  'elle promet le paquet quand un palier vient de sonner');
assert.match(pageCode, /data-xp-gain=\{gain\}/, 'et annonce le gain de la partie');
assert.match(cssMenu, /\.rpg-overlay__xp-piste \{/, 'la piste de la barre a son style');
assert.match(cssMenu, /@media \(prefers-reduced-motion: reduce\) \{\n  \.rpg-overlay__xp,/,
  'dont une version sans animation');

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
assert.equal(pageCode.match(/<MonteeDeNiveau/g)?.length, 3,
  'montée dans le menu, au retour sur le récit et en fin de duel');
assert.match(pageCode, /\{!partieEnCours && \(\s*<MonteeDeNiveau/,
  'jamais pendant une partie en cours : sur la table, la cérémonie attend la fin du duel');
assert.match(pageCode, /useSablierBourse\(\{[\s\S]{0,300}?partieEnCours,\s*\}\)/,
  'la page dit au hook quand une partie est en cours');
assert.match(hookCode, /if \(partieEnCoursRef\.current\) return null;/,
  'le hook n’ouvre aucun paquet de palier tant qu’une partie est en cours');
assert.match(hookCode, /if \(!partieEnCours\) reglerPaliers\(\);/,
  'et il règle les paliers en attente dès que la partie est terminée');
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

// 11. La piste des gains : un chemin qui défile, et deux cosmétiques portés.
// La carte était dépouillée de ses paliers à venir ; la piste les rend, mais
// comme un **chemin de gains** — pas un tableau de chiffres. Ce qui est gardé :
// aucun compteur, aucun barème, aucune formule de courbe à l'écran.
assert.match(gainsCode, /export const CADRES = Object\.freeze\(\[/, 'les cadres sont un catalogue gelé');
assert.match(gainsCode, /export const TITRES = Object\.freeze\(\[/, 'les titres aussi');
assert.match(gainsCode, /export function pisteDesGains\(profil, \{ apres = 8/,
  'la piste part du niveau en cours et pousse de huit niveaux au-delà du rang');
assert.match(gainsCode, /prochain\.niveau : niveau \+ suite\) \+ suite/,
  'sa fin est le prochain rang, plus ces huit niveaux');
assert.match(gainsCode, /Math\.min\(COURBE\.niveauMax,/, 'et jamais au-delà de la courbe');
assert.match(gainsCode, /gains\.push\(\{ \.\.\.GAIN_PAQUET, sorte: 'paquet', niveau: n \}\)/,
  'chaque niveau ferme sa liste par un paquet offert');
// Ce qui est gagné se **calcule** depuis le niveau — donc depuis l'XP. Aucune
// liste de possessions à écrire, donc rien à tricher dans une sauvegarde.
assert.match(gainsCode, /return niveauDe\(profil\) >= cadre\.niveau \? cadre : CADRES\[0\];/,
  'un cadre volé retombe sur celui du départ');
assert.match(gainsCode, /return niveauDe\(profil\) >= titre\.niveau \? titre : null;/,
  'un titre volé retombe sur aucun titre');
assert.match(gainsCode, /export function cadrePortable\(profil, cadreId\)/, 'porter se mérite');
assert.match(hookCode, /if \(!cadrePortable\(avant\.profil, cadreId\)\) return false;/,
  'et le hook refuse un cadre hors de portée');
assert.match(hookCode, /if \(!titrePortable\(avant\.profil, titreId\)\) return false;/,
  'comme un titre hors de portée');
// Le module des règles ne connaît pas le catalogue des gains : il garde deux
// chaînes propres, la validation se fait à la lecture — comme les visages.
assert.ok(!reglesCode.includes('rpgProfilGains'), 'le profil ignore les gains : il garde des chaînes');
assert.match(reglesCode, /cadre: normaliserChoix\(brut\.cadre\)/, 'et borne ce qu’il garde');
assert.match(reglesCode, /cadre: recent\.cadre \?\? ici\.cadre \?\? la\.cadre/,
  'la fusion ne perd pas un cadre porté d’un seul côté');
assert.ok(!gainsCode.includes('rpgAvatars') && !gainsCode.includes('rpgPlateaux') && !gainsCode.includes('rpgCards'),
  'les gains ne connaissent ni les visages, ni les tables, ni les cartes');
// La piste est présentationnelle : aucune écriture, aucun stockage.
for (const interdit of ['localStorage', 'sauverProfil', 'useState', 'fetch(']) {
  assert.ok(!pisteCode.includes(interdit), `la piste ne fait rien elle-même (${interdit})`);
}
assert.match(piste, /import '\.\/rpg-piste-gains\.css';/, 'et elle porte sa propre feuille de style');
assert.match(pisteCode, /data-palier=\{palier\.niveau\}/, 'chaque palier est marqué pour les vérifications');
assert.match(pisteCode, /data-palier-etat=\{palier\.etat\}/, 'son état aussi');
assert.match(pisteCode, /data-palier-gain=\{gain\.sorte\}/, 'et ce qu’il rapporte');
assert.match(pisteCode, /aria-current=\{palier\.etat === 'courant' \? 'step' : undefined\}/,
  'le palier en cours se dit à qui ne le voit pas');
assert.match(pisteCode, /aria-disabled=\{!gagne \|\| undefined\}/,
  'un gain verrouillé reste un bouton, mais se dit verrouillé — il ne disparaît pas');
assert.match(pisteCode, /onPlaySfx\?\.\('erreur'\)/, 'et son clic sonne l’erreur au lieu de mentir');
assert.match(pisteCode, /tabIndex=\{0\}/, 'la zone qui défile se parcourt au clavier');
assert.match(pisteCode, /bande\.scrollLeft = Math\.max\(0, courant\.offsetLeft/,
  'elle s’ouvre sur le niveau en cours, sans `scrollIntoView` — absent de jsdom');

// ── Les paquets sur la barre ────────────────────────────────────────────────
// Chaque niveau offre un paquet : la tuile le montre donc toujours. En grand —
// le dos de carte en miniature et son sachet — quand le paquet est tout le gain ;
// en coin, par le `::after` de la feuille, quand un rang ou un cosmétique occupe
// la tuile. Ni l'un ni l'autre ne coûte un asset : une vignette de 1,3 Ko et des
// dégradés.
assert.match(pisteCode, /vignetteDosDeCarte\(BASE_URL\)/, 'la miniature vient de la vignette du dos de carte');
assert.match(pisteCode, /className="rpg-piste__carte" style=\{\{ backgroundImage: `url\("\$\{dos\}"\)` \}\}/,
  'peinte en fond, pas en `<img>` dans le flux');
assert.match(pisteCode, /className="rpg-piste__sachet" aria-hidden="true"/, 'avec le sachet du Souk');
assert.match(gainsCode, /export const DOS_DE_CARTE_SOURCE = 'dos-de-carte\.jpg';/,
  'la source de la vignette est écrite une fois');
assert.match(gainsCode, /export const DOS_DE_CARTE_REVISION = '[^']+';/,
  'et sa révision casse le cache des navigateurs');
assert.match(gainsCode, /export function vignetteDosDeCarte\(baseUrl = '\/'\) \{/,
  'l’URL se construit comme celles des visages et des tables');
assert.ok(existsSync(new URL('../public/profil/dos-de-carte.webp', import.meta.url)),
  'la vignette est dans `public/` — `tools/make-profil-vignettes.mjs` la régénère');
assert.match(vignettes, /DOS_DE_CARTE_LARGEUR,/, 'l’outil la taille depuis la même constante');
assert.match(vignettes, /DOS_DE_CARTE_SOURCE,/, 'la source aussi vient du module');
assert.match(vignettes, /const sortie = path\.join\(PUBLIC, vignetteDosRelative\(\)\);/,
  'et son nom aussi — un seul endroit où l’URL est écrite');
assert.match(vignettes, /hauteur: Math\.round\(\(DOS_DE_CARTE_LARGEUR \* 5\) \/ 4\),/,
  'au format des cartes du Sablier, quatre pour cinq');
assert.match(cssPiste, /\.rpg-piste__carte \{[\s\S]{0,300}background-size: cover;/, 'la miniature couvre la tuile');
assert.match(cssPiste, /\.rpg-piste__sachet-top \{[\s\S]{0,600}clip-path: polygon\(/,
  'le sceau cranté du sachet se voit de dessus');
// Le sachet est un **volume** : trois faces en perspective, et une rotation
// lente que `prefers-reduced-motion` arrête.
assert.match(cssPiste, /\.rpg-piste__sachet \{[\s\S]{0,300}transform-style: preserve-3d;/,
  'le sachet est un volume, pas une image plate');
for (const face of ['face', 'cote', 'top']) {
  assert.ok(cssPiste.includes(`.rpg-piste__sachet-${face} {`), `le sachet a sa face « ${face} »`);
}
assert.match(cssPiste, /@keyframes rpg-piste-sachet \{/, 'et il tourne lentement sur lui-même');
// Ce qu'il y a à gagner s'écrit pour se lire d'un coup d'oeil : la famille du
// gain dans sa couleur, puis le nom de ce gain.
assert.match(pisteCode, /<b className="rpg-piste__famille">\{gain\.sorte\}<\/b>/,
  'chaque colonne écrit la famille de son gain');
assert.match(pisteCode, /<span className="rpg-piste__gain-nom">\{gain\.nom\}<\/span>/,
  'puis le nom de ce gain');
for (const famille of ['paquet', 'rang', 'cadre', 'titre']) {
  assert.match(cssPiste, new RegExp(`\\.rpg-piste__palier--${famille} \\{ --famille: #`),
    `la famille ${famille} a sa couleur`);
}
assert.match(cssPiste, /\.rpg-piste__palier:not\(\.rpg-piste__palier--paquet\) \.rpg-piste__tuile::after \{/,
  'un niveau qui gagne autre chose porte quand même son sachet, en coin');
// La lecture d'une passe de maîtrise : une colonne par niveau — le repère du
// niveau en cours, le numéro, la coche des niveaux passés, la récompense et son
// cadenas tant qu'elle est à venir.
assert.match(pisteCode, /\{palier\.etat === 'courant' \? 'niveau actuel' : ''\}/,
  'le repère « niveau actuel » n’écrit que la colonne en cours');
assert.match(pisteCode, /\{gagne \? null : <span className="rpg-piste__verrou" aria-hidden="true" \/>\}/,
  'une récompense à venir porte son cadenas');
assert.match(cssPiste, /\.rpg-piste__palier\.is-gagne \.rpg-piste__coche::before \{[\s\S]{0,120}content: '✓';/,
  'la coche des niveaux passés est peinte, pas montée');
assert.match(cssPiste, /\.rpg-piste__verrou \{[\s\S]{0,400}border-radius: 2px;/, 'le cadenas a son corps');
assert.match(cssPiste, /\.rpg-piste__verrou::before \{[\s\S]{0,300}border-bottom: 0;/, 'et son anse');
assert.match(cssPiste, /\.rpg-piste__palier \{[\s\S]{0,400}border-left: 1px solid/,
  'les colonnes se séparent d’un filet, comme les cases d’une passe');

// Des paquets dus ? La piste le dit, et mène au Souk — le seul endroit du menu où
// la dette de paliers se règle d'un clic.
assert.match(pisteCode, /data-piste-du=\{dus\}/, 'les paquets qui attendent ont leur bouton');
assert.match(pisteCode, /onClick=\{\(\) => \{ onPlaySfx\?\.\('menu'\); onOuvrirSouk\?\.\(\); \}\}/,
  'qui sonne le menu et mène au Souk');

// Les styles ont leur feuille : la queue de `rpg-profil.css` porte les `z-index`
// de la cérémonie et de l'annonce, on n'y touche pas pour un décor.
assert.ok(!css.includes('rpg-piste'), 'la piste a sa propre feuille de style');
assert.match(cssPiste, /\.rpg-piste__bande \{[\s\S]{0,400}overflow-x: auto;/, 'elle défile vraiment');
assert.match(cssPiste, /scroll-snap-type: x proximity;/, 'et s’arrête sur un palier');
assert.match(cssPiste, /\.rpg-piste__bande:focus-visible \{/, 'avec un signe visible au clavier');
assert.match(cssPiste, /\.rpg-piste__filet \{[\s\S]{0,700}calc\(var\(--gauche, 0%\) \/ 2\) 100%,/,
  'le filet se remplit en propriétés personnalisées — un noeud, pas quatre');
assert.match(cssPiste, /\.rpg-piste__palier\.is-jalon::before \{[\s\S]{0,600}content: 'rang';/,
  'le prochain rang est mis en avant');
assert.match(cssPiste, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,300}animation: none;/,
  'et le rappel des paquets dus s’arrête pour qui le demande');
assert.match(cssPiste, /@media \(max-width: 900px\)/, 'la piste a son palier téléphone');
assert.match(cssPiste, /\.rpg-mode-menu__play > \.rpg-piste \{ order: 1; \}/,
  'en une colonne, la piste passe avant les quêtes du jour');
assert.match(cssPiste, /\.rpg-mode-menu__play > \.rpg-piste \{ grid-column: 1 \/ -1; \}/,
  'le cadre s’allonge sur toute la largeur du menu : plus de niveaux d’un coup d’oeil');

// La piste est montée sur **Jouer**, dans la colonne de gauche, sous le héros —
// pas sur la carte du profil : c'est là qu'on décide de sa soirée.
const menuJouer = pageCode.split('<main className="rpg-mode-menu__play">')[1]?.split('</main>')[0] ?? '';
assert.ok(menuJouer.includes('<RpgPisteGains'), 'la piste est montée sur l’écran Jouer');
const branchePiste = pageCode.split('<RpgPisteGains')[1]?.split('/>')[0] ?? '';
for (const prop of ['profil={profil}', 'paquetsEnAttente={paquetsDePalierEnAttente}',
  'onChoisirCadre={onChoisirCadre}', 'onChoisirTitre={onChoisirTitre}', 'onPlaySfx={play}']) {
  assert.ok(branchePiste.includes(prop), `la piste reçoit ${prop}`);
}
assert.match(branchePiste, /onOuvrirSouk=\{\(\) => \{ play\('menu'\); onChangeScreen\('souk'\); \}\}/,
  'et son bouton des paquets dus mène au Souk');

// 10. Tactile et mouvement : les règles reprises des autres écrans.
assert.match(css, /min-height: 44px/, 'les boutons font leur taille au doigt');
assert.ok(css.includes('@media (max-width: 640px)'), 'le téléphone a son palier');
assert.ok(css.includes('@media (max-width: 420px)'), 'et le portrait étroit aussi');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'le mouvement se coupe');
// Le sceau et les noms peints ont leurs règles : sans elles, le cachet tombe
// dans le flux sous le médaillon, et le nom de la table déborde de la tuile.
assert.match(css, /\.rpg-profil__tete \{[\s\S]{0,90}position: relative;/, 'le médaillon porte son sceau');
assert.match(css, /\.rpg-profil__cachet \{[\s\S]{0,260}position: absolute;/, 'et le sceau se pose à son coin');
assert.match(css, /\.rpg-profil__plateau-nom \{[\s\S]{0,500}-webkit-line-clamp: 2;/,
  'le nom de la table tient en deux lignes sur sa tuile');
assert.match(css, /\.rpg-profil__etiquette b \{/, 'l’étiquette écrit le nom du choix courant');
assert.ok((css.match(/prefers-reduced-motion: reduce/g) ?? []).length >= 2,
  'la barre et l’annonce se tiennent tranquilles pour qui le demande');

// 12. L'histoire de Bab El : un seuil au lancement du mode Histoire.
// Le décor a quitté Jouer — une présentation qu'on relit à chaque passage ne
// vaut pas un seuil qu'on franchit une fois — et il attend un nouveau joueur, au
// moment où il compte. « Nouveau » se **lit** dans la progression : rien n'est
// écrit pour s'en souvenir, donc commencer la campagne suffit à ne plus l'être,
// et « Plus tard » ramène le seuil la fois suivante.
assert.ok(!pageCode.includes('rpg-flux-menu'), 'le bloc « L’histoire · Bab El » a quitté l’écran Jouer');
assert.ok(!cssMana.includes('rpg-flux-menu'), 'et ses règles sont parties avec lui');
assert.match(pageCode, /const lectureHistoire = ecran === 'recit' \|\| ecran === 'journal' \|\| ecran === 'bab-el';/,
  'le seuil est un écran de lecture, de la famille du récit et du journal');
assert.match(pageCode, /const nouveauJoueurHistoire = !progressionHistoire\?\.recit/,
  '« nouveau joueur » se lit dans la progression');
assert.match(pageCode, /\(progressionHistoire\?\.etagesVaincus\?\.length \?\? 0\) === 0;/,
  'ni récit en cours, ni étage déblayé');
assert.match(pageCode, /if \(nouveauJoueurHistoire\) \{[\s\S]{0,240}setEcran\('bab-el'\);/,
  'lancer le mode Histoire ouvre le seuil avant le récit');
assert.match(pageCode, /const commencerCampagne = \(\) => \{\s*ouvrirRecit\(\);/,
  '« Commencer la campagne » écrit le récit : le seuil ne revient plus');
assert.match(pageCode, /\{ecran === 'bab-el' \? \(\s*<RpgStoryBabEl/, 'le seuil est sa propre branche de rendu');
assert.match(pageCode, /const seuilHistoireVenuDe = useRef\('jouer'\);/,
  '« Plus tard » rend l’écran d’où l’on vient — noté à l’ouverture');
assert.match(pageCode, /seuilHistoireVenuDe\.current = ecran;/, 'au moment où le seuil s’ouvre');
assert.match(pageCode, /onPlusTard=\{\(\) => setEcran\(seuilHistoireVenuDe\.current\)\}/, 'pas un menu imposé');
// Le seuil lui-même : du texte, un keyart, deux boutons. Aucune règle, aucun
// état — la progression s'écrit dans la page, par `ouvrirRecit()`.
for (const interdit of ['localStorage', 'useState', 'useSablierBourse', 'fetch(', 'pisteDesGains', 'ouvrirRecit']) {
  assert.ok(!seuilCode.includes(interdit), `le seuil ne fait rien lui-même (${interdit})`);
}
assert.match(seuil, /import '\.\/rpg-story-bab-el\.css';/, 'il porte sa propre feuille de style');
for (const attendu of ['data-bab-el', 'data-bab-el-commencer', 'data-bab-el-plus-tard']) {
  assert.ok(seuilCode.includes(attendu), `le seuil est marqué pour les vérifications (${attendu})`);
}
assert.match(seuilCode, /commencerRef\.current\?\.focus\?\.\(\)/,
  '« Commencer la campagne » prend le focus : Entrée suffit');
assert.match(seuilCode, /'--bab-el-decor': `url\("\$\{BASE_URL\}sablier-story\/mode-histoire\.jpg"\)`/,
  'le keyart du mode Histoire arrive en fond, pas en `<img>`');
assert.match(seuilCode, /className="rpg-menu-button rpg-menu-button--primary"/,
  'les boutons sont ceux du menu — pas une seconde famille');
// Les deux paragraphes d'origine, mot pour mot : c'est le texte que le joueur
// lisait sur Jouer, pas un résumé écrit pour l'occasion.
for (const mot of ['Bab El', 'l’Astrolabe', 'la Liste', 'Salem', 'Yamina', 'douze survivants',
  'portail de Bab El']) {
  assert.ok(seuil.includes(mot), `le seuil raconte ${mot}`);
}
assert.ok(seuil.split('\n').length < 130, `le seuil reste un écran de texte (${seuil.split('\n').length} lignes)`);
assert.ok(existsSync(new URL('../public/sablier-story/mode-histoire.jpg', import.meta.url)), 'le keyart existe');
assert.match(cssSeuil, /\.rpg-bab-el \{[\s\S]{0,400}background-image: var\(--bab-el-decor, none\);/,
  'le décor se peint en fond');
assert.match(cssSeuil, /background-size: cover;/, 'il couvre l’écran');
assert.match(cssSeuil, /\.rpg-bab-el__voile \{/, 'un voile garde le texte lisible par-dessus');
assert.match(cssSeuil, /\.rpg-bab-el__carte \{/, 'et le texte a sa carte');
assert.match(cssSeuil, /@media \(max-width: 640px\)/, 'le seuil a son palier téléphone');
assert.match(cssSeuil, /@media \(prefers-reduced-motion: reduce\)/, 'et se tient tranquille pour qui le demande');

console.log('Le profil du Sablier est branché : un onglet Profil dans le menu, et une carte');
console.log('dépouillée — le pseudo, le niveau, la barre et sa lecture, trois gestes (douze');
console.log('visages du récit, six emblèmes, douze tables nommées plus « au gré du deck »),');
console.log('une ligne quand un paquet attend, et ce qui est déjà gagné : un cadre peint');
console.log('autour du médaillon, un titre écrit sous le pseudo.');
console.log('La **piste des gains** vit sur l’écran Jouer, sous le héros : un chemin qui');
console.log('défile du niveau en cours jusqu’au prochain rang de Bab El, puis huit niveaux');
console.log('au-delà. Chaque palier dit ce qu’il rapporte, et **chaque niveau montre son');
console.log('paquet** — le dos de carte en miniature et son sachet quand le paquet est tout');
console.log('le gain, un sachet en coin quand un rang ou un cosmétique occupe la tuile. Des');
console.log('paquets dus ? Un bouton mène au Souk. Les cosmétiques gagnés se portent là, ou');
console.log('se reposent ; ce qui est gagné se calcule depuis l’XP — rien à réclamer, rien à');
console.log('tricher, et un gain verrouillé le reste.');
console.log('L’histoire de Bab El, elle, a quitté Jouer : elle attend un **nouveau joueur**');
console.log('au lancement du mode Histoire — ni récit en cours, ni étage déblayé — avec le');
console.log('keyart, les deux paragraphes d’origine, « Commencer la campagne » et « Plus');
console.log('tard », qui rend l’écran d’où l’on vient sans rien écrire.');
console.log('Ni compteurs, ni barème, ni journal : ces chiffres vivent dans `rpgProfil.js`');
console.log('et au Souk, pas ici. Les vignettes des visages et des tables (6 à 34 Ko,');
console.log('`tools/make-profil-vignettes.mjs`) coûtent moins qu’une peinture ; la piste');
console.log('n’ajoute qu’un dos de carte de 1,3 Ko — le reste est glyphes et dégradés.');
console.log('La table choisie peint la moitié du joueur — musique et décor 3D suivent — et');
console.log('le tutoriel garde la sienne. La barre monte vite au début puis devient');
console.log('gourmande, et chaque palier offre un paquet tiré au hasard parmi les rayons');
console.log('ouverts, sans un crédit dépensé, avec la pitié et les doublons d’un vrai');
console.log('paquet. La dette attend derrière une cérémonie déjà ouverte, se règle à la');
console.log('fermeture, et ne se réannonce pas en boucle.');
