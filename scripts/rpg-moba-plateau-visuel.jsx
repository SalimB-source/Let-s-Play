// Banc isolé : le vrai plateau, sans authentification ni données personnelles.
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgMobaBoard from '../src/games/RpgMobaBoard.jsx';
import { RPG_RENDU_MOBA } from '../src/games/RpgDuelPage.jsx';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgFinDeTour } from '../src/games/rpgDuel.js';
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
  window.preparerCible = () => {
    rpgFinDeTour(duel); duel.sorcier.manaChoixEnAttente = null;
    duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const resultat = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0);
    if (!resultat.ok) throw new Error(`Préparation cible : ${resultat.reason ?? resultat.erreur}`);
    rpgFinDeTour(duel); duel.joueur.manaChoixEnAttente = null;
    duel.joueur.main = ['poigne-de-givre'];
    for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 30;
    render();
  };
  window.preparerRecherche = () => {
    duel.joueur.main = [];
    duel.joueur.deck = ['poigne-de-givre'];
    duel.mobaRechercheEnAttente = { cote: 'joueur', sourceCarteId: 'tiziri-du-djurdjura' };
    render();
  };
  window.preparerEffetCible = (protection = false, carteId = 'poigne-de-givre') => {
    rpgFinDeTour(duel); duel.sorcier.manaChoixEnAttente = null;
    duel.sorcier.main = ['ashigaru-des-braises']; duel.sorcier.mana.braise = 30;
    const result = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0);
    if (!result.ok) throw new Error(`Préparation cible : ${result.raison}`);
    result.entite.pv = result.entite.def = result.entite.pvMax = 10;
    if (protection) result.entite.bouclier = 1;
    rpgFinDeTour(duel); duel.joueur.manaChoixEnAttente = null;
    duel.joueur.main = [carteId];
    for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 30;
    render();
  };
  window.terminerPartie = (resultat) => { duel.moba.winner = resultat === 'nul' ? null : resultat; duel.fin = resultat === 'nul' ? { nul: true } : null; render(); };
  window.conquerir = (lane) => { mobaInfliger(duel.moba, 'joueur', lane, 30); render(); };
  window.reglerVie = (lane, side, pv) => { duel.moba.lanes.find((item) => item.id === lane).hp[side] = pv; render(); };
  return duel;
};
render();
