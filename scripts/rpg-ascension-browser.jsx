// Scènes de démonstration locales : aucun import dans le jeu publié.
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { RPG_RENDU_MOBA } from '../src/games/RpgDuelPage.jsx';
import RpgMobaBoard from '../src/games/RpgMobaBoard.jsx';
import { RPG_DECK_NEIGE_BASE, RPG_DECK_SOLEIL_ROUGE_BASE, cardById } from '../src/games/rpgCards.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgActionsEtat } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { installerDeckMaisonDeTest } from './rpg-duel-start.js';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'moba' ? 'moba' : 'duel';
const scenes = { dragon: 'Dragon Rouge', jarl: 'Jarl', 'jarl-furie': 'Jarl · Furie', scorpion: 'Scorpion', colosse: 'Colosse', 'soutiens-scorpion': 'Renforts · Scorpion', 'soutiens-colosse': 'Renforts · Colosse' };
const scene = Object.hasOwn(scenes, params.get('scene')) ? params.get('scene') : 'dragon';
const deck = scene.includes('scorpion') ? RPG_DECKS_THEMATIQUES.find(d => d.id === 'ascension-eclipse').cardIds
  : scene.includes('colosse') ? RPG_DECKS_THEMATIQUES.find(d => d.id === 'ascension-verre').cardIds
  : scene.startsWith('jarl') ? RPG_DECK_NEIGE_BASE : RPG_DECK_SOLEIL_ROUGE_BASE;
window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
installerDeckMaisonDeTest(deck);
const partie = mode === 'moba'
  ? rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 })
  : rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, modeMana: 'essai', rng: () => .5 });
partie.mulliganFait = { joueur: true, sorcier: true }; partie.manaEssaiDemarre = true;
for (const cote of ['joueur', 'sorcier']) { partie[cote].main = []; partie[cote].manaChoixEnAttente = null; }
function poser(cote, id, lane, slot) {
  let victimes = [];
  if (cardById(id).cost >= 5) victimes = [poser(cote, 'viking-des-neiges', lane, slot)];
  partie.tour = cote; partie[cote].invocationNormaleJouee = false;
  if (mode === 'moba') partie.moba.creaturesJouees[cote] = false;
  partie[cote].main.push(id);
  const options = { sacrificeIds: victimes.map(e => e.id) };
  const res = mode === 'moba' ? rpgMobaJouerCreature(partie, cote, id, lane, slot, options) : rpgJouerCreature(partie, cote, id, null, options);
  if (!res.ok) throw new Error(`Scène invalide : ${id}, ${res.raison}`);
  return res.entite;
}
if (scene === 'dragon') {
  poser('joueur', 'ronin-du-soleil-rouge', 'left', 0);
  poser('joueur', 'onna-musha-des-cendres', 'right', 1);
  poser('joueur', 'hatamoto-des-cendres', 'right', 0);
  poser('sorcier', 'ashigaru-des-braises', 'left', 0);
} else if (scene.startsWith('jarl')) {
  const a = poser('joueur', 'gardien-viking-du-fjord', 'left', 0);
  const b = poser('joueur', 'jarl-au-marteau-de-guerre', 'right', 1);
  if (scene === 'jarl-furie') {
    partie.tour = 'joueur';
    const opts = { sacrificeIds: [a.id, b.id] };
    const r = mode === 'moba' ? rpgMobaJouerCreature(partie, 'joueur', 'jarl-du-dernier-rempart', 'right', 1, opts) : rpgJouerCreature(partie, 'joueur', 'jarl-du-dernier-rempart', null, opts);
    if (!r.ok) throw new Error(r.raison);
    rpgBlesserCreature(partie, 'joueur', r.entite.id, 1, 'sable', null, 'attaque', null, null, 'sorcier'); rpgActionsEtat(partie);
  } else {
    poser('joueur', 'archere-viking-du-givre', 'left', 1); poser('joueur', 'valkyrie-au-corbeau', 'right', 0);
  }
} else if (scene === 'scorpion') {
  poser('joueur', 'scorpion-du-seuil', 'left', 0); poser('joueur', 'ureus-du-seuil', 'left', 1); poser('joueur', 'ureus-du-seuil', 'right', 1);
  poser('joueur', 'fennec-des-decombres', 'right', 0);
  const cible = poser('sorcier', 'gardien-viking-du-fjord', 'left', 0);
  rpgBlesserCreature(partie, 'sorcier', cible.id, 1);
} else if (scene === 'colosse') {
  poser('joueur', 'djinn-de-la-premiere-etincelle', 'left', 0); poser('joueur', 'djinn-de-la-flamme-mourante', 'left', 1); poser('joueur', 'dune-marchante', 'right', 1);
  poser('joueur', 'ashigaru-des-braises', 'right', 0);
  poser('sorcier', 'gardien-viking-du-fjord', 'left', 0); poser('sorcier', 'gardien-viking-du-fjord', 'right', 0);
} else if (scene === 'soutiens-scorpion') {
  poser('joueur', 'ureus-du-seuil', 'left', 0);
  partie.joueur.cimetiere.push('momie-de-lin');
}
partie.tour = 'joueur';
partie.joueur.main = scene === 'soutiens-scorpion' ? ['convoi-des-dunes', 'scorpion-du-seuil', 'retour-des-ensevelis']
  : scene === 'soutiens-colosse' ? ['confluence-des-etincelles', 'eveil-des-dunes', 'eveil-des-dunes', 'djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante']
  : ['viking-des-neiges'];
if (scene === 'soutiens-colosse') partie.joueur.deck = ['dune-marchante', 'dune-marchante', ...Array(20).fill('ghul-des-cendres')];
partie.sorcier.main = []; partie.sorcier.deck = [];
partie.joueur.invocationNormaleJouee = scene === 'soutiens-colosse';
if (mode === 'moba') partie.moba.creaturesJouees.joueur = scene === 'soutiens-colosse';
window.__ASCENSION_INITIAL_DUEL__ = partie; window.__ASCENSION_TEST_DUEL__ = partie;
const lien = (m = mode, s = scene) => `/?mode=${m}&scene=${s}`;

createRoot(document.getElementById('root')).render(<>
  {mode === 'duel'
    ? <RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .5} />
    : <div className="rpg-battle rpg-battle--moba is-immersive is-reduced" data-scene="moba"><RpgMobaBoard initialiser={() => partie} rendu={RPG_RENDU_MOBA} sonActif={false} onQuitter={() => location.assign('/')} /></div>}
  <nav className="ascension-demo-tools" aria-label="Démonstration locale">
    <span>Démo locale · Ascension</span>
    <a href={`/decks?mode=${mode}`}>Decks</a>
    <a href={lien('duel')} aria-current={mode === 'duel' ? 'page' : undefined}>Duel</a>
    <a href={lien('moba')} aria-current={mode === 'moba' ? 'page' : undefined}>MOBA</a>
    <select aria-label="Scène de démonstration" value={scene} onChange={e => location.assign(lien(mode, e.target.value))}>{Object.entries(scenes).map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}</select>
    <button type="button" onClick={() => location.reload()}>Recommencer</button>
  </nav>
</>);
