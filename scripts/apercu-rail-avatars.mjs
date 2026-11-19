// Régénère `docs/apercu-rail-avatars.html` : le vrai plateau, avec les vraies
// feuilles de style, rendu hors navigateur (jsdom + React) puis figé en HTML.
// Sert d'aperçu quand aucun navigateur n'est disponible pour la capture.
//   node scripts/apercu-rail-avatars.mjs
// Le rail d'avatars s'active par requête média : ouvrir la page dans une
// fenêtre d'au moins 900 px de large, à la souris.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
const globals = {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
};
Object.assign(globalThis, globals);
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
try {
  const { default: Page } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
  const { rpgNouveauDuel, rpgJouerCreature } = await server.ssrLoadModule('/src/games/rpgDuel.js');
  const { RPG_MODE_MANA_ESSAI } = await server.ssrLoadModule('/src/games/rpgManaEssai.js');
  const { RPG_ELEMENTS } = await server.ssrLoadModule('/src/games/rpgCards.js');

  // Des cartes à coût 3 ou moins : la démonstration ne paie aucun sacrifice.
  const joueurFond = ['tislit-des-aures', 'guetteur-du-beffroi', 'scalde-des-runes', 'pretre-de-la-bouche'];
  // Cinq corps à corps devant : `bouchra-guerriere-des-cretes` porte l'Attaque
  // ciblée, elle se range donc au fond avec les tireuses.
  const joueurFront = ['viking-des-neiges', 'gerboise-des-ruines', 'sentinelle-du-brasier',
    'guerrier-au-bouclier-rond', 'chien-du-guet'];
  const ennemiFront = ['berserk-des-trois-hivers', 'gardien-viking-du-fjord', 'garde-du-trone-givre'];
  const ennemiFond = ['ashigaru-des-braises', 'guetteur-du-beffroi'];

  const duel = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, pvp: true,
    lignes: true,
  });
  if (duel.lignes !== true) throw new Error('la fabrique n’a pas gardé le drapeau des lignes');
  duel.mulliganFait = { joueur: true, sorcier: true };
  duel.manaEssaiDemarre = true;
  for (const camp of ['joueur', 'sorcier']) duel[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  const poser = (camp, ids) => {
    for (const id of ids) {
      duel[camp].invocationNormaleJouee = false;
      duel[camp].main = [id];
      const r = rpgJouerCreature(duel, camp, id);
      if (!r.ok) throw new Error(`${id} refusé : ${r.raison}`);
    }
  };
  duel.tour = 'joueur';
  poser('joueur', joueurFond);
  poser('joueur', joueurFront);
  duel.tour = 'sorcier';
  poser('sorcier', ennemiFond);
  poser('sorcier', ennemiFront);
  duel.tour = 'joueur';
  duel.joueur.main = ['archere-viking-du-givre', 'ronin-du-soleil-rouge', 'daimyo-du-soleil-rouge'];
  duel.sorcier.main = ['valkyrie-au-corbeau'];

  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Page, {
    pvp: { vue: duel, seq: 1, onIntention: async () => ({ ok: true }), onQuitter() {}, onAbandon() {} },
  })));
  const battle = document.querySelector('.rpg-battle');
  const html = battle.outerHTML.replaceAll('src="/', 'src="../public/');
  const feuilles = ['rpg-battle', 'rpg-relief-visuel', 'rpg-mobile', 'rpg-story', 'rpg-deckbox',
    'rpg-mana-essai', 'rpg-soins', 'rpg-vie-compteurs', 'rpg-avatars-plateau', 'rpg-bouclier',
    'rpg-cadre-carte', 'effet-icons'];
  // La feuille globale d'abord : c'est elle qui pose `* { box-sizing: border-box }`,
  // sans quoi les cartes de l'aperçu seraient plus grandes que dans le jeu.
  const liens = ['  <link rel="stylesheet" href="../src/styles.css">',
    ...feuilles.map((nom) => `  <link rel="stylesheet" href="../src/games/${nom}.css">`)].join('\n');
  const page = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Le Sablier — le rail d'avatars à gauche</title>
${liens}
  <style>
    html, body { margin: 0; height: 100%; background: #0b0805; overflow: hidden; }
    .rpg-battle { position: absolute; inset: 0; }
    /* Le bandeau de vérité : c'est le HTML rendu par la page, pas une maquette. */
    .apercu-note { position: absolute; z-index: 9999; left: 10px; bottom: 8px; padding: 6px 10px;
      border: 1px solid rgba(246,211,122,.35); border-radius: 8px; background: rgba(10,8,5,.82);
      color: #edd4a1; font: 11px/1.4 ui-monospace, monospace; pointer-events: none; }
  </style>
</head>
<body>
${html}
<p class="apercu-note">Plateau rendu par RpgDuelPage — rail d'avatars à gauche (portrait, nom, PV, mana).
  Visible au-dessus de 900 px, à la souris. Régénéré par <code>node scripts/apercu-rail-avatars.mjs</code>.</p>
</body>
</html>
`;
  await writeFile(new URL('../docs/apercu-rail-avatars.html', import.meta.url), page);
  console.log('docs/apercu-rail-avatars.html écrit —',
    document.querySelectorAll('.card-row .rpg-card').length, 'cartes,',
    document.querySelectorAll('.rpg-creature-slot').length, 'cases');
  await act(async () => root.unmount());
} finally {
  await server.close();
}
