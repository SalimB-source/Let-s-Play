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
assert.match(battlePage, /setMulligan\(rpgPeutMulligan\(duelRef\.current, 'joueur'\)[\s\S]*?\{ etape: 'choix', choix: new Set\(\)[\s\S]*?: null\)/,
  'nouvelle partie : le volet s’ouvre sur la main de départ, et jamais sur une main vide');
assert.match(battlePage, /inert=\{viewport\.portrait \|\| mulliganOuvert \? true : undefined\}/,
  'la table est rendue inerte tant que le mulligan n’est pas validé');
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
assert.match(mulliganPanel, /onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/,
  'une carte déjà en grand ne réclame pas l’aperçu par appui long');
assert.match(mulliganPanel, /aria-pressed=\{selectionnee\}/,
  'le choix d’une carte est rendu accessible (bouton pressé ou non)');
assert.doesNotMatch(mulliganPanel, /HoverCardPreview|onMouseEnter/,
  'le mulligan n’attend pas un survol : tout est écrit sur la carte, au doigt comme à la souris');

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

// ── La feuille : les cartes sont lues en grand, sur tous les formats ────────
assert.match(battleCss, /\.rpg-mulligan\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*1150;/s,
  'le volet est posé sur la table, sous l’écran de rotation et l’aperçu au doigt');
assert.match(battleCss, /\.rpg-mulligan__panel\s*\{[^}]*max-height:\s*100%;/s,
  'le volet ne dépasse jamais la hauteur d’écran');
assert.match(battleCss, /\.rpg-mulligan__cards\s*\{[^}]*grid-auto-flow:\s*column;[^}]*grid-auto-columns:\s*min\(calc\(\(48dvh[^}]*\/ ?\.8\), calc\(\(100vw[^}]*\/ 5\)\);/s,
  'une carte de mulligan est plafonnée en largeur PAR LA HAUTEUR ET PAR LA LARGEUR : ni débordement, ni vignette');
assert.match(battleCss, /\.rpg-mulligan__face\s*\{[^}]*aspect-ratio:\s*4 \/ 5;/s,
  'l’illustration garde le ratio 4/5 d’une carte du jeu, en grand');
assert.match(battleCss, /\.rpg-mulligan__card\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\)[^}]*\}/s,
  'l’illustration occupe toute la place disponible au-dessus du texte : la carte se lit en grand');
assert.match(battleCss, /\.rpg-mulligan__face\s*>\s*img\s*\{[^}]*object-fit:\s*cover;/s,
  'l’illustration remplit la carte sans déformer');
assert.match(battleCss, /\.rpg-mulligan__name\s*\{[^}]*font:\s*800 clamp\(/s,
  'le nom est composé à une taille lisible, réglée sur la hauteur utile');
assert.match(battleCss, /\.rpg-mulligan__rules\s*\{[^}]*-webkit-line-clamp:\s*4;/s,
  'les règles tiennent sous l’illustration, sans jamais déborder de la carte');
assert.match(battleCss, /\.rpg-mulligan__card\.is-selected\s*\{[^}]*border-color:\s*#ffd619;/s,
  'une carte choisie prend le liseré doré du jeu');
assert.match(battleCss, /@keyframes rpg-mulligan-new/,
  'les cartes qui entrent en main à l’étape du résultat ont leur propre entrée');
assert.match(battleCss, /@media \(max-height: 480px\) \{[\s\S]*?\.rpg-mulligan__rules\s*\{\s*-webkit-line-clamp:\s*2;/,
  'sur téléphone en paysage, le texte se replie et l’illustration garde la place');
assert.match(`${battleCss}\n${mobileCss}`, /\.rpg-mulligan__valider[^{]*\{[^}]*min-height:\s*44px;/s,
  'les commandes du volet gardent une taille tactile');

console.log('✓ Mulligan du Sablier : main de départ en grand, choix des cartes, échange contre le paquet battu, nouvelle main relue, table rendue ensuite');
