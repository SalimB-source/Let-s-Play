/**
 * Vérification « la messagerie dans le Sablier » — `npm run check:rpg-messagerie`.
 *
 * La messagerie Let’s Play est le canal des défis du duel en ligne : le salon
 * y dépose la carte « Défi du Sablier », et c’est elle qu’on ouvre pour lancer
 * ou relever un défi. Or le jeu est une couche plein écran (z-index 1500) qui
 * couvrait la fenêtre sociale (1250) : dans le Sablier, la messagerie
 * n’apparaissait pas. Ce contrôle verrouille les trois pièces du correctif :
 *
 *   1. la fenêtre sociale monte au-dessus du jeu sur les routes du Sablier
 *      seulement (`social-dock--sablier`), en restant sous les appels ;
 *   2. les barres du jeu portent leur bouton « Messagerie » (menu principal,
 *      barre du duel, salon en ligne), avec la pastille des non-lus ;
 *   3. le bouton ouvre la messagerie du site et rend le plein écran natif de
 *      la coque du jeu quand il le faut (la fenêtre sociale vit hors de la
 *      coque : elle serait invisible derrière le sous-arbre plein écran).
 *
 * Le rendu réel des variantes « menu » et « duel » est couvert par
 * `scripts/rpg-duel-nav-smoke.jsx` (la page montée dans jsdom).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

const socialDock = lire('../src/social/SocialDock.jsx');
const socialCss = lire('../src/social/social.css');
const callsCss = lire('../src/messages/calls.css');
const battleCss = lire('../src/games/rpg-battle.css');
const pvpCss = lire('../src/games/rpg-pvp.css');
const bouton = lire('../src/games/RpgMessagerieBouton.jsx');
const duelPage = lire('../src/games/RpgDuelPage.jsx');
const salon = lire('../src/games/RpgPvpSalon.jsx');

/* ── 1. L’ordre des couches : jeu < fenêtre sociale (routes Sablier) < appels ── */

const zIndexDe = (css, selecteur) => {
  const bloc = css.match(new RegExp(`${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*z-index:\\s*(\\d+)`));
  assert.ok(bloc, `${selecteur} porte un z-index`);
  return Number(bloc[1]);
};

const zJeu = zIndexDe(battleCss, '.rpg-battle');
const zSalon = zIndexDe(pvpCss, '.rpg-pvp-page');
const zDock = zIndexDe(socialCss, '.social-dock');
const zDockSablier = zIndexDe(socialCss, '.social-dock--sablier');
const zAppels = Number(callsCss.match(/z-index:\s*(\d+);/)?.[1]);

assert.equal(zSalon, zJeu, 'le salon en ligne et le duel solo partagent la même couche plein écran');
assert.ok(zDock < zJeu, 'hors du Sablier, la fenêtre sociale garde sa couche habituelle, sous le jeu');
assert.ok(zDockSablier > zJeu, `dans le Sablier, la fenêtre sociale (${zDockSablier}) passe au-dessus du jeu (${zJeu})`);
assert.ok(zAppels > zDockSablier, `les appels (${zAppels}) restent au-dessus de la fenêtre sociale dans le jeu (${zDockSablier})`);

// La cascade réelle, telle que jsdom la calcule avec la vraie feuille.
const cascade = new JSDOM(`<!doctype html><html><head><style>${socialCss}</style></head><body>
  <div class="social-dock" id="site"></div>
  <div class="social-dock social-dock--sablier" id="sablier"></div>
</body></html>`);
const { document: docCascade, getComputedStyle } = cascade.window;
assert.equal(getComputedStyle(docCascade.getElementById('site')).zIndex, String(zDock),
  'sur le site, la fenêtre sociale garde son z-index d’origine');
assert.equal(getComputedStyle(docCascade.getElementById('sablier')).zIndex, String(zDockSablier),
  'dans le Sablier, la fenêtre sociale est calculée au-dessus de la couche du jeu');
cascade.window.close();

/* ── 2. La détection des routes du Sablier ───────────────────────────────────── */

assert.match(socialDock, /export function estRouteSablier\(pathname\)/,
  'SocialDock expose la détection des routes du Sablier');
const motif = socialDock.match(/return\s+(\/\^(?:\\.|[^/\n])+?\/)\.test\(pathname \|\| ''\)/);
assert.ok(motif, 'estRouteSablier teste le chemin avec un motif ancré');
// Le motif vient de notre propre source : on le rejoue contre les chemins réels.
const estRouteSablier = (pathname) => eval(motif[1]).test(pathname || ''); // eslint-disable-line no-eval
for (const chemin of ['/jeu/sablier-de-bab-el', '/jeu/sablier-de-bab-el/defi', '/jeu/sablier-de-bab-el/defi/AB12CD34']) {
  assert.equal(estRouteSablier(chemin), true, `${chemin} est une route du Sablier`);
}
for (const chemin of ['/jeu', '/jeu/mirage-rush', '/jeu/sablier-de-bab-el2', '/messages', '/', '']) {
  assert.equal(estRouteSablier(chemin), false, `${chemin || '(vide)'} n’est pas une route du Sablier`);
}
assert.match(socialDock, /onSablierRoute \? ' social-dock--sablier' : ''/,
  'la classe qui monte la fenêtre sociale n’est posée que sur les routes du Sablier');

/* ── 3. Le bouton « Messagerie » dans les barres du jeu ──────────────────────── */

assert.match(duelPage, /<RpgMessagerieBouton variante="menu"/,
  'le menu principal du Sablier porte le bouton Messagerie');
assert.match(duelPage, /<RpgMessagerieBouton\s+variante="duel"/,
  'la barre du duel porte le bouton Messagerie');
assert.match(salon, /<RpgMessagerieBouton variante="salon" \/>/,
  'le salon du duel en ligne porte le bouton Messagerie');
assert.match(salon, /import RpgMessagerieBouton from '\.\/RpgMessagerieBouton\.jsx';/,
  'le bouton Messagerie utilisé par le salon est importé (pas de ReferenceError au chargement)');
assert.match(salon, /className="rpg-pvp-page__outils"/,
  'le bouton du salon vit dans le liseré, à côté du code du défi');

assert.match(bouton, /useMessages\(\)/, 'le bouton lit la messagerie du site');
assert.match(bouton, /unreadTotal/, 'la pastille compte les messages non lus');
assert.match(bouton, /pendingCount/, 'la pastille signale aussi les demandes d’amis');
assert.match(bouton, /openInbox\?\.\(\)/,
  'le clic ouvre la messagerie comme partout sur le site (fenêtre sociale, ou page sur mobile)');
assert.match(bouton, /lancer ou recevoir un défi du Sablier/,
  'le bouton dit à quoi il sert : lancer et recevoir les défis');
assert.match(bouton, /href=\{`[^`]*messages`\}/,
  'sans compte, le bouton mène à la page de messagerie (connexion), sans routeur');
assert.match(bouton, /nativeFullscreenElement\(\)[\s\S]{0,200}!== document\.documentElement[\s\S]{0,120}exitNativeFullscreen\(\)/,
  'en plein écran natif de la coque du jeu, le clic rend d’abord le plein écran : la fenêtre sociale serait sinon invisible');

console.log('check:rpg-messagerie ✓ — dans le Sablier, la fenêtre sociale passe au-dessus du jeu (sous les appels) et les barres du menu, du duel et du salon portent le bouton Messagerie qui lance et reçoit les défis.');
