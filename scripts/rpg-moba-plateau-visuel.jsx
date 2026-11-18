// Banc isolé : le vrai plateau, sans authentification ni données personnelles.
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgMobaBoard from '../src/games/RpgMobaBoard.jsx';
import { RPG_RENDU_MOBA } from '../src/games/RpgDuelPage.jsx';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';
import { mobaInfliger } from '../src/games/rpgMoba.js';

const params = new URLSearchParams(location.search);
const root = createRoot(document.getElementById('root'));
const render = () => root.render(<div className="rpg-battle rpg-battle--moba" data-scene="moba"><RpgMobaBoard onQuitter={() => {}} initialiser={initialiser} rendu={params.has('autonome') ? undefined : RPG_RENDU_MOBA} /></div>);
const initialiser = () => {
  const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 });
  window.allongerMains = () => {
    for (const side of ['joueur', 'sorcier']) duel[side].main.push(...duel[side].deck.splice(0, 2));
  };
  window.preparerCarte = (id) => {
    duel.joueur.main = [id];
    duel.joueur.cimetiere = ['gardienne-des-portes-de-sable'];
    for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 30;
    render();
  };
  window.conquerir = (lane) => { mobaInfliger(duel.moba, 'joueur', lane, 30); render(); };
  window.reglerVie = (lane, side, pv) => { duel.moba.lanes.find((item) => item.id === lane).hp[side] = pv; render(); };
  return duel;
};
render();
