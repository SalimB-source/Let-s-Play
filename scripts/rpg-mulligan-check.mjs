// Vérification du mulligan du Sablier : le volet qui ouvre chaque duel (main de
// départ en grand, choix des cartes à changer, échange contre le paquet, puis
// table rendue) — rendu jsdom réel plus lectures du source et de la feuille.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Sonde de test : la page expose l'état du moteur pour que le scénario compare
// l'affiché et la vérité du duel. Le jeu n'est pas modifié, l'ajout n'existe
// que dans ce build de test (même procédé que scripts/rpg-ghost-check.mjs).
const sonde = {
  name: 'rpg-duel-probe',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('RpgDuelPage.jsx')) return null;
    const ancre = '  const duel = duelRef.current;';
    if (!code.includes(ancre)) throw new Error('ancre de sonde introuvable dans RpgDuelPage.jsx');
    return code.replace(ancre, `${ancre}\n  if (typeof window !== 'undefined') window.__RPG_DUEL__ = duel;`);
  },
};

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  plugins: [sonde],
  build: { ssr: 'scripts/rpg-mulligan-smoke.jsx', outDir: 'node_modules/.cache/rpg-mulligan', emptyOutDir: true },
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

try {
  const { checkRpgMulligan } = await import('../node_modules/.cache/rpg-mulligan/rpg-mulligan-smoke.js');
  await checkRpgMulligan(assert);
} finally {
  dom.window.close();
}

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const duelEngine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const aiBrain = readFileSync(new URL('../src/games/rpgAI.js', import.meta.url), 'utf8');
const mulliganPanel = battlePage.slice(battlePage.indexOf('function CarteMulligan('), battlePage.indexOf('function ConfirmationSort('));
assert.ok(mulliganPanel.length > 400 && mulliganPanel.includes('VoletMulligan'),
  'le volet du mulligan est un composant dédié, entre l’aperçu au doigt et la confirmation de sort');

// ── Le volet est une étape du jeu, pas une couche décorative ────────────────
assert.match(battlePage, /setMulligan\(!modeTutoriel && rpgPeutMulligan\(duelRef\.current, 'joueur'\)[\s\S]*?\{ etape: 'choix', choix: new Set\(\)[\s\S]*?: null\)/,
  'les duels libres ouvrent le mulligan sur la main de départ, mais le tutoriel garde sa main guidée');
assert.match(battlePage, /inert=\{viewport\.portrait \|\| mulliganOuvert \|\| choixManaEssaiOuvert \|\| sacrificeDemande \? true : undefined\}/,
  'la table est inerte tant que le mulligan, le choix du mana d’essai ou la fenêtre du sacrifice n’est pas validé');
assert.match(battlePage, /const mulliganOuvert = Boolean\(mulligan\);/,
  'une seule source de vérité pour « le mulligan tient la table »');
assert.match(battlePage, /const peutJouerCarte = \(carte\) => \{[\s\S]{0,240}?if \(mulliganOuvert\) return false;/,
  'aucune carte ne devient jouable pendant la lecture de la main de départ');
assert.match(battlePage, /if \(!monTour \|\| combatEntrant \|\| mulliganOuvert\) \{ jouerSfx\('erreur'\); return; \}/,
  'rendre le tour pendant le mulligan est refusé, pas seulement désactivé');
assert.match(battlePage, /if \(\(!monTour && !reponseActive\) \|\| mulliganOuvert\)/,
  'engager un terrain pendant le mulligan est refusé aussi');
assert.match(battlePage, /const \{ ecartees, piochees \} = rpgMulligan\(duelCourant, 'joueur', \[\.\.\.mulligan\.choix\], rng\)/,
  'le volet passe les indices choisis au moteur, qui seul décide de l’échange');
assert.match(battlePage, /const adverse = rpgMulliganSorcier\(duelCourant, rng\);/,
  'le sorcier use du même droit au même moment');
assert.match(battlePage, /etape: 'resultat'[\s\S]*?nouveau: piochees\.map/,
  'après l’échange, le volet reste ouvert sur la nouvelle main et signale ce qui entre');
// ── Le moteur : un échange, pas une perte de cartes ─────────────────────────
assert.match(duelEngine, /mulliganFait: \{ joueur: false, sorcier: false \}/,
  'le duel naît avec un droit à l’échange pour chaque camp');
assert.match(duelEngine, /duel\.mainDepart = \{ joueur: duel\.joueur\.main\.length, sorcier: duel\.sorcier\.main\.length \}/,
  'la main de départ est consignée : c’est le témoin de la légalité du mulligan');
assert.match(duelEngine, /if \(duel\[cote\]\.main\.length !== \(duel\.mainDepart\?\.\[cote\] \?\? 0\)\) return false;/,
  'dès que la main n’est plus la main de départ, le volet ne peut plus s’ouvrir');
assert.match(duelEngine, /camp\.deck = melangerDeck\(\[\.\.\.camp\.deck, \.\.\.ecartees\], rng\)/,
  'les cartes écartées sont rebattues dans le paquet, jamais remises en pile au-dessus');
assert.match(duelEngine, /for \(let i = 0; i < ecartees\.length; i \+= 1\) \{[\s\S]*?rpgPiocher\(duel, cote\)/,
  'on pioche autant de cartes qu’on en a écartées');
assert.match(duelEngine, /if \(!camp \|\| !rpgPeutMulligan\(duel, cote\)\) return \{ ok: false, ecartees: \[\], piochees: \[\] \}/,
  'un échange refusé ne touche à rien (ni main, ni paquet, ni journal)');
assert.match(aiBrain, /export function choisirMulliganIA\(duel, cote = 'sorcier', options = \{\}\)/,
  'l’IA a sa propre lecture de sa main de départ');
assert.match(aiBrain, /if \(main\.length < 2 \|\| profil\.niveau === 'recit'\) return \[\];/,
  'niveau Récit, le sorcier ne renvoie jamais sa main');
assert.match(aiBrain, /if \(!terrains\.length\) return autres;/,
  'une main sans terrain est renvoyée au paquet');

// ── La feuille : des faces 4:5 nues, l'aperçu rapide pour tout lire ────────
assert.match(battleCss, /\.rpg-mulligan\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*1150;/s,
  'le volet est posé sur la table, sous l’écran de rotation et l’aperçu au doigt');
assert.match(battleCss, /\.rpg-mulligan__panel\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;[^}]*height:\s*min\(100%,\s*\d+px\);/s,
  'le volet tient une hauteur définie : la rangée de cartes reçoit une place mesurable');
assert.match(battlePage, /rpg-mulligan__stage"[\s\S]{0,400}?rpg-mulligan__cards"/,
  'la rangée de cartes vit dans sa scène — c’est elle que la feuille mesure');
assert.match(battleCss, /\.rpg-mulligan__stage\s*\{[^}]*container-type:\s*size;/s,
  'la scène est le conteneur des requêtes de taille : les cartes se règlent sur le volet, pas sur la fenêtre');
assert.match(battleCss, /\.rpg-mulligan__stage\s*\{[^}]*min-height:\s*0;/s,
  'la scène suit la hauteur du volet au lieu de la dicter');

const cardsRule = battleCss.slice(battleCss.indexOf('.rpg-mulligan__cards {'), battleCss.indexOf('.rpg-mulligan__card {'));
assert.match(cardsRule, /grid-auto-flow:\s*column;/,
  'la main est une seule rangée — jamais une grille de deux colonnes');
assert.match(cardsRule, /grid-auto-columns:[^;]*100cqh[^;]*\*\s*\.8\)[^;]*;/,
  'une face 4:5 se plafonne par la hauteur utile du volet moins ce que la carte garde autour d’elle');
assert.match(cardsRule, /grid-auto-columns:[^;]*100cqw[^;]*\/\s*5\)[^;]*;/,
  'et une seconde fois par le cinquième de la largeur utile : cinq cartes, quatre gouttières, rien de coupé');
assert.match(cardsRule, /gap:\s*var\(--rpg-mulligan-gap\);/,
  'la gouttière entre les cartes vient de la même variable que le calcul de leur taille');
assert.doesNotMatch(cardsRule, /overflow:\s*(auto|scroll)/,
  'la rangée ne défile jamais : les cinq cartes sont toutes visibles d’un coup');
assert.doesNotMatch(cardsRule, /grid-template-columns/,
  'aucun repli en grille de deux colonnes qui défile');

// ── La carte : la face 4:5 du jeu, et pas un mot dessus ────────────────────
const cardRule = battleCss.slice(battleCss.indexOf('.rpg-mulligan__card {'), battleCss.indexOf('.rpg-mulligan__img {'));
assert.match(cardRule, /aspect-ratio:\s*4 \/ 5;/,
  'une carte du mulligan est au format 4:5, celui du jeu');
assert.match(cardRule, /container-type:\s*inline-size;/,
  'la carte est son propre conteneur : ses repères se règlent sur sa largeur');
assert.match(cardRule, /overflow:\s*hidden;/,
  'l’illustration est tenue dans le cadre de la carte');
assert.match(battleCss, /\.rpg-mulligan__img\s*\{[^}]*object-fit:\s*cover;/s,
  'l’illustration remplit la face sans déformer');
assert.match(battleCss, /\.rpg-mulligan__card\s*\{[^}]*--rpg-card-marker-size:\s*clamp\([^;]*cqw/s,
  'le badge d’élément se dimensionne sur la largeur de la carte');
assert.match(battleCss, /\.rpg-mulligan__card\s+\.rpg-card-element-badge\s*\{[^}]*--rpg-card-element-marker-top:\s*5%;[^}]*--rpg-card-element-marker-left:\s*6%;/s,
  'la couleur de la carte est en haut à gauche, comme sur les cartes du jeu');
assert.doesNotMatch(battleCss, /\.rpg-mulligan__card\s+\.rpg-card-element-badge\s*\{[^}]*bottom:/s,
  'la couleur n’est plus en bas de la carte');
assert.match(battleCss, /\.rpg-mulligan__card\s+\.rpg-mana-cost\s*\{[^}]*position:\s*absolute;[^}]*top:\s*var\(--rpg-card-element-marker-top,\s*5%\);[^}]*right:\s*var\(--rpg-card-element-marker-left,\s*6%\);[^}]*aspect-ratio:\s*1;[^}]*padding:\s*0;[^}]*border-radius:\s*50%;/s,
  'le coût est posé en haut à droite de l’illustration dans un bloc bien rond, à la taille de la carte');
assert.doesNotMatch(battleCss, /\.rpg-mulligan__card\s+\.rpg-mana-cost\s*\{[^}]*left:/s,
  'le coût a quitté le coin gauche');
assert.match(battlePage, /rpg-mulligan__stats"[\s\S]{0,200}?rpg-card__stat--atk"><CardStatIcon type="attack" \/><span className="rpg-stat-value">\{carte\.atk\}<\/span>/,
  'l’attaque porte la plaque du jeu : l’épée dessinée et le chiffre');
assert.match(battlePage, /rpg-card__pt"><CardStatIcon type="defense" \/><span className="rpg-stat-value">\{carte\.def\}<\/span>/,
  'la défense porte la plaque du jeu : le bouclier dessiné et le chiffre');
assert.doesNotMatch(mulliganPanel, /⚔|🛡/,
  'plus d’emoji ⚔/🛡 : l’attaque et la défense se lisent comme sur les cartes en jeu');
assert.match(battleCss, /\.rpg-hover-card-preview__face \.rpg-card__foot,\s*\.rpg-mulligan__card \.rpg-card__foot,\s*\.rpg-mulligan__stats\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s,
  'les deux plaques du mulligan partagent la même grille que la face de l’aperçu');
assert.match(battleCss, /\.rpg-hover-card-preview__face \.rpg-card__stat--atk,\s*\.rpg-hover-card-preview__face \.rpg-card__pt,\s*\.rpg-mulligan__card \.rpg-card__stat--atk,\s*\.rpg-mulligan__card \.rpg-card__pt\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.68\);[^}]*font:\s*900 calc\(var\(--rpg-card-marker-size,\s*38px\) \* \.62\)\/1\.15 Georgia, serif;/s,
  'les plaques ATQ/DÉF de l’aperçu et du mulligan reprennent le noir translucide du jeu');
assert.match(battleCss, /\.rpg-mulligan__card\.is-selected\s*\{[^}]*--rpg-frame-gradient:\s*linear-gradient\(#ffd619,\s*#ffd619\);/s,
  'une carte mise de côté repeint son cadre orné en or, sans masquer son illustration');
assert.match(battleCss, /@keyframes rpg-mulligan-new/,
  'les cartes qui entrent en main à l’étape du résultat ont leur propre entrée');
assert.doesNotMatch(battleCss, /\.rpg-mulligan__(name|rules|flag|banner|top|bas|type)\b/,
  'plus un bloc de texte encombrant sur les cartes : la face du mulligan est identique à celle de l’aperçu');
assert.match(battlePage, /<SortSceau carte=\{carte\} className="rpg-mulligan__sceau rpg-mulligan__sort" \/>/,
  'les sorts du mulligan portent le même sceau aligné que l’aperçu');

// ── Pas d'aperçu rapide au survol dans le mulligan ──────────────────────────
assert.doesNotMatch(mulliganPanel, /onMouseEnter=|onMouseLeave=|HoverCardPreview/,
  'le survol d’une carte du mulligan n’ouvre plus d’aperçu rapide');
assert.match(battlePage, /\{apercuSurvol && !mulligan && !apercuAnnonceOuvert && \(/,
  'la table n’ouvre aucun aperçu rapide tant que le mulligan est ouvert');
assert.doesNotMatch(mulliganPanel, /aria-hidden="true">\s*\{(effets|nouvelle)/,
  'aucun texte d’effet ni drapeau d’état n’est rendu sur la carte');
assert.match(mulliganPanel, /aria-pressed=\{selectionnee\}/,
  'le choix d’une carte est rendu accessible (bouton pressé ou non)');
assert.match(mulliganPanel, /aria-label=\{`\$\{carte\.name\} — \$\{cardFaceTypeLine\(carte\)\}/,
  'la carte nue reste décrite pour les lecteurs d’écran : nom, type, coût, effets');
assert.doesNotMatch(mulliganPanel, /onPointerDown=/,
  'la carte ne barre plus la route à l’appui long : au doigt, l’aperçu s’ouvre par le geste du jeu');

// ── Le contrat de place : ce qui reste autour de la face est réservé ───────
assert.match(battleCss, /--rpg-mulligan-text:\s*\d+px;/,
  'ce que la carte garde autour de sa face est réservé dans le calcul de sa taille');
assert.match(battleCss, /@media \(max-height: 480px\) \{[\s\S]{0,400}?\.rpg-mulligan__head p\s*\{/,
  'sur téléphone en paysage, la phrase d’explication se replie — la main garde la place');
assert.match(battleCss, /@media \(max-width: 620px\) \{[\s\S]{0,400}?\.rpg-mulligan__head p\s*\{/,
  'sur écran étroit, la même rangée de cinq, avec l’explication repliée');
assert.match(`${battleCss}\n${mobileCss}`, /\.rpg-mulligan__valider[^{]*\{[^}]*min-height:\s*44px;/s,
  'les commandes du volet gardent une taille tactile');
assert.match(mobileCss, /\.rpg-battle--touch \.rpg-mulligan__card:not\(\.is-selected\):hover \{ transform: none; box-shadow: none; \}/,
  'au doigt, le survol ne soulève rien — et le liseré doré d’une carte choisie reste intact');

console.log('✓ Mulligan du Sablier : trois cartes 4:5 sans ligne de type — couleur en haut à gauche, coût en haut à droite, plaques ATQ/DÉF comme dans le jeu — toutes visibles d’un seul coup, échange contre le paquet battu et nouvelle main relue avant de rendre la table');
