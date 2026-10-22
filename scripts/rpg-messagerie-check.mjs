/**
 * Vérification « la messagerie dans le Sablier » — `npm run check:rpg-messagerie`.
 *
 * La messagerie Let’s Play est le canal des défis du duel en ligne : le salon
 * y dépose la carte « Défi du Sablier », et c’est elle qu’on ouvre pour lancer
 * ou relever un défi. Or le jeu est une couche plein écran (z-index 1500) qui
 * couvrait la fenêtre sociale (1250) : dans le Sablier, la messagerie
 * n’apparaissait pas — et sur mobile (APK, plein écran natif de la coque) elle
 * n’apparaît toujours pas en bas de l’écran. Elle vit donc **dans le jeu** :
 * son propre onglet au menu, un voile au-dessus de la table en pleine partie
 * et au-dessus du salon. Ce contrôle verrouille les cinq pièces :
 *
 *   1. la fenêtre sociale monte au-dessus du jeu sur les routes du Sablier
 *      seulement (`social-dock--sablier`), en restant sous les appels — le
 *      parcours bureau, inchangé ;
 *   2. le menu principal donne à la messagerie **son onglet** (pastille des
 *      non-lus comprise), et cet onglet rend le panneau du jeu
 *      (`RpgMessageriePanel.jsx`) ;
 *   3. la barre du duel et le salon en ligne ouvrent ce même panneau en voile
 *      (`onOuvrir`) : un défi se lit sans quitter la table ni démonter le
 *      salon ;
 *   4. le panneau réutilise les composants de la messagerie du site
 *      (`InboxView` / `ThreadView`) et garde le thème sombre du jeu.
 *
 * Le rendu réel du menu et du voile est couvert par
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
const panneau = lire('../src/games/RpgMessageriePanel.jsx');
const panneauCss = lire('../src/games/rpg-messagerie-panel.css');

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
assert.match(socialDock, /const dockVisible = !onSocialRoute && !\(onSablierRoute && isMobile\);/,
  'sur téléphone, dans le jeu, le lanceur flottant s’efface : la messagerie y a son onglet et son voile');

/* ── 3. La messagerie a son onglet dans le menu du jeu ─────────────────────── */

assert.match(duelPage, /className=\{`rpg-mode-menu__messagerie\$\{screen === 'messagerie' \? ' is-active' : ''\}`\}/,
  'le menu principal du Sablier donne à la messagerie son onglet, dans la barre des modes');
assert.match(duelPage, /onChangeScreen\('messagerie'\)/,
  'l’onglet Messagerie mène à son propre écran');
assert.match(duelPage, /<RpgMessageriePanel\s+variante="ecran"/,
  'l’écran de l’onglet est le panneau de messagerie du jeu');
assert.match(duelPage, /data-rpg-messagerie-onglet=\{messageriePastille\}/,
  'l’onglet porte la pastille des non-lus (repère de test compris)');
// L’onglet doit SE LIRE : la barre des modes est écrite pour six onglets, et
// le huitième restait peint hors de l’écran (701 – 1100 px) ou réduit à une
// bulle anonyme (≤ 560 px). Deux garde-fous, un par palier.
assert.doesNotMatch(battleCss, /rpg-mode-menu__messagerie \.rpg-mode-menu__onglet-libelle \{ display: none/,
  'l’onglet Messagerie garde son mot « Messagerie » même au plus petit format');
assert.match(battleCss, /@media \(min-width: 701px\) and \(max-width: 1100px\) \{[\s\S]{0,700}?\.rpg-mode-menu__switch \{[\s\S]{0,500}?flex-wrap: wrap;/,
  'en paysage et sur petite tablette, la barre d’onglets passe à la ligne : le huitième onglet n’est plus coupé hors de l’écran');
assert.match(battleCss, /@media \(max-width: 560px\) \{[\s\S]{0,800}?rpg-mode-menu__messagerie \.rpg-mode-menu__onglet-libelle \{\s*font-size: 8px;/,
  'sur un téléphone de 320 px, le mot « Messagerie » tient quand même sur l’onglet');
assert.match(duelPage, /useMessages\(\)/, 'le menu lit la messagerie du site pour sa pastille');
assert.match(duelPage, /useFriends\(\)/, 'le menu lit aussi les demandes d’amis pour sa pastille');
// Plus de bouton dans l’en-tête du menu : l’onglet le remplace.
assert.doesNotMatch(duelPage, /<RpgMessagerieBouton\s+variante="menu"/,
  'l’en-tête du menu ne double plus l’onglet : la messagerie a sa place, et une seule');

/* ── 4. Le voile au-dessus de la table et du salon ─────────────────────────── */

assert.match(duelPage, /<RpgMessagerieBouton\s+variante="duel"[\s\S]{0,200}onOuvrir=\{\(\) => setMessagerieVoletOuvert\(true\)\}/,
  'la barre du duel ouvre le panneau de messagerie du jeu en pleine partie');
assert.match(duelPage, /messagerieVoletOuvert && \([\s\S]{0,120}<RpgMessageriePanel\s+variante="volet"/,
  'le voile se rend par-dessus la table quand la messagerie est ouverte en partie');
assert.match(salon, /<RpgMessagerieBouton variante="salon" onOuvrir=/,
  'le salon du duel en ligne ouvre le panneau de messagerie du jeu');
assert.match(salon, /messagerieOuverte && \([\s\S]{0,120}<RpgMessageriePanel\s+variante="volet"/,
  'le voile se rend par-dessus le salon quand la messagerie y est ouverte');
assert.match(salon, /import RpgMessageriePanel from '\.\/RpgMessageriePanel\.jsx';/,
  'le panneau utilisé par le salon est importé (pas de ReferenceError au chargement)');
assert.match(salon, /className="rpg-pvp-page__outils"/,
  'le bouton du salon vit dans le liseré, à côté du code du défi');

/* ── 5. Le bouton et le panneau ─────────────────────────────────────────────── */

assert.match(bouton, /onOuvrir/, 'le bouton sait ouvrir la messagerie du jeu (gestionnaire `onOuvrir`)');
assert.match(bouton, /if \(onOuvrir\) \{ onOuvrir\(\); return; \}/,
  'avec `onOuvrir`, le clic ouvre le panneau du jeu et rien d’autre');
assert.match(bouton, /useMessages\(\)/, 'le bouton lit la messagerie du site');
assert.match(bouton, /unreadTotal/, 'la pastille compte les messages non lus');
assert.match(bouton, /pendingCount/, 'la pastille signale aussi les demandes d’amis');
assert.match(bouton, /openInbox\?\.\(\)/,
  'sans `onOuvrir`, le clic ouvre la messagerie comme partout sur le site (fenêtre sociale, ou page sur mobile)');
assert.match(bouton, /lancer ou recevoir un défi du Sablier/,
  'le bouton dit à quoi il sert : lancer et recevoir les défis');
assert.match(bouton, /href=\{`[^`]*messages`\}/,
  'sans compte ni `onOuvrir`, le bouton mène à la page de messagerie (connexion), sans routeur');
assert.match(bouton, /nativeFullscreenElement\(\)[\s\S]{0,200}!== document\.documentElement[\s\S]{0,120}exitNativeFullscreen\(\)/,
  'en plein écran natif de la coque du jeu, le clic rend d’abord le plein écran : la fenêtre sociale serait sinon invisible');

assert.match(panneau, /import \{ InboxView, ThreadView \} from '\.\.\/messages\/MessagesTabs\.jsx';/,
  'le panneau réutilise la liste et le fil de la messagerie du site (aucune logique dupliquée)');
assert.match(panneau, /useMessages\(\)/, 'le panneau lit la messagerie du site');
assert.match(panneau, /useFriends\(\)/, 'le panneau lit le module amis du site');
assert.match(panneau, /useCalls\(\)/, 'le panneau garde les appels de la messagerie du site');
assert.match(panneau, /viewThread\(peerId\)/, 'le fil lu dans le jeu fait taire le « ding » des messages reçus');
assert.match(panneau, /markRead\(peerId\)/, 'une discussion ouverte passe ses messages en lus');
assert.match(panneau, /useContext\(AuthContext\)/, 'le panneau lit le compte sans routeur (la page du jeu se monte hors `<BrowserRouter>`)');

// La coque du panneau force le thème sombre du site : la table est nocturne
// même quand le joueur est en thème clair, et `messages.css` / `social.css`
// lisent ces variables.
assert.match(panneauCss, /\.rpg-messagerie \{[\s\S]{0,220}--ink: #eef0ff;/,
  'le panneau repose le thème sombre du site sur lui-même');
assert.match(panneauCss, /\.rpg-messagerie--volet \{[\s\S]{0,140}z-index: 3100;/,
  'le voile passe au-dessus de tout le HUD de la table');
const zHudMax = Math.max(...[...battleCss.matchAll(/z-index:\s*(\d+);/g)].map((m) => Number(m[1])));
assert.ok(3100 > zHudMax, `le voile (3100) domine la table (z-index max ${zHudMax})`);

console.log('check:rpg-messagerie ✓ — dans le Sablier, la messagerie vit dans le jeu : son onglet au menu, son voile sur la table et sur le salon (la fenêtre sociale du site reste le parcours bureau, au-dessus du jeu et sous les appels).');
